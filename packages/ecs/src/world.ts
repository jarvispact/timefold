import { Component, InferComponents } from './component';
import { Entity } from './entity';
import { GenericComponentDefinition, IndexTupleByName, TupleOfLength } from './internal';
import { GenericCompiledQuery } from './query';

type WorldBuilderContext = {
    components: GenericComponentDefinition[];
    queries: GenericCompiledQuery[];
};

type World<
    C extends Component = Component,
    Q extends Record<string, GenericCompiledQuery> = Record<string, GenericCompiledQuery>,
> = {
    createEntity: () => Entity;
    createEntities: <Count extends number>(count: Count) => TupleOfLength<Count, Entity>;
    spawn: (...args: [Entity, C[]] | [C[]]) => Entity;
    despawn: (...entities: Entity[]) => void;
    getComponent: <T extends C['type']>(entity: Entity, type: T) => Extract<C, { type: T }> | undefined;

    getQuery: <QueryName extends keyof Q>(name: QueryName) => Q[QueryName];
};

const createWorld = (args: WorldBuilderContext) => {
    console.log({ args });
    return {} as unknown as World;
};

type WorldBuilderApi<
    ComponentDefinitions extends GenericComponentDefinition[],
    QueryDefinitions extends GenericCompiledQuery[],
    ForbiddenMethod extends string = never,
> = Omit<
    {
        withComponents: <C extends GenericComponentDefinition[]>(
            components: C,
        ) => WorldBuilderApi<C, QueryDefinitions, 'withComponents' | 'compile'>;
        withQueries: <Q extends GenericCompiledQuery[]>(
            ...queries: Q
        ) => WorldBuilderApi<ComponentDefinitions, Q, 'withQueries'>;
        compile: () => World<InferComponents<ComponentDefinitions>, IndexTupleByName<QueryDefinitions>>;
    },
    ForbiddenMethod
>;

export const worldBuilder = () => {
    const ctx: WorldBuilderContext = {
        components: [],
        queries: [],
    };

    const withComponents = (components: GenericComponentDefinition[]) => {
        ctx.components = components;
        return api;
    };

    const withQueries = (queries: GenericCompiledQuery[]) => {
        ctx.queries = queries;
        return api;
    };

    const compile = () => createWorld(ctx);

    const api = {
        withComponents,
        withQueries,
        compile,
    };

    return api as WorldBuilderApi<GenericComponentDefinition[], GenericCompiledQuery[], 'withQueries' | 'compile'>;
};
