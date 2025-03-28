import { Component } from './component';
import { EntityId } from './misc';

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
    payload: { id: EntityId; components: Components };
};

export type DespawnEntityEcsEvent<Components extends Component[]> = {
    type: 'ecs/despawn-entity';
    payload: { id: EntityId; components: Components };
};

export type AddComponentEcsEvent<Components extends Component[]> = {
    type: 'ecs/add-component';
    payload: { entityId: EntityId; component: Components[number] };
};

export type RemoveComponentEcsEvent<Components extends Component[]> = {
    type: 'ecs/remove-component';
    payload: { entityId: EntityId; component: Components[number] };
};

export type EcsEvent<Components extends Component[]> =
    | SpawnEntityEcsEvent<Components>
    | DespawnEntityEcsEvent<Components>
    | AddComponentEcsEvent<Components>
    | RemoveComponentEcsEvent<Components>;
