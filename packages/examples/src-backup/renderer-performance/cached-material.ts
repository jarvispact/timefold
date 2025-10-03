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
            spawnCamera(Vec3.create(0, 30, 80));
            spawnLight(Vec3.create(0, 30, -80));

            const gridSize = { x: 40, z: 40 };
            const padding = 1.1;
            console.log(`entity count: ${gridSize.x * gridSize.z}`);

            const materials = [
                PhongMaterial.create({
                    diffuseColor: Vec3.create(1, 0, 0),
                }),
                UnlitMaterial.create({
                    color: Vec3.create(1, 0, 0),
                }),
                PhongMaterial.create({
                    diffuseColor: Vec3.create(0, 1, 0),
                }),
                UnlitMaterial.create({
                    color: Vec3.create(0, 1, 0),
                }),
            ];

            const randomIndex = () => Math.floor(Math.random() * materials.length);

            for (let x = 0; x <= gridSize.x; x++) {
                for (let z = 0; z <= gridSize.z; z++) {
                    const xPos = (x - gridSize.x / 2) * (1 + padding);
                    const zPos = (z - gridSize.z / 2) * (1 + padding);

                    world.spawnBundle({
                        id: `entity-${x}-${z}`,
                        bundle: MeshBundle.create({
                            transform: Transform.createFromTRS({ translation: Vec3.create(xPos, 0, zPos) }),
                            mesh: Mesh.create({
                                material: materials[randomIndex()],
                                primitive: InterleavedPrimitive.fromObjPrimitive(
                                    objects.Plane.primitives.default,
                                    info,
                                ),
                            }),
                        }),
                    });
                }
            }
        },
    });

    await world
        .registerPlugins([UpdateCameraFromTransformPlugin, RenderPlugin])
        .registerSystems([Startup, Update])
        .run({ loop: false });
};

void main();
