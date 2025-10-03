import { Wgsl, Uniform, WebgpuUtils } from '@timefold/webgpu';
import { Mat4x4, Quat, Vec2, Vec3 } from '@timefold/math';

const dpr = window.devicePixelRatio || 1;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;

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

const instanceCount = 1_000_000;

const quadSize = 2; // Size of each quad in pixels

const FrameStruct = Wgsl.struct('Frame', {
    view_projection_matrix: Wgsl.type('mat4x4<f32>'),
});

const EntityStruct = Wgsl.struct('Entity', {
    model_matrix: Wgsl.type('mat4x4<f32>'),
    color: Wgsl.type('vec3<f32>'),
});

const Entities = Wgsl.array(EntityStruct, instanceCount);

const FrameUniforms = Uniform.group(0, {
    frame: Uniform.buffer(0, FrameStruct),
});

const EntityUniforms = Uniform.group(1, {
    entities: Uniform.buffer(0, Entities, {
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'read-only-storage' },
    }),
});

const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
    position: { format: 'float32x3', stride: 0 },
    uv: { format: 'float32x2', stride: 3 },
});

const P = WebgpuUtils.createPipelineLayout2({
    uniformGroups: [FrameUniforms, EntityUniforms],
});

const wgsl = Uniform.getWgslFromGroups(P.uniformGroups);

const shaderCode = /* wgsl */ `
${wgsl}

${Vertex.wgsl}

struct VsOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) color: vec3f,
}

@vertex fn vs(@builtin(instance_index) instanceIdx : u32, vert: Vertex) -> VsOut {
    var vsOut: VsOut;
    vsOut.position = frame.view_projection_matrix * entities[instanceIdx].model_matrix * vec4f(vert.position, 1.0);
    vsOut.uv = vert.uv;
    vsOut.color = entities[instanceIdx].color;
    return vsOut;
}

@fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
    return vec4f(fsIn.color, 1.0);
}
`.trim();

console.log(shaderCode);

const main = async () => {
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
        fragment: { module: module, targets: [{ format, blend: WebgpuUtils.getBlendState('opaque') }] },
        multisample: { count: 4 },
    });

    const V = Vertex.createBuffer(device, quad);

    const entitiesBindgroup = P.createBindGroups(device, 1, {
        entities: WebgpuUtils.createBufferDescriptor({ usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }),
    });

    const entities = Entities.create();

    // Add velocity array for each entity
    const velocities: [number, number][] = Array.from({ length: instanceCount }, () => [
        (Math.random() - 0.5) * 2, // vx
        (Math.random() - 0.5) * 2, // vy
    ]);

    const useStagingBuffer = true as boolean;
    const stagingBuffers: GPUBuffer[] = [];
    let stagingBuffer: GPUBuffer | undefined;

    function fillCenteredGrid(indexCount: number, quadSize: number, padding = 1.1) {
        const gridSize = Math.ceil(Math.sqrt(indexCount));
        const halfGrid = (gridSize - 1) / 2;
        let i = 0;

        for (let y = 0; y < gridSize && i < indexCount; y++) {
            for (let x = 0; x < gridSize && i < indexCount; x++) {
                const xPos = (x - halfGrid) * quadSize * padding;
                const yPos = (y - halfGrid) * quadSize * padding;

                // TODO: create type parameter to indicate if a tuple should be used or not, to avoid
                // Type instantiation is excessively deep and possibly infinite

                const _translation = Vec3.fromVec2(Vec2.create(xPos, yPos), 0);
                const _scale = Vec3.fromVec2(Vec2.create(quadSize, quadSize), 1);
                const _rotation = Quat.createFromEuler(0, 0, 0);
                Mat4x4.fromRotationTranslationScale(entities.views[i].model_matrix, _rotation, _translation, _scale);
                Vec3.set(entities.views[i].color, Math.random(), Math.random(), Math.random());
                i++;
            }
        }
    }

    fillCenteredGrid(instanceCount, quadSize);

    // Helper to get quad bounds (half size)
    const halfQuad = quadSize / 2;

    // Screen bounds
    const minX = -canvas.width / 2 + halfQuad;
    const maxX = canvas.width / 2 - halfQuad;
    const minY = -canvas.height / 2 + halfQuad;
    const maxY = canvas.height / 2 - halfQuad;

    const update = () => {
        const r = Math.random();
        const g = Math.random();
        const b = Math.random();

        for (let i = 0; i < entities.views.length; i++) {
            const view = entities.views[i];

            Vec3.set(view.color, r, g, b);

            // Move entity
            let x = view.model_matrix[12];
            let y = view.model_matrix[13];
            let [vx, vy] = velocities[i];
            x += vx;
            y += vy;
            // Bounce if out of bounds
            if (x < minX) {
                x = minX;
                vx = -vx;
            }
            if (x > maxX) {
                x = maxX;
                vx = -vx;
            }
            if (y < minY) {
                y = minY;
                vy = -vy;
            }
            if (y > maxY) {
                y = maxY;
                vy = -vy;
            }
            velocities[i][0] = vx;
            velocities[i][1] = vy;
            // Update model matrix translation
            const _translation = Vec3.fromVec2(Vec2.create(x, y), 0);
            const _scale = Vec3.fromVec2(Vec2.create(quadSize, quadSize), 1);
            const _rotation = Quat.createFromEuler(0, 0, 0);
            Mat4x4.fromRotationTranslationScale(view.model_matrix, _rotation, _translation, _scale);
        }
    };

    const render = () => {
        renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();

        if (useStagingBuffer) {
            if (stagingBuffers.length) {
                stagingBuffer = stagingBuffers.pop();
            } else {
                stagingBuffer = device.createBuffer({
                    size: Entities.bufferSize,
                    usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
                    mappedAtCreation: true,
                });

                const target = new Uint8Array(stagingBuffer.getMappedRange());
                target.set(new Uint8Array(entities.buffer));
            }

            stagingBuffer.unmap();

            encoder.copyBufferToBuffer(
                stagingBuffer as GPUBuffer,
                0,
                entitiesBindgroup.buffers.entities,
                0,
                Entities.bufferSize,
            );
        } else {
            device.queue.writeBuffer(entitiesBindgroup.buffers.entities, 0, entities.buffer);
        }

        const pass = encoder.beginRenderPass(renderPassDescriptor);

        pass.setBindGroup(frameBindgroup.group, frameBindgroup.bindGroup);
        device.queue.writeBuffer(frameBindgroup.buffers.frame, 0, frame.buffer);

        pass.setPipeline(pipeline);
        pass.setVertexBuffer(V.slot, V.buffer);

        pass.setBindGroup(entitiesBindgroup.group, entitiesBindgroup.bindGroup);

        pass.draw(V.count, instanceCount);

        pass.end();
        device.queue.submit([encoder.finish()]);

        if (useStagingBuffer && stagingBuffer) {
            const currentBuffer = stagingBuffer;
            stagingBuffer = undefined; // Clear the reference to avoid reuse before mapping completes
            currentBuffer.mapAsync(GPUMapMode.WRITE).then(() => {
                stagingBuffers.push(currentBuffer);
            });
        }
    };

    let fps = 0;
    let oneSecond = performance.now() + 1000;

    const tick = () => {
        fps++;

        if (performance.now() >= oneSecond) {
            console.log(`FPS: ${fps}`);
            oneSecond = performance.now() + 1000;
            fps = 0;
        }

        // update();
        render();
        requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
};

void main();