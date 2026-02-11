// TODO:
// math operations with arrays vs objects vs typed arrays
// loops forEach vs for of vs for loop
// SMI vs non-SMI numbers

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
// Results
// number[]:     mean=255.27  median=255.58  stddev=4.35
// Float32Array: mean=161.81  median=161.02  stddev=2.72
// Object:       mean=223.42  median=222.72  stddev=4.44
// Float32Array is 27.58% faster than Object (trimmed mean)
// Float32Array is 36.61% faster than number[] (trimmed mean)
import './array-vs-typed-vs-object';
