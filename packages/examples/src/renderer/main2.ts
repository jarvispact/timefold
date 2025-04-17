import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';
import { createRenderer } from './renderer2';
import { ObjLoader } from '@timefold/obj';
import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const EntityStruct = Wgsl.struct('Entity', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    color: Wgsl.type('vec3<f32>'),
});

const main = async () => {
    const interleavedTypedArrayLoader = ObjLoader.createLoader({ mode: 'interleaved-typed-array' });
    const interleavedTypedArrayIndexedLoader = ObjLoader.createLoader({ mode: 'interleaved-typed-array-indexed' });
    const nonInterleavedTypedArrayLoader = ObjLoader.createLoader({ mode: 'non-interleaved-typed-array' });
    const nonInterleavedTypedArrayIndexedLoader = ObjLoader.createLoader({
        mode: 'non-interleaved-typed-array-indexed',
    });

    const objResults = await Promise.all([
        interleavedTypedArrayLoader.load('./webgpu-plane-pos-only.obj'),
        interleavedTypedArrayIndexedLoader.load('./webgpu-plane-pos-only.obj'),
        nonInterleavedTypedArrayLoader.load('./webgpu-plane-pos-only.obj'),
        nonInterleavedTypedArrayIndexedLoader.load('./webgpu-plane-pos-only.obj'),
    ]);

    const renderer = await createRenderer({
        canvas,
        materials: {
            unlit: ({ device }) => {
                const SceneStruct = Wgsl.struct('Scene', { view_projection_matrix: Wgsl.type('mat4x4<f32>') });
                const SceneUniformGroup = Uniform.group(0, { scene: Uniform.buffer(0, SceneStruct) });
                const EntityUniformGroup = Uniform.group(1, { entity: Uniform.buffer(0, EntityStruct) });
                const Vertex = WebgpuUtils.createVertexBufferLayout('non-interleaved', {
                    position: { format: 'float32x3' },
                });

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

                const module = device.createShaderModule({ code: shaderCode });

                const PipelineLayout = WebgpuUtils.createPipelineLayout({
                    device,
                    uniformGroups: [SceneUniformGroup, EntityUniformGroup],
                });

                const Scene = PipelineLayout.createBindGroups(0, {
                    scene: WebgpuUtils.createBufferDescriptor(),
                });

                const sceneData = SceneStruct.create();

                const view = Mat4x4.createLookAt([0, 5, 10], Vec3.zero(), Vec3.up());
                const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
                Mat4x4.multiplication(sceneData.views.view_projection_matrix, proj, view);

                return {
                    module,
                    layout: PipelineLayout.layout,
                    bufferLayout: Vertex.layout,
                    sceneBindgroup: Scene.bindGroup,
                    sceneBuffer: Scene.buffers.scene,
                    sceneUniforms: sceneData.buffer,
                    createEntityBindGroupAndBuffer: () => {
                        const Entity = PipelineLayout.createBindGroups(1, {
                            entity: WebgpuUtils.createBufferDescriptor(),
                        });

                        return {
                            bindgroup: Entity.bindGroup,
                            buffer: Entity.buffers.entity,
                        };
                    },
                };
            },
        },
        primitives: {},
    });

    renderer.registerPrimitive('unlit', 'test0', {
        type: 'interleaved',
        vertices: objResults[0].objects.Plane.primitives.default.vertices,
    });

    renderer.registerPrimitive('unlit', 'test1', {
        type: 'interleaved',
        vertices: objResults[1].objects.Plane.primitives.default.vertices,
        indices: objResults[1].objects.Plane.primitives.default.indices,
    });

    renderer.registerPrimitive('unlit', 'test2', {
        type: 'non-interleaved',
        position: objResults[2].objects.Plane.primitives.default.positions,
        attributes: {},
    });

    renderer.registerPrimitive('unlit', 'test3', {
        type: 'non-interleaved',
        position: objResults[3].objects.Plane.primitives.default.positions,
        indices: objResults[3].objects.Plane.primitives.default.indices,
        attributes: {},
    });

    const entity0 = EntityStruct.create();
    const entity1 = EntityStruct.create();
    const entity2 = EntityStruct.create();
    const entity3 = EntityStruct.create();

    Mat4x4.fromTranslation(entity0.views.model_matrix, [-1, 0, -1]);
    Vec3.copy(entity0.views.color, [1, 0, 0]);

    Mat4x4.fromTranslation(entity1.views.model_matrix, [1, 0, -1]);
    Vec3.copy(entity1.views.color, [0, 1, 0]);

    Mat4x4.fromTranslation(entity2.views.model_matrix, [-1, 0, 1]);
    Vec3.copy(entity2.views.color, [0, 0, 1]);

    Mat4x4.fromTranslation(entity3.views.model_matrix, [1, 0, 1]);
    Vec3.copy(entity3.views.color, [1, 1, 0]);

    renderer.addEntity('unlit', 'test0', entity0.buffer);
    renderer.addEntity('unlit', 'test1', entity1.buffer);
    renderer.addEntity('unlit', 'test2', entity2.buffer);
    renderer.addEntity('unlit', 'test3', entity3.buffer);

    const tick = () => {
        renderer.render();
        requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
};

void main();
