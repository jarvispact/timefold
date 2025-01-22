import { MtlLoader, ObjLoader } from '@timefold/obj';
import { CommonEntity, printObjStats, setupEntity, setupScene, updateEntity, VertexInterleaved } from './common';
import { WebgpuUtils } from '@timefold/webgpu';

let animationFrameHandle: number | undefined = undefined;
const mode = 'interleaved-typed-array-indexed';
const Loader = ObjLoader.createLoader({ mode });

export const run = async () => {
    const [{ materials }, { objects, info }] = await Promise.all([
        MtlLoader.load('./obj-loader-demo.mtl'),
        Loader.load('./obj-loader-demo.obj'),
    ]);

    console.log({ mode, objects, info });
    printObjStats(objects);

    const { device, context, Layout, pipeline, renderPassDescriptor, sceneBindgroup, scene } =
        await setupScene(VertexInterleaved);

    const entities: (CommonEntity & {
        vertexSlot: number;
        vertexBuffer: GPUBuffer;
        indexBuffer: GPUBuffer;
        indexCount: number;
        indexFormat: 'uint32';
    })[] = [];

    for (const objectKey of Object.keys(objects)) {
        const object = objects[objectKey];
        for (const primitiveKey of Object.keys(object.primitives)) {
            const primitive = object.primitives[primitiveKey];
            const vertexBuffer = VertexInterleaved.createBuffer(device, primitive.vertices);
            const index = WebgpuUtils.createIndexBuffer(device, {
                format: 'uint32',
                data: primitive.indices,
            });
            const color = materials[primitive.name].diffuseColor;
            const commonEntity = setupEntity(color, Layout);

            entities.push({
                ...commonEntity,
                vertexSlot: vertexBuffer.slot,
                vertexBuffer: vertexBuffer.buffer,
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
            pass.setVertexBuffer(e.vertexSlot, e.vertexBuffer);
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
