// =============================================================================
// Benchmark: Arrow Functions vs Regular Functions
// Tests three scenarios:
//   1. Simple function calls (standalone)
//   2. Functions with `this` context (object methods)
//   3. Functions used as callbacks in a loop
// =============================================================================

// --- Scenario 1: Simple function calls ---

function regularAdd(a: number, b: number): number {
    return a + b + a * b;
}

const arrowAdd = (a: number, b: number): number => {
    return a + b + a * b;
};

// --- Scenario 2: Object methods with `this` ---

interface Counter {
    value: number;
    increment: (n: number) => number;
}

function createCounterRegular(): Counter {
    const counter: Counter = {
        value: 0,
        increment: function (n: number): number {
            counter.value += n;
            return counter.value;
        },
    };
    return counter;
}

function createCounterArrow(): Counter {
    const counter: Counter = {
        value: 0,
        increment: (n: number): number => {
            counter.value += n;
            return counter.value;
        },
    };
    return counter;
}

// --- Scenario 3: Callbacks in a loop ---

function processRegular(arr: number[], callback: (val: number, idx: number) => number): number {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        sum += callback(arr[i], i);
    }
    return sum;
}

const regularCallback = function (val: number, idx: number): number {
    return val * idx + val;
};

const arrowCallback = (val: number, idx: number): number => {
    return val * idx + val;
};

// --- Benchmark harness ---

const ITERATIONS = 10_000_000;
const CALLBACK_ITERATIONS = 100_000; // fewer iterations since each processes 100 elements
const SAMPLES = 50;
const WARMUP_RUNS = 100;
const TRIM_COUNT = 5;

let sink = 0;

// --- Trial runners per scenario ---

function runTrialSimple(fn: (a: number, b: number) => number, iterations: number): number {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        sink += fn(i, i + 1);
    }
    return performance.now() - start;
}

function runTrialMethod(counter: Counter, iterations: number): number {
    counter.value = 0;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        sink += counter.increment(1);
    }
    return performance.now() - start;
}

const callbackData: number[] = [];
for (let i = 0; i < 100; i++) callbackData.push(i);

function runTrialCallback(callback: (val: number, idx: number) => number, iterations: number): number {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        sink += processRegular(callbackData, callback);
    }
    return performance.now() - start;
}

// --- Warmup functions ---

function warmupSimple(fn: (a: number, b: number) => number) {
    for (let i = 0; i < WARMUP_RUNS; i++) {
        for (let j = 0; j < ITERATIONS; j++) {
            sink += fn(j, j + 1);
        }
    }
}

function warmupMethod(counter: Counter) {
    for (let i = 0; i < WARMUP_RUNS; i++) {
        counter.value = 0;
        for (let j = 0; j < ITERATIONS; j++) {
            sink += counter.increment(1);
        }
    }
}

function warmupCallback(callback: (val: number, idx: number) => number) {
    for (let i = 0; i < WARMUP_RUNS; i++) {
        for (let j = 0; j < CALLBACK_ITERATIONS; j++) {
            sink += processRegular(callbackData, callback);
        }
    }
}

// --- Stats ---

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

// --- Shared scheduling + reporting ---

function buildSchedule(variantCount: number): number[] {
    const schedule: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
        for (let v = 0; v < variantCount; v++) {
            schedule.push(v);
        }
    }
    for (let i = schedule.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = schedule[i];
        schedule[i] = schedule[j];
        schedule[j] = tmp;
    }
    return schedule;
}

function reportResults(labelA: string, timesA: number[], labelB: string, timesB: number[]) {
    const meanA = trimmedMean(timesA);
    const meanB = trimmedMean(timesB);
    const medA = median(timesA);
    const medB = median(timesB);
    const stdA = stdDev(timesA, meanA);
    const stdB = stdDev(timesB, meanB);

    const padLen = Math.max(labelA.length, labelB.length) + 1;
    const pA = labelA.padEnd(padLen);
    const pB = labelB.padEnd(padLen);

    console.log(`${pA} mean=${meanA.toFixed(2)}  median=${medA.toFixed(2)}  stddev=${stdA.toFixed(2)}`);
    console.log(`${pB} mean=${meanB.toFixed(2)}  median=${medB.toFixed(2)}  stddev=${stdB.toFixed(2)}`);

    const diffPct = ((meanA - meanB) / meanA) * 100;
    if (Math.abs(diffPct) < 0.5) {
        console.log(`Difference: negligible (${Math.abs(diffPct).toFixed(2)}%)`);
    } else {
        const faster = diffPct > 0 ? labelB.trim() : labelA.trim();
        console.log(`Difference: ${faster} is ${Math.abs(diffPct).toFixed(2)}% faster (trimmed mean)`);
    }
}

// --- Main benchmark ---

async function runBenchmark() {
    console.log('=== Arrow Functions vs Regular Functions ===');
    console.log(`Iterations per sample: ${ITERATIONS.toLocaleString()}`);
    console.log(`Samples: ${SAMPLES} (trimming ${TRIM_COUNT} from each end)`);
    console.log(`Warmup runs: ${WARMUP_RUNS}`);
    console.log('');

    // ---- Scenario 1: Simple calls ----
    console.log('--- Scenario 1: Simple function calls ---');
    console.log('');

    console.log('Warming up regular function...');
    warmupSimple(regularAdd);
    await new Promise((r) => setTimeout(r, 100));

    console.log('Warming up arrow function...');
    warmupSimple(arrowAdd);
    await new Promise((r) => setTimeout(r, 100));

    console.log('Running samples...');

    const simpleTimes: [number[], number[]] = [[], []];
    const schedule1 = buildSchedule(2);

    for (let i = 0; i < schedule1.length; i++) {
        if (schedule1[i] === 0) {
            simpleTimes[0].push(runTrialSimple(regularAdd, ITERATIONS));
        } else {
            simpleTimes[1].push(runTrialSimple(arrowAdd, ITERATIONS));
        }
        if (i % 10 === 9) {
            await new Promise((r) => setTimeout(r, 50));
        }
    }

    console.log('');
    reportResults('Regular:', simpleTimes[0], 'Arrow:  ', simpleTimes[1]);
    console.log('');

    // ---- Scenario 2: Object methods ----
    console.log('--- Scenario 2: Object methods with closure-based this ---');
    console.log('');

    const counterReg = createCounterRegular();
    const counterArr = createCounterArrow();

    console.log('Warming up regular method...');
    warmupMethod(counterReg);
    await new Promise((r) => setTimeout(r, 100));

    console.log('Warming up arrow method...');
    warmupMethod(counterArr);
    await new Promise((r) => setTimeout(r, 100));

    console.log('Running samples...');

    const methodTimes: [number[], number[]] = [[], []];
    const schedule2 = buildSchedule(2);

    for (let i = 0; i < schedule2.length; i++) {
        if (schedule2[i] === 0) {
            methodTimes[0].push(runTrialMethod(counterReg, ITERATIONS));
        } else {
            methodTimes[1].push(runTrialMethod(counterArr, ITERATIONS));
        }
        if (i % 10 === 9) {
            await new Promise((r) => setTimeout(r, 50));
        }
    }

    console.log('');
    reportResults('Regular:', methodTimes[0], 'Arrow:  ', methodTimes[1]);
    console.log('');

    // ---- Scenario 3: Callbacks ----
    console.log('--- Scenario 3: Callbacks in a loop ---');
    console.log('');

    console.log('Warming up regular callback...');
    warmupCallback(regularCallback);
    await new Promise((r) => setTimeout(r, 100));

    console.log('Warming up arrow callback...');
    warmupCallback(arrowCallback);
    await new Promise((r) => setTimeout(r, 100));

    console.log('Running samples...');

    const cbTimes: [number[], number[]] = [[], []];
    const schedule3 = buildSchedule(2);

    for (let i = 0; i < schedule3.length; i++) {
        if (schedule3[i] === 0) {
            cbTimes[0].push(runTrialCallback(regularCallback, CALLBACK_ITERATIONS));
        } else {
            cbTimes[1].push(runTrialCallback(arrowCallback, CALLBACK_ITERATIONS));
        }
        if (i % 10 === 9) {
            await new Promise((r) => setTimeout(r, 50));
        }
    }

    console.log('');
    reportResults('Regular:', cbTimes[0], 'Arrow:  ', cbTimes[1]);
    console.log('');

    console.log(`Sink: ${sink}`);
}

void runBenchmark();
