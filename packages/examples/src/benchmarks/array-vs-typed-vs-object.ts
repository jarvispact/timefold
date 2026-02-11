// === Mat4 Multiply: Array vs Float32Array vs Object ===
//
// Compares three data representations for 4x4 matrix multiplication:
// 1. Flat JavaScript number[] array
// 2. Float32Array
// 3. Object with named properties (m00..m33)

// --- Types ---

/* eslint-disable prettier/prettier */

interface Mat4Obj {
    m00: number; m01: number; m02: number; m03: number;
    m10: number; m11: number; m12: number; m13: number;
    m20: number; m21: number; m22: number; m23: number;
    m30: number; m31: number; m32: number; m33: number;
}

// --- Variant A: number[] ---

const mat4MulArray = (out: number[], a: number[], b: number[]): number[] => {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
    const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
    const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
    const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

    out[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    out[1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    out[2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    out[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
    out[4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
    out[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
    out[6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
    out[7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
    out[8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
    out[9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
    out[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
    out[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
    out[12] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
    out[13] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
    out[14] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
    out[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

    return out;
};

// --- Variant B: Float32Array ---

const mat4MulF32 = (out: Float32Array, a: Float32Array, b: Float32Array): Float32Array => {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
    const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
    const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
    const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

    out[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    out[1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    out[2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    out[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
    out[4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
    out[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
    out[6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
    out[7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
    out[8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
    out[9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
    out[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
    out[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
    out[12] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
    out[13] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
    out[14] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
    out[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

    return out;
};

// --- Variant C: Object with named properties ---

const mat4MulObj = (out: Mat4Obj, a: Mat4Obj, b: Mat4Obj): Mat4Obj => {
    const a00 = a.m00, a01 = a.m01, a02 = a.m02, a03 = a.m03;
    const a10 = a.m10, a11 = a.m11, a12 = a.m12, a13 = a.m13;
    const a20 = a.m20, a21 = a.m21, a22 = a.m22, a23 = a.m23;
    const a30 = a.m30, a31 = a.m31, a32 = a.m32, a33 = a.m33;

    const b00 = b.m00, b01 = b.m01, b02 = b.m02, b03 = b.m03;
    const b10 = b.m10, b11 = b.m11, b12 = b.m12, b13 = b.m13;
    const b20 = b.m20, b21 = b.m21, b22 = b.m22, b23 = b.m23;
    const b30 = b.m30, b31 = b.m31, b32 = b.m32, b33 = b.m33;

    out.m00 = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    out.m01 = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    out.m02 = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    out.m03 = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
    out.m10 = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
    out.m11 = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
    out.m12 = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
    out.m13 = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
    out.m20 = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
    out.m21 = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
    out.m22 = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
    out.m23 = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
    out.m30 = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
    out.m31 = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
    out.m32 = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
    out.m33 = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

    return out;
};

// --- Benchmark harness ---

const ITERATIONS = 10_000_000;
const SAMPLES = 50;
const WARMUP_RUNS = 100;
const TRIM_COUNT = 5;

let sink = 0;

// --- Per-variant state (no sharing) ---

// prettier-ignore
const arrA: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
// prettier-ignore
const arrB: number[] = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
// prettier-ignore
const arrOut: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

// prettier-ignore
const f32A = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
// prettier-ignore
const f32B = new Float32Array([16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
const f32Out = new Float32Array(16);

const objA: Mat4Obj = {
    m00: 1, m01: 2, m02: 3, m03: 4,
    m10: 5, m11: 6, m12: 7, m13: 8,
    m20: 9, m21: 10, m22: 11, m23: 12,
    m30: 13, m31: 14, m32: 15, m33: 16,
};
const objB: Mat4Obj = {
    m00: 16, m01: 15, m02: 14, m03: 13,
    m10: 12, m11: 11, m12: 10, m13: 9,
    m20: 8, m21: 7, m22: 6, m23: 5,
    m30: 4, m31: 3, m32: 2, m33: 1,
};
const objOut: Mat4Obj = {
    m00: 0, m01: 0, m02: 0, m03: 0,
    m10: 0, m11: 0, m12: 0, m13: 0,
    m20: 0, m21: 0, m22: 0, m23: 0,
    m30: 0, m31: 0, m32: 0, m33: 0,
};

/* eslint-enable prettier/prettier */

// --- Trial runners ---

const runTrialArray = (iterations: number): number => {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        mat4MulArray(arrOut, arrA, arrB);
        sink += arrOut[0];
    }
    return performance.now() - start;
};

const runTrialF32 = (iterations: number): number => {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        mat4MulF32(f32Out, f32A, f32B);
        sink += f32Out[0];
    }
    return performance.now() - start;
};

const runTrialObj = (iterations: number): number => {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        mat4MulObj(objOut, objA, objB);
        sink += objOut.m00;
    }
    return performance.now() - start;
};

// --- Warmup ---

const warmupArray = () => {
    for (let i = 0; i < WARMUP_RUNS; i++) {
        for (let j = 0; j < ITERATIONS; j++) {
            mat4MulArray(arrOut, arrA, arrB);
            sink += arrOut[0];
        }
    }
};

const warmupF32 = () => {
    for (let i = 0; i < WARMUP_RUNS; i++) {
        for (let j = 0; j < ITERATIONS; j++) {
            mat4MulF32(f32Out, f32A, f32B);
            sink += f32Out[0];
        }
    }
};

const warmupObj = () => {
    for (let i = 0; i < WARMUP_RUNS; i++) {
        for (let j = 0; j < ITERATIONS; j++) {
            mat4MulObj(objOut, objA, objB);
            sink += objOut.m00;
        }
    }
};

// --- Statistics ---

const trimmedMean = (times: number[]): number => {
    const sorted = [...times].sort((a, b) => a - b);
    const trimmed = sorted.slice(TRIM_COUNT, sorted.length - TRIM_COUNT);
    let sum = 0;
    for (let i = 0; i < trimmed.length; i++) sum += trimmed[i];
    return sum / trimmed.length;
};

const median = (times: number[]): number => {
    const sorted = [...times].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
    return sorted[mid];
};

const stdDev = (times: number[], mean: number): number => {
    let sum = 0;
    for (let i = 0; i < times.length; i++) {
        const diff = times[i] - mean;
        sum += diff * diff;
    }
    return Math.sqrt(sum / times.length);
};

// --- Main ---

const runBenchmark = async () => {
    console.log('=== Mat4 Multiply: Array vs Float32Array vs Object ===');
    console.log(`Iterations per sample: ${ITERATIONS.toLocaleString()}`);
    console.log(`Samples: ${SAMPLES} (trimming ${TRIM_COUNT} from each end)`);
    console.log(`Warmup runs: ${WARMUP_RUNS}`);
    console.log('');

    console.log('Warming up number[] variant...');
    warmupArray();
    await new Promise((r) => setTimeout(r, 100));

    console.log('Warming up Float32Array variant...');
    warmupF32();
    await new Promise((r) => setTimeout(r, 100));

    console.log('Warming up Object variant...');
    warmupObj();
    await new Promise((r) => setTimeout(r, 100));

    console.log('Running samples...');
    console.log('');

    const arrayTimes: number[] = [];
    const f32Times: number[] = [];
    const objTimes: number[] = [];

    // Build randomized schedule: 0=array, 1=f32, 2=obj
    const schedule: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
        schedule.push(0);
        schedule.push(1);
        schedule.push(2);
    }
    for (let i = schedule.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = schedule[i];
        schedule[i] = schedule[j];
        schedule[j] = tmp;
    }

    for (let i = 0; i < schedule.length; i++) {
        if (schedule[i] === 0) {
            arrayTimes.push(runTrialArray(ITERATIONS));
        } else if (schedule[i] === 1) {
            f32Times.push(runTrialF32(ITERATIONS));
        } else {
            objTimes.push(runTrialObj(ITERATIONS));
        }
        if (i % 10 === 9) {
            await new Promise((r) => setTimeout(r, 50));
        }
    }

    const arrMean = trimmedMean(arrayTimes);
    const f32Mean = trimmedMean(f32Times);
    const objMean = trimmedMean(objTimes);

    const arrMed = median(arrayTimes);
    const f32Med = median(f32Times);
    const objMed = median(objTimes);

    const arrStd = stdDev(arrayTimes, arrMean);
    const f32Std = stdDev(f32Times, f32Mean);
    const objStd = stdDev(objTimes, objMean);

    console.log('--- Results (ms) ---');
    console.log('');
    console.log(`number[]:     mean=${arrMean.toFixed(2)}  median=${arrMed.toFixed(2)}  stddev=${arrStd.toFixed(2)}`);
    console.log(`Float32Array: mean=${f32Mean.toFixed(2)}  median=${f32Med.toFixed(2)}  stddev=${f32Std.toFixed(2)}`);
    console.log(`Object:       mean=${objMean.toFixed(2)}  median=${objMed.toFixed(2)}  stddev=${objStd.toFixed(2)}`);
    console.log('');

    // Find fastest
    const means = [
        { name: 'number[]', mean: arrMean },
        { name: 'Float32Array', mean: f32Mean },
        { name: 'Object', mean: objMean },
    ];
    means.sort((a, b) => a.mean - b.mean);

    for (let i = 1; i < means.length; i++) {
        const diffPct = ((means[i].mean - means[0].mean) / means[i].mean) * 100;
        console.log(`${means[0].name} is ${diffPct.toFixed(2)}% faster than ${means[i].name} (trimmed mean)`);
    }

    console.log('');
    console.log(`Sink: ${sink}`);
};

void runBenchmark();
