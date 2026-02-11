// === JS Array + Copy vs ArrayBuffer Views: ECS Component Data Pipeline ===
//
// Simulates a realistic ECS frame where each entity has:
//   - Position (vec3, 3 floats)
//   - Rotation (quaternion, 4 floats)
//   - Scale (vec3, 3 floats)
//
// Each frame composes a model matrix (mat4, 16 floats) from TRS per entity.
//
// Variant A (JS Arrays + Copy):
//   Components are number[] (PACKED_DOUBLE). After math, copy 16-float mat4
//   into a shared Float32Array staging buffer (simulating GPU upload prep).
//
// Variant B (ArrayBuffer Views):
//   Each entity owns an ArrayBuffer. Components are Float32Array views.
//   No copy needed — data is already in the buffer.
//
// Variant C (JS Arrays + Direct Write):
//   Components are number[] (PACKED_DOUBLE). TRS math reads from number[]
//   but writes the mat4 result directly into the shared Float32Array staging
//   buffer — no intermediate number[] mat4, no copy step.

/* eslint-disable prettier/prettier */

// --- Configuration ---

const ENTITY_COUNTS = [10_000, 100_000];
const FRAMES_PER_SAMPLE = 1_000;
const SAMPLES = 50;
const WARMUP_RUNS = 20;
const TRIM_COUNT = 5;

let sink = 0.0;

// --- TRS -> Mat4: number[] variant ---

const mat4FromTRS_Array = (
    out: number[],
    pos: number[],
    rot: number[],
    scl: number[],
): number[] => {
    const qx = rot[0], qy = rot[1], qz = rot[2], qw = rot[3];
    const sx = scl[0], sy = scl[1], sz = scl[2];

    const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
    const xx = qx * x2, xy = qx * y2, xz = qx * z2;
    const yy = qy * y2, yz = qy * z2, zz = qz * z2;
    const wx = qw * x2, wy = qw * y2, wz = qw * z2;

    out[0]  = (1.0 - (yy + zz)) * sx;
    out[1]  = (xy + wz) * sx;
    out[2]  = (xz - wy) * sx;
    out[3]  = 0.0;
    out[4]  = (xy - wz) * sy;
    out[5]  = (1.0 - (xx + zz)) * sy;
    out[6]  = (yz + wx) * sy;
    out[7]  = 0.0;
    out[8]  = (xz + wy) * sz;
    out[9]  = (yz - wx) * sz;
    out[10] = (1.0 - (xx + yy)) * sz;
    out[11] = 0.0;
    out[12] = pos[0];
    out[13] = pos[1];
    out[14] = pos[2];
    out[15] = 1.0;

    return out;
};

// --- TRS -> Mat4: Float32Array variant ---

const mat4FromTRS_F32 = (
    out: Float32Array,
    pos: Float32Array,
    rot: Float32Array,
    scl: Float32Array,
): Float32Array => {
    const qx = rot[0], qy = rot[1], qz = rot[2], qw = rot[3];
    const sx = scl[0], sy = scl[1], sz = scl[2];

    const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
    const xx = qx * x2, xy = qx * y2, xz = qx * z2;
    const yy = qy * y2, yz = qy * z2, zz = qz * z2;
    const wx = qw * x2, wy = qw * y2, wz = qw * z2;

    out[0]  = (1.0 - (yy + zz)) * sx;
    out[1]  = (xy + wz) * sx;
    out[2]  = (xz - wy) * sx;
    out[3]  = 0.0;
    out[4]  = (xy - wz) * sy;
    out[5]  = (1.0 - (xx + zz)) * sy;
    out[6]  = (yz + wx) * sy;
    out[7]  = 0.0;
    out[8]  = (xz + wy) * sz;
    out[9]  = (yz - wx) * sz;
    out[10] = (1.0 - (xx + yy)) * sz;
    out[11] = 0.0;
    out[12] = pos[0];
    out[13] = pos[1];
    out[14] = pos[2];
    out[15] = 1.0;

    return out;
};

// --- TRS -> Mat4: number[] reads, Float32Array direct write variant ---

const mat4FromTRS_DirectWrite = (
    out: Float32Array,
    offset: number,
    pos: number[],
    rot: number[],
    scl: number[],
): void => {
    const qx = rot[0], qy = rot[1], qz = rot[2], qw = rot[3];
    const sx = scl[0], sy = scl[1], sz = scl[2];

    const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
    const xx = qx * x2, xy = qx * y2, xz = qx * z2;
    const yy = qy * y2, yz = qy * z2, zz = qz * z2;
    const wx = qw * x2, wy = qw * y2, wz = qw * z2;

    out[offset]      = (1.0 - (yy + zz)) * sx;
    out[offset + 1]  = (xy + wz) * sx;
    out[offset + 2]  = (xz - wy) * sx;
    out[offset + 3]  = 0.0;
    out[offset + 4]  = (xy - wz) * sy;
    out[offset + 5]  = (1.0 - (xx + zz)) * sy;
    out[offset + 6]  = (yz + wx) * sy;
    out[offset + 7]  = 0.0;
    out[offset + 8]  = (xz + wy) * sz;
    out[offset + 9]  = (yz - wx) * sz;
    out[offset + 10] = (1.0 - (xx + yy)) * sz;
    out[offset + 11] = 0.0;
    out[offset + 12] = pos[0];
    out[offset + 13] = pos[1];
    out[offset + 14] = pos[2];
    out[offset + 15] = 1.0;
};

// --- Setup: Variant A (JS Arrays) ---

const setupVariantA = (entityCount: number) => {
    const positions: number[][] = [];
    const rotations: number[][] = [];
    const scales: number[][] = [];
    const modelMatrices: number[][] = [];
    const stagingBuffer = new Float32Array(entityCount * 16);

    for (let i = 0; i < entityCount; i++) {
        // Float literals ensure PACKED_DOUBLE_ELEMENTS
        positions.push([i * 0.1, i * 0.2, i * 0.3]);
        const angle = i * 0.01;
        const s = Math.sin(angle * 0.5);
        const c = Math.cos(angle * 0.5);
        rotations.push([0.0, s, 0.0, c]);
        scales.push([1.0, 1.0, 1.0]);
        modelMatrices.push([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
    }

    return { positions, rotations, scales, modelMatrices, stagingBuffer };
};

// --- Setup: Variant B (ArrayBuffer Views) ---

const setupVariantB = (entityCount: number) => {
    // Per-entity layout: position(3) + rotation(4) + scale(3) + mat4(16) = 26 floats
    const FLOATS_PER_ENTITY = 26;
    const positions: Float32Array[] = [];
    const rotations: Float32Array[] = [];
    const scales: Float32Array[] = [];
    const modelMatrices: Float32Array[] = [];

    for (let i = 0; i < entityCount; i++) {
        const buffer = new ArrayBuffer(FLOATS_PER_ENTITY * 4);
        const pos = new Float32Array(buffer, 0, 3);       // bytes 0-11
        const rot = new Float32Array(buffer, 12, 4);      // bytes 12-27
        const scl = new Float32Array(buffer, 28, 3);      // bytes 28-39
        const mat = new Float32Array(buffer, 40, 16);     // bytes 40-103

        pos[0] = i * 0.1; pos[1] = i * 0.2; pos[2] = i * 0.3;
        const angle = i * 0.01;
        const s = Math.sin(angle * 0.5);
        const c = Math.cos(angle * 0.5);
        rot[0] = 0.0; rot[1] = s; rot[2] = 0.0; rot[3] = c;
        scl[0] = 1.0; scl[1] = 1.0; scl[2] = 1.0;

        positions.push(pos);
        rotations.push(rot);
        scales.push(scl);
        modelMatrices.push(mat);
    }

    return { positions, rotations, scales, modelMatrices };
};

// --- Setup: Variant C (JS Arrays + Direct Write) ---

const setupVariantC = (entityCount: number) => {
    const positions: number[][] = [];
    const rotations: number[][] = [];
    const scales: number[][] = [];
    const stagingBuffer = new Float32Array(entityCount * 16);

    for (let i = 0; i < entityCount; i++) {
        positions.push([i * 0.1, i * 0.2, i * 0.3]);
        const angle = i * 0.01;
        const s = Math.sin(angle * 0.5);
        const c = Math.cos(angle * 0.5);
        rotations.push([0.0, s, 0.0, c]);
        scales.push([1.0, 1.0, 1.0]);
    }

    return { positions, rotations, scales, stagingBuffer };
};

// --- Frame runners ---

const runFrameA = (
    entityCount: number,
    positions: number[][],
    rotations: number[][],
    scales: number[][],
    modelMatrices: number[][],
    stagingBuffer: Float32Array,
) => {
    // Step 1: Compose model matrix from TRS (math on number[])
    for (let i = 0; i < entityCount; i++) {
        mat4FromTRS_Array(modelMatrices[i], positions[i], rotations[i], scales[i]);
    }

    // Step 2: Copy mat4 data into shared Float32Array staging buffer
    for (let i = 0; i < entityCount; i++) {
        const mat = modelMatrices[i];
        const offset = i * 16;
        for (let j = 0; j < 16; j++) {
            stagingBuffer[offset + j] = mat[j];
        }
    }

    sink += stagingBuffer[0];
};

const runFrameB = (
    entityCount: number,
    positions: Float32Array[],
    rotations: Float32Array[],
    scales: Float32Array[],
    modelMatrices: Float32Array[],
) => {
    // Step 1: Compose model matrix from TRS (math on Float32Array)
    for (let i = 0; i < entityCount; i++) {
        mat4FromTRS_F32(modelMatrices[i], positions[i], rotations[i], scales[i]);
    }

    // Step 2: No copy needed — mat4 data is already in the ArrayBuffer

    sink += modelMatrices[0][0];
};

const runFrameC = (
    entityCount: number,
    positions: number[][],
    rotations: number[][],
    scales: number[][],
    stagingBuffer: Float32Array,
) => {
    // Single step: read from number[] components, write directly into staging Float32Array
    for (let i = 0; i < entityCount; i++) {
        mat4FromTRS_DirectWrite(stagingBuffer, i * 16, positions[i], rotations[i], scales[i]);
    }

    sink += stagingBuffer[0];
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
    console.log('=== JS Array + Copy vs ArrayBuffer Views: ECS Data Pipeline ===');
    console.log(`Frames per sample: ${FRAMES_PER_SAMPLE.toLocaleString()}`);
    console.log(`Samples: ${SAMPLES} (trimming ${TRIM_COUNT} from each end)`);
    console.log(`Warmup runs: ${WARMUP_RUNS}`);
    console.log('');

    for (let ec = 0; ec < ENTITY_COUNTS.length; ec++) {
        const entityCount = ENTITY_COUNTS[ec];
        console.log(`========== ${entityCount.toLocaleString()} entities ==========`);
        console.log('');

        const dataA = setupVariantA(entityCount);
        const dataB = setupVariantB(entityCount);
        const dataC = setupVariantC(entityCount);

        // --- Warmup ---

        console.log('Warming up Variant A (JS Arrays + Copy)...');
        for (let w = 0; w < WARMUP_RUNS; w++) {
            for (let f = 0; f < FRAMES_PER_SAMPLE; f++) {
                runFrameA(entityCount, dataA.positions, dataA.rotations, dataA.scales, dataA.modelMatrices, dataA.stagingBuffer);
            }
        }
        await new Promise((r) => setTimeout(r, 200));

        console.log('Warming up Variant B (ArrayBuffer Views)...');
        for (let w = 0; w < WARMUP_RUNS; w++) {
            for (let f = 0; f < FRAMES_PER_SAMPLE; f++) {
                runFrameB(entityCount, dataB.positions, dataB.rotations, dataB.scales, dataB.modelMatrices);
            }
        }
        await new Promise((r) => setTimeout(r, 200));

        console.log('Warming up Variant C (JS Arrays + Direct Write)...');
        for (let w = 0; w < WARMUP_RUNS; w++) {
            for (let f = 0; f < FRAMES_PER_SAMPLE; f++) {
                runFrameC(entityCount, dataC.positions, dataC.rotations, dataC.scales, dataC.stagingBuffer);
            }
        }
        await new Promise((r) => setTimeout(r, 200));

        // --- Measurement ---

        console.log('Running samples...');

        // Randomized schedule: 0 = Variant A, 1 = Variant B, 2 = Variant C
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

        const timesA: number[] = [];
        const timesB: number[] = [];
        const timesC: number[] = [];

        for (let s = 0; s < schedule.length; s++) {
            if (schedule[s] === 0) {
                const start = performance.now();
                for (let f = 0; f < FRAMES_PER_SAMPLE; f++) {
                    runFrameA(entityCount, dataA.positions, dataA.rotations, dataA.scales, dataA.modelMatrices, dataA.stagingBuffer);
                }
                timesA.push(performance.now() - start);
            } else if (schedule[s] === 1) {
                const start = performance.now();
                for (let f = 0; f < FRAMES_PER_SAMPLE; f++) {
                    runFrameB(entityCount, dataB.positions, dataB.rotations, dataB.scales, dataB.modelMatrices);
                }
                timesB.push(performance.now() - start);
            } else {
                const start = performance.now();
                for (let f = 0; f < FRAMES_PER_SAMPLE; f++) {
                    runFrameC(entityCount, dataC.positions, dataC.rotations, dataC.scales, dataC.stagingBuffer);
                }
                timesC.push(performance.now() - start);
            }
            if (s % 10 === 9) {
                await new Promise((r) => setTimeout(r, 50));
            }
        }

        // --- Results ---

        const meanA = trimmedMean(timesA);
        const meanB = trimmedMean(timesB);
        const meanC = trimmedMean(timesC);
        const medA = median(timesA);
        const medB = median(timesB);
        const medC = median(timesC);
        const stdA = stdDev(timesA, meanA);
        const stdB = stdDev(timesB, meanB);
        const stdC = stdDev(timesC, meanC);

        console.log('');
        console.log(`Results (ms per ${FRAMES_PER_SAMPLE} frames):`);
        console.log(`  A) JS Arrays + Copy:        mean=${meanA.toFixed(2)}  median=${medA.toFixed(2)}  stddev=${stdA.toFixed(2)}`);
        console.log(`  B) ArrayBuffer Views:       mean=${meanB.toFixed(2)}  median=${medB.toFixed(2)}  stddev=${stdB.toFixed(2)}`);
        console.log(`  C) JS Arrays + Direct Write: mean=${meanC.toFixed(2)}  median=${medC.toFixed(2)}  stddev=${stdC.toFixed(2)}`);
        console.log('');

        const perFrameA = meanA / FRAMES_PER_SAMPLE;
        const perFrameB = meanB / FRAMES_PER_SAMPLE;
        const perFrameC = meanC / FRAMES_PER_SAMPLE;
        console.log(`  Per-frame average: A=${perFrameA.toFixed(4)}ms  B=${perFrameB.toFixed(4)}ms  C=${perFrameC.toFixed(4)}ms`);

        // Find fastest and compare
        const means = [
            { name: 'A) JS Arrays + Copy', mean: meanA },
            { name: 'B) ArrayBuffer Views', mean: meanB },
            { name: 'C) JS Arrays + Direct Write', mean: meanC },
        ];
        means.sort((a, b) => a.mean - b.mean);

        for (let i = 1; i < means.length; i++) {
            const pct = ((means[i].mean - means[0].mean) / means[i].mean) * 100;
            console.log(`  ${means[0].name} is ${pct.toFixed(2)}% faster than ${means[i].name} (trimmed mean)`);
        }
        console.log('');
    }

    console.log(`Sink: ${sink}`);
};

/* eslint-enable prettier/prettier */

void runBenchmark();
