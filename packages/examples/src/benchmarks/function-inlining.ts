// prettier-ignore
type Mat4 = [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
];

// --- Shared helpers used by variant A ---

function copy(out: Mat4, m: Mat4): Mat4 {
    out[0] = m[0];
    out[1] = m[1];
    out[2] = m[2];
    out[3] = m[3];
    out[4] = m[4];
    out[5] = m[5];
    out[6] = m[6];
    out[7] = m[7];
    out[8] = m[8];
    out[9] = m[9];
    out[10] = m[10];
    out[11] = m[11];
    out[12] = m[12];
    out[13] = m[13];
    out[14] = m[14];
    out[15] = m[15];
    return out;
}

// prettier-ignore
const temp: Mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
    const a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    const a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];
    const a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];
    const a30 = a[12],
        a31 = a[13],
        a32 = a[14],
        a33 = a[15];

    const b00 = b[0],
        b01 = b[1],
        b02 = b[2],
        b03 = b[3];
    const b10 = b[4],
        b11 = b[5],
        b12 = b[6],
        b13 = b[7];
    const b20 = b[8],
        b21 = b[9],
        b22 = b[10],
        b23 = b[11];
    const b30 = b[12],
        b31 = b[13],
        b32 = b[14],
        b33 = b[15];

    temp[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    temp[1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    temp[2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    temp[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
    temp[4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
    temp[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
    temp[6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
    temp[7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
    temp[8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
    temp[9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
    temp[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
    temp[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
    temp[12] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
    temp[13] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
    temp[14] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
    temp[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

    return copy(out, temp);
}

// --- Variant A: call chain (multiplyCall -> multiply -> copy) ---

// prettier-ignore
const outA: Mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
function multiplyCall(a: Mat4, b: Mat4): Mat4 {
    return multiply(outA, a, b);
}

// --- Variant B: fully inlined (same operations, no function calls) ---

// prettier-ignore
const tempB: Mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
// prettier-ignore
const outB: Mat4 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
function multiplyInlined(a: Mat4, b: Mat4): Mat4 {
    // inlined: multiply body (writes to tempB)
    const a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3];
    const a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];
    const a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];
    const a30 = a[12],
        a31 = a[13],
        a32 = a[14],
        a33 = a[15];

    const b00 = b[0],
        b01 = b[1],
        b02 = b[2],
        b03 = b[3];
    const b10 = b[4],
        b11 = b[5],
        b12 = b[6],
        b13 = b[7];
    const b20 = b[8],
        b21 = b[9],
        b22 = b[10],
        b23 = b[11];
    const b30 = b[12],
        b31 = b[13],
        b32 = b[14],
        b33 = b[15];

    tempB[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    tempB[1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    tempB[2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    tempB[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
    tempB[4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
    tempB[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
    tempB[6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
    tempB[7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
    tempB[8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
    tempB[9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
    tempB[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
    tempB[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
    tempB[12] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
    tempB[13] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
    tempB[14] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
    tempB[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

    // inlined: copy body (tempB -> outB)
    outB[0] = tempB[0];
    outB[1] = tempB[1];
    outB[2] = tempB[2];
    outB[3] = tempB[3];
    outB[4] = tempB[4];
    outB[5] = tempB[5];
    outB[6] = tempB[6];
    outB[7] = tempB[7];
    outB[8] = tempB[8];
    outB[9] = tempB[9];
    outB[10] = tempB[10];
    outB[11] = tempB[11];
    outB[12] = tempB[12];
    outB[13] = tempB[13];
    outB[14] = tempB[14];
    outB[15] = tempB[15];

    return outB;
}

// --- Benchmark harness ---

const ITERATIONS = 10_000_000;
const SAMPLES = 50;
const WARMUP_RUNS = 100;
const TRIM_COUNT = 5;

let sink = 0;

function runTrial(fn: (a: Mat4, b: Mat4) => Mat4, iterations: number): number {
    // prettier-ignore
    const a: Mat4 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    // prettier-ignore
    const b: Mat4 = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const r = fn(a, b);
        sink += r[0];
    }
    return performance.now() - start;
}

function warmup(fn: (a: Mat4, b: Mat4) => Mat4) {
    // prettier-ignore
    const a: Mat4 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    // prettier-ignore
    const b: Mat4 = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    for (let i = 0; i < WARMUP_RUNS; i++) {
        for (let j = 0; j < ITERATIONS; j++) {
            const r = fn(a, b);
            sink += r[0];
        }
    }
}

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

async function runBenchmark() {
    console.log('=== Function Inlining Benchmark (Mat4 Multiply) ===');
    console.log(`Iterations per sample: ${ITERATIONS.toLocaleString()}`);
    console.log(`Samples: ${SAMPLES} (trimming ${TRIM_COUNT} from each end)`);
    console.log(`Warmup runs: ${WARMUP_RUNS}`);
    console.log('');

    console.log('Warming up call-chain variant...');
    warmup(multiplyCall);

    await new Promise((r) => setTimeout(r, 100));

    console.log('Warming up inlined variant...');
    warmup(multiplyInlined);

    await new Promise((r) => setTimeout(r, 100));

    console.log('Running samples...');
    console.log('');

    const callTimes: number[] = [];
    const inlinedTimes: number[] = [];

    const schedule: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
        schedule.push(0);
        schedule.push(1);
    }
    for (let i = schedule.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = schedule[i];
        schedule[i] = schedule[j];
        schedule[j] = tmp;
    }

    for (let i = 0; i < schedule.length; i++) {
        if (schedule[i] === 0) {
            callTimes.push(runTrial(multiplyCall, ITERATIONS));
        } else {
            inlinedTimes.push(runTrial(multiplyInlined, ITERATIONS));
        }
        if (i % 10 === 9) {
            await new Promise((r) => setTimeout(r, 50));
        }
    }

    const callMean = trimmedMean(callTimes);
    const inlinedMean = trimmedMean(inlinedTimes);
    const callMed = median(callTimes);
    const inlinedMed = median(inlinedTimes);
    const callStd = stdDev(callTimes, callMean);
    const inlinedStd = stdDev(inlinedTimes, inlinedMean);
    const diffPct = ((callMean - inlinedMean) / callMean) * 100;

    console.log('--- Results (ms) ---');
    console.log('');
    console.log(
        `Call chain:      mean=${callMean.toFixed(2)}  median=${callMed.toFixed(2)}  stddev=${callStd.toFixed(2)}`,
    );
    console.log(
        `Inlined:         mean=${inlinedMean.toFixed(2)}  median=${inlinedMed.toFixed(2)}  stddev=${inlinedStd.toFixed(2)}`,
    );
    console.log('');
    console.log(
        `Difference: ${diffPct > 0 ? 'inlined is' : 'call chain is'} ${Math.abs(diffPct).toFixed(2)}% faster (trimmed mean)`,
    );
    console.log(`Sink: ${sink}`);
}

void runBenchmark();
