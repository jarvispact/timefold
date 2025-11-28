/* eslint-disable @typescript-eslint/no-explicit-any */
import { World } from './world';

export type PluginWorld = World<any>;

export type PluginApi = NonNullable<unknown>;

export type Plugin<Name extends string, W extends PluginWorld> = {
    name: Name;
    build: (world: W) => PluginApi;
};

export function createPlugin<Name extends string, P extends Plugin<Name, PluginWorld>>(plugin: P) {
    return plugin;
}

export type ExtractComponentTypeFromPlugin<P extends Plugin<string, PluginWorld>> = Parameters<
    Parameters<P['build']>[0]['addComponent']
>[1];

export type ExtractCustomEventFromPlugin<P extends Plugin<string, PluginWorld>> = Parameters<
    Parameters<P['build']>[0]['emit']
>[0];

export type ExtractResourcesFromPlugin<P extends Plugin<string, PluginWorld>> = Parameters<
    Parameters<P['build']>[0]['setResource']
>[1];
