import { Component } from './component';
import { Entity } from './entity';
import { GenericResources } from './resource';

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

export type SetResourceEcsEvent<R extends GenericResources, K extends keyof R> = {
    type: 'ecs/set-resource';
    payload: { name: K; data: R[K] };
};

export type RemoveResourceEcsEvent<R extends GenericResources, K extends keyof R> = {
    type: 'ecs/remove-resource';
    payload: { name: K; data: R[K] };
};

export type EcsEvent<C extends Component, R extends GenericResources> =
    | SpawnEntityEcsEvent<C>
    | SetResourceEcsEvent<R, keyof R>
    | RemoveResourceEcsEvent<R, keyof R>;
