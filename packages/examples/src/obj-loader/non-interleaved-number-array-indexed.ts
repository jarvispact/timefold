import { MtlLoader, ObjLoader } from '@timefold/obj';
import { WebgpuUtils } from '@timefold/webgpu';
import { CommonEntity, printObjStats, setupEntity, setupScene, updateEntity, VertexNonInterleaved } from './common';

let animationFrameHandle: number | undefined = undefined;

const mode = 'non-interleaved-number-array-indexed';
const Loader = ObjLoader.createLoader({ mode });

export const run = async () => {
    const [{ materials }, { objects }] = await Promise.all([
        MtlLoader.load('./obj-loader-demo.mtl'),
        Loader.load('./obj-loader-demo.obj'),
    ]);

    console.log({ mode, objects });
    printObjStats(objects);

    const { device, context, Layout, pipeline, renderPassDescriptor, sceneBindgroup, scene } =
        await setupScene(VertexNonInterleaved);

    const entities: (CommonEntity & {
        positionSlot: number;
        positionBuffer: GPUBuffer;
        uvSlot: number;
        uvBuffer: GPUBuffer;
        normalSlot: number;
        normalBuffer: GPUBuffer;
        indexBuffer: GPUBuffer;
        indexCount: number;
        indexFormat: 'uint32';
    })[] = [];

    for (const objectKey of Object.keys(objects)) {
        const object = objects[objectKey];
        for (const primitiveKey of Object.keys(object.primitives)) {
            const primitive = object.primitives[primitiveKey];

            const positionsBuffer = VertexNonInterleaved.createBuffer(
                device,
                'position',
                new Float32Array(primitive.positions),
            );
            const uvsBuffer = VertexNonInterleaved.createBuffer(device, 'uv', new Float32Array(primitive.uvs));

            const normalsBuffer = VertexNonInterleaved.createBuffer(
                device,
                'normal',
                new Float32Array(primitive.normals),
            );

            const index = WebgpuUtils.createIndexBuffer(device, {
                format: 'uint32',
                data: new Uint32Array(primitive.indices),
            });

            const color = materials[primitive.name].diffuseColor;
            const commonEntity = setupEntity(color, Layout);

            entities.push({
                ...commonEntity,
                positionSlot: positionsBuffer.slot,
                positionBuffer: positionsBuffer.buffer,
                uvSlot: uvsBuffer.slot,
                uvBuffer: uvsBuffer.buffer,
                normalSlot: normalsBuffer.slot,
                normalBuffer: normalsBuffer.buffer,
                indexBuffer: index.buffer,
                indexCount: index.count,
                indexFormat: 'uint32',
            });
        }
    }

    const render = (time: number) => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setBindGroup(sceneBindgroup.group, sceneBindgroup.bindGroup);
        device.queue.writeBuffer(sceneBindgroup.buffers.scene, 0, scene.buffer);

        for (const e of entities) {
            pass.setVertexBuffer(e.positionSlot, e.positionBuffer);
            pass.setVertexBuffer(e.uvSlot, e.uvBuffer);
            pass.setVertexBuffer(e.normalSlot, e.normalBuffer);
            pass.setIndexBuffer(e.indexBuffer, e.indexFormat);
            updateEntity(e, time);
            pass.setBindGroup(e.uniform.group, e.uniform.bindGroup);
            device.queue.writeBuffer(e.uniform.buffer, 0, e.uniform.data);
            pass.drawIndexed(e.indexCount);
        }

        pass.end();
        device.queue.submit([encoder.finish()]);
        animationFrameHandle = requestAnimationFrame(render);
    };

    animationFrameHandle = requestAnimationFrame(render);
};

export const destroy = () => {
    if (animationFrameHandle) cancelAnimationFrame(animationFrameHandle);
};
