import { Component } from './component';
import { Entity } from './entity';

export type GenericEcsEvent = { type: string };

export type DefineEcsEvent<Type extends GenericEcsEvent['type'], Payload = undefined> = Payload extends undefined
    ? {
          type: Type;
      }
    : {
          type: Type;
          payload: Payload;
      };

export type SpawnEntityEcsEvent<C extends Component> = {
    type: 'ecs/spawn-entity';
    payload: { entity: Entity; components: C[] };
};

export const createSpawnEntityEvent = (event: SpawnEntityEcsEvent<Component>) => event;

export type DespawnEntityEcsEvent = {
    type: 'ecs/despawn-entity';
    payload: { entity: Entity };
};

export const createDespawnEntityEvent = (event: DespawnEntityEcsEvent) => event;

export type AddComponentEcsEvent<C extends Component> = {
    type: 'ecs/add-component';
    payload: { entity: Entity; component: C };
};

export const createAddComponentEvent = (event: AddComponentEcsEvent<Component>) => event;

export type RemoveComponentEcsEvent<C extends Component> = {
    type: 'ecs/remove-component';
    payload: { entity: Entity; component: C };
};

export const createRemoveComponentEvent = (event: RemoveComponentEcsEvent<Component>) => event;

export type EcsEvent<C extends Component> =
    | SpawnEntityEcsEvent<C>
    | DespawnEntityEcsEvent
    | AddComponentEcsEvent<C>
    | RemoveComponentEcsEvent<C>;

export type ExtendEcsEvent<C extends Component, CustomEvent extends GenericEcsEvent> = EcsEvent<C> | CustomEvent;
