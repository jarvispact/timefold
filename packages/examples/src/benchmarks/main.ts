// TODO:
// math operations with arrays vs objects vs typed arrays
// loops forEach vs for of vs for loop

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
