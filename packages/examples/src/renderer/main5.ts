import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';
import { ObjLoader } from '@timefold/obj';
import { Uniform, WebgpuUtils, Wgsl } from '@timefold/webgpu';

const createFullScreenRenderer = ({
    context,
    device,
    format,
    texture,
}: {
    context: GPUCanvasContext;
    device: GPUDevice;
    format: GPUTextureFormat;
    texture: GPUTexture;
}) => {
    const UniformGroup = Uniform.group(0, {
        color_sampler: Uniform.sampler(0),
        color_texture: Uniform.texture(1),
    });

    const code = /* wgsl */ `
    ${Uniform.getWgslFromGroups([UniformGroup])}
    
    struct VsOut {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
    }
    
    @vertex fn vs(@builtin(vertex_index) vertexIndex : u32) -> VsOut {
        let pos = array(
            vec2f(-0.5,  0.5), // top left
            vec2f(-0.5, -0.5), // bottom left
            vec2f( 0.5, -0.5), // bottom right
    
            vec2f(-0.5,  0.5), // top left
            vec2f( 0.5, -0.5), // bottom right
            vec2f( 0.5,  0.5), // top right
        );
    
        let uv = array(
            vec2f(0.0, 0.0), // top left
            vec2f(0.0, 1.0), // bottom left
            vec2f(1.0, 1.0), // bottom right
    
            vec2f(0.0, 0.0), // top left
            vec2f(1.0, 1.0), // bottom right
            vec2f(1.0, 0.0), // top right
        );
    
        var vsOut: VsOut;
        vsOut.position = vec4f(pos[vertexIndex], 0.0, 1.0);
        vsOut.uv = uv[vertexIndex];
        return vsOut;
    }
    
    @fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
        let color = textureSample(color_texture, color_sampler, fsIn.uv);
        return vec4f(color * 0.5);
    }
    `.trim();

    const Layout = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [UniformGroup],
    });

    const module = device.createShaderModule({ code });

    const pipeline = device.createRenderPipeline({
        layout: Layout.layout,
        vertex: { module },
        fragment: { module, targets: [{ format }] },
    });

    const Uniforms = Layout.createBindGroups(0, {
        color_sampler: WebgpuUtils.createSampler(device),
        color_texture: texture,
    });

    const renderPassDescriptor = {
        colorAttachments: [
            WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView(), {
                clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
            }),
        ],
    };

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setPipeline(pipeline);
        pass.setBindGroup(Uniforms.group, Uniforms.bindGroup);
        pass.draw(6);

        pass.end();
        return encoder;
    };

    return { render };
};

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const LightStruct = Wgsl.struct('Light', {
    direction: Wgsl.type('vec3<f32>'),
    color: Wgsl.type('vec3<f32>'),
});

const CameraStruct = Wgsl.struct('Camera', {
    translation: Wgsl.type('vec3<f32>'),
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

const UnlitEntityStruct = Wgsl.struct('UnlitEntityStruct', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    color: Wgsl.type('vec3<f32>'),
});

const PhongEntityStruct = Wgsl.struct('PhongEntityStruct', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    normal_matrix: Wgsl.type('mat4x4<f32>'),
    diffuse_color: Wgsl.type('vec3<f32>'),
    specular_color: Wgsl.type('vec3<f32>'),
});

// LEARNING: Every material should define its own pipeline layout
// Handling different lighting models and entity properties is a mess
// Maybe with a different API its easier to share layouts?

// TODO: Use a record instead of array indices for Uniform.group
// Then we can define a full set of uniforms at once.
// group and binding numbers could be generated internally

const LightUniformGroup = Uniform.group(0, { light: Uniform.buffer(0, LightStruct) });
const CameraUniformGroup = Uniform.group(1, { camera: Uniform.buffer(0, CameraStruct) });

const UnlitEntityUniformGroup = Uniform.group(2, { entity: Uniform.buffer(0, UnlitEntityStruct) });
const PhongEntityUniformGroup = Uniform.group(2, { entity: Uniform.buffer(0, PhongEntityStruct) });

const getFormatForIndices = (indices: Uint16Array | Uint32Array) => {
    if (indices instanceof Uint16Array) return 'uint16';
    return 'uint32';
};

const main = async () => {
    const { info, objects } = await ObjLoader.load('./webgpu-plane.obj');
    console.log({ info, objects });

    const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
        position: { format: 'float32x3', offset: info.positionOffset },
        uv: { format: 'float32x2', offset: info.uvOffset },
        normal: { format: 'float32x3', offset: info.normalOffset },
    });

    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });

    // TODO: Split WebgpuUtils.createPipelineLayout into 2 functions
    // so that the layout can be generated without dependency to the device?

    // =======================================
    // Unlit

    const UnlitPipelineLayout = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [LightUniformGroup, CameraUniformGroup, UnlitEntityUniformGroup],
    });

    const unlitShaderCode = /* wgsl */ `
    ${Vertex.wgsl}

    ${Uniform.getWgslFromGroups([LightUniformGroup, CameraUniformGroup, UnlitEntityUniformGroup])}

    @vertex fn vs(vert: Vertex) -> @builtin(position) vec4f {
        return camera.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
    }

    @fragment fn fs() -> @location(0) vec4f {
        return vec4f(entity.color, 1.0);
    }
    `.trim();

    console.log(unlitShaderCode);

    const unlitModule = device.createShaderModule({ code: unlitShaderCode });

    const unlitPipeline = device.createRenderPipeline({
        layout: UnlitPipelineLayout.layout,
        vertex: {
            module: unlitModule,
            buffers: Vertex.layout,
        },
        fragment: {
            module: unlitModule,
            targets: [{ format }],
        },
    });

    // =======================================
    // Phong

    const PhongPipelineLayout = WebgpuUtils.createPipelineLayout({
        device,
        uniformGroups: [LightUniformGroup, CameraUniformGroup, PhongEntityUniformGroup],
    });

    const phongShaderCode = /* wgsl */ `
    struct VSOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) normal: vec3f,
    };

    ${Vertex.wgsl}

    ${Uniform.getWgslFromGroups([LightUniformGroup, CameraUniformGroup, PhongEntityUniformGroup])}

    @vertex fn vs(vert: Vertex) -> VSOutput {
        var vsOut: VSOutput;
        vsOut.position = camera.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
        vsOut.uv = vert.uv;
        vsOut.normal = (entity.normal_matrix * vec4f(vert.normal, 0.0)).xyz;
        return vsOut;
    }

    @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
        let N = normalize(vsOut.normal);
        let L = normalize(light.direction);
        let ambient = entity.diffuse_color * 0.1;
        let diff = max(dot(N, L), 0.0);
        let diffuse = diff * light.color * entity.diffuse_color;
        return vec4f(ambient + diffuse, 1.0);
    }
    `.trim();

    const phongModule = device.createShaderModule({ code: phongShaderCode });

    const phongPipeline = device.createRenderPipeline({
        layout: PhongPipelineLayout.layout,
        vertex: {
            module: phongModule,
            buffers: Vertex.layout,
        },
        fragment: {
            module: phongModule,
            targets: [{ format }],
        },
    });

    const renderTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'bgra8unorm',
        dimension: '2d',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    const renderTextureView = renderTexture.createView();

    const renderPassDescriptor = {
        colorAttachments: [
            WebgpuUtils.createColorAttachmentFromView(renderTextureView, {
                clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
            }),
        ],
    };

    const fullscreenRenderer = createFullScreenRenderer({ device, context, format, texture: renderTexture });

    const V = Vertex.createBuffer(device, objects.Plane.primitives.default.vertices);
    const I = WebgpuUtils.createIndexBuffer(device, {
        data: objects.Plane.primitives.default.indices,
        format: getFormatForIndices(objects.Plane.primitives.default.indices),
    });

    const Light = UnlitPipelineLayout.createBindGroups(0, {
        light: WebgpuUtils.createBufferDescriptor(),
    });

    const light = LightStruct.create();
    Vec3.copy(light.views.direction, Vec3.normalize([2, 3, 5]));
    Vec3.copy(light.views.color, [1, 1, 1]);

    const Camera = UnlitPipelineLayout.createBindGroups(1, {
        camera: WebgpuUtils.createBufferDescriptor(),
    });

    const camera = CameraStruct.create();
    const view = Mat4x4.createLookAt([2, 5, 10], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
    Mat4x4.multiplication(camera.views.view_projection_matrix, proj, view);

    const UnlitEntity = UnlitPipelineLayout.createBindGroups(2, {
        entity: WebgpuUtils.createBufferDescriptor(),
    });

    const unlitEntity = UnlitEntityStruct.create();
    Mat4x4.fromTranslation(unlitEntity.views.model_matrix, [-2, 0, 0]);
    Vec3.copy(unlitEntity.views.color, [1, 0, 0]);

    const PhongEntity = PhongPipelineLayout.createBindGroups(2, {
        entity: WebgpuUtils.createBufferDescriptor(),
    });

    const phongEntity = PhongEntityStruct.create();
    Mat4x4.fromTranslation(phongEntity.views.model_matrix, [2, 0, 0]);
    Mat4x4.modelToNormal(phongEntity.views.normal_matrix, phongEntity.views.model_matrix);
    Vec3.copy(phongEntity.views.diffuse_color, [1, 0, 0]);

    const render = () => {
        renderPassDescriptor.colorAttachments[0].view = renderTexture.createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setBindGroup(Light.group, Light.bindGroup);
        device.queue.writeBuffer(Light.buffers.light, 0, light.buffer);

        // Unlit
        pass.setPipeline(unlitPipeline);

        pass.setBindGroup(Camera.group, Camera.bindGroup);
        device.queue.writeBuffer(Camera.buffers.camera, 0, camera.buffer);

        pass.setVertexBuffer(0, V.buffer);
        pass.setIndexBuffer(I.buffer, I.format);

        pass.setBindGroup(UnlitEntity.group, UnlitEntity.bindGroup);
        device.queue.writeBuffer(UnlitEntity.buffers.entity, 0, unlitEntity.buffer);
        pass.drawIndexed(I.count);

        // Phong
        pass.setPipeline(phongPipeline);

        pass.setBindGroup(Camera.group, Camera.bindGroup);
        device.queue.writeBuffer(Camera.buffers.camera, 0, camera.buffer);

        pass.setVertexBuffer(0, V.buffer);
        pass.setIndexBuffer(I.buffer, I.format);

        pass.setBindGroup(PhongEntity.group, PhongEntity.bindGroup);
        device.queue.writeBuffer(PhongEntity.buffers.entity, 0, phongEntity.buffer);
        pass.drawIndexed(I.count);

        pass.end();
        const enc = fullscreenRenderer.render();
        device.queue.submit([encoder.finish(), enc.finish()]);
    };

    render();
    render();
};

void main();
