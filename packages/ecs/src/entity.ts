export type Entity = number;

export function createEntitySequence() {
    let entity = 0;

    function currentId(): Entity {
        return entity;
    }

    function nextId(): Entity {
        return entity++;
    }

    function reset(): Entity {
        entity = 0;
        return entity;
    }

    return { currentId, nextId, reset };
}
