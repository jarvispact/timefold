import { Component } from './component';

export type GenericQueryDefinition<WorldComponent extends Component> = {
    includeEntity?: true;
    tuple: WorldComponent['type'][];
};

export function createQueryKey(definition: GenericQueryDefinition<Component>) {
    const items: string[] = [];

    if (definition.includeEntity === true) {
        items.push('entityId');
    }

    items.push(...definition.tuple);

    return `query([${items.join(', ')}])`;
}
