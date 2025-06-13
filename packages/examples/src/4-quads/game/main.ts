import { WebgpuUtils, Wgsl, Uniform } from '@timefold/webgpu';
import { Mat4x4, Vec3, Vec2, Vec2Type, Quat, Vec3Type } from '@timefold/math';
import { ImageLoader } from '../../../../engine/src/utils';

/* eslint-disable prettier/prettier */
const quad = new Float32Array([
    -0.5,  0.5, 0.0,    0.0, 0.0, // top left
    -0.5, -0.5, 0.0,    0.0, 1.0, // bottom left
     0.5, -0.5, 0.0,    1.0, 1.0, // bottom right

    -0.5,  0.5, 0.0,    0.0, 0.0, // top left
     0.5, -0.5, 0.0,    1.0, 1.0, // bottom right
     0.5,  0.5, 0.0,    1.0, 0.0, // top right
]);
/* eslint-enable prettier/prettier */

const FrameStruct = Wgsl.struct('Frame', {
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

const EntityStruct = Wgsl.struct('Entity', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    color: Wgsl.type('vec3<f32>'),
});

const FrameUniforms = Uniform.group(0, {
    frame: Uniform.buffer(0, FrameStruct),
});

const EntityUniforms = Uniform.group(1, {
    entity: Uniform.buffer(0, EntityStruct),
    color_map_sampler: Uniform.sampler(1),
    color_map_texture: Uniform.texture(2),
});

const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
    position: { format: 'float32x3', stride: 0 },
    uv: { format: 'float32x2', stride: 3 },
});

const P = WebgpuUtils.createPipelineLayout2({
    uniformGroups: [FrameUniforms, EntityUniforms],
});

const wgsl = Uniform.getWgslFromGroups(P.uniformGroups);

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

const shaderCode = /* wgsl */ `
${wgsl}

${Vertex.wgsl}

struct VsOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@vertex fn vs(vert: Vertex) -> VsOut {
    var vsOut: VsOut;
    vsOut.position = frame.view_projection_matrix * entity.model_matrix * vec4f(vert.position, 1.0);
    vsOut.uv = vert.uv;
    return vsOut;
}

@fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
    let sample = textureSample(color_map_texture, color_map_sampler, fsIn.uv).rgb;
    return vec4f(sample * entity.color, 1.0);

    // let radius = 0.5;
    // let center = vec2f(radius, radius);
    // let dist = distance(fsIn.uv, center);
    // let feather = fwidth(dist);
    // let alpha = 1.0 - smoothstep(radius - feather, radius + feather, dist);
    // return vec4f(1.0, 0.0, 0.0, alpha);
}
`.trim();

const createEntity = (
    device: GPUDevice,
    translation: Vec2Type,
    scale: Vec2Type,
    rotation: number,
    color: Vec3Type,
    texture: ImageBitmap | undefined,
) => {
    const entityBindgroup = P.createBindGroups(device, 1, {
        entity: WebgpuUtils.createBufferDescriptor(),
        color_map_sampler: WebgpuUtils.createSampler(device),
        color_map_texture: texture
            ? WebgpuUtils.createImageBitmapTexture(device, texture)
            : WebgpuUtils.createDataTexture(device, {
                  /* eslint-disable prettier/prettier */
            data: new Uint8Array([
                255, 255, 255, 255,
                  0,   0,   0, 255,
                  0,   0,   0, 255,
                255, 255, 255, 255,
                // 255, 255, 255, 255,
                // 255, 255, 255, 255,
                // 255, 255, 255, 255,
                // 255, 255, 255, 255,
            ]),
            /* eslint-enable prettier/prettier */
                  width: 2,
                  height: 2,
              }),
    });

    const _translation = Vec3.fromVec2(translation, 0);
    const _scale = Vec3.fromVec2(scale, 1);
    const _rotation = Quat.createFromEuler(0, 0, rotation);

    const entity = EntityStruct.create();
    Mat4x4.fromRotationTranslationScale(entity.views.model_matrix, _rotation, _translation, _scale);
    Vec3.copy(entity.views.color, color);

    return {
        bindgroup: entityBindgroup,
        data: entity.buffer,
        modelMatrix: entity.views.model_matrix,
        translation: _translation,
        scale: _scale,
        rotation: _rotation,
        color: entity.views.color,
    };
};

type Entity = ReturnType<typeof createEntity>;

const run = async () => {
    const [fRed, fGreen, fBlue, fYellow] = await Promise.all([
        ImageLoader.loadImage('./f-red.png'),
        ImageLoader.loadImage('./f-green.png'),
        ImageLoader.loadImage('./f-blue.png'),
        ImageLoader.loadImage('./f-yellow.png'),
    ]);

    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });
    const pipelineLayout = P.createLayout(device);

    const frameBindgroup = P.createBindGroups(device, 0, { frame: WebgpuUtils.createBufferDescriptor() });
    const frame = FrameStruct.create();

    const cameraPos = Vec3.create(0, 0, 0.1);

    const updateCamera = () => {
        const view = Mat4x4.inverted(Mat4x4.fromTranslation(Mat4x4.create(), cameraPos));
        const proj = Mat4x4.createOrtho(
            -canvas.width / 2,
            canvas.width / 2,
            canvas.height / 2,
            -canvas.height / 2,
            0.1,
            10,
        );
        Mat4x4.multiplication(frame.views.view_projection_matrix, proj, view);
    };

    updateCamera();

    const colorTexture = device.createTexture({
        format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        size: [canvas.width, canvas.height],
        sampleCount: 4,
    });

    const renderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(colorTexture.createView())],
    };

    const module = device.createShaderModule({ code: shaderCode });

    const pipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        primitive: { topology: 'triangle-list' },
        vertex: { module: module, buffers: Vertex.layout },
        fragment: { module: module, targets: [{ format, blend: WebgpuUtils.getBlendState('transparent') }] },
        multisample: { count: 4 },
    });

    const V = Vertex.createBuffer(device, quad);

    const entities: Entity[] = [];

    // entities.push(createEntity(device, Vec2.create(0, 0), Vec2.create(100, 100), 0, Vec3.create(1, 0, 0)));
    // entities.push(createEntity(device, Vec2.create(0, -150), Vec2.create(100, 100), 0, Vec3.create(0, 1, 0)));
    // entities.push(createEntity(device, Vec2.create(0, 150), Vec2.create(100, 100), 0, Vec3.create(0, 0, 1)));
    // entities.push(createEntity(device, Vec2.create(0, -300), Vec2.create(100, 100), 0, Vec3.create(1, 1, 0)));
    entities.push(createEntity(device, Vec2.create(0, 0), Vec2.create(100, 100), 0, Vec3.create(1, 1, 1), fRed));
    entities.push(createEntity(device, Vec2.create(0, -150), Vec2.create(100, 100), 0, Vec3.create(1, 1, 1), fGreen));
    entities.push(createEntity(device, Vec2.create(0, 150), Vec2.create(100, 100), 0, Vec3.create(1, 1, 1), fBlue));
    entities.push(createEntity(device, Vec2.create(0, -300), Vec2.create(100, 100), 0, Vec3.create(1, 1, 1), fYellow));

    const keymap = {
        up: false,
        down: false,
        left: false,
        right: false,
    };

    const dir = Vec3.create(0, 0, 0);
    const speed = 10;

    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp':
                keymap.up = true;
                break;
            case 'ArrowDown':
                keymap.down = true;
                break;
            case 'ArrowLeft':
                keymap.left = true;
                break;
            case 'ArrowRight':
                keymap.right = true;
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.key) {
            case 'ArrowUp':
                keymap.up = false;
                break;
            case 'ArrowDown':
                keymap.down = false;
                break;
            case 'ArrowLeft':
                keymap.left = false;
                break;
            case 'ArrowRight':
                keymap.right = false;
                break;
        }
    });

    const update = () => {
        Vec3.set(dir, 0, 0, 0);

        if (keymap.up && !keymap.down) {
            dir[1] = 1;
        } else if (!keymap.up && keymap.down) {
            dir[1] = -1;
        }

        if (keymap.left && !keymap.right) {
            dir[0] = 1;
        } else if (!keymap.left && keymap.right) {
            dir[0] = -1;
        }

        Vec3.add(cameraPos, Vec3.scale(Vec3.normalize(dir), speed));

        updateCamera();
        for (const entity of entities) {
            Quat.rotateZ(entity.rotation, 0.05);
            Mat4x4.fromRotationTranslationScale(entity.modelMatrix, entity.rotation, entity.translation, entity.scale);
        }
    };

    const render = () => {
        renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setBindGroup(frameBindgroup.group, frameBindgroup.bindGroup);
        device.queue.writeBuffer(frameBindgroup.buffers.frame, 0, frame.buffer);

        pass.setPipeline(pipeline);
        pass.setVertexBuffer(V.slot, V.buffer);

        for (const entity of entities) {
            pass.setBindGroup(entity.bindgroup.group, entity.bindgroup.bindGroup);
            device.queue.writeBuffer(entity.bindgroup.buffers.entity, 0, entity.data);
            pass.draw(V.count);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
    };

    const tick = () => {
        update();
        render();
        window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
};

void run();
