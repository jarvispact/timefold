import {
    InterleavedObjPrimitive,
    InterleavedObjPrimitiveIndexed,
    MtlLoader,
    MtlMaterial,
    ObjLoader,
    ObjParser,
} from '@timefold/obj';
import { WebgpuUtils } from '@timefold/webgpu';
import { CommonEntity, printObjStats, setupEntity, setupScene, updateEntity, VertexInterleaved } from './common';

let animationFrameHandle: number | undefined = undefined;
const mode = 'interleaved-number-array';
const Loader = ObjLoader.createLoader({ mode });

export const run = async () => {
    const [{ materials }, { objects, info }] = await Promise.all([
        MtlLoader.load('./obj-loader-demo.mtl'),
        Loader.load('./obj-loader-demo.obj'),
    ]);

    console.log({ mode, objects });
    console.log('before conversion:');
    printObjStats(objects);

    const byMaterial: Record<string, { material: MtlMaterial; primitive: InterleavedObjPrimitive<number[]> }> = {};

    // combine all vertices for the same material into a single vertices array
    for (const objKey of Object.keys(objects)) {
        const obj = objects[objKey];
        for (const primitiveKey of Object.keys(obj.primitives)) {
            const primitive = obj.primitives[primitiveKey];
            const entry = byMaterial[primitive.name];
            const material = materials[primitive.name];
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!entry) {
                byMaterial[primitive.name] = { material, primitive };
            } else {
                byMaterial[primitive.name].primitive.vertices = entry.primitive.vertices.concat(primitive.vertices);
            }
        }
    }

    // convert into a indexed primitive with TypedArrays
    const convertedByMaterial: Record<
        string,
        { material: MtlMaterial; primitive: InterleavedObjPrimitiveIndexed<Float32Array, Uint32Array> }
    > = {};

    for (const key of Object.keys(byMaterial)) {
        const entry = byMaterial[key];
        convertedByMaterial[key] = {
            material: entry.material,
            primitive: ObjParser.convertInterleavedToTypedArray(
                ObjParser.convertInterleavedToIndexed(entry.primitive, info),
            ),
        };
    }

    const stats = Object.keys(convertedByMaterial).map((materialKey) => {
        const entry = convertedByMaterial[materialKey];
        return {
            material: entry.material.name,
            vertices: entry.primitive.vertices.length,
            indices: entry.primitive.indices.length,
        };
    });

    console.log('after conversion:');
    console.log(JSON.stringify(stats, null, 2));

    const { device, context, Layout, pipeline, renderPassDescriptor, sceneBindgroup, scene } =
        await setupScene(VertexInterleaved);

    const entities: (CommonEntity & {
        vertexSlot: number;
        vertexBuffer: GPUBuffer;
        indexBuffer: GPUBuffer;
        indexCount: number;
        indexFormat: 'uint32';
    })[] = [];

    for (const { material, primitive } of Object.values(convertedByMaterial)) {
        const vertexBuffer = VertexInterleaved.createBuffer(device, primitive.vertices);

        const indexBuffer = WebgpuUtils.createIndexBuffer(device, {
            format: 'uint32',
            data: primitive.indices,
        });

        const color = materials[material.name].diffuseColor;

        const commonEntity = setupEntity(color, Layout);

        entities.push({
            ...commonEntity,
            vertexSlot: vertexBuffer.slot,
            vertexBuffer: vertexBuffer.buffer,
            indexBuffer: indexBuffer.buffer,
            indexCount: indexBuffer.count,
            indexFormat: indexBuffer.format,
        });
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
