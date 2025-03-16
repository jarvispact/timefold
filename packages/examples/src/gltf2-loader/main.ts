import { CreateIndexBufferResult, RenderPassDescriptor, Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { Vec3, Mat4x4, MathUtils, Mat4x4Type, Vec3Type } from '@timefold/math';
import { Gltf2Parser } from '@timefold/gltf2';

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
    scene: Uniform.buffer(0, Scene),
});

const EntityUniformGroup = Uniform.group(1, {
    entity: Uniform.buffer(0, Entity),
});

const Vertex = WebgpuUtils.createVertexBufferLayout('non-interleaved', {
    position: { format: 'float32x3' },
    normal: { format: 'float32x3' },
    uv: { format: 'float32x2' },
});

const shaderCode = /* wgsl */ `
${Vertex.wgsl}
 
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
};

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
    const gltfJson = await fetch('./multiple-planes-with-and-without-instances.gltf').then((res) => res.text());
    const parser = Gltf2Parser.createParser();
    const result = await parser.parse(gltfJson);
    console.log({ result });

    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const module = device.createShaderModule({ code: shaderCode });

    const Pipeline = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [SceneUniformGroup, EntityUniformGroup],
    });

    const sceneBindgroup = Pipeline.createBindGroups(0, { scene: WebgpuUtils.createBufferDescriptor() });

    type Entity = {
        group: number;
        bindGgroup: GPUBindGroup;
        buffer: GPUBuffer;
        data: ArrayBuffer;
        modelMatrix: Mat4x4Type;
        normalMatrix: Mat4x4Type;
        color: Vec3Type;
        position: { slot: number; buffer: GPUBuffer };
        normal: { slot: number; buffer: GPUBuffer };
        uv: { slot: number; buffer: GPUBuffer };
        index: CreateIndexBufferResult;
    };

    const entities: Entity[] = [];

    // for each materialType in materialTypes
    //      for each primitiveLayout in primitiveLayouts
    //          pass.setPipeline(pipeline)
    //          pass.setBindGroup(scene)
    //          for each primitive in primitivesForLayout
    //              pass.setVertexBuffer(primitive)
    //              pass.setIndexBuffer(primitive)
    //              pass.drawInstances(primitive.meshInstances)
    //              for each mesh in primitive.meshes
    //                  pass.setBindGroup(entity)
    //                  pass.drawIndexed(count)

    for (const mesh of result.meshes) {
        for (const meshPrimitive of mesh.primitives) {
            const material = meshPrimitive.material ? result.materials[meshPrimitive.material] : undefined;
            const entityBindgroup = Pipeline.createBindGroups(1, { entity: WebgpuUtils.createBufferDescriptor() });
            const entity = Entity.create();

            Mat4x4.fromTranslation(entity.views.model_matrix, mesh.translation);
            Mat4x4.modelToNormal(entity.views.normal_matrix, entity.views.normal_matrix);
            if (material && material.type === 'pbr-metallic-roughness-opaque-ds') {
                Vec3.copy(entity.views.color, material.baseColor);
            } else {
                Vec3.set(entity.views.color, 0.965, 0.447, 0.502);
            }

            const primitive = result.primitives[meshPrimitive.primitive];
            if (!primitive.attributes.NORMAL) continue;
            if (!primitive.attributes.TEXCOORD_0) continue;
            if (!primitive.indices) continue;
            const P = Vertex.createBuffer(device, 'position', primitive.attributes.POSITION);
            const N = Vertex.createBuffer(device, 'normal', primitive.attributes.NORMAL);
            const U = Vertex.createBuffer(device, 'uv', primitive.attributes.TEXCOORD_0);

            // TODO: mapping for index format
            const I = WebgpuUtils.createIndexBuffer(device, {
                format: 'uint16',
                data: primitive.indices.data as Uint16Array,
            });

            entities.push({
                group: entityBindgroup.group,
                bindGgroup: entityBindgroup.bindGroup,
                buffer: entityBindgroup.buffers.entity,
                data: entity.buffer,
                modelMatrix: entity.views.model_matrix,
                normalMatrix: entity.views.normal_matrix,
                color: entity.views.color,
                position: P,
                normal: N,
                uv: U,
                index: I,
            });
        }
    }

    const renderPassDescriptor: RenderPassDescriptor = {
        label: 'canvas renderPass',
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
    };

    const pipeline = device.createRenderPipeline({
        layout: Pipeline.layout,
        primitive: { cullMode: 'back', topology: 'triangle-list' },
        vertex: { module: module, buffers: Vertex.layout },
        fragment: { module: module, targets: [{ format }] },
    });

    const scene = Scene.create();

    const view = Mat4x4.createLookAt(Vec3.create(2, 5, 8), Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0.1);
    Mat4x4.multiplication(scene.views.view_projection_matrix, proj, view);

    Vec3.normalization(scene.views.sun_direction, Vec3.create(2, 3, 4));
    Vec3.set(scene.views.sun_color, 1, 1, 1);

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setPipeline(pipeline);
        pass.setBindGroup(sceneBindgroup.group, sceneBindgroup.bindGroup);
        device.queue.writeBuffer(sceneBindgroup.buffers.scene, 0, scene.buffer);

        for (const entity of entities) {
            pass.setVertexBuffer(entity.position.slot, entity.position.buffer);
            pass.setVertexBuffer(entity.normal.slot, entity.normal.buffer);
            pass.setVertexBuffer(entity.uv.slot, entity.uv.buffer);
            pass.setIndexBuffer(entity.index.buffer, entity.index.format);

            pass.setBindGroup(entity.group, entity.bindGgroup);
            device.queue.writeBuffer(entity.buffer, 0, entity.data);
            pass.drawIndexed(entity.index.count);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
        requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
};

void run();
