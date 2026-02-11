---
name: benchmark
description: Create fair browser-based microbenchmarks in TypeScript. Use when the user asks to benchmark, compare performance of, or measure the speed of two or more code variants. Produces files in packages/examples/src/benchmarks/.
---

# Benchmark

Create a new `.ts` file in `packages/examples/src/benchmarks/` that fairly compares N code variants.

## File Structure

```ts
// --- Variant A: descriptive name ---
function variantA(/* args */) { /* ... */ }

// --- Variant B: descriptive name ---
function variantB(/* args */) { /* ... */ }

// --- Benchmark harness ---
// (see template below)
```

## Harness Template

Use this exact pattern. Adapt `ITERATIONS` to make each sample take ~5-50ms. All benchmark functions and the harness must use plain `for` loops, never `.forEach`/`.map`/`.filter`.

```ts
const ITERATIONS = 10_000_000;
const SAMPLES = 50;
const WARMUP_RUNS = 100;
const TRIM_COUNT = 5;

let sink = 0; // accumulate results here to prevent dead code elimination

function runTrial(fn: () => number, iterations: number): number {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        sink += fn();
    }
    return performance.now() - start;
}
```

Adapt `runTrial` signature to match what the variants accept/return. The critical rule: **every return value or meaningful side-effect must feed into `sink`** so V8 cannot eliminate the work.

## Fairness Rules (mandatory)

Apply every one of these in every benchmark:

### 1. Warmup

Run each variant `WARMUP_RUNS` times (each run = `ITERATIONS` calls) before collecting samples. This lets V8 TurboFan produce optimized machine code. Yield between warmups:

```ts
warmup(variantA);
await new Promise(r => setTimeout(r, 100));
warmup(variantB);
await new Promise(r => setTimeout(r, 100));
```

### 2. Randomized execution order

Build a schedule array with `SAMPLES` entries per variant, then Fisher-Yates shuffle it:

```ts
const schedule: number[] = [];
for (let i = 0; i < SAMPLES; i++) {
    schedule.push(0); // variant A
    schedule.push(1); // variant B
    // push(2), push(3)... for more variants
}
for (let i = schedule.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = schedule[i];
    schedule[i] = schedule[j];
    schedule[j] = tmp;
}
```

Then iterate `schedule` and push results into per-variant arrays.

### 3. Yield between samples

Every 10 samples, yield to let GC run and reduce thermal throttling bias:

```ts
if (i % 10 === 9) {
    await new Promise(r => setTimeout(r, 50));
}
```

### 4. Trimmed mean + median + stddev

Discard `TRIM_COUNT` from each end before averaging. Report trimmed mean, median, and stddev:

```ts
function trimmedMean(times: number[]): number {
    const sorted = [...times].sort((a, b) => a - b);
    const trimmed = sorted.slice(TRIM_COUNT, sorted.length - TRIM_COUNT);
    let sum = 0;
    for (let i = 0; i < trimmed.length; i++) sum += trimmed[i];
    return sum / trimmed.length;
}

function median(times: number[]): number {
    const sorted = [...times].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
    return sorted[mid];
}

function stdDev(times: number[], mean: number): number {
    let sum = 0;
    for (let i = 0; i < times.length; i++) {
        const diff = times[i] - mean;
        sum += diff * diff;
    }
    return Math.sqrt(sum / times.length);
}
```

### 5. Dead code elimination prevention

Every variant's return value must accumulate into `sink`. Print `sink` at the end so V8 treats it as observable.

### 6. Identical function shapes

All variants must have the same call signature and return type. Allocate separate state (e.g. output buffers) per variant so they don't share mutable state.

## Output Format

Print to `console.log`:

```
=== Benchmark Name ===
Iterations per sample: 10,000,000
Samples: 50 (trimming 5 from each end)
Warmup runs: 100

Warming up variant A...
Warming up variant B...
Running samples...

--- Results (ms) ---

Variant A:   mean=X.XX  median=X.XX  stddev=X.XX
Variant B:   mean=X.XX  median=X.XX  stddev=X.XX

Difference: variant X is Y.YY% faster (trimmed mean)
Sink: <sink value>
```

## Wiring

After creating the file, update `packages/examples/src/benchmarks/main.ts` to import it (comment out other imports so only one benchmark runs at a time).
