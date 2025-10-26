import { DomUtils } from '@timefold/engine';
import { Mat4x4, Mat4x4Type, MathUtils, Quat, Vec3, Vec3Type } from '@timefold/math';
import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';

/* eslint-disable prettier/prettier */
export const quadInterleavedIndexed = new Float32Array([
  -1.0,  1.0, 0.0,   0.0, 0.0,  // top-left
   1.0,  1.0, 0.0,   1.0, 0.0,  // top-right
  -1.0, -1.0, 0.0,   0.0, 1.0,  // bottom-left
   1.0, -1.0, 0.0,   1.0, 1.0,  // bottom-right
]);

export const quadIndices = new Uint16Array([
  0, 2, 1,  // first triangle: top-left → bottom-left → top-right
  1, 2, 3,  // second triangle: top-right → bottom-left → bottom-right
]);
/* eslint-enable prettier/prettier */

type Entity = {
    data: ArrayBuffer;
    modelMatrix: Mat4x4Type;
    color: Vec3Type;
    buffer: GPUBuffer;
    bindgroup: GPUBindGroup;
};

const canvas = DomUtils.getCanvasById('canvas');

const SceneStruct = Wgsl.struct('Scene', { view_projection_matrix: Wgsl.type('mat4x4<f32>') });
const EntityStruct = Wgsl.struct('Entity', { model_matrix: Wgsl.type('mat4x4<f32>'), color: Wgsl.type('vec3<f32>') });

const SceneUniformGroup = Uniform.group(0, {
    scene: Uniform.uniformBuffer(0, SceneStruct),
});

const EntityUniformGroup = Uniform.group(1, {
    entity: Uniform.uniformBuffer(0, EntityStruct),
});

// pipeline layout

const PipelineLayout = WebgpuUtils.createPipelineLayout({
    bindGroupLayoutLabel: 'Entity Pipeline BGL',
    pipelineLayoutLabel: 'Entity Pipeline PL',
    uniformGroups: [SceneUniformGroup, EntityUniformGroup],
});

const VertexInterleaved = WebgpuUtils.createVertexBufferLayout({
    label: 'Simple Quad Layout',
    mode: 'interleaved',
    definition: {
        position: { format: 'float32x3', stride: 0 },
        uv: { format: 'float32x2', stride: 3 },
    },
});

const shaderCode = /* wgsl */ `
${VertexInterleaved.wgsl}

struct VsOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

${Uniform.getWgslFromGroups(PipelineLayout.uniformGroups)}

@vertex fn vs(vert: Vertex) -> VsOut {
    var vsOut: VsOut;
    vsOut.position = scene.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
    vsOut.uv = vert.uv;
    return vsOut;
}

fn sdf_circle(point: vec2f, radius: f32) -> f32 {
    return length(point) - radius;
}

fn sdf_box(point: vec2f, border: f32) -> f32 {
    let d = abs(point) - border;
    return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);
}

const k_triangle = sqrt(3.0);
fn sdf_triangle(point: vec2f, radius: f32) -> f32 {
    var result = vec2f(point.x, -point.y);
    result.x = abs(result.x) - radius;
    result.y = result.y + radius / k_triangle;

    if (result.x + k_triangle * result.y > 0.0) {
        result = vec2(result.x - k_triangle * result.y, -k_triangle * result.x - result.y) / 2.0;
    }

    result.x -= clamp(result.x, -2.0 * radius, 0.0);
    return -length(result) * sign(result.y);
}

const k_pentagon = vec3(0.809016994,0.587785252,0.726542528);
fn sdf_pentagon(point: vec2f, radius: f32) -> f32 {
    var result = vec2f(point);
    result.x = abs(result.x);
    result -= 2.0 * min(dot(vec2(-k_pentagon.x, k_pentagon.y), result), 0.0) * vec2(-k_pentagon.x, k_pentagon.y);
    result -= 2.0 * min(dot(vec2( k_pentagon.x, k_pentagon.y), result), 0.0) * vec2( k_pentagon.x, k_pentagon.y);
    result -= vec2(clamp(result.x, -radius * k_pentagon.z, radius * k_pentagon.z), radius);    
    return length(result) * sign(result.y);
}

const k_hexagon = vec3f(-0.866025404, 0.5, 0.577350269);
fn sdf_hexagon(point: vec2f, radius: f32) -> f32 {
    var p = abs(point);
    p -= 2.0 * min(dot(k_hexagon.xy, p), 0.0) * k_hexagon.xy;
    p -= vec2f(clamp(p.x, -k_hexagon.z * radius, k_hexagon.z * radius), radius);
    return length(p) * sign(p.y);
}

const k_octagon = vec3f(-0.9238795325, 0.3826834323, 0.4142135623);
fn sdf_octagon(point: vec2f, radius: f32) -> f32 {
    var p = abs(point);
    p -= 2.0 * min(dot(vec2f( k_octagon.x,  k_octagon.y), p), 0.0) * vec2f( k_octagon.x,  k_octagon.y);
    p -= 2.0 * min(dot(vec2f(-k_octagon.x,  k_octagon.y), p), 0.0) * vec2f(-k_octagon.x,  k_octagon.y);
    p -= vec2f(clamp(p.x, -k_octagon.z * radius, k_octagon.z * radius), radius);
    return length(p) * sign(p.y);
}

const k_hexagram = vec4f(-0.5, 0.8660254038, 0.5773502692, 1.7320508076);
fn sdf_hexagram(point: vec2f, radius: f32) -> f32 {
    var p = abs(point);
    p -= 2.0 * min(dot(k_hexagram.xy, p), 0.0) * k_hexagram.xy;
    p -= 2.0 * min(dot(k_hexagram.yx, p), 0.0) * k_hexagram.yx;
    p -= vec2f(clamp(p.x, radius * k_hexagram.z, radius * k_hexagram.w), radius);
    return length(p) * sign(p.y);
}

fn sdf_heart(point: vec2f) -> f32 {
    // Shift heart down so it’s vertically centered
    var p = vec2f(abs(point.x), -point.y + 0.5);

    if (p.y + p.x > 1.0) {
        let diff = p - vec2f(0.25, 0.75);
        return sqrt(dot(diff, diff)) - sqrt(2.0) / 4.0;
    }

    let a = p - vec2f(0.0, 1.0);
    let b = p - 0.5 * max(p.x + p.y, 0.0);
    let dot_a = dot(a, a);
    let dot_b = dot(b, b);
    return sqrt(min(dot_a, dot_b)) * sign(p.x - p.y);
}

fn sdf_cross(point: vec2f, b: vec2f, r: f32) -> f32 {
    var p = abs(point);
    p = select(p, vec2f(p.y, p.x), p.y > p.x);

    let q = p - b;
    let k = max(q.y, q.x);
    let w = select(vec2f(b.y - p.x, -k), q, k > 0.0);

    return sign(k) * length(max(w, vec2f(0.0))) + r;
}

fn sdf_rounded_x(point: vec2f, w: f32, r: f32) -> f32 {
    var p = abs(point);
    return length(p - min(p.x + p.y, w) * 0.5) - r;
}

// @fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
//     let uv_center = (2 * fsIn.uv) - 1 / 1;
//     let sd = sdf_box(uv_center, 0.5);
//     let edge = smoothstep(0.0, 0.01, -sd);
//     return vec4f(edge, edge, edge, 1.0);
// }

@fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
    // normalize UVs to [-1, 1]
    let uv_center = (fsIn.uv * 2.0) - vec2f(1.0);
    // let uv_center = vec2f((fsIn.uv.x * 2.0 - 1.0), (1.0 - fsIn.uv.y * 2.0));

    // let sd = sdf_hexagon(uv_center, 0.5);
    // let sd = sdf_cross(uv_center, vec2f(0.3, 0.1), 0.02);
    // let sd = sdf_rounded_x(uv_center, 1.0, 0.1);
    let sd = sdf_heart(uv_center);

    // smooth edge transition
    let edge = smoothstep(0.0, 0.01, -sd);

    // inside = white, outside = red
    let inside_color = vec3f(1.0);
    let outside_color = vec3f(1.0, 0.0, 0.0);

    // interpolate based on edge
    let color = mix(outside_color, inside_color, edge);

    return vec4f(color, 1.0);
}
`.trim();

const createEntity = (bindgroup: GPUBindGroup, buffer: GPUBuffer, position: Vec3Type, color: Vec3Type): Entity => {
    const { buffer: data, views } = EntityStruct.create();
    Mat4x4.fromRotationTranslationScale(views.model_matrix, Quat.createIdentity(), position, Vec3.create(1, 1, 0));
    Vec3.copy(views.color, color);

    return {
        data,
        modelMatrix: views.model_matrix,
        color: views.color,
        buffer,
        bindgroup,
    };
};

const run = async () => {
    // adapter, device, context, module
    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });

    const createColorTexture = () =>
        device.createTexture({
            format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            size: [canvas.width, canvas.height],
            sampleCount: 4,
        });

    let colorTexture = createColorTexture();

    const pipeline = device.createRenderPipeline({
        layout: PipelineLayout.createLayout(device),
        vertex: { module: module, buffers: VertexInterleaved.layout },
        fragment: { module: module, targets: [{ format }] },
        multisample: { count: 4 },
    });

    // render pass

    const renderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(colorTexture.createView())],
    };

    // scene

    const { buffer: sceneData, views } = SceneStruct.create();
    const view = Mat4x4.createLookAt([0, 0, 5], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
    Mat4x4.multiplication(views.view_projection_matrix, proj, view);
    const Scene = PipelineLayout.createBindGroups({
        device,
        group: 0,
        bindings: {
            scene: WebgpuUtils.createUniformBufferDescriptor({ label: 'Scene Uniform Buffer' }),
        },
    });

    DomUtils.onResize({
        canvas,
        fn: (width, height) => {
            colorTexture.destroy();
            colorTexture = createColorTexture();
            renderPassDescriptor.colorAttachments[0] = WebgpuUtils.createColorAttachmentFromView(
                colorTexture.createView(),
            );

            const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), width / height, 0);
            Mat4x4.multiplication(views.view_projection_matrix, proj, view);
        },
    });

    // geometry

    const P = VertexInterleaved.createBuffer(device, quadInterleavedIndexed);
    const I = WebgpuUtils.createIndexBuffer({
        device,
        format: 'uint16',
        data: quadIndices,
        label: 'Simple Quad Index Buffer',
    });

    // entity data

    const entities: Entity[] = [];
    const E1 = PipelineLayout.createBindGroups({
        device,
        group: 1,
        bindings: {
            entity: WebgpuUtils.createUniformBufferDescriptor({ label: 'Entity 1 Uniform Buffer' }),
        },
    });

    entities.push(createEntity(E1.bindGroup, E1.buffers.entity, [0, 0, 0], [1, 0, 0]));

    const render = () => {
        renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setBindGroup(0, Scene.bindGroup);
        device.queue.writeBuffer(Scene.buffers.scene, 0, sceneData);

        pass.setPipeline(pipeline);
        pass.setVertexBuffer(P.slot, P.buffer);
        pass.setIndexBuffer(I.buffer, I.format);

        for (const entity of entities) {
            pass.setBindGroup(1, entity.bindgroup);
            device.queue.writeBuffer(entity.buffer, 0, entity.data);
            pass.drawIndexed(I.count);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
        // window.requestAnimationFrame(render);
    };

    window.requestAnimationFrame(render);
};

void run();
