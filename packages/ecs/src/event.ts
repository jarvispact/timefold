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

export type SpawnEntityEcsEvent<Components extends Component[]> = {
    type: 'ecs/spawn-entity';
    payload: { id: Entity; components: Components };
};

export type DespawnEntityEcsEvent<Components extends Component[]> = {
    type: 'ecs/despawn-entity';
    payload: { id: Entity; components: Components };
};

export type AddComponentEcsEvent<Components extends Component[]> = {
    type: 'ecs/add-component';
    payload: { entityId: Entity; component: Components[number] };
};

export type RemoveComponentEcsEvent<Components extends Component[]> = {
    type: 'ecs/remove-component';
    payload: { entityId: Entity; component: Components[number] };
};

export type EcsEvent<Components extends Component[]> =
    | SpawnEntityEcsEvent<Components>
    | DespawnEntityEcsEvent<Components>
    | AddComponentEcsEvent<Components>
    | RemoveComponentEcsEvent<Components>;
