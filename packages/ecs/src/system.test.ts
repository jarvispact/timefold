import { expect, it, describe } from 'vitest';
import { defineSystemGraph, createSystem, createAsyncSystem } from './system';
import { resolveSystemNamesForStage } from './internal';

const spawnWorld = createSystem({ stage: 'startup', fn: () => {} });
const spawnPlaver = createSystem({ stage: 'startup', fn: () => {} });
const spawnCamera = createSystem({ stage: 'startup', fn: () => {} });

const spawnWorldAsync = createAsyncSystem({ stage: 'startup', fn: async () => {} });
const spawnPlaverAsync = createAsyncSystem({ stage: 'startup', fn: async () => {} });
const spawnCameraAsync = createAsyncSystem({ stage: 'startup', fn: async () => {} });

const handleInput = createSystem({ stage: 'update', fn: () => {} });
const applyGravity = createSystem({ stage: 'update', fn: () => {} });
const handleMovement = createSystem({ stage: 'update', fn: () => {} });
const checkCollisions = createSystem({ stage: 'update', fn: () => {} });

const handleInputAsync = createAsyncSystem({ stage: 'update', fn: async () => {} });
const applyGravityAsync = createAsyncSystem({ stage: 'update', fn: async () => {} });
const handleMovementAsync = createAsyncSystem({ stage: 'update', fn: async () => {} });
const checkCollisionsAsync = createAsyncSystem({ stage: 'update', fn: async () => {} });

const depthPreRenderPass = createSystem({ stage: 'render', fn: () => {} });
const shadowRenderPass = createSystem({ stage: 'render', fn: () => {} });
const mainRenderPass = createSystem({ stage: 'render', fn: () => {} });
const postProcessRenderPass = createSystem({ stage: 'render', fn: () => {} });

const depthPreRenderPassAsync = createAsyncSystem({ stage: 'render', fn: async () => {} });
const shadowRenderPassAsync = createAsyncSystem({ stage: 'render', fn: async () => {} });
const mainRenderPassAsync = createAsyncSystem({ stage: 'render', fn: async () => {} });
const postProcessRenderPassAsync = createAsyncSystem({ stage: 'render', fn: async () => {} });

describe('system', () => {
    describe('resolveSystemNamesForStage with sync systems', () => {
        it('should return the systems sorted based on object order, when no dependencies are defined', () => {
            const graph = defineSystemGraph({
                systems: {
                    spawnWorld,
                    spawnPlaver,
                    spawnCamera,
                    handleInput,
                    applyGravity,
                    handleMovement,
                    checkCollisions,
                    depthPreRenderPass,
                    shadowRenderPass,
                    mainRenderPass,
                    postProcessRenderPass,
                },
            });

            const systemNamesStartup = resolveSystemNamesForStage(graph, 'startup');
            expect(systemNamesStartup).toEqual(['spawnWorld', 'spawnPlaver', 'spawnCamera']);

            const systemNamesUpdate = resolveSystemNamesForStage(graph, 'update');
            expect(systemNamesUpdate).toEqual(['handleInput', 'applyGravity', 'handleMovement', 'checkCollisions']);

            const systemNamesRender = resolveSystemNamesForStage(graph, 'render');
            expect(systemNamesRender).toEqual([
                'depthPreRenderPass',
                'shadowRenderPass',
                'mainRenderPass',
                'postProcessRenderPass',
            ]);

            const systemNamesCleanup = resolveSystemNamesForStage(graph, 'cleanup');
            expect(systemNamesCleanup).toEqual([]);
        });

        it('should return the systems sorted based the dependencies', () => {
            const graph = defineSystemGraph({
                systems: {
                    spawnWorld,
                    spawnPlaver,
                    spawnCamera,
                    handleInput,
                    applyGravity,
                    handleMovement,
                    checkCollisions,
                    depthPreRenderPass,
                    shadowRenderPass,
                    mainRenderPass,
                    postProcessRenderPass,
                },
                dependencies: {
                    spawnCamera: { before: ['spawnWorld', 'spawnPlaver'] },
                    applyGravity: { after: ['handleMovement'] },
                    checkCollisions: { before: ['handleMovement'] },
                    depthPreRenderPass: { after: ['postProcessRenderPass'], before: ['mainRenderPass'] },
                },
            });

            const systemNamesStartup = resolveSystemNamesForStage(graph, 'startup');
            expect(systemNamesStartup).toEqual(['spawnCamera', 'spawnWorld', 'spawnPlaver']);

            const systemNamesUpdate = resolveSystemNamesForStage(graph, 'update');
            expect(systemNamesUpdate).toEqual(['handleInput', 'checkCollisions', 'handleMovement', 'applyGravity']);

            const systemNamesRender = resolveSystemNamesForStage(graph, 'render');
            expect(systemNamesRender).toEqual([
                'shadowRenderPass',
                'postProcessRenderPass',
                'depthPreRenderPass',
                'mainRenderPass',
            ]);

            const systemNamesCleanup = resolveSystemNamesForStage(graph, 'cleanup');
            expect(systemNamesCleanup).toEqual([]);
        });

        it('should throw on circular dependency - simple cycle', () => {
            const graph = defineSystemGraph({
                systems: {
                    updateA: handleInput,
                    updateB: applyGravity,
                },
                dependencies: {
                    updateA: { before: ['updateB'] },
                    updateB: { before: ['updateA'] },
                },
            });

            expect(() => resolveSystemNamesForStage(graph, 'update')).toThrow(
                'Circular dependency detected in update stage',
            );
        });

        it('should throw on circular dependency - complex cycle', () => {
            const graph = defineSystemGraph({
                systems: {
                    updateA: handleInput,
                    updateB: handleInput,
                    updateC: handleInput,
                    updateD: handleInput,
                },
                dependencies: {
                    updateA: { before: ['updateB'] },
                    updateB: { before: ['updateC'] },
                    updateC: { before: ['updateD'] },
                    updateD: { before: ['updateA'] }, // cycle back to A
                },
            });

            expect(() => resolveSystemNamesForStage(graph, 'update')).toThrow(
                'Circular dependency detected in update stage',
            );
        });

        it('should throw on self-dependency with after', () => {
            const graph = defineSystemGraph({
                systems: {
                    updateA: handleInput,
                    updateB: handleInput,
                },
                dependencies: {
                    updateA: { after: ['updateA' as never] },
                },
            });

            expect(() => resolveSystemNamesForStage(graph, 'update')).toThrow(
                'Circular dependency detected in update stage',
            );
        });

        it('should throw on self-dependency with before', () => {
            const graph = defineSystemGraph({
                systems: {
                    renderA: mainRenderPass,
                    renderB: mainRenderPass,
                },
                dependencies: {
                    renderA: { before: ['renderA' as never] },
                },
            });

            expect(() => resolveSystemNamesForStage(graph, 'render')).toThrow(
                'Circular dependency detected in render stage',
            );
        });

        it('should throw with the same dependency in before and after', () => {
            const graph = defineSystemGraph({
                systems: {
                    renderA: mainRenderPass,
                    renderB: mainRenderPass,
                },
                dependencies: {
                    renderA: { after: ['renderB'], before: ['renderB'] },
                },
            });

            expect(() => resolveSystemNamesForStage(graph, 'render')).toThrow(
                'Circular dependency detected in render stage',
            );
        });

        it('should handle long dependency chain', () => {
            const graph = defineSystemGraph({
                systems: {
                    startupA: spawnCamera,
                    startupB: spawnCamera,
                    startupC: spawnCamera,
                    startupD: spawnCamera,
                    startupE: spawnCamera,
                },
                dependencies: {
                    startupB: { after: ['startupA'] },
                    startupC: { after: ['startupB'] },
                    startupD: { after: ['startupC'] },
                    startupE: { after: ['startupD'] },
                },
            });

            const systemNames = resolveSystemNamesForStage(graph, 'startup');
            expect(systemNames).toEqual(['startupA', 'startupB', 'startupC', 'startupD', 'startupE']);
        });

        it('should handle diamond dependency pattern', () => {
            const graph = defineSystemGraph({
                systems: {
                    renderA: mainRenderPass,
                    renderB: mainRenderPass,
                    renderC: mainRenderPass,
                    renderD: mainRenderPass,
                },
                dependencies: {
                    renderB: { after: ['renderA'] },
                    renderC: { after: ['renderA'] },
                    renderD: { after: ['renderB', 'renderC'] },
                },
            });

            const systemNames = resolveSystemNamesForStage(graph, 'render');
            expect(systemNames).toEqual(['renderA', 'renderB', 'renderC', 'renderD']);
        });

        it('should ignore dependencies referencing non-existent systems', () => {
            const graph = defineSystemGraph({
                systems: {
                    updateA: handleInput,
                    updateB: handleInput,
                },
                dependencies: {
                    updateA: { after: ['updateNonExistent' as never] },
                    updateB: { before: ['updateAlsoNonExistent' as never] },
                },
            });

            const systemNames = resolveSystemNamesForStage(graph, 'update');
            expect(systemNames).toHaveLength(2);
        });

        it('should ignore cross-stage dependencies', () => {
            const graph = defineSystemGraph({
                systems: {
                    startupA: spawnCamera,
                    updateB: handleInput,
                    renderC: mainRenderPass,
                },
                dependencies: {
                    updateB: { after: ['startupA' as never] }, // different stage
                    renderC: { before: ['updateB' as never] }, // different stage
                },
            });

            const startupNames = resolveSystemNamesForStage(graph, 'startup');
            expect(startupNames).toEqual(['startupA']);

            const updateNames = resolveSystemNamesForStage(graph, 'update');
            expect(updateNames).toEqual(['updateB']);

            const renderNames = resolveSystemNamesForStage(graph, 'render');
            expect(renderNames).toEqual(['renderC']);
        });

        it('should handle complex mixed before and after dependencies', () => {
            const graph = defineSystemGraph({
                systems: {
                    updateC: handleInput,
                    updateD: handleInput,
                    updateE: handleInput,
                    updateA: handleInput,
                    updateB: handleInput,
                },
                dependencies: {
                    updateC: { after: ['updateA', 'updateB'], before: ['updateD'] },
                    updateE: { after: ['updateD'] },
                    updateB: { after: ['updateA'] },
                },
            });

            const systemNames = resolveSystemNamesForStage(graph, 'update');
            expect(systemNames).toEqual(['updateA', 'updateB', 'updateC', 'updateD', 'updateE']);
        });
    });

    describe('resolveSystemNamesForStage with async and sync systems', () => {
        it('should put all systems into a single nested array', () => {
            const graph = defineSystemGraph({
                systems: {
                    spawnWorldAsync,
                    spawnPlaverAsync,
                    spawnCameraAsync,
                },
            });

            const systemNamesStartup = resolveSystemNamesForStage(graph, 'startup');
            expect(systemNamesStartup).toEqual([['spawnWorldAsync', 'spawnPlaverAsync', 'spawnCameraAsync']]);
        });

        it('should have a nested array for spawnWorldAsync and spawnPlaverAsync, but spawnCameraAsync depends on the first 2', () => {
            const graph = defineSystemGraph({
                systems: {
                    spawnCameraAsync,
                    spawnWorldAsync,
                    spawnPlaverAsync,
                },
                dependencies: {
                    spawnCameraAsync: { after: ['spawnWorldAsync', 'spawnPlaverAsync'] },
                },
            });

            const systemNamesStartup = resolveSystemNamesForStage(graph, 'startup');
            expect(systemNamesStartup).toEqual([['spawnWorldAsync', 'spawnPlaverAsync'], 'spawnCameraAsync']);
        });

        it('should have a nested array for spawnWorldAsync and spawnPlaverAsync, spawnWorldAsync and spawnPlaverAsync should be grouped also when defining single dependency: spawnWorldAsync', () => {
            const graph = defineSystemGraph({
                systems: {
                    spawnCameraAsync,
                    spawnWorldAsync,
                    spawnPlaverAsync,
                },
                dependencies: {
                    spawnCameraAsync: { after: ['spawnWorldAsync'] },
                },
            });

            const systemNamesStartup = resolveSystemNamesForStage(graph, 'startup');
            expect(systemNamesStartup).toEqual([['spawnWorldAsync', 'spawnPlaverAsync'], 'spawnCameraAsync']);
        });

        it('should generate no nested array with after dependencies', () => {
            const graph = defineSystemGraph({
                systems: {
                    spawnCameraAsync,
                    spawnWorldAsync,
                    spawnPlaverAsync,
                },
                dependencies: {
                    spawnCameraAsync: { after: ['spawnWorldAsync'] },
                    spawnWorldAsync: { after: ['spawnPlaverAsync'] },
                },
            });

            const systemNamesStartup = resolveSystemNamesForStage(graph, 'startup');
            expect(systemNamesStartup).toEqual(['spawnPlaverAsync', 'spawnWorldAsync', 'spawnCameraAsync']);
        });

        it('should generate no nested array with before dependencies', () => {
            const graph = defineSystemGraph({
                systems: {
                    spawnCameraAsync,
                    spawnWorldAsync,
                    spawnPlaverAsync,
                },
                dependencies: {
                    spawnPlaverAsync: { before: ['spawnCameraAsync'] },
                    spawnWorldAsync: { before: ['spawnPlaverAsync'] },
                },
            });

            const systemNamesStartup = resolveSystemNamesForStage(graph, 'startup');
            expect(systemNamesStartup).toEqual(['spawnWorldAsync', 'spawnPlaverAsync', 'spawnCameraAsync']);
        });

        it('should return the systems sorted based the dependencies and group async systems correctly', () => {
            const graph = defineSystemGraph({
                systems: {
                    spawnWorld: spawnWorldAsync,
                    spawnPlaver: spawnPlaverAsync,
                    spawnCamera: spawnCameraAsync,
                    handleInput: handleInputAsync,
                    applyGravity: applyGravityAsync,
                    handleMovement: handleMovementAsync,
                    checkCollisions: checkCollisionsAsync,
                    depthPreRenderPass: depthPreRenderPassAsync,
                    shadowRenderPass: shadowRenderPassAsync,
                    mainRenderPass: mainRenderPassAsync,
                    postProcessRenderPass: postProcessRenderPassAsync,
                },
                dependencies: {
                    spawnCamera: { before: ['spawnWorld', 'spawnPlaver'] },
                    applyGravity: { after: ['handleMovement'] },
                    checkCollisions: { after: ['applyGravity'] },
                    postProcessRenderPass: { after: ['mainRenderPass'] },
                    shadowRenderPass: { before: ['mainRenderPass'] },
                    depthPreRenderPass: { before: ['mainRenderPass'] },
                },
            });

            const systemNamesStartup = resolveSystemNamesForStage(graph, 'startup');
            expect(systemNamesStartup).toEqual(['spawnCamera', ['spawnWorld', 'spawnPlaver']]);

            const systemNamesUpdate = resolveSystemNamesForStage(graph, 'update');
            expect(systemNamesUpdate).toEqual([['handleInput', 'handleMovement'], 'applyGravity', 'checkCollisions']);

            const systemNamesRender = resolveSystemNamesForStage(graph, 'render');
            expect(systemNamesRender).toEqual([
                ['depthPreRenderPass', 'shadowRenderPass'],
                'mainRenderPass',
                'postProcessRenderPass',
            ]);

            const systemNamesCleanup = resolveSystemNamesForStage(graph, 'cleanup');
            expect(systemNamesCleanup).toEqual([]);
        });

        it('should handle a complex dependency defintition with before', () => {
            const graph = defineSystemGraph({
                systems: {
                    update1_0: handleInputAsync,
                    update1_1: handleInputAsync,
                    update1_2: handleInputAsync,
                    update2_0: handleInputAsync,
                    update2_1: handleInputAsync,
                    update2_2: handleInputAsync,
                    update3_0: handleInputAsync,
                    update3_1: handleInputAsync,
                    update4_0: handleInputAsync,
                    update4_1: handleInputAsync,
                    update4_2: handleInputAsync,
                    update4_3: handleInputAsync,
                    update5_0: handleInputAsync,
                    update5_1: handleInputAsync,
                    update5_2: handleInputAsync,
                },
                dependencies: {
                    update1_0: { before: ['update2_0', 'update2_1', 'update2_2'] },
                    update1_1: { before: ['update2_0', 'update2_1', 'update2_2'] },
                    update1_2: { before: ['update2_0', 'update2_1', 'update2_2'] },

                    update2_0: { before: ['update3_0', 'update3_1'] },
                    update2_1: { before: ['update3_0', 'update3_1'] },
                    update2_2: { before: ['update3_0', 'update3_1'] },

                    update3_0: { before: ['update4_0', 'update4_1', 'update4_2', 'update4_3'] },
                    update3_1: { before: ['update4_0', 'update4_1', 'update4_2', 'update4_3'] },

                    update4_0: { before: ['update5_0', 'update5_1', 'update5_2'] },
                    update4_1: { before: ['update5_0', 'update5_1', 'update5_2'] },
                    update4_2: { before: ['update5_0', 'update5_1', 'update5_2'] },
                    update4_3: { before: ['update5_0', 'update5_1', 'update5_2'] },
                },
            });

            const systemNames = resolveSystemNamesForStage(graph, 'update');
            expect(systemNames).toEqual([
                ['update1_0', 'update1_1', 'update1_2'],
                ['update2_0', 'update2_1', 'update2_2'],
                ['update3_0', 'update3_1'],
                ['update4_0', 'update4_1', 'update4_2', 'update4_3'],
                ['update5_0', 'update5_1', 'update5_2'],
            ]);
        });

        it('should handle a complex dependency defintition with after', () => {
            const graph = defineSystemGraph({
                systems: {
                    update1_0: handleInputAsync,
                    update1_1: handleInputAsync,
                    update1_2: handleInputAsync,
                    update2_0: handleInputAsync,
                    update2_1: handleInputAsync,
                    update2_2: handleInputAsync,
                    update3_0: handleInputAsync,
                    update3_1: handleInputAsync,
                    update4_0: handleInputAsync,
                    update4_1: handleInputAsync,
                    update4_2: handleInputAsync,
                    update4_3: handleInputAsync,
                    update5_0: handleInputAsync,
                    update5_1: handleInputAsync,
                    update5_2: handleInputAsync,
                },
                dependencies: {
                    update1_0: { after: ['update2_0'] },
                    update1_1: { after: ['update2_0'] },
                    update1_2: { after: ['update2_0'] },

                    update2_0: { after: ['update3_0'] },
                    update2_1: { after: ['update3_0'] },
                    update2_2: { after: ['update3_0'] },

                    update3_0: { after: ['update4_0'] },
                    update3_1: { after: ['update4_0'] },

                    update4_0: { after: ['update5_0'] },
                    update4_1: { after: ['update5_0'] },
                    update4_2: { after: ['update5_0'] },
                    update4_3: { after: ['update5_0'] },
                },
            });

            const systemNames = resolveSystemNamesForStage(graph, 'update');
            expect(systemNames).toEqual([
                ['update5_0', 'update5_1', 'update5_2'],
                ['update4_0', 'update4_1', 'update4_2', 'update4_3'],
                ['update3_0', 'update3_1'],
                ['update2_0', 'update2_1', 'update2_2'],
                ['update1_0', 'update1_1', 'update1_2'],
            ]);
        });

        it('should handle a complex dependency defintition with before and after', () => {
            const graph = defineSystemGraph({
                systems: {
                    update1_0: handleInputAsync,
                    update1_1: handleInputAsync,
                    update1_2: handleInputAsync,
                    update2_0: handleInputAsync,
                    update2_1: handleInputAsync,
                    update2_2: handleInputAsync,
                    update3_0: handleInputAsync,
                    update3_1: handleInputAsync,
                    update4_0: handleInputAsync,
                    update4_1: handleInputAsync,
                    update4_2: handleInputAsync,
                    update4_3: handleInputAsync,
                    update5_0: handleInputAsync,
                    update5_1: handleInputAsync,
                    update5_2: handleInputAsync,
                },
                dependencies: {
                    update1_0: { after: ['update2_0'] },
                    update1_1: { after: ['update2_0'] },
                    update1_2: { after: ['update2_0'] },

                    update2_0: { after: ['update3_0'] },
                    update2_1: { after: ['update3_0'] },
                    update2_2: { after: ['update3_0'] },

                    update3_0: { after: ['update4_0'] },
                    update3_1: { after: ['update4_0'] },

                    update4_0: { after: ['update5_0'] },
                    update4_1: { after: ['update5_0'] },
                    update4_2: { after: ['update5_0'] },
                    update4_3: { after: ['update5_0'] },

                    update5_0: { before: ['update5_1', 'update5_2'] },
                    update5_1: { before: ['update4_0', 'update4_1', 'update4_2', 'update4_3'] },
                },
            });

            const systemNames = resolveSystemNamesForStage(graph, 'update');
            expect(systemNames).toEqual([
                'update5_0',
                ['update5_1', 'update5_2'],
                ['update4_0', 'update4_1', 'update4_2', 'update4_3'],
                ['update3_0', 'update3_1'],
                ['update2_0', 'update2_1', 'update2_2'],
                ['update1_0', 'update1_1', 'update1_2'],
            ]);
        });
    });
});
