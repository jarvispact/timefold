import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { Vec3, Mat4x4, MathUtils } from '@timefold/math';
import { ObjObject } from '@timefold/obj';

const dpr = window.devicePixelRatio || 1;
export const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const Scene = Wgsl.struct('Scene', {
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
    sun_direction: Wgsl.type('vec3<f32>'),
    sun_color: Wgsl.type('vec3<f32>'),
});

export const Entity = Wgsl.struct('Entity', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    normal_matrix: Wgsl.type('mat4x4<f32>'),
    color: Wgsl.type('vec3<f32>'),
});

const SceneUniformGroup = Uniform.group(0, {
    scene: Uniform.buffer(0, Scene, {
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
    }),
});

const EntityUniformGroup = Uniform.group(1, {
    entity: Uniform.buffer(0, Entity, {
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
    }),
});

export const VertexInterleaved = WebgpuUtils.createVertexBufferLayout('interleaved', {
    position: { format: 'float32x3', offset: 0 },
    uv: { format: 'float32x2', offset: 3 },
    normal: { format: 'float32x3', offset: 5 },
});

export const VertexNonInterleaved = WebgpuUtils.createVertexBufferLayout('non-interleaved', {
    position: { format: 'float32x3' },
    uv: { format: 'float32x2' },
    normal: { format: 'float32x3' },
});

const shaderCode = /* wgsl */ `
${VertexInterleaved.wgsl}

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
}

${Uniform.getWgslFromGroups([SceneUniformGroup, EntityUniformGroup])}

@vertex fn vs(
  vert: Vertex
) -> VSOutput {
    var vsOut: VSOutput;
    vsOut.position = scene.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
    vsOut.normal = (entity.normal_matrix * vec4f(vert.normal, 0.0)).xyz;
    return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
    let N = normalize(vsOut.normal);
    let L = normalize(scene.sun_direction);
    let ambient = entity.color * 0.1;
    let diff = max(dot(N, L), 0.0);
    let diffuse = max(dot(N, L), 0.0) * scene.sun_color * entity.color;
    return vec4f(ambient + diffuse, 1.0);
}
`.trim();

export const setupScene = async (Vertex: typeof VertexInterleaved | typeof VertexNonInterleaved) => {
    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });

    const Layout = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [SceneUniformGroup, EntityUniformGroup],
    });

    const sceneBindgroup = Layout.createBindGroups(0, { scene: WebgpuUtils.createBufferDescriptor() });

    const renderPassDescriptor: WebgpuUtils.RenderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
        depthStencilAttachment: WebgpuUtils.createDepthAttachmentFromView(device, canvas.width, canvas.height),
    };

    const pipeline = device.createRenderPipeline({
        layout: Layout.layout,
        primitive: { cullMode: 'back' },
        vertex: { module: module, buffers: Vertex.layout },
        fragment: { module: module, targets: [{ format }] },
        depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' },
    });

    const scene = Scene.create();
    const view = Mat4x4.createLookAt(Vec3.create(2, 5, 10), Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0.1);
    Mat4x4.multiplication(scene.views.view_projection_matrix, proj, view);
    Vec3.normalization(scene.views.sun_direction, Vec3.create(2, 3, 4));
    Vec3.set(scene.views.sun_color, 1, 1, 1);

    return { device, context, Layout, sceneBindgroup, renderPassDescriptor, pipeline, scene };
};

export type CommonEntity = {
    modelMatrix: Float32Array;
    normalMatrix: Float32Array;
    color: Float32Array;
    uniform: {
        group: number;
        bindGroup: GPUBindGroup;
        buffer: GPUBuffer;
        data: ArrayBuffer;
    };
};

export const setupEntity = (color: Vec3.Type, layout: Awaited<ReturnType<typeof setupScene>>['Layout']) => {
    const uniform = layout.createBindGroups(1, { entity: WebgpuUtils.createBufferDescriptor() });

    const entity = Entity.create();
    Mat4x4.fromTranslation(entity.views.model_matrix, Vec3.zero());
    Mat4x4.modelToNormal(entity.views.normal_matrix, entity.views.normal_matrix);
    Vec3.copy(entity.views.color, color);

    return {
        modelMatrix: entity.views.model_matrix,
        normalMatrix: entity.views.normal_matrix,
        color: entity.views.color,
        uniform: {
            group: uniform.group,
            bindGroup: uniform.bindGroup,
            buffer: uniform.buffers.entity,
            data: entity.buffer,
        },
    };
};

export const updateEntity = (entity: CommonEntity, time: number) => {
    Mat4x4.identity(entity.modelMatrix);
    Mat4x4.translate(entity.modelMatrix, [0, Math.sin(time * 0.01) * 0.05, 0]);
    Mat4x4.rotateY(entity.modelMatrix, -time * 0.001);
    Mat4x4.modelToNormal(entity.normalMatrix, entity.modelMatrix);
    Vec3.copy(entity.color, entity.color);
};

export const printObjStats = (objects: Record<string, ObjObject>) => {
    const stats = Object.keys(objects).map((objectKey) => {
        const object = objects[objectKey];
        return {
            name: object.name,
            primitives: Object.keys(object.primitives).map((primitiveKey) => {
                const primitive = object.primitives[primitiveKey];
                const primitiveStats: Record<string, string | number> = { name: primitive.name };

                if ('vertices' in primitive) {
                    primitiveStats.vertices = primitive.vertices.length;
                }

                if ('positions' in primitive) {
                    primitiveStats.positions = primitive.positions.length;
                }

                if ('uvs' in primitive) {
                    primitiveStats.uvs = primitive.uvs.length;
                }

                if ('normals' in primitive) {
                    primitiveStats.normals = primitive.normals.length;
                }

                if ('indices' in primitive) {
                    primitiveStats.indices = primitive.indices.length;
                }

                return primitiveStats;
            }),
        };
    });

    console.log(JSON.stringify(stats, null, 2));
};
