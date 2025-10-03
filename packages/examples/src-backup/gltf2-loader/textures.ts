import { Gltf2Loader, ParsedGltf2Material, ParsedGltf2Mesh, ParsedGltf2Primitive } from '@timefold/gltf2';
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

const SceneUniformGroup = Uniform.group(0, {
    scene: Uniform.buffer(0, Scene),
});

type SceneUniformGroup = typeof SceneUniformGroup;

const EntityUniformGroup = Uniform.group(1, {
    entity: Uniform.buffer(0, Entity),
    colorMap: Uniform.texture(1),
    colorSampler: Uniform.sampler(2),
});

type EntityUniformGroup = typeof EntityUniformGroup;

type RenderTreeBuffersInterleaved = {
    type: 'interleaved';
    vertices: { slot: number; buffer: GPUBuffer; count: number };
    index?: { buffer: GPUBuffer; format: 'uint16' | 'uint32'; count: number };
};

type RenderTreeBuffersNonInterleaved = {
    type: 'non-interleaved';
    buffers: {
        position: { slot: number; buffer: GPUBuffer; count: number };
        normal: { slot: number; buffer: GPUBuffer };
        uv: { slot: number; buffer: GPUBuffer };
    };
    index?: { buffer: GPUBuffer; format: 'uint16' | 'uint32'; count: number };
};

type RenderTreeBuffers = RenderTreeBuffersInterleaved | RenderTreeBuffersNonInterleaved;

type RenderTreeMesh = {
    bindGroup: CreateBindGroupResult<EntityUniformGroup>;
    data: ArrayBuffer;
    material: ParsedGltf2Material;
    mesh: ParsedGltf2Mesh;
};

type RenderTreePrimitive = RenderTreeBuffers & {
    primitive: ParsedGltf2Primitive;
    meshes: RenderTreeMesh[];
};

type RenderTree = {
    pipelines: {
        pipeline: GPURenderPipeline;
        sceneBindGroup: CreateBindGroupResult<SceneUniformGroup>;
        primitives: RenderTreePrimitive[];
    }[];
};

const run = async () => {
    const result = await Gltf2Loader.load('./single-plane-with-textures-interleaved.gltf');
    console.log(result);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const brickColorMap = result.textures.find((t) => t.name === 'bricks-color-map')!.image;

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

            // Incompatible with current shader - skip
            if (!primitiveLayout.attributes.NORMAL || !primitiveLayout.attributes.TEXCOORD_0) {
                continue;
            }

            const InterleavedLayout = WebgpuUtils.createVertexBufferLayout('interleaved', {
                position: primitiveLayout.attributes.POSITION,
                uv: primitiveLayout.attributes.TEXCOORD_0,
                normal: primitiveLayout.attributes.NORMAL,
            });

            const NonInterleavedLayout = WebgpuUtils.createVertexBufferLayout('non-interleaved', {
                position: primitiveLayout.attributes.POSITION,
                uv: primitiveLayout.attributes.TEXCOORD_0,
                normal: primitiveLayout.attributes.NORMAL,
            });

            const VertexLayout = primitiveLayout.type === 'interleaved' ? InterleavedLayout : NonInterleavedLayout;

            console.log({ VertexLayout });

            const code = /* wgsl */ `
                ${VertexLayout.wgsl}
                
                struct VSOutput {
                    @builtin(position) position: vec4f,
                    @location(0) uv: vec2f,
                    @location(1) normal: vec3f,
                };
                
                ${Uniform.getWgslFromGroups([SceneUniformGroup, EntityUniformGroup])}
                
                @vertex fn vs(
                vert: Vertex
                ) -> VSOutput {
                    var vsOut: VSOutput;
                    vsOut.position = scene.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
                    vsOut.uv = vert.uv;
                    vsOut.normal = (entity.normal_matrix * vec4f(vert.normal, 0.0)).xyz;
                    return vsOut;
                }
                
                @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
                    let N = normalize(vsOut.normal);
                    let L = normalize(scene.sun_direction);
                    let color = textureSample(colorMap, colorSampler, vsOut.uv).rgb;
                    let ambient = color * 0.1;
                    let diff = max(dot(N, L), 0.0);
                    let diffuse = max(dot(N, L), 0.0) * scene.sun_color * color;
                    return vec4f(ambient + diffuse, 1.0);
                }
            `.trim();

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
                    if (
                        primitive.type === 'non-interleaved' &&
                        (!primitive.attributes.NORMAL || !primitive.attributes.TEXCOORD_0)
                    ) {
                        return undefined;
                    }

                    const index = primitive.indices
                        ? WebgpuUtils.createIndexBuffer(device, {
                              format: primitive.indices.format,
                              data: primitive.indices.data,
                          })
                        : undefined;

                    console.log({ primitive });

                    const renderTreePrimitive =
                        primitive.type === 'interleaved'
                            ? {
                                  type: 'interleaved' as const,
                                  vertices: InterleavedLayout.createBuffer(device, primitive.vertices),
                                  index,
                              }
                            : {
                                  type: 'non-interleaved' as const,
                                  buffers: NonInterleavedLayout.createBuffers(device, {
                                      position: primitive.attributes.POSITION,
                                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                      normal: primitive.attributes.NORMAL!,
                                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                      uv: primitive.attributes.TEXCOORD_0!,
                                  }),
                                  index,
                              };

                    return {
                        primitive,
                        ...renderTreePrimitive,
                        meshes: result.meshesForPrimitive[pi].map((m) => {
                            const mesh = result.meshes[m];

                            const bindGroup = PipelineLayout.createBindGroups(1, {
                                entity: WebgpuUtils.createBufferDescriptor(),
                                colorMap: WebgpuUtils.createImageBitmapTexture(device, brickColorMap),
                                colorSampler: WebgpuUtils.createSampler(device),
                            });

                            const entity = Entity.create();
                            Mat4x4.fromTranslation(entity.views.model_matrix, mesh.translation);
                            Mat4x4.modelToNormal(entity.views.normal_matrix, entity.views.normal_matrix);

                            const material =
                                primitive.material !== undefined ? result.materials[primitive.material] : undefined;

                            if (material && material.type === 'pbr-metallic-roughness') {
                                Vec3.copy(entity.views.color, material.baseColor);
                            } else {
                                Vec3.set(entity.views.color, 0.965, 0.447, 0.502);
                            }

                            return {
                                bindGroup,
                                data: entity.buffer,
                                material: (primitive.material
                                    ? result.meshes[primitive.material]
                                    : undefined) as unknown as ParsedGltf2Material,
                                mesh: mesh,
                            };
                        }),
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

    const view = Mat4x4.createLookAt(Vec3.create(2, 3, 3), Vec3.zero(), Vec3.up());
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
                if (primitive.type === 'interleaved') {
                    pass.setVertexBuffer(primitive.vertices.slot, primitive.vertices.buffer);
                } else {
                    pass.setVertexBuffer(primitive.buffers.position.slot, primitive.buffers.position.buffer);
                    pass.setVertexBuffer(primitive.buffers.normal.slot, primitive.buffers.normal.buffer);
                    pass.setVertexBuffer(primitive.buffers.uv.slot, primitive.buffers.uv.buffer);
                }

                if (primitive.index) {
                    pass.setIndexBuffer(primitive.index.buffer, primitive.index.format);
                }

                stats.setVertexIndexBuffers++;

                for (const mesh of primitive.meshes) {
                    pass.setBindGroup(mesh.bindGroup.group, mesh.bindGroup.bindGroup);
                    device.queue.writeBuffer(mesh.bindGroup.buffers.entity, 0, mesh.data);
                    stats.setEntityBindgroup++;

                    if (primitive.index) {
                        pass.drawIndexed(primitive.index.count);
                    } else if (primitive.type === 'interleaved') {
                        pass.draw(primitive.vertices.count);
                    } else {
                        pass.draw(primitive.buffers.position.count);
                    }

                    stats.drawCalls++;
                }
            }
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
        // requestAnimationFrame(render);
        console.log(stats);
    };

    requestAnimationFrame(render);
};

void run();
