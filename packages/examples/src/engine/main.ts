import { MtlLoader, ObjLoader, ObjUtils } from '@timefold/obj';
import { InterleavedPrimitive, InterleavedPrimitiveComponent } from '@timefold/engine';

const run = async () => {
    const [{ materials }, obj] = await Promise.all([
        MtlLoader.load('./multi-material-test.mtl'),
        ObjLoader.load('./multi-material-test.obj'),
    ]);

    const materialToObjPrimitives = ObjUtils.indexPrimitivesByMaterial(obj.objects);

    const materialToEnginePrimitives = Object.keys(materialToObjPrimitives).reduce<
        Record<string, InterleavedPrimitiveComponent[]>
    >((accum, key) => {
        accum[key] = materialToObjPrimitives[key].map((p) => InterleavedPrimitive.fromObjPrimitive(p, obj.info));
        return accum;
    }, {});

    console.log({ materials, materialToObjPrimitives, materialToEnginePrimitives });
};

void run();
