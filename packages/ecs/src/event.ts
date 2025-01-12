import * as Component from './component';
import { EntityId } from './entity';

export type Generic = { type: string };

export type Define<Type extends Generic['type'], Payload = undefined> = {
    type: Type;
    payload: Payload;
};

export type SpawnEntity<Components extends Component.Type[]> = {
    type: 'ecs/spawn-entity';
    payload: { id: EntityId; components: Components };
};

export type DespawnEntity<Components extends Component.Type[]> = {
    type: 'ecs/despawn-entity';
    payload: { id: EntityId; components: Components };
};

export type AddComponent<Components extends Component.Type[]> = {
    type: 'ecs/add-component';
    payload: { entityId: EntityId; component: Components[number] };
};

export type RemoveComponent<Components extends Component.Type[]> = {
    type: 'ecs/remove-component';
    payload: { entityId: EntityId; component: Components[number] };
};

export type EcsEvent<Components extends Component.Type[]> =
    | SpawnEntity<Components>
    | DespawnEntity<Components>
    | AddComponent<Components>
    | RemoveComponent<Components>;
