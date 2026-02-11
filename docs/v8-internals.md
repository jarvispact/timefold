# V8 Engine Internals

This document summarizes critical V8 engine internals relevant to writing high-performance JavaScript code, particularly for performance-critical paths in Timefold (ECS systems, math operations, rendering/update loops).

## Four-Tier Compilation Pipeline

V8 uses a multi-tier JIT compilation strategy to balance startup time and peak performance:

### Tier 0 - Ignition (Interpreter)
- Parses JavaScript into an Abstract Syntax Tree (AST)
- Generates bytecode for quick execution
- Collects type feedback data during execution
- Prioritizes rapid startup without expensive compilation overhead

### Tier 1 - Sparkplug (Baseline Compiler)
- Introduced in 2021
- Compiles bytecode directly to unoptimized machine code
- No type specialization yet
- Bridges the performance gap between interpretation and optimization

### Tier 2 - Maglev (Mid-Tier Optimizer)
- Added in December 2023
- Uses Static Single Assignment (SSA) form and control flow graphs
- Generates "good enough code, fast enough"
- Faster compilation than TurboFan with reasonable optimization

### Tier 3 - TurboFan (Advanced Optimizer)
- Most aggressive optimizer
- Makes speculative assumptions based on observed type feedback
- Generates highly optimized machine code for hot functions
- Risk of deoptimization if assumptions are violated

## Hidden Classes: The Performance Foundation

V8 assigns each object a "hidden class" (also called "shape" or "map") that encodes its property layout.

**Key principle:** Objects with properties added in the same order share the same hidden class, enabling fast property access as fixed-offset memory reads rather than slow hash-table lookups.

### Hidden Class Anti-Patterns

```javascript
// BAD: Different initialization orders create different hidden classes
const obj1 = {};
obj1.x = 1;
obj1.y = 2;

const obj2 = {};
obj2.y = 2;  // Different order!
obj2.x = 1;
```

```javascript
// BAD: Conditional properties fragment the hidden class tree
function createConfig(includeOptional) {
  const config = { required: true };
  if (includeOptional) {
    config.optional = 42;  // Creates different hidden classes
  }
  return config;
}
```

### Hidden Class Best Practices

```javascript
// GOOD: Initialize all properties upfront, even optional ones
function createConfig(includeOptional) {
  const config = {
    required: true,
    optional: includeOptional ? 42 : null  // Always same shape
  };
  return config;
}
```

## Inline Caching and Monomorphism

Inline Caches (ICs) optimize repeated property accesses by caching offsets and rewriting machine code stubs.

### IC States

1. **Monomorphic** - Single hidden class observed (fastest, ~1x baseline)
2. **Polymorphic** - 2-4 hidden classes (~3x slower)
3. **Megamorphic** - Many hidden classes (10-50x slower, falls back to hash lookup)

### Monomorphic vs Polymorphic Example

```javascript
// MONOMORPHIC: Function always receives same type
function addVec3(a) {
  return a.x + a.y + a.z;  // Fast fixed-offset access
}

// POLYMORPHIC: Function receives different types
function process(obj) {
  return obj.value;  // Could be {value} or {value, other} or...
}
```

**Critical insight:** Design functions to receive objects of a single type/shape. If you need to handle multiple types, use separate monomorphic functions with a dispatcher.

## Deoptimization: The Performance Cliff

Deoptimization occurs when TurboFan's speculative assumptions fail, forcing V8 to discard optimized code and revert to lower tiers.

### Common Deoptimization Triggers

1. **Type changes** - Function parameter changes from Number to BigInt
2. **Hidden class mismatches** - Object shape changes unexpectedly
3. **Element kind transitions** - Array switches from packed integers to sparse objects
4. **Assumptions violated** - Prototype chain modifications, global variable changes

### Deoptimization Example

```javascript
// BAD: Mixing types causes deopt cycles
function add(a, b) {
  return a + b;
}

add(1, 2);      // Optimized for Numbers
add(1n, 2n);    // DEOPT! Now it's BigInt
add(3, 4);      // DEOPT again! Back to Numbers
```

```javascript
// GOOD: Separate monomorphic functions
function addNumber(a, b) { return a + b; }
function addBigInt(a, b) { return a + b; }

function add(a, b) {
  return typeof a === 'bigint' ? addBigInt(a, b) : addNumber(a, b);
}
```

## Memory Representation

### Small Integers (Smis)

- Represented with tagged pointers (no heap allocation)
- On 64-bit systems with pointer compression: 31-bit signed integers
- Range: approximately ±1 billion (±2³⁰)
- Arithmetic with Smis is extremely fast

```javascript
// GOOD: Stays in Smi range
for (let i = 0; i < 1000000; i++) {
  // Fast integer arithmetic
}

// BAD: Exceeds Smi range, requires heap allocation
const bigNum = 2_000_000_000;
```

### Heap Objects

- Non-Smi values require heap allocation
- V8 uses unboxing and escape analysis to minimize allocations
- String internalization: Identical string literals share memory

## Performance Anti-Patterns

### 1. Delete Operator

```javascript
// BAD: Forces object into slow dictionary mode
const obj = { x: 1, y: 2 };
delete obj.x;

// GOOD: Set to undefined/null to maintain shape
const obj = { x: 1, y: 2 };
obj.x = undefined;
```

### 2. Mixed Array Element Kinds

```javascript
// BAD: Forces element kind transitions
const arr = [1, 2, 3];        // PACKED_SMI_ELEMENTS
arr.push(4.5);                // Transition to PACKED_DOUBLE_ELEMENTS
arr.push({});                 // Transition to PACKED_ELEMENTS
arr[100] = 999;               // Transition to HOLEY_ELEMENTS (sparse)

// GOOD: Consistent element types
const ints = [1, 2, 3];
const floats = [1.5, 2.5, 3.5];
const objects = [{}, {}, {}];
```

### 3. Arguments Object

```javascript
// BAD: arguments object is slow and prevents optimization
function sum() {
  let total = 0;
  for (let i = 0; i < arguments.length; i++) {
    total += arguments[i];
  }
  return total;
}

// GOOD: Use rest parameters
function sum(...args) {
  let total = 0;
  for (let i = 0; i < args.length; i++) {
    total += args[i];
  }
  return total;
}
```

## Array Element Kinds (Deep Dive)

V8 tracks the type of values stored in arrays via "element kinds," enabling specialized fast paths for array operations.

### The Element Kind Lattice

Six core kinds arranged from most specific (fastest) to most general (slowest):

```
PACKED_SMI_ELEMENTS  →  PACKED_DOUBLE_ELEMENTS  →  PACKED_ELEMENTS
        ↓                        ↓                        ↓
HOLEY_SMI_ELEMENTS   →  HOLEY_DOUBLE_ELEMENTS   →  HOLEY_ELEMENTS
```

- **SMI** - Small integers only (no heap allocation)
- **DOUBLE** - Floating-point numbers (includes integers outside Smi range, `-0`, `NaN`, `Infinity`)
- **ELEMENTS** - Any value (strings, objects, mixed types)
- **PACKED** - Dense, no gaps in indices
- **HOLEY** - Sparse, has missing indices (holes)

### Transitions Are Irreversible

Element kind transitions only go in one direction — from specific to general. Once an array becomes `HOLEY`, it stays `HOLEY` forever, even if all holes are filled. Once it transitions from `SMI` to `DOUBLE`, it never goes back.

### PACKED vs HOLEY Performance Impact

Operations on packed arrays skip expensive prototype chain lookups. When V8 encounters a hole during array access, it must walk the prototype chain to check if the index exists on `Array.prototype` or `Object.prototype` — this is significantly slower.

```javascript
// BAD: Out-of-bounds read forces HOLEY handling on optimized code (~6x slower)
for (let i = 0, item; (item = items[i]) != null; i++) { /* ... */ }

// GOOD: Bounds-checked loop stays on fast path
for (let i = 0; i < items.length; i++) { /* ... */ }

// GOOD: Modern iteration
for (const item of items) { /* ... */ }
```

### Avoiding Unnecessary Transitions

```javascript
// BAD: new Array(n) creates HOLEY array permanently
const arr = new Array(3);
arr[0] = 'a'; arr[1] = 'b'; arr[2] = 'c';  // Still HOLEY

// GOOD: Literal creates PACKED
const arr = ['a', 'b', 'c'];

// BAD: -0, NaN, Infinity force SMI → DOUBLE transition
const arr = [1, 2, 3];  // PACKED_SMI_ELEMENTS
arr.push(-0);            // Now PACKED_DOUBLE_ELEMENTS forever

// GOOD: Normalize special values before insertion
arr.push(Math.max(0, value));  // Avoids -0
```

When creating new arrays, always prefer the following pattern:

```javascript
// GOOD: increase array size in a v8 friendly way (no holes, stays on fastest kind as long as possible)
const arr = [];
ar.push(0);
ar.push(1);
ar.push(2);

// BAD: V8 starts with holey kind right away, will never be optimized by V8!
const arr = new Array(3);
arr[0] = 0; arr[1] = 1; arr[2] = 2;
```

### Polymorphism in Array-Receiving Functions

Functions that receive arrays with different element kinds become polymorphic at those call sites. Built-in methods like `Array.prototype.forEach` handle this internally; user-defined functions do not.

```javascript
// BAD: Receives arrays with different element kinds → polymorphic
function processItems(arr) {
  for (let i = 0; i < arr.length; i++) { /* ... */ }
}
processItems([1, 2, 3]);          // PACKED_SMI_ELEMENTS
processItems([1.5, 2.5]);         // PACKED_DOUBLE_ELEMENTS
processItems(['a', 'b']);          // PACKED_ELEMENTS

// GOOD: Prefer built-ins or ensure consistent element kinds at call sites
```

### Prefer True Arrays Over Array-Likes

Array-like objects (e.g., `{ 0: 'a', 1: 'b', length: 2 }`) miss V8's array-specific optimizations. Convert to true arrays when performance matters:

```javascript
// Convert array-like to true array
const args = [...arrayLike];
// or
const args = Array.from(arrayLike);
```

**Source:** [V8 Blog - Elements Kinds](https://v8.dev/blog/elements-kinds)

## Best Practices for Performance-Critical Code

1. **Initialize all properties upfront** - Even optional ones (set to null/undefined)
2. **Design monomorphic functions** - Single type per function call site
3. **Use constructors** - Ensures consistent hidden classes
4. **Avoid delete operator** - Assign to undefined instead
5. **Keep arrays homogeneous** - Same element type throughout
6. **Stay in Smi range for counters/indices** - SMIs are fast for loop variables and array indexing, but not for math-heavy FPU work (use PACKED_DOUBLE for that)
7. **Avoid mixing types** - Don't mix Number/BigInt, int/float in hot paths
8. **Use `number[]` for math data** - Initialize with float literals (`0.0`) to get PACKED_DOUBLE_ELEMENTS; reserve `Float32Array` for GPU upload buffers
9. **Use factory functions** - Consistent object creation patterns

## Fundamental Principle

**Write predictable, monomorphic code that respects hidden class stability, and V8's compilers will reward you with near-C++ performance.**

---

**Source:** [The Node Book - V8 Engine Architecture](https://www.thenodebook.com/node-arch/v8-engine-intro)

## Benchmark Findings (Timefold-Specific)

The following findings come from controlled microbenchmarks run on this codebase (see `packages/examples/src/benchmarks/`). All benchmarks use 10M iterations per sample, 50 samples with trimmed means, randomized execution order, and extensive warmup.

### Data Representation for Math Operations

**Benchmark:** 4x4 matrix multiplication (`mat4Mul(out, a, b)`) in gl-matrix style — no allocations, all data passed through arguments.

**Variants tested:**
1. `number[]` — flat JS array with index access
2. `Float32Array` — typed array with index access
3. `Object` — named properties (`m00`, `m01`, ..., `m33`)

**Results with float values (realistic — PACKED_DOUBLE_ELEMENTS):**

| Representation | Mean (ms) | Median (ms) | vs fastest |
|---|---|---|---|
| `number[]` | 123.35 | 122.57 | — |
| Object | 142.98 | 142.87 | 14% slower |
| `Float32Array` | 167.60 | 167.54 | 26% slower |

**Results with integer values (PACKED_SMI_ELEMENTS):**

| Representation | Mean (ms) | Median (ms) | vs fastest |
|---|---|---|---|
| `Float32Array` | 161.81 | 161.02 | — |
| Object | 223.42 | 222.72 | 28% slower |
| `number[]` | 255.27 | 255.58 | 37% slower |

**Why the ranking flips between integers and floats:**

- **`number[]` with PACKED_DOUBLE** is fastest because loads/stores are direct 64-bit float operations — no conversions, no tagging. TurboFan generates clean FPU instructions (`mulsd`, `addsd`).
- **`number[]` with PACKED_SMI** is slowest because SMI values require tagging/untagging on every access, overflow checks on arithmetic, and implicit SMI→double conversion since JS math operates on doubles.
- **`Float32Array`** performance is constant regardless of input values (always float32 storage), but pays a float32↔float64 conversion penalty on every load (widening) and store (truncation). For mat4 multiply that's 48 extra conversions per call.
- **Object** with named properties performs well because V8 stores doubles unboxed in hidden class slots and inlines property access efficiently.

**Guideline:** Use `number[]` with `PACKED_DOUBLE_ELEMENTS` for math data. Always initialize with float literals (e.g. `0.0` not `0`) to ensure V8 uses the PACKED_DOUBLE element kind from the start. Avoid `Float32Array` for CPU-side math — the float32↔float64 conversion overhead is significant. Reserve `Float32Array` for GPU upload buffers where float32 is required by the API.

### Function Call Overhead

**Benchmark:** Mat4 multiply via call chain (`multiplyCall → multiply → copy`) vs fully inlined equivalent.

| Variant | Mean (ms) |
|---|---|
| Call chain | 289.97 |
| Inlined | 268.66 |

Inlining gives ~7% improvement for mat4-sized operations. For smaller operations (vec2, vec3), TurboFan's automatic inlining eliminates the difference. Manual inlining is only worth it for larger operation chains.

### Arrow Functions vs Regular Functions

No measurable difference between arrow functions and regular `function` declarations, even for callbacks inside hot loops. Use arrow functions per project convention without performance concern.

### Argument Passing vs Closure Capture

No measurable difference between passing data as a function argument vs accessing it through a closure variable, even with nested closures. Choose whichever style produces clearer code.
