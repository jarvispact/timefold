import { MtlLoader, ObjLoader } from '@timefold/obj';
import { WebgpuUtils } from '@timefold/webgpu';
import { CommonEntity, printObjStats, setupEntity, setupScene, updateEntity, VertexNonInterleaved } from './common';

let animationFrameHandle: number | undefined = undefined;
const mode = 'non-interleaved-typed-array-indexed';
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
            const P = VertexNonInterleaved.createBuffer(device, 'position', primitive.positions);
            const U = VertexNonInterleaved.createBuffer(device, 'uv', primitive.uvs);
            const N = VertexNonInterleaved.createBuffer(device, 'normal', primitive.normals);
            const I = WebgpuUtils.createIndexBuffer(device, {
                format: 'uint32',
                data: primitive.indices,
            });

            const color = materials[primitive.name].diffuseColor;
            const commonEntity = setupEntity(color, Layout);

            entities.push({
                ...commonEntity,
                positionSlot: P.slot,
                positionBuffer: P.buffer,
                uvSlot: U.slot,
                uvBuffer: U.buffer,
                normalSlot: N.slot,
                normalBuffer: N.buffer,
                indexBuffer: I.buffer,
                indexCount: I.count,
                indexFormat: I.format,
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
