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

export type DespawnEntityEcsEvent = {
    type: 'ecs/despawn-entity';
    payload: { entity: Entity };
};

export type AddComponentEcsEvent<C extends Component> = {
    type: 'ecs/add-component';
    payload: { entity: Entity; component: C };
};

export type RemoveComponentEcsEvent<C extends Component> = {
    type: 'ecs/remove-component';
    payload: { entity: Entity; component: C };
};

export type EcsEvent<C extends Component> =
    | SpawnEntityEcsEvent<C>
    | DespawnEntityEcsEvent
    | AddComponentEcsEvent<C>
    | RemoveComponentEcsEvent<C>;
