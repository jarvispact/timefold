import { Gltf2Parser, ParsedGltf2Primitive } from '@timefold/gltf2';
import { WebgpuUtils, Wgsl, Uniform, RenderPassDescriptor, CreateBindGroupResult } from '@timefold/webgpu';
import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';

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

const MAX_ENTITY_INDEX_COUNT = 10;
const Entities = Wgsl.array(Entity, MAX_ENTITY_INDEX_COUNT);

const SceneUniformGroup = Uniform.group(0, {
    scene: Uniform.buffer(0, Scene),
});

type SceneUniformGroup = typeof SceneUniformGroup;

const EntityUniformGroup = Uniform.group(1, {
    entities: Uniform.buffer(0, Entities),
});

type EntityUniformGroup = typeof EntityUniformGroup;

type RenderTreeBuffers = {
    position: { slot: number; buffer: GPUBuffer; count: number };
    normal: { slot: number; buffer: GPUBuffer };
    uv: { slot: number; buffer: GPUBuffer };
    index: { buffer: GPUBuffer; format: 'uint16' | 'uint32'; count: number };
};

type RenderTreePrimitive = {
    primitive: ParsedGltf2Primitive;
    buffers: RenderTreeBuffers;
    bindGroup: CreateBindGroupResult<EntityUniformGroup>;
    data: ArrayBuffer;
    instances: number;
};

type RenderTree = {
    pipelines: {
        pipeline: GPURenderPipeline;
        sceneBindGroup: CreateBindGroupResult<SceneUniformGroup>;
        primitives: RenderTreePrimitive[];
    }[];
};

const run = async () => {
    const gltfJson = await fetch('./multiple-planes-with-and-without-instances.gltf').then((res) => res.text());
    const parser = Gltf2Parser.createParser();
    const result = await parser.parse(gltfJson);
    console.log(result);

    const renderTree: RenderTree = {
        pipelines: [],
    };

    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });

    const renderPassDescriptor: RenderPassDescriptor = {
        label: 'canvas renderPass',
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
    };

    for (let mtidx = 0; mtidx < result.materialTypes.length; mtidx++) {
        const materialType = result.materialTypes[mtidx];

        for (let plidx = 0; plidx < result.primitiveLayouts.length; plidx++) {
            const primitiveLayout = result.primitiveLayouts[plidx];

            const PipelineLayout = WebgpuUtils.createPipelineLayout({
                device,
                uniformGroups: [SceneUniformGroup, EntityUniformGroup],
            });

            // Incompatible - skip
            if (!primitiveLayout.attributes.NORMAL || !primitiveLayout.attributes.TEXCOORD_0) {
                continue;
            }

            const VertexLayout = WebgpuUtils.createVertexBufferLayout('non-interleaved', {
                position: { format: primitiveLayout.attributes.POSITION },
                normal: { format: primitiveLayout.attributes.NORMAL },
                uv: { format: primitiveLayout.attributes.TEXCOORD_0 },
            });

            const code = /* wgsl */ `
${VertexLayout.wgsl}

struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) @interpolate(flat) instanceIdx: u32,
};

${Uniform.getWgslFromGroups([SceneUniformGroup, EntityUniformGroup])}

@vertex fn vs(
    @builtin(instance_index) instanceIdx : u32,
    vert: Vertex
) -> VSOutput {
    var vsOut: VSOutput;
    vsOut.position = scene.view_projection_matrix * entities[instanceIdx].model_matrix * vec4f(vert.position, 1.0);
    vsOut.normal = (entities[instanceIdx].normal_matrix * vec4f(vert.normal, 0.0)).xyz;
    vsOut.instanceIdx = instanceIdx;
    return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
    let N = normalize(vsOut.normal);
    let L = normalize(scene.sun_direction);
    let ambient = entities[vsOut.instanceIdx].color * 0.1;
    let diff = max(dot(N, L), 0.0);
    let diffuse = max(dot(N, L), 0.0) * scene.sun_color * entities[vsOut.instanceIdx].color;
    return vec4f(ambient + diffuse, 1.0);
}
            `.trim();

            console.log(code);

            const module = device.createShaderModule({ code });

            const pipeline = device.createRenderPipeline({
                layout: PipelineLayout.layout,
                primitive: {
                    cullMode: materialType.doubleSided ? 'none' : 'back',
                    topology: primitiveLayout.mode,
                },
                vertex: { module: module, buffers: VertexLayout.layout },
                fragment: { module: module, targets: [{ format }] },
            });

            const sceneBindGroup = PipelineLayout.createBindGroups(0, { scene: WebgpuUtils.createBufferDescriptor() });

            const primitives = result.primitives
                .map((primitive, pi): RenderTreePrimitive | undefined => {
                    if (!primitive.attributes.NORMAL || !primitive.attributes.TEXCOORD_0 || !primitive.indices) {
                        return undefined;
                    }

                    const position = VertexLayout.createBuffer(device, 'position', primitive.attributes.POSITION);
                    const normal = VertexLayout.createBuffer(device, 'normal', primitive.attributes.NORMAL);
                    const uv = VertexLayout.createBuffer(device, 'uv', primitive.attributes.TEXCOORD_0);
                    const index = WebgpuUtils.createIndexBuffer(device, {
                        format: primitive.indices.format,
                        data: primitive.indices.data,
                    });

                    const bindGroup = PipelineLayout.createBindGroups(1, {
                        entities: WebgpuUtils.createBufferDescriptor(),
                    });

                    const entities = Entities.create();

                    for (let i = 0; i < result.meshesForPrimitive[pi].length; i++) {
                        const idx = result.meshesForPrimitive[pi][i];
                        const mesh = result.meshes[idx];

                        Mat4x4.fromTranslation(entities.views[i].model_matrix, mesh.translation);
                        Mat4x4.modelToNormal(entities.views[i].normal_matrix, entities.views[i].normal_matrix);

                        const material =
                            primitive.material !== undefined ? result.materials[primitive.material] : undefined;

                        if (material && material.type === 'pbr-metallic-roughness') {
                            Vec3.copy(entities.views[i].color, material.baseColor);
                        } else {
                            Vec3.set(entities.views[i].color, 0.965, 0.447, 0.502);
                        }
                    }

                    return {
                        primitive,
                        buffers: {
                            position,
                            normal,
                            uv,
                            index,
                        },
                        bindGroup,
                        data: entities.buffer,
                        instances: result.meshesForPrimitive[pi].length,
                    };
                })
                .filter((item): item is RenderTreePrimitive => Boolean(item));

            renderTree.pipelines.push({
                pipeline,
                sceneBindGroup,
                primitives,
            });
        }
    }

    const scene = Scene.create();

    const view = Mat4x4.createLookAt(Vec3.create(2, 5, 8), Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0.1);
    Mat4x4.multiplication(scene.views.view_projection_matrix, proj, view);

    Vec3.normalization(scene.views.sun_direction, Vec3.create(2, 3, 4));
    Vec3.set(scene.views.sun_color, 1, 1, 1);

    const stats = {
        setPipeline: 0,
        setSceneBindgroup: 0,
        setVertexIndexBuffers: 0,
        setEntityBindgroup: 0,
        drawCalls: 0,
    };

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        for (const { pipeline, sceneBindGroup, primitives } of renderTree.pipelines) {
            pass.setPipeline(pipeline);
            stats.setPipeline++;

            pass.setBindGroup(sceneBindGroup.group, sceneBindGroup.bindGroup);
            device.queue.writeBuffer(sceneBindGroup.buffers.scene, 0, scene.buffer);
            stats.setSceneBindgroup++;

            for (const primitive of primitives) {
                pass.setVertexBuffer(primitive.buffers.position.slot, primitive.buffers.position.buffer);
                pass.setVertexBuffer(primitive.buffers.normal.slot, primitive.buffers.normal.buffer);
                pass.setVertexBuffer(primitive.buffers.uv.slot, primitive.buffers.uv.buffer);
                pass.setIndexBuffer(primitive.buffers.index.buffer, primitive.buffers.index.format);
                stats.setVertexIndexBuffers++;

                pass.setBindGroup(primitive.bindGroup.group, primitive.bindGroup.bindGroup);
                device.queue.writeBuffer(primitive.bindGroup.buffers.entities, 0, primitive.data);
                stats.setEntityBindgroup++;
                pass.drawIndexed(primitive.buffers.index.count, primitive.instances);
                stats.drawCalls++;
            }
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
        // requestAnimationFrame(render);

        console.log({ renderTree });
        console.log(stats);
    };

    requestAnimationFrame(render);
};

void run();
