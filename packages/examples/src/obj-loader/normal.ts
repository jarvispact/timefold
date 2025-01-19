import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { Vec3, Mat4x4, MathUtils } from '@timefold/math';
import { MtlLoader, ObjLoader } from '@timefold/obj';

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const Scene = Wgsl.struct('Scene', {
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
    sun_direction: Wgsl.type('vec3<f32>'),
    sun_color: Wgsl.type('vec3<f32>'),
});

const Entity = Wgsl.struct('Entity', {
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

const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
    position: { format: 'float32x3', offset: 0 },
    uv: { format: 'float32x2', offset: 3 },
    normal: { format: 'float32x3', offset: 5 },
});

const shaderCode = /* wgsl */ `
${Vertex.wgsl}

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

const run = async () => {
    const [{ materials }, { objects }] = await Promise.all([
        MtlLoader.load('./obj-loader-demo.mtl'),
        ObjLoader.load('./obj-loader-demo.obj'),
    ]);

    console.log({ materials, objects });

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

    const entities: {
        vertexSlot: number;
        vertexBuffer: GPUBuffer;
        indexBuffer: GPUBuffer;
        indexCount: number;
        indexFormat: 'uint32';
        modelMatrix: Float32Array;
        normalMatrix: Float32Array;
        color: Float32Array;
        uniformBuffer: ArrayBuffer;
        group: number;
        bindGroup: GPUBindGroup;
        buffer: GPUBuffer;
    }[] = [];

    for (const objectKey of Object.keys(objects)) {
        const object = objects[objectKey];
        for (const primitiveKey of Object.keys(object.primitives)) {
            const primitive = object.primitives[primitiveKey];
            const vertexBuffer = Vertex.createBuffer(device, primitive.vertices);

            const indexBuffer = WebgpuUtils.createIndexBuffer(device, {
                format: 'uint32',
                data: primitive.indices,
            });

            const color = materials[primitive.name].diffuseColor;

            const bindGroup = Layout.createBindGroups(1, { entity: WebgpuUtils.createBufferDescriptor() });

            const entity = Entity.create();
            Mat4x4.fromTranslation(entity.views.model_matrix, Vec3.zero());
            Mat4x4.modelToNormal(entity.views.normal_matrix, entity.views.normal_matrix);
            Vec3.copy(entity.views.color, color);

            entities.push({
                vertexSlot: vertexBuffer.slot,
                vertexBuffer: vertexBuffer.buffer,
                indexBuffer: indexBuffer.buffer,
                indexCount: indexBuffer.count,
                indexFormat: indexBuffer.format,
                modelMatrix: entity.views.model_matrix,
                normalMatrix: entity.views.normal_matrix,
                color: entity.views.color,
                uniformBuffer: entity.buffer,
                group: bindGroup.group,
                bindGroup: bindGroup.bindGroup,
                buffer: bindGroup.buffers.entity,
            });
        }
    }

    const render = (time: number) => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setPipeline(pipeline);

        pass.setBindGroup(sceneBindgroup.group, sceneBindgroup.bindGroup);
        device.queue.writeBuffer(sceneBindgroup.buffers.scene, 0, scene.buffer);

        let drawCalls = 0;

        for (const e of entities) {
            pass.setVertexBuffer(e.vertexSlot, e.vertexBuffer);
            pass.setIndexBuffer(e.indexBuffer, e.indexFormat);

            Mat4x4.identity(e.modelMatrix);
            Mat4x4.translate(e.modelMatrix, [0, Math.sin(time * 0.01) * 0.05, 0]);
            Mat4x4.rotateY(e.modelMatrix, -time * 0.001);
            Mat4x4.modelToNormal(e.normalMatrix, e.modelMatrix);
            Vec3.copy(e.color, e.color);

            pass.setBindGroup(e.group, e.bindGroup);
            device.queue.writeBuffer(e.buffer, 0, e.uniformBuffer);

            pass.drawIndexed(e.indexCount);
            drawCalls++;
        }

        console.log(drawCalls);

        pass.end();
        device.queue.submit([encoder.finish()]);
        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
};

void run();
