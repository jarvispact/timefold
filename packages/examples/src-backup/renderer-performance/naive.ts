import { createSystem } from '@timefold/ecs';
import {
    InterleavedPrimitive,
    Mesh,
    MeshBundle,
    PhongMaterial,
    Transform,
    UnlitMaterial,
    UpdateCameraFromTransformPlugin,
} from '@timefold/engine';
import { Vec3 } from '@timefold/math';
import { ObjLoader } from '@timefold/obj';
import { RenderPlugin, spawnCamera, spawnLight, Update, world } from './common';

const main = async () => {
    const { info, objects } = await ObjLoader.load('./webgpu-plane.obj');

    const Startup = createSystem({
        stage: 'startup',
        fn: () => {
            spawnCamera(Vec3.create(0, 50, 250));
            spawnLight(Vec3.create(50, 50, 250));

            const gridSize = { x: 100, z: 100 };
            const padding = 1.1;
            console.log(`entity count: ${gridSize.x * gridSize.z}`);

            let i = 0;

            for (let x = 0; x <= gridSize.x; x++) {
                for (let z = 0; z <= gridSize.z; z++) {
                    const xPos = (x - gridSize.x / 2) * (1 + padding);
                    const zPos = (z - gridSize.z / 2) * (1 + padding);

                    world.spawnBundle({
                        id: `entity-${x}-${z}`,
                        bundle: MeshBundle.create({
                            transform: Transform.createFromTRS({ translation: Vec3.create(xPos, 0, zPos) }),
                            mesh: Mesh.create({
                                material:
                                    i % 2 === 0
                                        ? PhongMaterial.create({
                                              diffuseColor: i % 4 === 0 ? Vec3.create(1, 0, 0) : Vec3.create(0, 1, 0),
                                          })
                                        : UnlitMaterial.create({
                                              color: i % 4 === 0 ? Vec3.create(1, 0, 0) : Vec3.create(0, 1, 0),
                                          }),
                                primitive: InterleavedPrimitive.fromObjPrimitive(
                                    objects.Plane.primitives.default,
                                    info,
                                ),
                            }),
                        }),
                    });

                    i++;
                }
            }
        },
    });

    await world
        .registerPlugins([UpdateCameraFromTransformPlugin, RenderPlugin])
        .registerSystems([Startup, Update])
        .run();
};

void main();
