/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Component, InferComponents } from './component';
import { Entity } from './entity';
import { GenericComponentDefinition, indexTupleByName, IndexTupleByName, TupleOfLength } from './internal';
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
    const queriesByName = indexTupleByName(args.queries);

    const getQuery = (name: keyof typeof queriesByName) => queriesByName[name];

    let entityCounter = 0;
    const entityIdRecycleBin: Entity[] = [];

    const componentsByEntity = new Map<number, Map<number, Component | undefined>>();

    const createEntity = (): Entity => {
        if (entityIdRecycleBin.length > 0) {
            return entityIdRecycleBin.pop() as Entity;
        }
        return entityCounter++ as Entity;
    };

    const createEntities = (count: number) => {
        const result: Entity[] = [];

        for (let i = 0; i < count; i++) {
            result.push(createEntity());
        }
        return result;
    };

    const spawn = (...spawnArgs: [Entity, Component[]] | [Component[]]): Entity => {
        const entity = spawnArgs.length === 1 ? createEntity() : spawnArgs[0];
        const components = spawnArgs.length === 1 ? spawnArgs[0] : spawnArgs[1];

        if (!componentsByEntity.has(entity)) {
            componentsByEntity.set(entity, new Map());
        }

        const entityComponents = componentsByEntity.get(entity)!;
        for (const component of components) {
            entityComponents.set(component.type, component);
        }

        return entity;
    };

    const despawn = (...entities: Entity[]) => {
        for (let i = 0; i < entities.length; i++) {
            entityIdRecycleBin.push(entities[i]);
        }
    };

    const getComponent = (entity: Entity, type: Component['type']) => {
        const components = componentsByEntity.get(entity);
        if (!components) return undefined;
        return components.get(type);
    };

    return {
        createEntity,
        createEntities,
        spawn,
        despawn,
        getComponent,
        getQuery,
    } as unknown as World;
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

    const withQueries = (...queries: GenericCompiledQuery[]) => {
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
