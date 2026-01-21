/**
 * Main benchmark suite entry point
 *
 * This file imports all benchmark suites for the ECS World API.
 * Run all benchmarks with: npm run bench
 *
 * Individual suites can be run with:
 * - npm run bench:entity      (entity lifecycle)
 * - npm run bench:component   (component operations)
 * - npm run bench:query       (query operations)
 * - npm run bench:events      (event system)
 * - npm run bench:serialization (serialization/deserialization)
 * - npm run bench:combined    (realistic scenarios)
 */

import './entity-lifecycle.bench';
import './component-operations.bench';
import './query-operations.bench';
import './query-updates.bench';
import './event-system.bench';
import './serialization.bench';
import './combined-scenarios.bench';
