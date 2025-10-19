export type GenericResources = Record<string, unknown>;

export function defineResources<Resources extends GenericResources>(resources: Resources) {
    return resources;
}
