# Thoughts about systems and plugins

- timefold and other libraries can create plugins and systems.
- consumers can define plugins and systems.
- consumers can define the final execution order in detail.
- plugins and systems depend on queries and will be injected by the ecs world.
    - We need a way for library authors of plugins and systems to inform about required queries.
- every system has a unique id, and a "stage".
- systems define their query and resource dependencies.
- Some stages **may** be fixed, but the consumer or libraries can define new ones.
    - Example of fixed stages: `update`, `render`.
- synchronous and asynchronous systems are supported at any stage.
- asynchronous systems within the same stage can run in parallel.
- systems need a way to share data. One systems output can be the input of the next one.
    - The system graph is typesafe.
    - If `system2` depends on `system1` the result of `system1` should be available as input to `system2` in a typesafe way.

## Exploring the API

```ts
import { worldBuilder, defineQueries } from '@timefold/ecs';

const queries = defineQueries({ ... });
type Queries = typeof queries;

const ConsumerSystem = systemBuilder<Queries, Resources>()
    .withQuery('some-query')
    .withResources(['res1', 'res2'])
    .fn(({query, resources}) => {
        // System impl
    })
    .compile();

const ConsumerPlugin = pluginBuilder()
    .addSystem('systemID', system);

const world = worldBuilder<WorldComponent>()
    .defineResources({ ... })
    .defineQueries(queries)
    .definePlugins({ ... });
```