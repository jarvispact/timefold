import { createWorld, createPlugin, createSystem } from '@timefold/ecs';

const MyPlugin = createPlugin({
    fn: (world) => {
        console.log('MyPlugin called');

        const MyPluginStartupSystem = createSystem({
            stage: 'startup',
            fn: () => {
                console.log('MyPluginStartupSystem called');
            },
        });

        world.registerSystems(MyPluginStartupSystem);
    },
});

const MyStartupSystem = createSystem({
    stage: 'startup',
    fn: () => {
        console.log('MyStartupSystem called');
    },
});

let timeToPrintUps = performance.now() + 1000;
let ups = 0;

const MyUpdateSystem = createSystem({
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

const world = createWorld().registerPlugins(MyPlugin).registerSystems([MyStartupSystem, MyUpdateSystem]);

void (async () => {
    await world.run();
})();
