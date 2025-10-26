import { createEntitySequence, worldBuilder } from '@timefold/ecs';
import {
    createRenderPlugin,
    DomUtils,
    EngineComponent,
    InterleavedPrimitive,
    MainCameraTag,
    PerspectiveCamera,
    PhongMaterial,
    Transform,
    UnlitMaterial,
} from '@timefold/engine';
import { MtlLoader, ObjLoader } from '@timefold/obj';
import { Vec3 } from '@timefold/math';

const run = async () => {
    const { nextId } = createEntitySequence();

    const canvas = DomUtils.getCanvasById('canvas');
    const RenderPlugin = await createRenderPlugin({ canvas });

    const world = worldBuilder<EngineComponent>().withPlugin(RenderPlugin).compile();

    const [{ materials }, obj] = await Promise.all([
        MtlLoader.load('./multi-material-test.mtl'),
        ObjLoader.load('./multi-material-test.obj'),
    ]);

    const t = Transform.createAndLookAt({ translation: Vec3.create(0, 0, 5), target: Vec3.create(0, 0, 0) });
    const c = PerspectiveCamera.createFromModelMatrix({
        aspect: canvas.width / canvas.height,
        modelMatrix: t.data.modelMatrix,
    });
    const m = MainCameraTag.create();
    world.spawn(nextId(), [t, c, m]);

    for (const oKey of Object.keys(obj.objects)) {
        for (const pKey of Object.keys(obj.objects[oKey].primitives)) {
            const objPrimtive = obj.objects[oKey].primitives[pKey];
            const mtlMaterial = materials[objPrimtive.name];

            const primitive = InterleavedPrimitive.fromObjPrimitive(objPrimtive, obj.info);

            const material = ['Unlit', 'Custom'].includes(mtlMaterial.name)
                ? UnlitMaterial.create({ color: mtlMaterial.diffuseColor })
                : PhongMaterial.fromMtlMaterial(mtlMaterial);

            const transform = Transform.createFromTRS({
                translation: Vec3.create(Math.random() * 10 - 5, Math.random() * 10 - 5, 0),
            });

            world.spawn(nextId(), [primitive, material, transform]);
        }
    }

    await world.start({ loop: false });
};

void run();
