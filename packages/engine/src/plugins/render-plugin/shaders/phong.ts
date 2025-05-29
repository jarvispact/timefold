import { MAX_DIR_LIGHTS } from '../../../structs';

export const getPhongShaderCode = (uniformsWgsl: string, vertexWgsl: string) => {
    const code = /* wgsl */ `
${vertexWgsl}

struct VsOut {
    @builtin(position) position: vec4f,
    @location(0) world_position: vec3f,
    @location(1) uv: vec2f,
    @location(2) normal: vec3f,
}

${uniformsWgsl}

const RECIPROCAL_PI = 0.3183098861837907;
const GAMMA = 2.2;
const RECIPROCAL_GAMMA = 0.454545;

@vertex fn vs(vert: Vertex) -> VsOut {
    var vsOut: VsOut;
    vsOut.position = camera.view_projection_matrix * transform.model_matrix * vec4f(vert.position, 1.0);
    vsOut.world_position = (transform.model_matrix * vec4f(vert.position, 1.0)).xyz;
    vsOut.uv = vert.uv;
    vsOut.normal = (transform.normal_matrix * vec4f(vert.normal, 0.0)).xyz;
    return vsOut;
}

fn brdf_lambert(diffuse_color: vec3f) -> vec3f {
    return RECIPROCAL_PI * diffuse_color;
}

fn gamma_to_linear_space(color: vec3f) -> vec3f {
    return pow(color, vec3(GAMMA));
}

fn linear_to_gamma_space(color: vec3f) -> vec3f {
    return pow(color, vec3(RECIPROCAL_GAMMA));
}

fn calc_light(
    light_dir: vec3f,
    light_color: vec3f,
    light_intensity: f32,
    normal: vec3f,
    view_dir: vec3f,
    diffuse_color: vec3f,
    specular_color: vec3f,
    specular_shininess: f32
) -> vec3f {
    let half_dir = normalize(light_dir + view_dir);

    // diffuse
    let irradiance = saturate(dot(normal, light_dir)) * light_color * light_intensity;
    let diffuse = irradiance * diffuse_color;

    // specular
    let spec = pow(saturate(dot(normal, half_dir)), specular_shininess);
    let specular = irradiance * spec * specular_color;

    return diffuse + specular;
}

fn calc_dir_light(
    light: DirLight,
    normal: vec3f,
    view_dir: vec3f,
    diffuse_color: vec3f,
    specular_color: vec3f,
    specular_shininess: f32
) -> vec3f {
    let L = normalize(-light.direction);
    return calc_light(L, light.color, light.intensity, normal, view_dir, diffuse_color, specular_color, specular_shininess);
}

@fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
    let N = normalize(fsIn.normal);
    let V = normalize(camera.position - fsIn.world_position);
    let diffuse_color = brdf_lambert(material.diffuse_color);
    let specular_color = material.specular_color;
    
    // ambient
    var result = diffuse_color * 0.005;

    for (var i = 0u; i < ${MAX_DIR_LIGHTS}u; i++) {
        let light = dir_lights[i];
        if (light.intensity == 0.0) { continue; }
        result += calc_dir_light(light, N, V, diffuse_color, specular_color, material.shininess);
    }

    return vec4f(linear_to_gamma_space(result), material.opacity);
}
    `.trim();

    return code;
};
