/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { expect, it, describe } from 'vitest';
import { defineSystemGraph, createSystem, mergeSystemGraphs, createAsyncSystem } from './system';

describe('system', () => {
    describe('defineSystemGraph', () => {
        describe('sync systems only', () => {
            it('should generate the system order only for the update stage when not specified by the user', () => {
                const result = defineSystemGraph({
                    systems: {
                        update1: createSystem({ stage: 'update', fn: () => {} }),
                        update2: createSystem({ stage: 'update', fn: () => {} }),
                        update3: createSystem({ stage: 'update', fn: () => {} }),
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
                        startup1: createSystem({ stage: 'startup', fn: () => {} }),
                        startup2: createSystem({ stage: 'startup', fn: () => {} }),
                        startup3: createSystem({ stage: 'startup', fn: () => {} }),

                        update1: createSystem({ stage: 'update', fn: () => {} }),
                        update2: createSystem({ stage: 'update', fn: () => {} }),
                        update3: createSystem({ stage: 'update', fn: () => {} }),

                        render1: createSystem({ stage: 'render', fn: () => {} }),
                        render2: createSystem({ stage: 'render', fn: () => {} }),
                        render3: createSystem({ stage: 'render', fn: () => {} }),

                        cleanup1: createSystem({ stage: 'cleanup', fn: () => {} }),
                        cleanup2: createSystem({ stage: 'cleanup', fn: () => {} }),
                        cleanup3: createSystem({ stage: 'cleanup', fn: () => {} }),
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
                        startup1: createSystem({ stage: 'startup', fn: () => {} }),
                        startup2: createSystem({ stage: 'startup', fn: () => {} }),
                        startup3: createSystem({ stage: 'startup', fn: () => {} }),

                        update1: createSystem({ stage: 'update', fn: () => {} }),
                        update2: createSystem({ stage: 'update', fn: () => {} }),
                        update3: createSystem({ stage: 'update', fn: () => {} }),
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
                        startup1: createSystem({ stage: 'startup', fn: () => {} }),
                        startup2: createSystem({ stage: 'startup', fn: () => {} }),
                        startup3: createSystem({ stage: 'startup', fn: () => {} }),

                        update1: createSystem({ stage: 'update', fn: () => {} }),
                        update2: createSystem({ stage: 'update', fn: () => {} }),
                        update3: createSystem({ stage: 'update', fn: () => {} }),
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
                            startup1: createSystem({ stage: 'startup', fn: () => {} }),
                            startup2: createSystem({ stage: 'startup', fn: () => {} }),
                            startup3: createSystem({ stage: 'startup', fn: () => {} }),
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
                            startup1: createSystem({ stage: 'startup', fn: () => {} }),
                            startup2: createSystem({ stage: 'startup', fn: () => {} }),
                            startup3: createSystem({ stage: 'startup', fn: () => {} }),
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
                        update1: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        update2: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        update3: createAsyncSystem({ stage: 'update', fn: async () => {} }),
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
                        startup1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startup2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startup3: createAsyncSystem({ stage: 'startup', fn: async () => {} }),

                        update1: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        update2: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        update3: createAsyncSystem({ stage: 'update', fn: async () => {} }),

                        render1: createAsyncSystem({ stage: 'render', fn: async () => {} }),
                        render2: createAsyncSystem({ stage: 'render', fn: async () => {} }),
                        render3: createAsyncSystem({ stage: 'render', fn: async () => {} }),

                        cleanup1: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
                        cleanup2: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
                        cleanup3: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
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
                        startup1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startup2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startup3: createAsyncSystem({ stage: 'startup', fn: async () => {} }),

                        update1: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        update2: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        update3: createAsyncSystem({ stage: 'update', fn: async () => {} }),
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
                        startup1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startup2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startup3: createAsyncSystem({ stage: 'startup', fn: async () => {} }),

                        update1: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        update2: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        update3: createAsyncSystem({ stage: 'update', fn: async () => {} }),
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
                            startup1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                            startup2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                            startup3: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
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
                            startup1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                            startup2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                            startup3: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
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
                        update1: createSystem({ stage: 'update', fn: () => {} }),
                        update2: createSystem({ stage: 'update', fn: () => {} }),
                        update3: createAsyncSystem({ stage: 'update', fn: async () => {} }),
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
                        startup1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startup2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startup3: createSystem({ stage: 'startup', fn: () => {} }),

                        update1: createSystem({ stage: 'update', fn: () => {} }),
                        update2: createSystem({ stage: 'update', fn: () => {} }),
                        update3: createAsyncSystem({ stage: 'update', fn: async () => {} }),

                        render1: createSystem({ stage: 'render', fn: () => {} }),
                        render2: createAsyncSystem({ stage: 'render', fn: async () => {} }),
                        render3: createSystem({ stage: 'render', fn: () => {} }),

                        cleanup1: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
                        cleanup2: createSystem({ stage: 'cleanup', fn: () => {} }),
                        cleanup3: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
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
                        startup1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startup2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startup3: createSystem({ stage: 'startup', fn: () => {} }),

                        update1: createSystem({ stage: 'update', fn: () => {} }),
                        update2: createSystem({ stage: 'update', fn: () => {} }),
                        update3: createAsyncSystem({ stage: 'update', fn: async () => {} }),

                        render1: createSystem({ stage: 'render', fn: () => {} }),
                        render2: createAsyncSystem({ stage: 'render', fn: async () => {} }),
                        render3: createSystem({ stage: 'render', fn: () => {} }),

                        cleanup1: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
                        cleanup2: createSystem({ stage: 'cleanup', fn: () => {} }),
                        cleanup3: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
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
                        startup1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startup2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startup3: createSystem({ stage: 'startup', fn: () => {} }),

                        update1: createSystem({ stage: 'update', fn: () => {} }),
                        update2: createSystem({ stage: 'update', fn: () => {} }),
                        update3: createAsyncSystem({ stage: 'update', fn: async () => {} }),

                        render1: createSystem({ stage: 'render', fn: () => {} }),
                        render2: createAsyncSystem({ stage: 'render', fn: async () => {} }),
                        render3: createSystem({ stage: 'render', fn: () => {} }),

                        cleanup1: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
                        cleanup2: createSystem({ stage: 'cleanup', fn: () => {} }),
                        cleanup3: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
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
                            startup1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                            startup2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                            startup3: createSystem({ stage: 'startup', fn: () => {} }),
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
                            startup1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                            startup2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                            startup3: createSystem({ stage: 'startup', fn: () => {} }),
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
                    updateA1: createSystem({ stage: 'update', fn: () => {} }),
                    updateA2: createSystem({ stage: 'update', fn: () => {} }),
                    updateA3: createSystem({ stage: 'update', fn: () => {} }),
                },
            });

            const b = defineSystemGraph({
                systems: {
                    updateB1: createSystem({ stage: 'update', fn: () => {} }),
                    updateB2: createSystem({ stage: 'update', fn: () => {} }),
                    updateB3: createSystem({ stage: 'update', fn: () => {} }),
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
                        updateA1: createSystem({ stage: 'update', fn: () => {} }),
                        updateA2: createSystem({ stage: 'update', fn: () => {} }),
                        updateA3: createSystem({ stage: 'update', fn: () => {} }),
                    },
                });

                const b = defineSystemGraph({
                    systems: {
                        updateB1: createSystem({ stage: 'update', fn: () => {} }),
                        updateB2: createSystem({ stage: 'update', fn: () => {} }),
                        updateB3: createSystem({ stage: 'update', fn: () => {} }),
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
                        updateA1: createSystem({ stage: 'update', fn: () => {} }),
                        updateA2: createSystem({ stage: 'update', fn: () => {} }),
                        updateA3: createSystem({ stage: 'update', fn: () => {} }),
                    },
                });

                const b = defineSystemGraph({
                    systems: {
                        updateB1: createSystem({ stage: 'update', fn: () => {} }),
                        updateB2: createSystem({ stage: 'update', fn: () => {} }),
                        updateB3: createSystem({ stage: 'update', fn: () => {} }),
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
                        updateA1: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        updateA2: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        updateA3: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                    },
                });

                const b = defineSystemGraph({
                    systems: {
                        updateB1: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        updateB2: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        updateB3: createAsyncSystem({ stage: 'update', fn: async () => {} }),
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
                        updateA1: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        updateA2: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        updateA3: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                    },
                });

                const b = defineSystemGraph({
                    systems: {
                        updateB1: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        updateB2: createAsyncSystem({ stage: 'update', fn: async () => {} }),
                        updateB3: createAsyncSystem({ stage: 'update', fn: async () => {} }),
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
                        startupA1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startupA2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startupA3: createSystem({ stage: 'startup', fn: () => {} }),

                        updateA1: createSystem({ stage: 'update', fn: () => {} }),
                        updateA2: createSystem({ stage: 'update', fn: () => {} }),
                        updateA3: createAsyncSystem({ stage: 'update', fn: async () => {} }),

                        renderA1: createSystem({ stage: 'render', fn: () => {} }),
                        renderA2: createAsyncSystem({ stage: 'render', fn: async () => {} }),
                        renderA3: createSystem({ stage: 'render', fn: () => {} }),

                        cleanupA1: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
                        cleanupA2: createSystem({ stage: 'cleanup', fn: () => {} }),
                        cleanupA3: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
                    },
                });

                const b = defineSystemGraph({
                    systems: {
                        startupB1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startupB2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startupB3: createSystem({ stage: 'startup', fn: () => {} }),

                        updateB1: createSystem({ stage: 'update', fn: () => {} }),
                        updateB2: createSystem({ stage: 'update', fn: () => {} }),
                        updateB3: createAsyncSystem({ stage: 'update', fn: async () => {} }),

                        renderB1: createSystem({ stage: 'render', fn: () => {} }),
                        renderB2: createAsyncSystem({ stage: 'render', fn: async () => {} }),
                        renderB3: createSystem({ stage: 'render', fn: () => {} }),

                        cleanupB1: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
                        cleanupB2: createSystem({ stage: 'cleanup', fn: () => {} }),
                        cleanupB3: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
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
                        startupA1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startupA2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startupA3: createSystem({ stage: 'startup', fn: () => {} }),

                        updateA1: createSystem({ stage: 'update', fn: () => {} }),
                        updateA2: createSystem({ stage: 'update', fn: () => {} }),
                        updateA3: createAsyncSystem({ stage: 'update', fn: async () => {} }),

                        renderA1: createSystem({ stage: 'render', fn: () => {} }),
                        renderA2: createAsyncSystem({ stage: 'render', fn: async () => {} }),
                        renderA3: createSystem({ stage: 'render', fn: () => {} }),

                        cleanupA1: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
                        cleanupA2: createSystem({ stage: 'cleanup', fn: () => {} }),
                        cleanupA3: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
                    },
                });

                const b = defineSystemGraph({
                    systems: {
                        startupB1: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startupB2: createAsyncSystem({ stage: 'startup', fn: async () => {} }),
                        startupB3: createSystem({ stage: 'startup', fn: () => {} }),

                        updateB1: createSystem({ stage: 'update', fn: () => {} }),
                        updateB2: createSystem({ stage: 'update', fn: () => {} }),
                        updateB3: createAsyncSystem({ stage: 'update', fn: async () => {} }),

                        renderB1: createSystem({ stage: 'render', fn: () => {} }),
                        renderB2: createAsyncSystem({ stage: 'render', fn: async () => {} }),
                        renderB3: createSystem({ stage: 'render', fn: () => {} }),

                        cleanupB1: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
                        cleanupB2: createSystem({ stage: 'cleanup', fn: () => {} }),
                        cleanupB3: createAsyncSystem({ stage: 'cleanup', fn: async () => {} }),
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
