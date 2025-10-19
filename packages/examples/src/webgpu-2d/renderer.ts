import { Mat4x4, Mat4x4Type, MathUtils, Vec3, Vec3Type } from '@timefold/math';
import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';

type Entity = {
    data: ArrayBuffer;
    modelMatrix: Mat4x4Type;
    color: Vec3Type;
    buffer: GPUBuffer;
    bindgroup: GPUBindGroup;
};

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

/* eslint-disable prettier/prettier */
const triangle = new Float32Array([
     1.0, -1.0, 0.0,
     0.0,  1.0, 0.0,
    -1.0, -1.0, 0.0,
]);
/* eslint-enable prettier/prettier */

const SceneStruct = Wgsl.struct('Scene', { view_projection_matrix: Wgsl.type('mat4x4<f32>') });
const EntityStruct = Wgsl.struct('Entity', { model_matrix: Wgsl.type('mat4x4<f32>'), color: Wgsl.type('vec3<f32>') });
const SceneUniformGroup = Uniform.group(0, { scene: Uniform.buffer(0, SceneStruct) });
const EntityUniformGroup = Uniform.group(1, { entity: Uniform.buffer(0, EntityStruct) });
const Vertex = WebgpuUtils.createVertexBufferLayout('non-interleaved', { position: { format: 'float32x3' } });

const shaderCode = /* wgsl */ `
${Vertex.wgsl}

${Uniform.getWgslFromGroups([SceneUniformGroup, EntityUniformGroup])}

@vertex fn vs(vert: Vertex) -> @builtin(position) vec4f {
    return scene.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
}

@fragment fn fs() -> @location(0) vec4f {
    return vec4f(entity.color, 1.0);
}
`.trim();

const createEntity = (bindgroup: GPUBindGroup, buffer: GPUBuffer, position: Vec3Type, color: Vec3Type): Entity => {
    const { buffer: data, views } = EntityStruct.create();

    // const test1 = EntityStruct.create();
    // const test2 = EntityStruct.create({ mode: 'array-buffer' });
    // const test3 = EntityStruct.create({ mode: 'shared-array-buffer' });
    // const test4 = EntityStruct.create({ mode: 'array-buffer-casted-to-tuple' });
    // const test5 = EntityStruct.create({ mode: 'shared-array-buffer-casted-to-tuple' });
    // const test6 = EntityStruct.create({ mode: 'number-tuple' });

    // const EntityArray = Wgsl.array(EntityStruct, 3);
    // const test11 = EntityArray.create();
    // const test22 = EntityArray.create({ mode: 'array-buffer' });
    // const test33 = EntityArray.create({ mode: 'shared-array-buffer' });
    // const test44 = EntityArray.create({ mode: 'array-buffer-casted-to-tuple' });
    // const test55 = EntityArray.create({ mode: 'shared-array-buffer-casted-to-tuple' });
    // const test66 = EntityArray.create({ mode: 'number-tuple' });

    // const Color = Wgsl.type('vec3<f32>');
    // const test111 = Color.create();
    // const test222 = Color.create({ mode: 'array-buffer' });
    // const test333 = Color.create({ mode: 'shared-array-buffer' });
    // const test444 = Color.create({ mode: 'array-buffer-casted-to-tuple' });
    // const test555 = Color.create({ mode: 'shared-array-buffer-casted-to-tuple' });
    // const test666 = Color.create({ mode: 'number-tuple' });

    // const c1 = test1.views.color;
    // const c2 = test2.views.color;
    // const c3 = test3.views.color;
    // const c4 = test4.views.color;
    // const c5 = test5.views.color;
    // const c6 = test6.views.color;

    // const c11 = test11.views[0].color;
    // const c22 = test22.views[0].color;
    // const c33 = test33.views[0].color;
    // const c44 = test44.views[0].color;
    // const c55 = test55.views[0].color;
    // const c66 = test66.views[0].color;

    // const c111 = test111.view;
    // const c222 = test222.view;
    // const c333 = test333.view;
    // const c444 = test444.view;
    // const c555 = test555.view;
    // const c666 = test666.view;

    Mat4x4.fromTranslation(views.model_matrix, position);
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

    // pipeline layout

    const PipelineLayout = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [SceneUniformGroup, EntityUniformGroup],
    });

    const pipeline = device.createRenderPipeline({
        layout: PipelineLayout.layout,
        vertex: { module: module, buffers: Vertex.layout },
        fragment: { module: module, targets: [{ format }] },
    });

    // render pass

    const renderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
    };

    // scene

    const { buffer: sceneData, views } = SceneStruct.create();
    const view = Mat4x4.createLookAt([2, 2, 5], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
    Mat4x4.multiplication(views.view_projection_matrix, proj, view);
    const Scene = PipelineLayout.createBindGroups(0, { scene: WebgpuUtils.createBufferDescriptor() });

    // geometry

    const P = Vertex.createBuffers(device, { position: triangle });

    // entity data

    const entities: Entity[] = [];
    const E1 = PipelineLayout.createBindGroups(1, { entity: WebgpuUtils.createBufferDescriptor() });
    const E2 = PipelineLayout.createBindGroups(1, { entity: WebgpuUtils.createBufferDescriptor() });

    entities.push(
        createEntity(E1.bindGroup, E1.buffers.entity, [-2, 0, 0], [1, 0, 0]),
        createEntity(E2.bindGroup, E2.buffers.entity, [2, 0, 0], [0, 1, 0]),
    );

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setVertexBuffer(P.attribs.position.slot, P.attribs.position.buffer);

        pass.setBindGroup(0, Scene.bindGroup);
        device.queue.writeBuffer(Scene.buffers.scene, 0, sceneData);

        for (const entity of entities) {
            pass.setBindGroup(1, entity.bindgroup);
            device.queue.writeBuffer(entity.buffer, 0, entity.data);
            pass.draw(P.attribs.position.count);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
    };

    render();
};

void run();
