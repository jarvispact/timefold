// TODO:
// arrow vs regular function with args and higher scope
// math operations with arrays vs objects vs typed arrays
// loops forEach vs for of vs for loop

// Outcome of function-inlining benchmark:
// Inlining is not worth it for vec2, vec3, ...
// but for mat4 and longer/more operations it can be worth it.

// Results
// Call chain:      mean=289.97  median=289.99  stddev=3.02
// Inlined:         mean=268.66  median=267.83  stddev=4.29
// Difference: inlined is 7.35% faster (trimmed mean)
import './function-inlining';
