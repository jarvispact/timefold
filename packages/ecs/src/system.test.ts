/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, expect, it } from 'vitest';
import { defineAsyncSystem, defineSystem, defineSystemGraph, mergeSystemGraphs } from './system';

describe('system', () => {
    describe('defineSystemGraph', () => {
        describe('sync systems only', () => {
            it('should generate the system order only for the update stage when not specified by the user', () => {
                const result = defineSystemGraph({
                    systems: {
                        update1: defineSystem({ stage: 'update' }),
                        update2: defineSystem({ stage: 'update' }),
                        update3: defineSystem({ stage: 'update' }),
                    },
                });

                expect(result.orderByStage).toEqual({
                    startup: [],
                    update: ['update1', 'update2', 'update3'],
                    render: [],
                    cleanup: [],
                });
            });

            it('should generate the system order for all stages when not specified by the user', () => {
                const result = defineSystemGraph({
                    systems: {
                        startup1: defineSystem({ stage: 'startup' }),
                        startup2: defineSystem({ stage: 'startup' }),
                        startup3: defineSystem({ stage: 'startup' }),

                        update1: defineSystem({ stage: 'update' }),
                        update2: defineSystem({ stage: 'update' }),
                        update3: defineSystem({ stage: 'update' }),

                        render1: defineSystem({ stage: 'render' }),
                        render2: defineSystem({ stage: 'render' }),
                        render3: defineSystem({ stage: 'render' }),

                        cleanup1: defineSystem({ stage: 'cleanup' }),
                        cleanup2: defineSystem({ stage: 'cleanup' }),
                        cleanup3: defineSystem({ stage: 'cleanup' }),
                    },
                });

                expect(result.orderByStage).toEqual({
                    startup: ['startup1', 'startup2', 'startup3'],
                    update: ['update1', 'update2', 'update3'],
                    render: ['render1', 'render2', 'render3'],
                    cleanup: ['cleanup1', 'cleanup2', 'cleanup3'],
                });
            });

            it('should respect the order from the user when defined only for one stage', () => {
                const result = defineSystemGraph({
                    systems: {
                        startup1: defineSystem({ stage: 'startup' }),
                        startup2: defineSystem({ stage: 'startup' }),
                        startup3: defineSystem({ stage: 'startup' }),

                        update1: defineSystem({ stage: 'update' }),
                        update2: defineSystem({ stage: 'update' }),
                        update3: defineSystem({ stage: 'update' }),
                    },
                    orderByStage: {
                        update: ['update3', 'update2', 'update1'],
                    },
                });

                expect(result.orderByStage).toEqual({
                    startup: ['startup1', 'startup2', 'startup3'],
                    update: ['update3', 'update2', 'update1'],
                    render: [],
                    cleanup: [],
                });
            });

            it('should respect the order from the user when defined for all stages', () => {
                const result = defineSystemGraph({
                    systems: {
                        startup1: defineSystem({ stage: 'startup' }),
                        startup2: defineSystem({ stage: 'startup' }),
                        startup3: defineSystem({ stage: 'startup' }),

                        update1: defineSystem({ stage: 'update' }),
                        update2: defineSystem({ stage: 'update' }),
                        update3: defineSystem({ stage: 'update' }),
                    },
                    orderByStage: {
                        startup: ['startup2', 'startup1', 'startup3'],
                        update: ['update3', 'update2', 'update1'],
                    },
                });

                expect(result.orderByStage).toEqual({
                    startup: ['startup2', 'startup1', 'startup3'],
                    update: ['update3', 'update2', 'update1'],
                    render: [],
                    cleanup: [],
                });
            });

            it('should throw an error when the order contains just a subset within one stage', () => {
                const buildGraph = () =>
                    defineSystemGraph({
                        systems: {
                            startup1: defineSystem({ stage: 'startup' }),
                            startup2: defineSystem({ stage: 'startup' }),
                            startup3: defineSystem({ stage: 'startup' }),
                        },
                        orderByStage: {
                            startup: ['startup2', 'startup1'],
                        },
                    });

                expect(buildGraph).toThrowError(
                    'The order within the same stage must contain all system names exactly once. System count for stage "startup": 3. Count of flattened order: 2',
                );
            });

            it('should throw an error when the order contains additional elements within one stage', () => {
                const buildGraph = () =>
                    defineSystemGraph({
                        systems: {
                            startup1: defineSystem({ stage: 'startup' }),
                            startup2: defineSystem({ stage: 'startup' }),
                            startup3: defineSystem({ stage: 'startup' }),
                        },
                        orderByStage: {
                            startup: ['startup2', 'startup1', 'startup3', 'startup2'],
                        },
                    });

                expect(buildGraph).toThrowError(
                    'The order within the same stage must contain all system names exactly once. System count for stage "startup": 3. Count of flattened order: 4',
                );
            });
        });

        describe('async systems only', () => {
            it('should generate the system order only for the update stage when not specified by the user', () => {
                const result = defineSystemGraph({
                    systems: {
                        update1: defineAsyncSystem({ stage: 'update' }),
                        update2: defineAsyncSystem({ stage: 'update' }),
                        update3: defineAsyncSystem({ stage: 'update' }),
                    },
                });

                expect(result.orderByStage).toEqual({
                    startup: [],
                    update: [['update1', 'update2', 'update3']],
                    render: [],
                    cleanup: [],
                });
            });

            it('should generate the system order for all stages when not specified by the user', () => {
                const result = defineSystemGraph({
                    systems: {
                        startup1: defineAsyncSystem({ stage: 'startup' }),
                        startup2: defineAsyncSystem({ stage: 'startup' }),
                        startup3: defineAsyncSystem({ stage: 'startup' }),

                        update1: defineAsyncSystem({ stage: 'update' }),
                        update2: defineAsyncSystem({ stage: 'update' }),
                        update3: defineAsyncSystem({ stage: 'update' }),

                        render1: defineAsyncSystem({ stage: 'render' }),
                        render2: defineAsyncSystem({ stage: 'render' }),
                        render3: defineAsyncSystem({ stage: 'render' }),

                        cleanup1: defineAsyncSystem({ stage: 'cleanup' }),
                        cleanup2: defineAsyncSystem({ stage: 'cleanup' }),
                        cleanup3: defineAsyncSystem({ stage: 'cleanup' }),
                    },
                });

                expect(result.orderByStage).toEqual({
                    startup: [['startup1', 'startup2', 'startup3']],
                    update: [['update1', 'update2', 'update3']],
                    render: [['render1', 'render2', 'render3']],
                    cleanup: [['cleanup1', 'cleanup2', 'cleanup3']],
                });
            });

            it('should respect the order from the user when defined only for one stage', () => {
                const result = defineSystemGraph({
                    systems: {
                        startup1: defineAsyncSystem({ stage: 'startup' }),
                        startup2: defineAsyncSystem({ stage: 'startup' }),
                        startup3: defineAsyncSystem({ stage: 'startup' }),

                        update1: defineAsyncSystem({ stage: 'update' }),
                        update2: defineAsyncSystem({ stage: 'update' }),
                        update3: defineAsyncSystem({ stage: 'update' }),
                    },
                    orderByStage: {
                        update: [['update3', 'update2'], 'update1'],
                    },
                });

                expect(result.orderByStage).toEqual({
                    startup: [['startup1', 'startup2', 'startup3']],
                    update: [['update3', 'update2'], 'update1'],
                    render: [],
                    cleanup: [],
                });
            });

            it('should respect the order from the user when defined for all stages', () => {
                const result = defineSystemGraph({
                    systems: {
                        startup1: defineAsyncSystem({ stage: 'startup' }),
                        startup2: defineAsyncSystem({ stage: 'startup' }),
                        startup3: defineAsyncSystem({ stage: 'startup' }),

                        update1: defineAsyncSystem({ stage: 'update' }),
                        update2: defineAsyncSystem({ stage: 'update' }),
                        update3: defineAsyncSystem({ stage: 'update' }),
                    },
                    orderByStage: {
                        startup: [['startup2', 'startup1'], 'startup3'],
                        update: [['update3'], 'update2', 'update1'],
                    },
                });

                expect(result.orderByStage).toEqual({
                    startup: [['startup2', 'startup1'], 'startup3'],
                    update: [['update3'], 'update2', 'update1'],
                    render: [],
                    cleanup: [],
                });
            });

            it('should throw an error when the order contains just a subset within one stage', () => {
                const buildGraph = () =>
                    defineSystemGraph({
                        systems: {
                            startup1: defineAsyncSystem({ stage: 'startup' }),
                            startup2: defineAsyncSystem({ stage: 'startup' }),
                            startup3: defineAsyncSystem({ stage: 'startup' }),
                        },
                        orderByStage: {
                            startup: [['startup2', 'startup1']],
                        },
                    });

                expect(buildGraph).toThrowError(
                    'The order within the same stage must contain all system names exactly once. System count for stage "startup": 3. Count of flattened order: 2',
                );
            });

            it('should throw an error when the order contains additional elements within one stage', () => {
                const buildGraph = () =>
                    defineSystemGraph({
                        systems: {
                            startup1: defineAsyncSystem({ stage: 'startup' }),
                            startup2: defineAsyncSystem({ stage: 'startup' }),
                            startup3: defineAsyncSystem({ stage: 'startup' }),
                        },
                        orderByStage: {
                            startup: ['startup2', ['startup1', 'startup3'], 'startup2'],
                        },
                    });

                expect(buildGraph).toThrowError(
                    'The order within the same stage must contain all system names exactly once. System count for stage "startup": 3. Count of flattened order: 4',
                );
            });
        });

        describe('mixed sync and async systems', () => {
            it('should generate the system order only for the update stage when not specified by the user', () => {
                const result = defineSystemGraph({
                    systems: {
                        update1: defineSystem({ stage: 'update' }),
                        update2: defineSystem({ stage: 'update' }),
                        update3: defineAsyncSystem({ stage: 'update' }),
                    },
                });

                expect(result.orderByStage).toEqual({
                    startup: [],
                    update: ['update1', 'update2', ['update3']],
                    render: [],
                    cleanup: [],
                });
            });

            it('should generate the system order for all stages when not specified by the user', () => {
                const result = defineSystemGraph({
                    systems: {
                        startup1: defineAsyncSystem({ stage: 'startup' }),
                        startup2: defineAsyncSystem({ stage: 'startup' }),
                        startup3: defineSystem({ stage: 'startup' }),

                        update1: defineSystem({ stage: 'update' }),
                        update2: defineSystem({ stage: 'update' }),
                        update3: defineAsyncSystem({ stage: 'update' }),

                        render1: defineSystem({ stage: 'render' }),
                        render2: defineAsyncSystem({ stage: 'render' }),
                        render3: defineSystem({ stage: 'render' }),

                        cleanup1: defineAsyncSystem({ stage: 'cleanup' }),
                        cleanup2: defineSystem({ stage: 'cleanup' }),
                        cleanup3: defineAsyncSystem({ stage: 'cleanup' }),
                    },
                });

                expect(result.orderByStage).toEqual({
                    startup: [['startup1', 'startup2'], 'startup3'],
                    update: ['update1', 'update2', ['update3']],
                    render: ['render1', ['render2'], 'render3'],
                    cleanup: [['cleanup1', 'cleanup3'], 'cleanup2'],
                });
            });

            it('should respect the order from the user when defined only for one stage', () => {
                const result = defineSystemGraph({
                    systems: {
                        startup1: defineAsyncSystem({ stage: 'startup' }),
                        startup2: defineAsyncSystem({ stage: 'startup' }),
                        startup3: defineSystem({ stage: 'startup' }),

                        update1: defineSystem({ stage: 'update' }),
                        update2: defineSystem({ stage: 'update' }),
                        update3: defineAsyncSystem({ stage: 'update' }),

                        render1: defineSystem({ stage: 'render' }),
                        render2: defineAsyncSystem({ stage: 'render' }),
                        render3: defineSystem({ stage: 'render' }),

                        cleanup1: defineAsyncSystem({ stage: 'cleanup' }),
                        cleanup2: defineSystem({ stage: 'cleanup' }),
                        cleanup3: defineAsyncSystem({ stage: 'cleanup' }),
                    },
                    orderByStage: {
                        update: ['update2', 'update1', ['update3']],
                    },
                });

                expect(result.orderByStage).toEqual({
                    startup: [['startup1', 'startup2'], 'startup3'],
                    update: ['update2', 'update1', ['update3']],
                    render: ['render1', ['render2'], 'render3'],
                    cleanup: [['cleanup1', 'cleanup3'], 'cleanup2'],
                });
            });

            it('should respect the order from the user when defined for all stages', () => {
                const result = defineSystemGraph({
                    systems: {
                        startup1: defineAsyncSystem({ stage: 'startup' }),
                        startup2: defineAsyncSystem({ stage: 'startup' }),
                        startup3: defineSystem({ stage: 'startup' }),

                        update1: defineSystem({ stage: 'update' }),
                        update2: defineSystem({ stage: 'update' }),
                        update3: defineAsyncSystem({ stage: 'update' }),

                        render1: defineSystem({ stage: 'render' }),
                        render2: defineAsyncSystem({ stage: 'render' }),
                        render3: defineSystem({ stage: 'render' }),

                        cleanup1: defineAsyncSystem({ stage: 'cleanup' }),
                        cleanup2: defineSystem({ stage: 'cleanup' }),
                        cleanup3: defineAsyncSystem({ stage: 'cleanup' }),
                    },
                    orderByStage: {
                        startup: [['startup1'], 'startup2', 'startup3'],
                        update: ['update2', 'update1', 'update3'],
                        render: [['render2'], 'render3', 'render1'],
                        cleanup: ['cleanup2', ['cleanup3', 'cleanup1']],
                    },
                });

                expect(result.orderByStage).toEqual({
                    startup: [['startup1'], 'startup2', 'startup3'],
                    update: ['update2', 'update1', 'update3'],
                    render: [['render2'], 'render3', 'render1'],
                    cleanup: ['cleanup2', ['cleanup3', 'cleanup1']],
                });
            });

            it('should throw an error when the order contains just a subset within one stage', () => {
                const buildGraph = () =>
                    defineSystemGraph({
                        systems: {
                            startup1: defineAsyncSystem({ stage: 'startup' }),
                            startup2: defineAsyncSystem({ stage: 'startup' }),
                            startup3: defineSystem({ stage: 'startup' }),
                        },
                        orderByStage: {
                            startup: ['startup2', 'startup1'],
                        },
                    });

                expect(buildGraph).toThrowError(
                    'The order within the same stage must contain all system names exactly once. System count for stage "startup": 3. Count of flattened order: 2',
                );
            });

            it('should throw an error when the order contains additional elements within one stage', () => {
                const buildGraph = () =>
                    defineSystemGraph({
                        systems: {
                            startup1: defineAsyncSystem({ stage: 'startup' }),
                            startup2: defineAsyncSystem({ stage: 'startup' }),
                            startup3: defineSystem({ stage: 'startup' }),
                        },
                        orderByStage: {
                            startup: ['startup2', 'startup1', 'startup3', 'startup2'],
                        },
                    });

                expect(buildGraph).toThrowError(
                    'The order within the same stage must contain all system names exactly once. System count for stage "startup": 3. Count of flattened order: 4',
                );
            });
        });
    });

    describe('mergeSystemGraphs', () => {
        it('should combine all systems into one object', () => {
            const a = defineSystemGraph({
                systems: {
                    updateA1: defineSystem({ stage: 'update' }),
                    updateA2: defineSystem({ stage: 'update' }),
                    updateA3: defineSystem({ stage: 'update' }),
                },
            });

            const b = defineSystemGraph({
                systems: {
                    updateB1: defineSystem({ stage: 'update' }),
                    updateB2: defineSystem({ stage: 'update' }),
                    updateB3: defineSystem({ stage: 'update' }),
                },
            });

            const result = mergeSystemGraphs(a, b);

            expect(result.systems).toEqual({
                updateA1: expect.objectContaining({ stage: 'update', async: false }),
                updateA2: expect.objectContaining({ stage: 'update', async: false }),
                updateA3: expect.objectContaining({ stage: 'update', async: false }),
                updateB1: expect.objectContaining({ stage: 'update', async: false }),
                updateB2: expect.objectContaining({ stage: 'update', async: false }),
                updateB3: expect.objectContaining({ stage: 'update', async: false }),
            });
        });

        describe('sync systems only', () => {
            it('should append both order definitions without rules', () => {
                const a = defineSystemGraph({
                    systems: {
                        updateA1: defineSystem({ stage: 'update' }),
                        updateA2: defineSystem({ stage: 'update' }),
                        updateA3: defineSystem({ stage: 'update' }),
                    },
                });

                const b = defineSystemGraph({
                    systems: {
                        updateB1: defineSystem({ stage: 'update' }),
                        updateB2: defineSystem({ stage: 'update' }),
                        updateB3: defineSystem({ stage: 'update' }),
                    },
                });

                const result = mergeSystemGraphs(a, b);

                expect(result.orderByStage).toEqual({
                    startup: [],
                    update: ['updateA1', 'updateA2', 'updateA3', 'updateB1', 'updateB2', 'updateB3'],
                    render: [],
                    cleanup: [],
                });
            });

            it('should resolve the merge rules correctly', () => {
                const a = defineSystemGraph({
                    systems: {
                        updateA1: defineSystem({ stage: 'update' }),
                        updateA2: defineSystem({ stage: 'update' }),
                        updateA3: defineSystem({ stage: 'update' }),
                    },
                });

                const b = defineSystemGraph({
                    systems: {
                        updateB1: defineSystem({ stage: 'update' }),
                        updateB2: defineSystem({ stage: 'update' }),
                        updateB3: defineSystem({ stage: 'update' }),
                    },
                });

                const result = mergeSystemGraphs(a, b, {
                    updateB1: { before: 'updateA1' },
                    updateB2: { before: 'updateA2' },
                    updateB3: { before: 'updateA3' },
                });

                expect(result.orderByStage).toEqual({
                    startup: [],
                    update: ['updateB1', 'updateA1', 'updateB2', 'updateA2', 'updateB3', 'updateA3'],
                    render: [],
                    cleanup: [],
                });
            });
        });

        describe('async systems only', () => {
            it('should append both order definitions without rules', () => {
                const a = defineSystemGraph({
                    systems: {
                        updateA1: defineAsyncSystem({ stage: 'update' }),
                        updateA2: defineAsyncSystem({ stage: 'update' }),
                        updateA3: defineAsyncSystem({ stage: 'update' }),
                    },
                });

                const b = defineSystemGraph({
                    systems: {
                        updateB1: defineAsyncSystem({ stage: 'update' }),
                        updateB2: defineAsyncSystem({ stage: 'update' }),
                        updateB3: defineAsyncSystem({ stage: 'update' }),
                    },
                });

                const result = mergeSystemGraphs(a, b);

                expect(result.orderByStage).toEqual({
                    startup: [],
                    update: [['updateA1', 'updateA2', 'updateA3', 'updateB1', 'updateB2', 'updateB3']],
                    render: [],
                    cleanup: [],
                });
            });

            it('should resolve the merge rules correctly', () => {
                const a = defineSystemGraph({
                    systems: {
                        updateA1: defineAsyncSystem({ stage: 'update' }),
                        updateA2: defineAsyncSystem({ stage: 'update' }),
                        updateA3: defineAsyncSystem({ stage: 'update' }),
                    },
                });

                const b = defineSystemGraph({
                    systems: {
                        updateB1: defineAsyncSystem({ stage: 'update' }),
                        updateB2: defineAsyncSystem({ stage: 'update' }),
                        updateB3: defineAsyncSystem({ stage: 'update' }),
                    },
                });

                const result = mergeSystemGraphs(a, b, {
                    updateB1: { before: 'updateA1' },
                    updateB2: { before: 'updateA2' },
                    updateB3: { before: 'updateA3' },
                });

                expect(result.orderByStage).toEqual({
                    startup: [],
                    update: [['updateB1', 'updateA1', 'updateB2', 'updateA2', 'updateB3', 'updateA3']],
                    render: [],
                    cleanup: [],
                });
            });
        });

        describe('mixed sync and async systems', () => {
            it('should append both order definitions without rules', () => {
                const a = defineSystemGraph({
                    systems: {
                        startupA1: defineAsyncSystem({ stage: 'startup' }),
                        startupA2: defineAsyncSystem({ stage: 'startup' }),
                        startupA3: defineSystem({ stage: 'startup' }),

                        updateA1: defineSystem({ stage: 'update' }),
                        updateA2: defineSystem({ stage: 'update' }),
                        updateA3: defineAsyncSystem({ stage: 'update' }),

                        renderA1: defineSystem({ stage: 'render' }),
                        renderA2: defineAsyncSystem({ stage: 'render' }),
                        renderA3: defineSystem({ stage: 'render' }),

                        cleanupA1: defineAsyncSystem({ stage: 'cleanup' }),
                        cleanupA2: defineSystem({ stage: 'cleanup' }),
                        cleanupA3: defineAsyncSystem({ stage: 'cleanup' }),
                    },
                });

                const b = defineSystemGraph({
                    systems: {
                        startupB1: defineAsyncSystem({ stage: 'startup' }),
                        startupB2: defineAsyncSystem({ stage: 'startup' }),
                        startupB3: defineSystem({ stage: 'startup' }),

                        updateB1: defineSystem({ stage: 'update' }),
                        updateB2: defineSystem({ stage: 'update' }),
                        updateB3: defineAsyncSystem({ stage: 'update' }),

                        renderB1: defineSystem({ stage: 'render' }),
                        renderB2: defineAsyncSystem({ stage: 'render' }),
                        renderB3: defineSystem({ stage: 'render' }),

                        cleanupB1: defineAsyncSystem({ stage: 'cleanup' }),
                        cleanupB2: defineSystem({ stage: 'cleanup' }),
                        cleanupB3: defineAsyncSystem({ stage: 'cleanup' }),
                    },
                });

                const result = mergeSystemGraphs(a, b);

                expect(result.orderByStage).toEqual({
                    startup: [['startupA1', 'startupA2'], 'startupA3', ['startupB1', 'startupB2'], 'startupB3'],
                    update: ['updateA1', 'updateA2', ['updateA3'], 'updateB1', 'updateB2', ['updateB3']],
                    render: ['renderA1', ['renderA2'], 'renderA3', 'renderB1', ['renderB2'], 'renderB3'],
                    cleanup: [['cleanupA1', 'cleanupA3'], 'cleanupA2', ['cleanupB1', 'cleanupB3'], 'cleanupB2'],
                });
            });

            it('should resolve the merge rules correctly', () => {
                const a = defineSystemGraph({
                    systems: {
                        startupA1: defineAsyncSystem({ stage: 'startup' }),
                        startupA2: defineAsyncSystem({ stage: 'startup' }),
                        startupA3: defineSystem({ stage: 'startup' }),

                        updateA1: defineSystem({ stage: 'update' }),
                        updateA2: defineSystem({ stage: 'update' }),
                        updateA3: defineAsyncSystem({ stage: 'update' }),

                        renderA1: defineSystem({ stage: 'render' }),
                        renderA2: defineAsyncSystem({ stage: 'render' }),
                        renderA3: defineSystem({ stage: 'render' }),

                        cleanupA1: defineAsyncSystem({ stage: 'cleanup' }),
                        cleanupA2: defineSystem({ stage: 'cleanup' }),
                        cleanupA3: defineAsyncSystem({ stage: 'cleanup' }),
                    },
                });

                const b = defineSystemGraph({
                    systems: {
                        startupB1: defineAsyncSystem({ stage: 'startup' }),
                        startupB2: defineAsyncSystem({ stage: 'startup' }),
                        startupB3: defineSystem({ stage: 'startup' }),

                        updateB1: defineSystem({ stage: 'update' }),
                        updateB2: defineSystem({ stage: 'update' }),
                        updateB3: defineAsyncSystem({ stage: 'update' }),

                        renderB1: defineSystem({ stage: 'render' }),
                        renderB2: defineAsyncSystem({ stage: 'render' }),
                        renderB3: defineSystem({ stage: 'render' }),

                        cleanupB1: defineAsyncSystem({ stage: 'cleanup' }),
                        cleanupB2: defineSystem({ stage: 'cleanup' }),
                        cleanupB3: defineAsyncSystem({ stage: 'cleanup' }),
                    },
                });

                const result = mergeSystemGraphs(a, b, {
                    startupB1: { after: 'startupA1' },
                    startupB2: { after: 'startupA2' },
                    startupB3: { after: 'startupA3' },

                    updateB1: { before: 'updateA1' },
                    updateB2: { before: 'updateA2' },
                    updateB3: { before: 'updateA3' },

                    renderB1: { after: 'renderA1' },
                    renderB2: { after: 'renderA2' },
                    renderB3: { after: 'renderA3' },

                    cleanupB1: { before: 'cleanupA1' },
                    cleanupB2: { before: 'cleanupA2' },
                    cleanupB3: { before: 'cleanupA3' },
                });

                expect(result.orderByStage).toEqual({
                    startup: [['startupA1', 'startupB1', 'startupA2', 'startupB2'], 'startupA3', 'startupB3'],
                    update: ['updateB1', 'updateA1', 'updateB2', 'updateA2', ['updateB3', 'updateA3']],
                    render: ['renderA1', 'renderB1', ['renderA2', 'renderB2'], 'renderA3', 'renderB3'],
                    cleanup: [['cleanupB1', 'cleanupA1', 'cleanupB3', 'cleanupA3'], 'cleanupB2', 'cleanupA2'],
                });
            });
        });
    });
});
