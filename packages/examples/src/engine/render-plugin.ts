import { Plugin, System } from '@timefold/ecs';
import { Wgsl, WebgpuUtils, Uniform } from '@timefold/webgpu';
import { Vec3, Mat4x4 } from '@timefold/math';
import { world, World } from './world';
import { cubeVertices, stride } from './cube';

type FixedRenderPassDescriptor = Omit<GPURenderPassDescriptor, 'colorAttachments'> & {
    colorAttachments: GPURenderPassColorAttachment[];
};

const Camera = Wgsl.struct('Camera', {
    position: Wgsl.type('vec3<f32>'),
    view_matrix: Wgsl.type('mat4x4<f32>'),
    projection_matrix: Wgsl.type('mat4x4<f32>'),
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

const DirLight = Wgsl.struct('DirLight', {
    direction: Wgsl.type('vec3<f32>'),
    color: Wgsl.type('vec3<f32>'),
    intensity: Wgsl.type('f32'),
});

const MAX_DIR_LIGHTS = 3;

const Scene = Wgsl.struct('Scene', {
    camera: Camera,
    light: Wgsl.array(DirLight, MAX_DIR_LIGHTS),
});

const Transform = Wgsl.struct('Transform', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    normal_matrix: Wgsl.type('mat4x4<f32>'),
});

const Material = Wgsl.struct('Material', {
    diffuse_color: Wgsl.type('vec3<f32>'),
    specular_color: Wgsl.type('vec3<f32>'),
    opacity: Wgsl.type('f32'),
});

const Entity = Wgsl.struct('Entity', {
    transform: Transform,
    material: Material,
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

const shaderCode = /* wgsl */ `
struct Vertex {
  @location(0) position: vec3f,
  @location(1) uv: vec2f,
  @location(2) normal: vec3f,
}
 
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) world_pos: vec3f,
};

${Uniform.getWgslFromGroups([SceneUniformGroup, EntityUniformGroup])}

@vertex fn vs(
  vert: Vertex
) -> VSOutput {
    var vsOut: VSOutput;
    let world_pos = entity.transform.model_matrix * vec4f(vert.position, 1.0);
    vsOut.position = scene.camera.view_projection_matrix * world_pos;
    vsOut.uv = vert.uv;
    vsOut.normal = (entity.transform.normal_matrix * vec4f(vert.normal, 0.0)).xyz;
    vsOut.world_pos = world_pos.xyz;
    return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
    let N = normalize(vsOut.normal);

    var diffuse_color = entity.material.diffuse_color;

    let ambientFactor = 0.1;
    let ambient = diffuse_color * ambientFactor;

    var lighting = vec3f(0.0, 0.0, 0.0);

    for (var i = 0; i < ${MAX_DIR_LIGHTS}; i++) {
        let L = normalize(scene.light[i].direction);

        let diff = max(dot(N, L), 0.0);
        let diffuse = diff * scene.light[i].color * scene.light[i].intensity * diffuse_color;
    
        let view_dir = normalize(scene.camera.position - vsOut.world_pos);
        let halfway_dir = normalize(L + view_dir);
        let spec = pow(max(dot(N, halfway_dir), 0.0), 512.0);
        let specular = spec * scene.light[i].color * scene.light[i].intensity * entity.material.specular_color;

        lighting += (diffuse + specular);
    }

    return vec4f(ambient + lighting, entity.material.opacity);
}
`.trim();

console.log(shaderCode);

export const createRenderPlugin = async (canvas: HTMLCanvasElement) => {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('Webgpu not available');
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    if (!context) {
        throw new Error('Webgpu not available');
    }

    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
        device,
        format,
    });

    const module = device.createShaderModule({
        code: shaderCode,
    });

    const { layout, createBindGroups } = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [SceneUniformGroup, EntityUniformGroup],
    });

    const scene = createBindGroups(0, {
        scene: WebgpuUtils.createBufferDescriptor(),
    });

    const vertexBufferLayout: GPUVertexBufferLayout[] = [
        {
            arrayStride: stride * Float32Array.BYTES_PER_ELEMENT, // 6 floats
            attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x3' }, // Position
                { shaderLocation: 1, offset: 6 * Float32Array.BYTES_PER_ELEMENT, format: 'float32x2' }, // Uv
                { shaderLocation: 2, offset: 3 * Float32Array.BYTES_PER_ELEMENT, format: 'float32x3' }, // Normal
            ],
        },
    ];

    const vertexBuffer = device.createBuffer({
        label: 'vertex buffer vertices',
        size: cubeVertices.buffer.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const vertexCount = cubeVertices.length / stride;
    device.queue.writeBuffer(vertexBuffer, 0, cubeVertices.buffer);

    const renderPassDescriptor: FixedRenderPassDescriptor = {
        label: 'canvas renderPass',
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                clearValue: [0.3, 0.3, 0.3, 1],
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
    };

    const pipeline = device.createRenderPipeline({
        label: 'pipeline',
        layout,
        primitive: { cullMode: 'back' },
        vertex: { module: module, buffers: vertexBufferLayout },
        fragment: { module: module, targets: [{ format }] },
    });

    const cameraQuery = world.createQuery(
        {
            tuple: [{ has: '@timefold/Transform' }, { has: '@timefold/PerspectiveCamera' }],
        },
        {
            map: ([transform, camera]) => ({
                position: transform.data.translation,
                modelMatrix: transform.data.modelMatrix,
                view: camera.data.viewMatrix,
                projection: camera.data.projectionMatrix,
                viewProjection: camera.data.viewProjectionMatrix,
            }),
        },
    );

    const lightQuery = world.createQuery(
        {
            tuple: [{ has: '@timefold/DirLight' }],
        },
        {
            map: ([dirlight]) => dirlight.data,
        },
    );

    const query = world.createQuery(
        { tuple: [{ has: '@timefold/Transform' }, { has: '@timefold/PhongMaterial' }] },
        {
            map: ([transform, material]) => {
                const { bindGroup, buffers } = createBindGroups(1, {
                    entity: WebgpuUtils.createBufferDescriptor(),
                });

                return {
                    bindGroup,
                    buffer: buffers.entity,
                    data: createResult.buffer,
                    modelMatrix: transform.data.modelMatrix,
                    normalMatrix: transform.data.normalMatrix,
                    diffuseColor: material.data.diffuseColor,
                    specularColor: material.data.specularColor,
                };
            },
        },
    );

    const sceneCreateResult = Scene.create();
    const webgpuCameraPos = sceneCreateResult.views.camera.position;
    const webgpuCameraView = sceneCreateResult.views.camera.view_matrix;
    const webgpuCameraProj = sceneCreateResult.views.camera.projection_matrix;
    const webgpuCameraViewProj = sceneCreateResult.views.camera.view_projection_matrix;

    const webgpuLights = sceneCreateResult.views.light;

    const createResult = Entity.create();
    const webgpuModelMatrix = createResult.views.transform.model_matrix;
    const webgpuNormalMatrix = createResult.views.transform.normal_matrix;
    const webgpuDiffuse = createResult.views.material.diffuse_color;
    const webgpuSpecular = createResult.views.material.specular_color;

    const render = () => {
        const camera = cameraQuery[0];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!camera) {
            return;
        }

        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, vertexBuffer);

        Vec3.copy(webgpuCameraPos, camera.position);
        Mat4x4.copy(webgpuCameraView, camera.view);
        Mat4x4.copy(webgpuCameraProj, camera.projection);
        Mat4x4.copy(webgpuCameraViewProj, camera.viewProjection);

        for (let li = 0; li < webgpuLights.length; li++) {
            const webgpuLight = webgpuLights[li];
            const light = lightQuery[li];
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!light) continue;
            Vec3.copy(webgpuLight.direction, light.direction);
            Vec3.copy(webgpuLight.color, light.color);
            webgpuLight.intensity[0] = light.intensity;
        }

        pass.setBindGroup(0, scene.bindGroup);
        device.queue.writeBuffer(scene.buffers.scene, 0, sceneCreateResult.buffer);

        for (const item of query) {
            Mat4x4.copy(webgpuModelMatrix, item.modelMatrix);
            Mat4x4.copy(webgpuNormalMatrix, item.normalMatrix);
            Vec3.copy(webgpuDiffuse, item.diffuseColor);
            Vec3.copy(webgpuSpecular, item.specularColor);
            pass.setBindGroup(1, item.bindGroup);
            device.queue.writeBuffer(item.buffer, 0, item.data);
            pass.draw(vertexCount);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
    };

    const RenderSystem = System.create({ stage: 'render', fn: render });

    return Plugin.create<World>({
        fn: (world) => {
            world.registerSystems(RenderSystem);
        },
    });
};
