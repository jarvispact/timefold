/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Mat4, Vec3, Vec3Type, Mat4Type } from '@timefold/math';
import type { PhongMaterialData, PerspectiveCameraData, TransformData, DirLightData } from '@timefold/engine';

// --- WebGPU Scene Data ---

export type WebGPUSceneData = {
    cameraTransform: TransformData;
    cameraData: PerspectiveCameraData;
    lightData: DirLightData;
    lightTransform: TransformData;
    cubeGeometry: {
        posiitions: Float32Array;
        normals: Float32Array;
        uvs: Float32Array;
        indices: Uint32Array;
    };
    cubeTransform: TransformData;
    cubeMaterial: PhongMaterialData;
    texture?: ImageBitmap;
};

// --- Trackball ---

type Trackball = {
    theta: number;
    phi: number;
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

// --- 2D Overlay drawing (reused from renderer.ts) ---

const projectToScreen = (
    out: [number, number],
    point: Vec3Type,
    mvp: Mat4Type,
    width: number,
    height: number,
): [number, number] => {
    const ndc = Vec3.transformMat4(Vec3.create(), point, mvp);
    out[0] = (ndc[0] + 1.0) * 0.5 * width;
    out[1] = (1.0 - ndc[1]) * 0.5 * height;
    return out;
};

const drawLightIndicator = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    proj: Mat4Type,
    view: Mat4Type,
    scene: WebGPUSceneData,
) => {
    const vp = Mat4.create();
    Mat4.multiply(vp, proj, view);

    const lightPos = scene.lightTransform.translation;
    const dirEnd = Vec3.create();
    Vec3.normalization(dirEnd, scene.lightData.direction);
    Vec3.scaling(dirEnd, dirEnd, 2.0);
    Vec3.addition(dirEnd, lightPos, dirEnd);

    const screenPos: [number, number] = [0, 0];
    const screenEnd: [number, number] = [0, 0];
    projectToScreen(screenPos, lightPos, vp, width, height);
    projectToScreen(screenEnd, dirEnd, vp, width, height);

    // Direction line
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

    // Sun icon
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

const drawAxesIndicator = (ctx: CanvasRenderingContext2D, height: number, trackball: Trackball) => {
    const ox = 60;
    const oy = height - 60;
    const len = 40;

    const viewMat = Mat4.create();
    const camPos = trackballToPosition(Vec3.create(), trackball);
    Mat4.lookAt(viewMat, camPos, trackball.target, Vec3.up());

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
        Vec3.transformMat4(projected, axis.dir, viewMat);
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

const drawDebugInfo = (ctx: CanvasRenderingContext2D, scene: WebGPUSceneData) => {
    const ct = scene.cubeTransform;
    const cam = scene.cameraTransform;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px monospace';

    const ld = scene.lightData.direction;
    const ldLen = Vec3.length(ld);
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

// --- WGSL Shader ---

const SHADER_SOURCE = /* wgsl */ `
struct SceneUniforms {
    viewProj: mat4x4f,
    model: mat4x4f,
    normalMatrix: mat4x4f,
    cameraPos: vec3f,
}

struct LightUniforms {
    direction: vec3f,
    color: vec3f,
    intensity: f32,
}

struct MaterialUniforms {
    ambientColor: vec3f,
    diffuseColor: vec3f,
    specularColor: vec3f,
    shininess: f32,
    opacity: f32,
}

@group(0) @binding(0) var<uniform> scene: SceneUniforms;
@group(1) @binding(0) var<uniform> light: LightUniforms;
@group(2) @binding(0) var<uniform> material: MaterialUniforms;
@group(3) @binding(0) var texSampler: sampler;
@group(3) @binding(1) var texDiffuse: texture_2d<f32>;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
}

struct VertexOutput {
    @builtin(position) clipPos: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) worldNormal: vec3f,
    @location(2) uv: vec2f,
}

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    let worldPos4 = scene.model * vec4f(input.position, 1.0);
    out.worldPos = worldPos4.xyz;
    out.clipPos = scene.viewProj * worldPos4;
    out.worldNormal = (scene.normalMatrix * vec4f(input.normal, 0.0)).xyz;
    out.uv = input.uv;
    return out;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    let N = normalize(input.worldNormal);
    let L = normalize(-light.direction);
    let V = normalize(scene.cameraPos - input.worldPos);
    let H = normalize(L + V);

    let texColor = textureSample(texDiffuse, texSampler, input.uv).rgb;

    // Ambient
    let ambient = material.ambientColor * texColor;

    // Diffuse
    let NdotL = max(dot(N, L), 0.0);
    let diffuse = material.diffuseColor * texColor * NdotL * light.intensity * light.color;

    // Specular (Blinn-Phong)
    let NdotH = max(dot(N, H), 0.0);
    let spec = select(0.0, pow(NdotH, material.shininess), NdotL > 0.0);
    let specular = material.specularColor * spec * light.intensity * light.color;

    let color = ambient + diffuse + specular;
    return vec4f(color, material.opacity);
}
`;

// --- Uniform buffer helpers ---

// Writes a Mat4Type (number[]) into a Float32Array at the given float offset
const writeMat4 = (buf: Float32Array, offset: number, m: Mat4Type) => {
    // WGSL mat4x4f is column-major, same as our Mat4
    for (let i = 0; i < 16; i++) {
        buf[offset + i] = m[i];
    }
};

const writeVec3 = (buf: Float32Array, offset: number, v: Vec3Type) => {
    buf[offset] = v[0];
    buf[offset + 1] = v[1];
    buf[offset + 2] = v[2];
};

// --- Scene uniform layout (std140) ---
// viewProj:     0  (16 floats = 64 bytes)
// model:        16 (16 floats = 64 bytes)
// normalMatrix: 32 (16 floats = 64 bytes)
// cameraPos:    48 (3 floats + 1 pad = 16 bytes)
// Total: 52 floats → 208 bytes, round up to 256 for alignment
const SCENE_UNIFORM_SIZE = 256;

// --- Light uniform layout (WGSL uniform) ---
// direction: float[0..2]  (vec3f, align 16)
// color:     float[4..6]  (vec3f, align 16)
// intensity: float[7]     (f32, packed into vec3f padding)
// Struct size: 32 bytes (rounded up to align 16)
const LIGHT_UNIFORM_SIZE = 32;

// --- Material uniform layout (WGSL uniform) ---
// ambientColor:  float[0..2]   (vec3f, align 16)
// diffuseColor:  float[4..6]   (vec3f, align 16)
// specularColor: float[8..10]  (vec3f, align 16)
// shininess:     float[11]     (f32, packed into vec3f padding)
// opacity:       float[12]     (f32)
// Struct size: 64 bytes (rounded up to align 16)
const MATERIAL_UNIFORM_SIZE = 64;

// --- Public API ---

export type WebGPURenderer = {
    scene: WebGPUSceneData;
    init: () => Promise<void>;
    frame: () => void;
};

export const createWebGPURenderer = (canvas: HTMLCanvasElement, scene: WebGPUSceneData): WebGPURenderer => {
    const trackball = createTrackball(scene.cameraTransform.translation, scene.cubeTransform.translation);

    let frameFn: (() => void) | null = null;

    const init = async () => {
        // --- WebGPU init ---
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error('WebGPU adapter not available');
        const device = await adapter.requestDevice();

        const format = navigator.gpu.getPreferredCanvasFormat();
        const gpuCtx = canvas.getContext('webgpu');
        if (!gpuCtx) throw new Error('Failed to get WebGPU context');

        gpuCtx.configure({ device, format, alphaMode: 'opaque' });

        // --- Create overlay canvas ---
        const overlayCanvas = document.createElement('canvas');
        overlayCanvas.width = canvas.width;
        overlayCanvas.height = canvas.height;
        overlayCanvas.style.position = 'fixed';
        overlayCanvas.style.top = '0';
        overlayCanvas.style.left = '0';
        overlayCanvas.style.width = '100%';
        overlayCanvas.style.height = '100%';
        overlayCanvas.style.pointerEvents = 'auto';
        canvas.parentElement!.appendChild(overlayCanvas);

        const overlayCtx = overlayCanvas.getContext('2d')!;

        // Bind trackball to overlay (it's on top)
        bindTrackball(overlayCanvas, trackball);

        // --- Create buffers ---
        const positionBuffer = device.createBuffer({
            size: scene.cubeGeometry.posiitions.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(positionBuffer, 0, scene.cubeGeometry.posiitions.buffer);

        const normalBuffer = device.createBuffer({
            size: scene.cubeGeometry.normals.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(normalBuffer, 0, scene.cubeGeometry.normals.buffer);

        const uvBuffer = device.createBuffer({
            size: scene.cubeGeometry.uvs.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(uvBuffer, 0, scene.cubeGeometry.uvs.buffer);

        const indexBuffer = device.createBuffer({
            size: scene.cubeGeometry.indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(indexBuffer, 0, scene.cubeGeometry.indices.buffer);

        const sceneUniformBuffer = device.createBuffer({
            size: SCENE_UNIFORM_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const lightUniformBuffer = device.createBuffer({
            size: LIGHT_UNIFORM_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const materialUniformBuffer = device.createBuffer({
            size: MATERIAL_UNIFORM_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // --- GPU texture + sampler ---
        const gpuTexture = device.createTexture({
            size: [scene.texture!.width, scene.texture!.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        device.queue.copyExternalImageToTexture({ source: scene.texture!, flipY: true }, { texture: gpuTexture }, [
            scene.texture!.width,
            scene.texture!.height,
        ]);

        const sampler = device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
        });

        // --- Shader module ---
        const shaderModule = device.createShaderModule({ code: SHADER_SOURCE });

        // --- Bind group layouts ---
        const sceneBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' },
                },
            ],
        });

        const lightBindGroupLayout = device.createBindGroupLayout({
            entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }],
        });

        const materialBindGroupLayout = device.createBindGroupLayout({
            entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }],
        });

        const textureBindGroupLayout = device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
                { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
            ],
        });

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [
                sceneBindGroupLayout,
                lightBindGroupLayout,
                materialBindGroupLayout,
                textureBindGroupLayout,
            ],
        });

        // --- Render pipeline ---
        const pipeline = device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main',
                buffers: [
                    {
                        arrayStride: 12, // 3 floats * 4 bytes
                        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
                    },
                    {
                        arrayStride: 12,
                        attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }],
                    },
                    {
                        arrayStride: 8, // 2 floats * 4 bytes
                        attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x2' }],
                    },
                ],
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [{ format }],
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back',
                frontFace: 'ccw',
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            },
        });

        // --- Bind groups ---
        const sceneBindGroup = device.createBindGroup({
            layout: sceneBindGroupLayout,
            entries: [{ binding: 0, resource: { buffer: sceneUniformBuffer } }],
        });

        const lightBindGroup = device.createBindGroup({
            layout: lightBindGroupLayout,
            entries: [{ binding: 0, resource: { buffer: lightUniformBuffer } }],
        });

        const materialBindGroup = device.createBindGroup({
            layout: materialBindGroupLayout,
            entries: [{ binding: 0, resource: { buffer: materialUniformBuffer } }],
        });

        const textureBindGroup = device.createBindGroup({
            layout: textureBindGroupLayout,
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: gpuTexture.createView() },
            ],
        });

        // --- Depth texture ---
        let depthTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        // --- Reusable CPU buffers ---
        const sceneData = new Float32Array(SCENE_UNIFORM_SIZE / 4);
        const lightDataBuf = new Float32Array(LIGHT_UNIFORM_SIZE / 4);
        const materialDataBuf = new Float32Array(MATERIAL_UNIFORM_SIZE / 4);

        const view = Mat4.create();
        const proj = Mat4.create();
        const model = Mat4.create();
        const viewProj = Mat4.create();
        const normalMatrix = Mat4.create();

        // --- Frame function ---
        frameFn = () => {
            // Handle resize
            if (depthTexture.width !== canvas.width || depthTexture.height !== canvas.height) {
                depthTexture.destroy();
                depthTexture = device.createTexture({
                    size: [canvas.width, canvas.height],
                    format: 'depth24plus',
                    usage: GPUTextureUsage.RENDER_ATTACHMENT,
                });
                overlayCanvas.width = canvas.width;
                overlayCanvas.height = canvas.height;
            }

            const width = canvas.width;
            const height = canvas.height;

            // Update camera from trackball
            const camPos = trackballToPosition(Vec3.create(), trackball);
            Vec3.copy(scene.cameraTransform.translation, camPos);

            // Build matrices
            Mat4.lookAt(view, camPos, trackball.target, Vec3.up());

            const c = scene.cameraData;
            Mat4.perspective(proj, c.fovy, c.aspect, c.near, c.far);

            const ct = scene.cubeTransform;
            Mat4.fromRotationTranslationScale(model, ct.rotation, ct.translation, ct.scale);

            Mat4.multiply(viewProj, proj, view);

            // Normal matrix = transpose(invert(model))
            Mat4.modelToNormal(normalMatrix, model);

            // Write scene uniforms
            writeMat4(sceneData, 0, viewProj);
            writeMat4(sceneData, 16, model);
            writeMat4(sceneData, 32, normalMatrix);
            writeVec3(sceneData, 48, camPos);
            device.queue.writeBuffer(sceneUniformBuffer, 0, sceneData);

            // Write light uniforms (vec3f has size 12 but align 16 in uniform buffers,
            // so f32 after vec3f packs into the 4-byte padding at float[3]/float[7])
            writeVec3(lightDataBuf, 0, scene.lightData.direction);
            // float[3] is padding after direction
            writeVec3(lightDataBuf, 4, scene.lightData.color);
            lightDataBuf[7] = scene.lightData.intensity;
            device.queue.writeBuffer(lightUniformBuffer, 0, lightDataBuf);

            // Write material uniforms
            const mat = scene.cubeMaterial;
            writeVec3(materialDataBuf, 0, mat.ambientColor);
            writeVec3(materialDataBuf, 4, mat.diffuseColor);
            writeVec3(materialDataBuf, 8, mat.specularColor);
            materialDataBuf[11] = mat.shininess;
            materialDataBuf[12] = mat.opacity;
            device.queue.writeBuffer(materialUniformBuffer, 0, materialDataBuf);

            // --- Encode render pass ---
            const commandEncoder = device.createCommandEncoder();
            const textureView = gpuCtx.getCurrentTexture().createView();

            const renderPass = commandEncoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: textureView,
                        clearValue: { r: 0.102, g: 0.102, b: 0.18, a: 1.0 }, // #1a1a2e
                        loadOp: 'clear',
                        storeOp: 'store',
                    },
                ],
                depthStencilAttachment: {
                    view: depthTexture.createView(),
                    depthClearValue: 1.0,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store',
                },
            });

            renderPass.setPipeline(pipeline);
            renderPass.setVertexBuffer(0, positionBuffer);
            renderPass.setVertexBuffer(1, normalBuffer);
            renderPass.setVertexBuffer(2, uvBuffer);
            renderPass.setIndexBuffer(indexBuffer, 'uint32');
            renderPass.setBindGroup(0, sceneBindGroup);
            renderPass.setBindGroup(1, lightBindGroup);
            renderPass.setBindGroup(2, materialBindGroup);
            renderPass.setBindGroup(3, textureBindGroup);
            renderPass.drawIndexed(36);
            renderPass.end();

            device.queue.submit([commandEncoder.finish()]);

            // --- 2D overlay ---
            overlayCtx.clearRect(0, 0, width, height);
            drawLightIndicator(overlayCtx, width, height, proj, view, scene);
            drawAxesIndicator(overlayCtx, height, trackball);
            drawDebugInfo(overlayCtx, scene);
        };
    };

    const frame = () => {
        if (frameFn) frameFn();
    };

    return { scene, init, frame };
};
