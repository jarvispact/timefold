import { Plugin, System, World } from '@timefold/ecs';

const MyPlugin = Plugin.create({
    fn: (world) => {
        console.log('MyPlugin called');

        const MyPluginStartupSystem = System.create({
            stage: 'startup',
            fn: () => {
                console.log('MyPluginStartupSystem called');
            },
        });

        world.registerSystems(MyPluginStartupSystem);
    },
});

const MyStartupSystem = System.create({
    stage: 'startup',
    fn: () => {
        console.log('MyStartupSystem called');
    },
});

let timeToPrintUps = performance.now() + 1000;
let ups = 0;

const MyUpdateSystem = System.create({
    stage: 'update',
    fn: (_, time) => {
        if (time > timeToPrintUps) {
            console.log(`updated per second: ${ups}`);
            timeToPrintUps = performance.now() + 1000;
            ups = 0;
        }

        ups++;
    },
});

const world = World.create().registerPlugins(MyPlugin).registerSystems([MyStartupSystem, MyUpdateSystem]);

void (async () => {
    await world.run();
})();
