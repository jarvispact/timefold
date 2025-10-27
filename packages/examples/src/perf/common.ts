import { Component, defineComponentTypes } from '@timefold/ecs';
import { DomUtils } from '@timefold/engine';
import { InferWgslStructResult, Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';
import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';

/* eslint-disable prettier/prettier */
export const quadVertices = new Float32Array([
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

export const { T } = defineComponentTypes(['TransformTuple', 'TransformStruct', 'MaterialTuple', 'MaterialStruct']);

export const canvas = DomUtils.getCanvasById('canvas');

export const SceneStruct = Wgsl.struct('Scene', { view_projection_matrix: Wgsl.type('mat4x4<f32>') });

const SceneUniformGroup = Uniform.group(0, {
    scene: Uniform.uniformBuffer(0, SceneStruct),
});

const Transform = Wgsl.struct('Transform', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    position: Wgsl.type('vec3<f32>'),
});
type TransformType = InferWgslStructResult<typeof Transform>;
const Material = Wgsl.struct('Material', { color: Wgsl.type('vec3<f32>') });
type MaterialType = InferWgslStructResult<typeof Material>;
export const Entity = Wgsl.struct('Entity', { transform: Transform, material: Material });
export type EntityType = InferWgslStructResult<typeof Entity>;

type TransformTuple = Component<typeof T.TransformTuple, TransformType['views']>;
type TransformStruct = Component<typeof T.TransformStruct, TransformType['views']>;
type MaterialTuple = Component<typeof T.MaterialTuple, MaterialType['views']>;
type MaterialStruct = Component<typeof T.MaterialStruct, MaterialType['views']>;

export type WorldComponent = TransformTuple | TransformStruct | MaterialTuple | MaterialStruct;

const EntityUniformGroup = Uniform.group(1, {
    entity: Uniform.uniformBuffer(0, Entity),
});

// pipeline layout

export const PipelineLayout = WebgpuUtils.createPipelineLayout({
    bindGroupLayoutLabel: 'Entity Pipeline BGL',
    pipelineLayoutLabel: 'Entity Pipeline PL',
    uniformGroups: [SceneUniformGroup, EntityUniformGroup],
});

export const VertexInterleaved = WebgpuUtils.createVertexBufferLayout({
    label: 'Simple Quad Layout',
    mode: 'interleaved',
    definition: {
        position: { format: 'float32x3', stride: 0 },
        uv: { format: 'float32x2', stride: 3 },
    },
});

export const shaderCode = /* wgsl */ `
    ${VertexInterleaved.wgsl}
    
    struct VsOut {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
    }
    
    ${Uniform.getWgslFromGroups(PipelineLayout.uniformGroups)}
    
    @vertex fn vs(vert: Vertex) -> VsOut {
        var vsOut: VsOut;
        vsOut.position = scene.view_projection_matrix * entity.transform.model_matrix * vec4f(vert.position, 1.0);
        vsOut.uv = vert.uv;
        return vsOut;
    }
    
    @fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
        return vec4f(entity.material.color, 1.0);
    }
`.trim();

export const { buffer: sceneData, views } = SceneStruct.create();
export const view = Mat4x4.createLookAt([0, 0, 100], Vec3.zero(), Vec3.up());
export const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
Mat4x4.multiplication(views.view_projection_matrix, proj, view);

export const rp = () => Math.random() * 200 - 100;

export const ENTITY_COUNT = 5000;
