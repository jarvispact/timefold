interface LargeObject {
    posX: number;
    posY: number;
    posZ: number;
    velX: number;
    velY: number;
    velZ: number;
    accX: number;
    accY: number;
    accZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    rotW: number;
    mass: number;
    friction: number;
    restitution: number;
    health: number;
}

function makeLargeObject(): LargeObject {
    return {
        posX: 1.0,
        posY: 2.0,
        posZ: 3.0,
        velX: 0.1,
        velY: 0.2,
        velZ: 0.3,
        accX: 0.01,
        accY: -9.81,
        accZ: 0.03,
        scaleX: 1.0,
        scaleY: 1.5,
        scaleZ: 2.0,
        rotX: 0.0,
        rotY: 0.707,
        rotZ: 0.0,
        rotW: 0.707,
        mass: 10.0,
        friction: 0.5,
        restitution: 0.3,
        health: 100.0,
    };
}

// --- Variant A: pass object as argument ---

const processViaArg = (obj: LargeObject): number => {
    const nx = obj.posX + obj.velX + obj.accX * obj.mass;
    const ny = obj.posY + obj.velY + obj.accY * obj.mass;
    const nz = obj.posZ + obj.velZ + obj.accZ * obj.mass;
    const ke = 0.5 * obj.mass * (obj.velX * obj.velX + obj.velY * obj.velY + obj.velZ * obj.velZ);
    const rl = Math.sqrt(obj.rotX * obj.rotX + obj.rotY * obj.rotY + obj.rotZ * obj.rotZ + obj.rotW * obj.rotW);
    const sl = obj.scaleX * obj.scaleY * obj.scaleZ;
    const drag = obj.friction * (1.0 - obj.restitution);
    return nx + ny + nz + ke + rl + sl + drag + obj.health;
};

// --- Variant B: access object from outer scope (closure) ---

const closureObj = makeLargeObject();

const processViaClosure = (): number => {
    const nx = closureObj.posX + closureObj.velX + closureObj.accX * closureObj.mass;
    const ny = closureObj.posY + closureObj.velY + closureObj.accY * closureObj.mass;
    const nz = closureObj.posZ + closureObj.velZ + closureObj.accZ * closureObj.mass;
    const ke =
        0.5 *
        closureObj.mass *
        (closureObj.velX * closureObj.velX + closureObj.velY * closureObj.velY + closureObj.velZ * closureObj.velZ);
    const rl = Math.sqrt(
        closureObj.rotX * closureObj.rotX +
            closureObj.rotY * closureObj.rotY +
            closureObj.rotZ * closureObj.rotZ +
            closureObj.rotW * closureObj.rotW,
    );
    const sl = closureObj.scaleX * closureObj.scaleY * closureObj.scaleZ;
    const drag = closureObj.friction * (1.0 - closureObj.restitution);
    return nx + ny + nz + ke + rl + sl + drag + closureObj.health;
};

// --- Variant C: nested closure (4 levels deep) ---

function makeNestedProcessor() {
    const level1Obj = makeLargeObject();
    return () => {
        const _capture1 = level1Obj; // captured at level 1
        return () => {
            const _capture2 = _capture1; // captured at level 2
            return () => {
                const _capture3 = _capture2; // captured at level 3
                return (): number => {
                    // innermost function accesses through the scope chain
                    const obj = _capture3;
                    const nx = obj.posX + obj.velX + obj.accX * obj.mass;
                    const ny = obj.posY + obj.velY + obj.accY * obj.mass;
                    const nz = obj.posZ + obj.velZ + obj.accZ * obj.mass;
                    const ke = 0.5 * obj.mass * (obj.velX * obj.velX + obj.velY * obj.velY + obj.velZ * obj.velZ);
                    const rl = Math.sqrt(
                        obj.rotX * obj.rotX + obj.rotY * obj.rotY + obj.rotZ * obj.rotZ + obj.rotW * obj.rotW,
                    );
                    const sl = obj.scaleX * obj.scaleY * obj.scaleZ;
                    const drag = obj.friction * (1.0 - obj.restitution);
                    return nx + ny + nz + ke + rl + sl + drag + obj.health;
                };
            };
        };
    };
}

const processViaNested = makeNestedProcessor()()()();

// --- Benchmark harness ---

const ITERATIONS = 10_000_000;
const SAMPLES = 50;
const WARMUP_RUNS = 100;
const TRIM_COUNT = 5;

let sink = 0;

const argObj = makeLargeObject();

function runTrialArg(iterations: number): number {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        sink += processViaArg(argObj);
    }
    return performance.now() - start;
}

function runTrialClosure(iterations: number): number {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        sink += processViaClosure();
    }
    return performance.now() - start;
}

function warmupArg() {
    for (let i = 0; i < WARMUP_RUNS; i++) {
        for (let j = 0; j < ITERATIONS; j++) {
            sink += processViaArg(argObj);
        }
    }
}

function runTrialNested(iterations: number): number {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        sink += processViaNested();
    }
    return performance.now() - start;
}

function warmupClosure() {
    for (let i = 0; i < WARMUP_RUNS; i++) {
        for (let j = 0; j < ITERATIONS; j++) {
            sink += processViaClosure();
        }
    }
}

function warmupNested() {
    for (let i = 0; i < WARMUP_RUNS; i++) {
        for (let j = 0; j < ITERATIONS; j++) {
            sink += processViaNested();
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
    console.log('=== Argument vs Closure Access Benchmark ===');
    console.log(`Iterations per sample: ${ITERATIONS.toLocaleString()}`);
    console.log(`Samples: ${SAMPLES} (trimming ${TRIM_COUNT} from each end)`);
    console.log(`Warmup runs: ${WARMUP_RUNS}`);
    console.log('');

    console.log('Warming up argument variant...');
    warmupArg();

    await new Promise((r) => setTimeout(r, 100));

    console.log('Warming up closure variant...');
    warmupClosure();

    await new Promise((r) => setTimeout(r, 100));

    console.log('Warming up nested closure variant...');
    warmupNested();

    await new Promise((r) => setTimeout(r, 100));

    console.log('Running samples...');
    console.log('');

    const argTimes: number[] = [];
    const closureTimes: number[] = [];
    const nestedTimes: number[] = [];

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
            argTimes.push(runTrialArg(ITERATIONS));
        } else if (schedule[i] === 1) {
            closureTimes.push(runTrialClosure(ITERATIONS));
        } else {
            nestedTimes.push(runTrialNested(ITERATIONS));
        }
        if (i % 10 === 9) {
            await new Promise((r) => setTimeout(r, 50));
        }
    }

    const argMean = trimmedMean(argTimes);
    const closureMean = trimmedMean(closureTimes);
    const nestedMean = trimmedMean(nestedTimes);
    const argMed = median(argTimes);
    const closureMed = median(closureTimes);
    const nestedMed = median(nestedTimes);
    const argStd = stdDev(argTimes, argMean);
    const closureStd = stdDev(closureTimes, closureMean);
    const nestedStd = stdDev(nestedTimes, nestedMean);

    const diffAB = ((argMean - closureMean) / argMean) * 100;
    const diffAC = ((argMean - nestedMean) / argMean) * 100;

    console.log('--- Results (ms) ---');
    console.log('');
    console.log(
        `Pass as arg:     mean=${argMean.toFixed(2)}  median=${argMed.toFixed(2)}  stddev=${argStd.toFixed(2)}`,
    );
    console.log(
        `Closure access:  mean=${closureMean.toFixed(2)}  median=${closureMed.toFixed(2)}  stddev=${closureStd.toFixed(2)}`,
    );
    console.log(
        `Nested closure:  mean=${nestedMean.toFixed(2)}  median=${nestedMed.toFixed(2)}  stddev=${nestedStd.toFixed(2)}`,
    );
    console.log('');
    console.log(
        `Arg vs Closure:  ${diffAB > 0 ? 'closure is' : 'arg is'} ${Math.abs(diffAB).toFixed(2)}% faster (trimmed mean)`,
    );
    console.log(
        `Arg vs Nested:   ${diffAC > 0 ? 'nested is' : 'arg is'} ${Math.abs(diffAC).toFixed(2)}% faster (trimmed mean)`,
    );
    console.log(`Sink: ${sink}`);
}

void runBenchmark();
