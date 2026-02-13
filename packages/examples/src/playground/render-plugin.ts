import { PluginBuilder, QueryBuilder } from '@timefold/ecs';
import { EngineComponent, T } from '@timefold/engine';

const Renderables = QueryBuilder<EngineComponent>()
    .name('Renderables')
    .with(T.Transform)
    .with(T.PhongMaterial)
    .compile();

export const RenderPlugin = PluginBuilder<EngineComponent>().name('RenderPlugin').withQueries(Renderables).compile();
