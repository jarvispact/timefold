# ECS Performance Benchmarks

This directory contains a comprehensive benchmark suite for the ECS (Entity Component System) module, specifically targeting the `world.ts` public API.

## Overview

The benchmark suite measures performance characteristics of all major ECS operations at scale (10K-100K+ entities), helping track performance over time and identify potential bottlenecks.

## Benchmark Categories

### 1. Entity Lifecycle (`entity-lifecycle.bench.ts`)
Measures entity creation, spawning, and despawning operations:
- `createEntity` - Entity ID generation and pool recycling
- `spawn` - Entity spawning with 1, 3, and 5 components
- `despawn` - Entity removal with and without active queries
- Combined spawn/despawn cycles

### 2. Component Operations (`component-operations.bench.ts`)
Measures component manipulation on existing entities:
- `addComponent` - Adding components with varying query impact
- `removeComponent` - Removing components with query updates
- `getComponent` - Component retrieval (hit and miss scenarios)
- Component churn patterns (rapid add/remove cycles)

### 3. Query Operations (`query-operations.bench.ts`)
Measures query creation and iteration:
- `createQuery` - Simple (2 components) and complex (5 components) queries
- Query iteration with different match rates (10%, 50%, 90%)
- Queries with/without `map` functions
- Queries with/without `includeEntity`
- Multiple simultaneous queries

### 4. Query Updates (`query-updates.bench.ts`)
Measures query update overhead during mutations:
- Query updates during `spawn` (0, 1, 5, 10 queries)
- Query updates during `addComponent`
- Query updates during `removeComponent`
- Query updates during `despawn`

### 5. Event System (`event-system.bench.ts`)
Measures event subscription and emission:
- `on` - Event subscription
- `emit` - Event emission with 0, 1, 10, 100 subscribers
- Events with payloads
- Built-in ECS events (spawn, despawn, add/remove component)
- Mixed event types

### 6. Serialization (`serialization.bench.ts`)
Measures world state serialization/deserialization:
- `serialize` - World serialization at different scales
- `deserialize` - World deserialization
- Round-trip (serialize + deserialize)
- Custom serialization functions

### 7. Combined Scenarios (`combined-scenarios.bench.ts`)
Realistic workload patterns:
- Game loop simulation
- Batch operations (spawn/despawn)
- Component churn scenarios
- Query-heavy workloads
- Event-heavy workloads
- Mixed workloads (realistic game simulation)

## Running Benchmarks

### Run All Benchmarks
```bash
npm run bench
```
This runs benchmarks interactively (watch mode). Results are displayed in the console but NOT saved to file.

### Run Benchmarks Once and Save Results (Recommended)
```bash
npm run bench:run
```
This runs all benchmarks once and saves results to `benchmarks/results/latest.json` for comparison.

### Run Specific Benchmark Suites
```bash
npm run bench:entity          # Entity lifecycle operations → entity-lifecycle.json
npm run bench:component       # Component operations → component-operations.json
npm run bench:query           # Query operations → query-operations.json
npm run bench:query-updates   # Query update overhead → query-updates.json
npm run bench:events          # Event system → event-system.json
npm run bench:serialization   # Serialization/deserialization → serialization.json
npm run bench:combined        # Combined realistic scenarios → combined-scenarios.json
```
Each suite saves its results to a separate JSON file in `benchmarks/results/`.

## Benchmark Scales

All benchmarks are tested at multiple scales:
- **10K entities** - Medium scale (baseline)
- **50K entities** - Large scale (target performance)
- **100K entities** - Extra-large scale (stress test)

The scale focus aligns with large-scale game and simulation requirements.

## Output

### Console Output
Benchmarks display timing statistics in the terminal:
- **hz** - Operations per second (throughput)
- **mean** - Average execution time in milliseconds
- **min/max** - Best and worst case timings
- **p75/p99/p995/p999** - Percentile timings (e.g., p99 = 99% of runs were faster)
- **rme** - Relative margin of error (performance consistency)
- **samples** - Number of times the benchmark was run

Example console output:
```
spawn [100 entities] - 0 queries  31,480.80  0.0275  0.7778  0.0318  0.0310  0.0753  0.0818  0.1251  ±0.61%  15741
```

### JSON Output Files
When running `npm run bench:run` or specific benchmark suites, results are saved to JSON files in `benchmarks/results/`:

- **latest.json** - All benchmark results (when using `npm run bench:run`)
- **entity-lifecycle.json** - Entity operations only
- **component-operations.json** - Component operations only
- **query-operations.json** - Query operations only
- **query-updates.json** - Query update overhead only
- **event-system.json** - Event system only
- **serialization.json** - Serialization only
- **combined-scenarios.json** - Combined scenarios only

Each JSON file contains detailed statistics for every benchmark including:
```json
{
  "name": "spawn [100 entities] - 0 queries",
  "hz": 31346.81,           // Operations per second
  "mean": 0.0319,           // Mean time in ms
  "median": 0.0286,         // Median time in ms
  "min": 0.0272,            // Minimum time in ms
  "max": 1.1824,            // Maximum time in ms
  "p75": 0.0310,            // 75th percentile
  "p99": 0.0808,            // 99th percentile
  "p995": 0.0908,           // 99.5th percentile
  "p999": 0.1219,           // 99.9th percentile
  "rme": 0.71,              // Relative margin of error (%)
  "sampleCount": 15674      // Number of samples collected
}
```

## Implementation Notes

### Design Principles
1. **No implementation changes** - Benchmarks are purely external, measuring the public API
2. **Deterministic data** - Uses seeded random generation for reproducible results
3. **JIT warmup** - Each benchmark includes warmup iterations
4. **Isolated worlds** - Each benchmark uses fresh World instances
5. **Realistic workloads** - Combined scenarios simulate real game patterns

### Fixtures
The `fixtures.ts` file provides:
- Predefined component types (Position, Velocity, Health, etc.)
- Component factory functions
- World population utilities
- Seeded random data generation

### Utilities
The `utils.ts` file provides:
- Scale definitions and helpers
- Formatting functions
- Benchmark configuration utilities

## Interpreting Results

### What to Look For

1. **Linear Scaling** - Most operations should scale linearly with entity count
2. **Query Overhead** - Compare operations with 0 vs 10 queries to measure overhead
3. **Consistency** - Low standard deviation indicates stable performance
4. **Bottlenecks** - Operations with disproportionate slowdown need attention

### Performance Expectations

At 50K entities:
- **Entity spawn/despawn**: Should handle thousands per frame
- **Component operations**: Should be fast (microseconds per operation)
- **Query iteration**: Should scale with result set size, not total entity count
- **Serialization**: May take longer but should be reasonable (<100ms)

### Tracking Over Time

**To track performance changes across code modifications:**

1. **Establish a baseline** - Run benchmarks on main/stable branch and save as baseline:
   ```bash
   npm run bench:baseline
   ```
   This runs all benchmarks and saves the results to `benchmarks/results/baseline.json`.

2. **Make your changes** - Modify code, optimize, refactor, etc.

3. **Compare against baseline**:
   ```bash
   npm run bench:compare
   ```
   This runs benchmarks again and shows side-by-side comparison with the baseline, highlighting improvements (⇑) and regressions (⇓).

**Alternative workflow:**

If you want more control:
```bash
# Save current state as baseline
npm run bench:run
cp benchmarks/results/latest.json benchmarks/results/baseline.json

# Make changes...

# Run and compare
vitest bench --run --config vitest.bench.config.ts \
  --compare ./benchmarks/results/baseline.json \
  --outputJson ./benchmarks/results/latest.json
```

**Reading comparison output:**
- `[1.02x] ⇑` (green) = 2% faster than baseline (improvement)
- `[0.98x] ⇓` (red) = 2% slower than baseline (regression)
- `[1.00x]` = No significant change

**Manual JSON comparison:**
You can also compare the JSON files directly. Look at these metrics:
- `hz` - Higher is better (more operations per second)
- `mean` - Lower is better (faster average time in ms)
- `p99` - Lower is better (consistent performance)
- `rme` - Lower is better (more stable results)

**Example interpretation:**
- Baseline: `hz: 31,346` → Current: `hz: 35,000` = **11.6% faster** ✅
- Baseline: `mean: 0.0319ms` → Current: `mean: 0.0286ms` = **10.3% faster** ✅
- Baseline: `hz: 31,346` → Current: `hz: 28,000` = **10.7% slower** ⚠️ (regression!)

## Extending Benchmarks

To add new benchmarks:

1. Create a new `.bench.ts` file in the `benchmarks/` directory
2. Import necessary fixtures and utilities
3. Use Vitest's `bench()` function to define benchmarks
4. Follow the naming pattern: `describeBenchmark(operation, scale, details)`
5. Import the new file in `world.bench.ts`
6. Add a corresponding npm script in `package.json`

Example:
```typescript
import { bench, describe } from 'vitest';
import { createWorld } from '../src/world';
import { SCALES, describeBenchmark } from './utils';

describe('My New Benchmarks', () => {
    SCALES.forEach((scale) => {
        bench(describeBenchmark('myOperation', scale), () => {
            // Benchmark code here
        });
    });
});
```

## Troubleshooting

### Benchmarks Taking Too Long
- Reduce scale by running individual benchmark files
- Adjust iterations in benchmark config
- Run specific scales only

### Inconsistent Results
- Ensure no other intensive processes running
- Run multiple times and average results
- Check for thermal throttling on laptop

### Out of Memory
- 100K entity benchmarks may require more heap
- Use Node.js with increased memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run bench`

## Notes

- Benchmarks focus on **timing only** - JavaScript doesn't expose memory allocation metrics
- Results vary by hardware - use for relative comparison, not absolute numbers
- Large-scale benchmarks (100K entities) may take several minutes to complete
- Benchmark results are stored in `benchmarks/results/` (gitignored)
