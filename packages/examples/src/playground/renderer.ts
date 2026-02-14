import { Mat4, Vec3, Vec3Type, Mat4Type } from '@timefold/math';
import type { TransformData, DirLightData, PerspectiveCameraData } from '@timefold/engine';

// --- Local math helpers ---

const vec3Dot = (a: Vec3Type, b: Vec3Type): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const vec3Length = (v: Vec3Type): number => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

const transformPoint = (out: Vec3Type, p: Vec3Type, m: Mat4Type): Vec3Type => {
    const x = p[0],
        y = p[1],
        z = p[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return out;
};

// --- Unit cube geometry ---

const CUBE_VERTICES: Vec3Type[] = [
    [-0.5, -0.5, -0.5],
    [-0.5, -0.5, 0.5],
    [-0.5, 0.5, -0.5],
    [-0.5, 0.5, 0.5],
    [0.5, -0.5, -0.5],
    [0.5, -0.5, 0.5],
    [0.5, 0.5, -0.5],
    [0.5, 0.5, 0.5],
];

const CUBE_FACES: { indices: [number, number, number, number]; normal: Vec3Type }[] = [
    { indices: [0, 2, 6, 4], normal: [0, 0, -1] }, // back
    { indices: [5, 7, 3, 1], normal: [0, 0, 1] }, // front
    { indices: [0, 1, 3, 2], normal: [-1, 0, 0] }, // left
    { indices: [4, 6, 7, 5], normal: [1, 0, 0] }, // right
    { indices: [0, 4, 5, 1], normal: [0, -1, 0] }, // bottom
    { indices: [2, 3, 7, 6], normal: [0, 1, 0] }, // top
];

const CUBE_EDGES: [number, number][] = [
    [0, 1],
    [1, 3],
    [3, 2],
    [2, 0],
    [4, 5],
    [5, 7],
    [7, 6],
    [6, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
];

// --- Trackball ---

type Trackball = {
    theta: number; // azimuth (radians, around Y)
    phi: number; // elevation (radians, from XZ plane)
    radius: number;
    target: Vec3Type;
    dragging: boolean;
    lastX: number;
    lastY: number;
};

const createTrackball = (cameraPos: Vec3Type, target: Vec3Type): Trackball => {
    const dx = cameraPos[0] - target[0];
    const dy = cameraPos[1] - target[1];
    const dz = cameraPos[2] - target[2];
    const radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const phi = Math.asin(Math.max(-1, Math.min(1, dy / radius)));
    const theta = Math.atan2(dx, dz);
    return { theta, phi, radius, target: Vec3.createCopy(target), dragging: false, lastX: 0, lastY: 0 };
};

const trackballToPosition = (out: Vec3Type, tb: Trackball): Vec3Type => {
    const cosPhi = Math.cos(tb.phi);
    out[0] = tb.target[0] + tb.radius * Math.sin(tb.theta) * cosPhi;
    out[1] = tb.target[1] + tb.radius * Math.sin(tb.phi);
    out[2] = tb.target[2] + tb.radius * Math.cos(tb.theta) * cosPhi;
    return out;
};

const bindTrackball = (canvas: HTMLCanvasElement, tb: Trackball) => {
    canvas.addEventListener('mousedown', (e) => {
        tb.dragging = true;
        tb.lastX = e.clientX;
        tb.lastY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
        tb.dragging = false;
    });

    window.addEventListener('mousemove', (e) => {
        if (!tb.dragging) return;
        const dx = e.clientX - tb.lastX;
        const dy = e.clientY - tb.lastY;
        tb.lastX = e.clientX;
        tb.lastY = e.clientY;

        tb.theta -= dx * 0.005;
        tb.phi += dy * 0.005;

        // Clamp phi to avoid flipping at poles
        const limit = Math.PI * 0.495;
        if (tb.phi > limit) tb.phi = limit;
        if (tb.phi < -limit) tb.phi = -limit;
    });

    canvas.addEventListener(
        'wheel',
        (e) => {
            e.preventDefault();
            tb.radius *= 1 + e.deltaY * 0.001;
            if (tb.radius < 0.5) tb.radius = 0.5;
            if (tb.radius > 50) tb.radius = 50;
        },
        { passive: false },
    );
};

// --- Renderer state ---

export type SceneData = {
    cameraTransform: TransformData;
    cameraData: PerspectiveCameraData;
    lightData: DirLightData;
    lightTransform: TransformData;
    cubeTransform: TransformData;
};

type RenderState = {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    mvp: Mat4Type;
    view: Mat4Type;
    proj: Mat4Type;
    model: Mat4Type;
    temp: Mat4Type;
};

const createRenderState = (canvas: HTMLCanvasElement): RenderState => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    return {
        ctx,
        width: canvas.width,
        height: canvas.height,
        mvp: Mat4.create(),
        view: Mat4.create(),
        proj: Mat4.create(),
        model: Mat4.create(),
        temp: Mat4.create(),
    };
};

// --- Projection ---

const projectToScreen = (
    out: [number, number],
    point: Vec3Type,
    mvp: Mat4Type,
    width: number,
    height: number,
): [number, number] => {
    const ndc = transformPoint(Vec3.create(), point, mvp);
    out[0] = (ndc[0] + 1.0) * 0.5 * width;
    out[1] = (1.0 - ndc[1]) * 0.5 * height;
    return out;
};

// --- Drawing ---

const drawScene = (state: RenderState, scene: SceneData, trackball: Trackball) => {
    const { ctx, width, height } = state;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Compute camera position from trackball and write back to transform
    const camPos = trackballToPosition(Vec3.create(), trackball);
    Vec3.copy(scene.cameraTransform.translation, camPos);

    // Build view matrix: camera looks at trackball target
    Mat4.lookAt(state.view, camPos, trackball.target, Vec3.up());

    // Build projection matrix
    const c = scene.cameraData;
    Mat4.perspective(state.proj, c.fovy, c.aspect, c.near, c.far);

    // Build model matrix for cube
    const ct = scene.cubeTransform;
    Mat4.fromRotationTranslationScale(state.model, ct.rotation, ct.translation, ct.scale);

    // MVP = proj * view * model
    Mat4.multiply(state.temp, state.view, state.model);
    Mat4.multiply(state.mvp, state.proj, state.temp);

    // Light direction for shading (negate for N dot L convention)
    const lightDir = Vec3.create();
    Vec3.normalization(lightDir, scene.lightData.direction);
    Vec3.scaling(lightDir, lightDir, -1.0);

    const screenA: [number, number] = [0, 0];
    const screenB: [number, number] = [0, 0];

    // Depth-sort faces (painter's algorithm)
    const faceDepths: { idx: number; depth: number }[] = [];
    const centroid = Vec3.create();
    const worldCentroid = Vec3.create();

    for (let i = 0; i < CUBE_FACES.length; i++) {
        const face = CUBE_FACES[i];
        Vec3.set(centroid, 0, 0, 0);
        for (let j = 0; j < 4; j++) {
            Vec3.add(centroid, CUBE_VERTICES[face.indices[j]]);
        }
        Vec3.scale(centroid, 0.25);
        transformPoint(worldCentroid, centroid, state.mvp);
        faceDepths.push({ idx: i, depth: worldCentroid[2] });
    }
    faceDepths.sort((a, b) => b.depth - a.depth);

    // Material (Blinn-Phong)
    const matDiffuse: Vec3Type = [0.55, 0.45, 0.7];
    const matSpecular: Vec3Type = [1.0, 1.0, 1.0];
    const matAmbient: Vec3Type = [0.08, 0.06, 0.12];
    const shininess = 64.0;

    const worldNormal = Vec3.create();
    const viewDir = Vec3.create();
    const halfVec = Vec3.create();
    const faceCenterWorld = Vec3.create();

    for (let fi = 0; fi < faceDepths.length; fi++) {
        const face = CUBE_FACES[faceDepths[fi].idx];

        // World-space normal
        Vec3.transformQuat(worldNormal, face.normal, ct.rotation);
        Vec3.normalize(worldNormal);

        // Face center in world space
        Vec3.set(faceCenterWorld, 0, 0, 0);
        for (let j = 0; j < 4; j++) {
            Vec3.add(faceCenterWorld, CUBE_VERTICES[face.indices[j]]);
        }
        Vec3.scale(faceCenterWorld, 0.25);
        transformPoint(faceCenterWorld, faceCenterWorld, state.model);

        // View direction
        Vec3.subtraction(viewDir, camPos, faceCenterWorld);
        Vec3.normalize(viewDir);

        // Diffuse
        const ndotl = Math.max(0.0, vec3Dot(worldNormal, lightDir));

        // Specular (Blinn-Phong)
        Vec3.addition(halfVec, lightDir, viewDir);
        Vec3.normalize(halfVec);
        const ndoth = Math.max(0.0, vec3Dot(worldNormal, halfVec));
        const spec = ndotl > 0.0 ? Math.pow(ndoth, shininess) : 0.0;

        const li = scene.lightData.intensity;
        const lc = scene.lightData.color;

        const r = Math.min(
            255,
            Math.floor(255 * (matAmbient[0] + matDiffuse[0] * ndotl * li * lc[0] + matSpecular[0] * spec * li * lc[0])),
        );
        const g = Math.min(
            255,
            Math.floor(255 * (matAmbient[1] + matDiffuse[1] * ndotl * li * lc[1] + matSpecular[1] * spec * li * lc[1])),
        );
        const b = Math.min(
            255,
            Math.floor(255 * (matAmbient[2] + matDiffuse[2] * ndotl * li * lc[2] + matSpecular[2] * spec * li * lc[2])),
        );

        ctx.beginPath();
        projectToScreen(screenA, CUBE_VERTICES[face.indices[0]], state.mvp, width, height);
        ctx.moveTo(screenA[0], screenA[1]);
        for (let j = 1; j < 4; j++) {
            projectToScreen(screenA, CUBE_VERTICES[face.indices[j]], state.mvp, width, height);
            ctx.lineTo(screenA[0], screenA[1]);
        }
        ctx.closePath();
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();
    }

    // Wireframe
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < CUBE_EDGES.length; i++) {
        const [a, b] = CUBE_EDGES[i];
        projectToScreen(screenA, CUBE_VERTICES[a], state.mvp, width, height);
        projectToScreen(screenB, CUBE_VERTICES[b], state.mvp, width, height);
        ctx.beginPath();
        ctx.moveTo(screenA[0], screenA[1]);
        ctx.lineTo(screenB[0], screenB[1]);
        ctx.stroke();
    }

    drawLightIndicator(state, scene);
    drawAxesIndicator(state, scene, trackball);
    drawDebugInfo(state, scene);
};

// --- Light indicator: point at light position, line along direction ---

const drawLightIndicator = (state: RenderState, scene: SceneData) => {
    const { ctx, width, height } = state;
    const vp = Mat4.create();
    Mat4.multiply(vp, state.proj, state.view);

    const lightPos = scene.lightTransform.translation;
    const dirEnd = Vec3.create();
    Vec3.normalization(dirEnd, scene.lightData.direction);
    Vec3.scaling(dirEnd, dirEnd, 2.0);
    Vec3.addition(dirEnd, lightPos, dirEnd);

    const screenPos: [number, number] = [0, 0];
    const screenEnd: [number, number] = [0, 0];
    projectToScreen(screenPos, lightPos, vp, width, height);
    projectToScreen(screenEnd, dirEnd, vp, width, height);

    // Direction line from light position
    ctx.strokeStyle = '#ffdd44';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(screenPos[0], screenPos[1]);
    ctx.lineTo(screenEnd[0], screenEnd[1]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead
    const adx = screenEnd[0] - screenPos[0];
    const ady = screenEnd[1] - screenPos[1];
    const aLen = Math.sqrt(adx * adx + ady * ady);
    if (aLen > 10) {
        const nx = adx / aLen;
        const ny = ady / aLen;
        const arrowSize = 8;
        ctx.fillStyle = '#ffdd44';
        ctx.beginPath();
        ctx.moveTo(screenEnd[0], screenEnd[1]);
        ctx.lineTo(
            screenEnd[0] - nx * arrowSize + ny * arrowSize * 0.4,
            screenEnd[1] - ny * arrowSize - nx * arrowSize * 0.4,
        );
        ctx.lineTo(
            screenEnd[0] - nx * arrowSize - ny * arrowSize * 0.4,
            screenEnd[1] - ny * arrowSize + nx * arrowSize * 0.4,
        );
        ctx.closePath();
        ctx.fill();
    }

    // Sun icon at light position
    ctx.fillStyle = '#ffdd44';
    ctx.beginPath();
    ctx.arc(screenPos[0], screenPos[1], 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(screenPos[0], screenPos[1], 4, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#ffdd44';
    ctx.font = '11px monospace';
    const lp = scene.lightTransform.translation;
    ctx.fillText(
        `light [${lp[0].toFixed(1)}, ${lp[1].toFixed(1)}, ${lp[2].toFixed(1)}]`,
        screenPos[0] + 14,
        screenPos[1] - 6,
    );
};

// --- Axes indicator ---

const drawAxesIndicator = (state: RenderState, _scene: SceneData, trackball: Trackball) => {
    const { ctx } = state;
    const ox = 60;
    const oy = state.height - 60;
    const len = 40;

    const viewMat = Mat4.create();
    const camPos = trackballToPosition(Vec3.create(), trackball);
    Mat4.lookAt(viewMat, camPos, trackball.target, Vec3.up());

    // Strip translation (keep rotation only)
    viewMat[12] = 0;
    viewMat[13] = 0;
    viewMat[14] = 0;

    const axes: { dir: Vec3Type; color: string; label: string }[] = [
        { dir: [1, 0, 0], color: '#ff4444', label: 'X' },
        { dir: [0, 1, 0], color: '#44ff44', label: 'Y' },
        { dir: [0, 0, 1], color: '#4444ff', label: 'Z' },
    ];

    const projected = Vec3.create();
    for (let i = 0; i < axes.length; i++) {
        const axis = axes[i];
        transformPoint(projected, axis.dir, viewMat);
        const ex = ox + projected[0] * len;
        const ey = oy - projected[1] * len;

        ctx.strokeStyle = axis.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        ctx.fillStyle = axis.color;
        ctx.font = '12px monospace';
        ctx.fillText(axis.label, ex + 4, ey - 4);
    }
};

// --- Debug overlay ---

const drawDebugInfo = (state: RenderState, scene: SceneData) => {
    const { ctx } = state;
    const ct = scene.cubeTransform;
    const cam = scene.cameraTransform;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px monospace';

    const ld = scene.lightData.direction;
    const ldLen = vec3Length(ld);
    const ldn = ldLen > 0 ? [ld[0] / ldLen, ld[1] / ldLen, ld[2] / ldLen] : [0, 0, 0];
    const lp = scene.lightTransform.translation;

    const lines = [
        `cam pos:    [${cam.translation[0].toFixed(2)}, ${cam.translation[1].toFixed(2)}, ${cam.translation[2].toFixed(2)}]`,
        `cube pos:   [${ct.translation[0].toFixed(2)}, ${ct.translation[1].toFixed(2)}, ${ct.translation[2].toFixed(2)}]`,
        `cube rot:   [${ct.rotation[0].toFixed(3)}, ${ct.rotation[1].toFixed(3)}, ${ct.rotation[2].toFixed(3)}, ${ct.rotation[3].toFixed(3)}]`,
        `light pos:  [${lp[0].toFixed(2)}, ${lp[1].toFixed(2)}, ${lp[2].toFixed(2)}]`,
        `light dir:  [${ldn[0].toFixed(3)}, ${ldn[1].toFixed(3)}, ${ldn[2].toFixed(3)}]`,
        `light int:  ${scene.lightData.intensity.toFixed(2)}`,
    ];

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], 10, 20 + i * 16);
    }
};

// --- Public API ---

export type Renderer = {
    scene: SceneData;
    start: () => void;
    stop: () => void;
};

export const createRenderer = (canvas: HTMLCanvasElement, scene: SceneData): Renderer => {
    const state = createRenderState(canvas);

    // Initialize trackball from the camera's current position, orbiting around the cube
    const trackball = createTrackball(scene.cameraTransform.translation, scene.cubeTransform.translation);
    bindTrackball(canvas, trackball);

    let animId = 0;

    const frame = () => {
        drawScene(state, scene, trackball);
        animId = requestAnimationFrame(frame);
    };

    const start = () => {
        animId = requestAnimationFrame(frame);
    };

    const stop = () => {
        cancelAnimationFrame(animId);
    };

    return { scene, start, stop };
};
