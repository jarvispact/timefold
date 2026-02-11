import { Component } from './component';

export type World<C extends Component> = {
    createEntity: () => number;
    spawn: (entity: number, components: C[]) => void;
};

const createWorld = <C extends Component>(): World<C> => {
    let entityCounter = 0;
    const componentsByEntity = new Map<number, Map<number, C | undefined> | undefined>();

    const createEntity = () => {
        return entityCounter++;
    };

    const spawn = (entity: number, components: Component[]) => {
        if (!componentsByEntity.has(entity)) {
            componentsByEntity.set(entity, new Map());
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const entityComponents = componentsByEntity.get(entity)!;
        for (const component of components) {
            entityComponents.set(component.type, component as C);
        }
    };

    return {
        createEntity,
        spawn,
    };
};

type WorldBuilderApi<C extends Component> = {
    compile: () => World<C>;
};

export const worldBuilder = <C extends Component>() => {
    const compile = () => createWorld<C>();

    const api = {
        compile,
    } as WorldBuilderApi<C>;

    return api;
};
