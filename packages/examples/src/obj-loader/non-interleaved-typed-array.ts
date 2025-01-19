import { MtlLoader, ObjLoader } from '@timefold/obj';
import { CommonEntity, printObjStats, setupEntity, setupScene, updateEntity, VertexNonInterleaved } from './common';

let animationFrameHandle: number | undefined = undefined;

const mode = 'non-interleaved-typed-array';
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
        vertexCount: number;
        uvSlot: number;
        uvBuffer: GPUBuffer;
        normalSlot: number;
        normalBuffer: GPUBuffer;
    })[] = [];

    for (const objectKey of Object.keys(objects)) {
        const object = objects[objectKey];
        for (const primitiveKey of Object.keys(object.primitives)) {
            const primitive = object.primitives[primitiveKey];
            const positionsBuffer = VertexNonInterleaved.createBuffer(device, 'position', primitive.positions);
            const uvsBuffer = VertexNonInterleaved.createBuffer(device, 'uv', primitive.uvs);
            const normalsBuffer = VertexNonInterleaved.createBuffer(device, 'normal', primitive.normals);
            const color = materials[primitive.name].diffuseColor;
            const commonEntity = setupEntity(color, Layout);

            entities.push({
                ...commonEntity,
                positionSlot: positionsBuffer.slot,
                positionBuffer: positionsBuffer.buffer,
                vertexCount: positionsBuffer.count,
                uvSlot: uvsBuffer.slot,
                uvBuffer: uvsBuffer.buffer,
                normalSlot: normalsBuffer.slot,
                normalBuffer: normalsBuffer.buffer,
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
            updateEntity(e, time);
            pass.setBindGroup(e.uniform.group, e.uniform.bindGroup);
            device.queue.writeBuffer(e.uniform.buffer, 0, e.uniform.data);
            pass.draw(e.vertexCount);
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
