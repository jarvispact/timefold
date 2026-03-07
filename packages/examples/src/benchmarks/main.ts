// TODO:
// loops forEach vs for of vs for loop

// Prompt template:
/**
Create a new benchmark file in `packages/examples/src/benchmarks`. Use the skill for that. I want to compare the performance of a math arrow functions in gl-matrix style ( `const mat4Mul = (out, a, b) => { ... }` ). The function should not create a new object or array, everything is passed through arguments. Compate the following cases:

1. mat4 data is represented as a flat js number array
2. mat4 data is represented as a Float32Array
3. mat4 data is represented as an object with named properties (e.g. `m00`, `m01`, ..., `m33`)

The function should perform the exact same math operations in all cases, just how the data is stored and accessed is different.
 */

// ================================================================
// Outcome of function-inlining benchmark:
// Inlining is not worth it for vec2, vec3, ...
// but for mat4 and longer/more operations it can be worth it.

// Results
// Call chain:      mean=289.97  median=289.99  stddev=3.02
// Inlined:         mean=268.66  median=267.83  stddev=4.29
// Difference: inlined is 7.35% faster (trimmed mean)
// import './function-inlining';

// ================================================================
// Outcome of arrow-vs-regular benchmark:
// No meaningful difference between arrow and regular functions, even for callbacks in a loop.
// import './arrow-vs-regular';

// ================================================================
// Outcome of arg-vs-closure benchmark:
// No meaningful difference between passing data as an argument vs accessing it via closure, even for nested closures.
// import './arg-vs-closure';

// ================================================================
// Outcome of array-vs-typed-vs-object benchmark:
// Fastest: Float32Array, then Object, then number[] (but Object is close to number[])
// If we write math functions we should make them operate on arrays or typed arrays.

// Results (integer literals)
// number[]:     mean=255.27  median=255.58  stddev=4.35
// Float32Array: mean=161.81  median=161.02  stddev=2.72
// Object:       mean=223.42  median=222.72  stddev=4.44
// Float32Array is 27.58% faster than Object (trimmed mean)
// Float32Array is 36.61% faster than number[] (trimmed mean)

// Results (forced floats)
// number[]:     mean=123.35  median=122.57  stddev=1.81
// Float32Array: mean=167.60  median=167.54  stddev=2.03
// Object:       mean=142.98  median=142.87  stddev=1.18
// number[] is 13.73% faster than Object (trimmed mean)
// number[] is 26.40% faster than Float32Array (trimmed mean)

// Claude Opus 4.6 analysis of results:
//   PACKED_DOUBLE (current, floats) — fastest:
//   - Loads/stores are direct 64-bit float operations, no conversions
//   - Arithmetic uses native FPU instructions (mulsd, addsd) with zero overhead
//   - TurboFan generates very clean machine code

//   PACKED_SMI (previous, integers) — surprisingly slow for math:
//   - Values are stored as tagged SMIs (pointer-tagging with bit shift)
//   - Every load needs untagging, every store needs tagging
//   - Multiplications may need overflow checks (does the result still fit in SMI?)
//   - JS arithmetic fundamentally operates on doubles, so SMIs often get converted to doubles internally anyway for * and + chains

//   Float32Array — middle ground:
//   - No tagging overhead (good)
//   - But every load does float32 → float64 widening (JS numbers are float64)
//   - Every store does float64 → float32 truncation
//   - That's 32 loads + 16 stores = 48 extra conversions per mat4 multiply

//   So the ranking makes perfect sense:
//   1. number[] (PACKED_DOUBLE) — zero conversion overhead, direct double read/write
//   2. Object — V8 inlines named property access well, also stores doubles (unboxed in hidden class slots)
//   3. Float32Array — float32↔float64 conversion penalty on every access

//   SMIs win for things like loop counters and array indices where V8 keeps everything in integer registers. For math-heavy FPU work, unboxed
//   doubles are the ideal representation.
// import './array-vs-typed-vs-object';

// ================================================================
// JS Array + Copy vs ArrayBuffer Views: ECS Data Pipeline
// Tests whether number[] components + staging buffer copy (Option A)
// outperform Float32Array views into per-entity ArrayBuffers (Option B)
// when composing model matrices from TRS per entity.

// Results (ms per 1000 frames):
//   JS Arrays + Copy:    mean=1362.19  median=1343.46  stddev=36.87
//   ArrayBuffer Views:   mean=683.23  median=683.11  stddev=2.41

//   Per-frame average: A=1.3622ms  B=0.6832ms
//   => ArrayBuffer Views is 49.84% faster than JS Arrays + Copy (trimmed mean)

// Removing the copy operation from the equation!
// Results (ms per 1000 frames):
//   JS Arrays + Copy:    mean=572.29  median=571.67  stddev=4.20
//   ArrayBuffer Views:   mean=689.08  median=688.68  stddev=1.66

//   Per-frame average: A=0.5723ms  B=0.6891ms
//   => JS Arrays + Copy is 16.95% faster than ArrayBuffer Views (trimmed mean)

// Adding a new js array + direct write approach:
// Results (ms per 1000 frames):
//   A) JS Arrays + Copy:        mean=1359.64  median=1344.38  stddev=35.35
//   B) ArrayBuffer Views:       mean=687.46  median=687.69  stddev=2.55
//   C) JS Arrays + Direct Write: mean=618.74  median=617.48  stddev=5.24

//   Per-frame average: A=1.3596ms  B=0.6875ms  C=0.6187ms
//   C) JS Arrays + Direct Write is 10.00% faster than B) ArrayBuffer Views (trimmed mean)
//   C) JS Arrays + Direct Write is 54.49% faster than A) JS Arrays + Copy (trimmed mean)
// import './js-array-vs-arraybuffer';

// ===============================================================
// Performance of world updates - dense query array iteration

/**

Results:

Results (ms per 1,000 frames):
   mean=321.89  median=321.14  stddev=7.93
   per-frame average: 0.3219ms
   per-frame FPS equivalent: 3107 (if this was the only work)

Results (ms per 1,000 frames):
   mean=325.61  median=325.07  stddev=7.34
   per-frame average: 0.3256ms
   per-frame FPS equivalent: 3071 (if this was the only work)

Results (ms per 1,000 frames):
   mean=330.98  median=329.62  stddev=7.04
   per-frame average: 0.3310ms
   per-frame FPS equivalent: 3021 (if this was the only work)

 */

import './ecs-world-update';
