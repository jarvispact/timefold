import { Wgsl } from '@timefold/webgpu';

export const UnlitMaterialStruct = Wgsl.struct('UnlitMaterial', {
    color: Wgsl.type('vec3<f32>'),
});

export const getUnlitShaderCode = ({ vertexWgsl, uniformsWgsl }: { vertexWgsl: string; uniformsWgsl: string }) => {
    const shaderCode = /* wgsl */ `
${vertexWgsl}

struct VsOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

${uniformsWgsl}

@vertex fn vs(vert: Vertex) -> VsOut {
    var vsOut: VsOut;
    vsOut.position = camera.view_projection_matrix * transform.model_matrix * vec4f(vert.position, 1.0);
    vsOut.uv = vert.uv;
    return vsOut;
}

@fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
    // return textureSample(color_map_texture, color_map_sampler, fsIn.uv);
    return vec4f(material.color, 1.0);
}
`.trim();

    return shaderCode;
};
