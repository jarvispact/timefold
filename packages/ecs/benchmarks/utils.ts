/**
 * Utility functions for benchmarks
 */

export interface BenchmarkScale {
    name: string;
    count: number;
}

export const SCALES: BenchmarkScale[] = [
    { name: '100', count: 100 },
    { name: '500', count: 500 },
    { name: '1K', count: 1_000 },
];

export const MEDIUM_SCALE = SCALES[0];
export const LARGE_SCALE = SCALES[1];
export const XL_SCALE = SCALES[2];

/**
 * Format a number with thousand separators
 */
export function formatNumber(num: number): string {
    return num.toLocaleString('en-US');
}

/**
 * Format time in appropriate units (ns, μs, ms, s)
 */
export function formatTime(ms: number): string {
    if (ms < 0.001) {
        return `${(ms * 1_000_000).toFixed(2)} ns`;
    } else if (ms < 1) {
        return `${(ms * 1000).toFixed(2)} μs`;
    } else if (ms < 1000) {
        return `${ms.toFixed(2)} ms`;
    } else {
        return `${(ms / 1000).toFixed(2)} s`;
    }
}

/**
 * Format operations per second
 */
export function formatOpsPerSec(opsPerSec: number): string {
    if (opsPerSec >= 1_000_000) {
        return `${(opsPerSec / 1_000_000).toFixed(2)}M ops/s`;
    } else if (opsPerSec >= 1_000) {
        return `${(opsPerSec / 1_000).toFixed(2)}K ops/s`;
    } else {
        return `${opsPerSec.toFixed(2)} ops/s`;
    }
}

/**
 * Create a benchmark description with scale information
 */
export function describeBenchmark(operation: string, scale: BenchmarkScale, details?: string): string {
    const scaleInfo = `[${scale.name} entities]`;
    const detailsInfo = details ? ` - ${details}` : '';
    return `${operation} ${scaleInfo}${detailsInfo}`;
}

/**
 * Warmup function to stabilize JIT compilation
 */
export function warmup(fn: () => void, iterations = 100): void {
    for (let i = 0; i < iterations; i++) {
        fn();
    }
}

/**
 * Run a function multiple times and return average execution time
 */
export function measure(fn: () => void, iterations = 1000): number {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const end = performance.now();
    return (end - start) / iterations;
}

/**
 * Print a benchmark section header
 */
export function printSectionHeader(title: string): void {
    console.log('\n' + '='.repeat(70));
    console.log(` ${title}`);
    console.log('='.repeat(70) + '\n');
}

/**
 * Print a benchmark subsection header
 */
export function printSubsectionHeader(title: string): void {
    console.log('\n' + '-'.repeat(70));
    console.log(` ${title}`);
    console.log('-'.repeat(70));
}

/**
 * Calculate statistics from an array of numbers
 */
export function calculateStats(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / sorted.length;

    const squaredDiffs = sorted.map((val) => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / sorted.length;
    const stddev = Math.sqrt(variance);

    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median =
        sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];

    return {
        mean,
        median,
        min,
        max,
        stddev,
        count: sorted.length,
    };
}

/**
 * Get benchmark configuration based on scale
 */
export function getBenchmarkConfig(scale: BenchmarkScale) {
    // Adjust iterations based on scale to keep benchmark time reasonable
    let iterations = 100;
    let warmupIterations = 10;

    if (scale.count >= 100_000) {
        iterations = 50;
        warmupIterations = 5;
    } else if (scale.count >= 50_000) {
        iterations = 75;
        warmupIterations = 10;
    }

    return {
        iterations,
        warmupIterations,
        time: 5000, // 5 seconds per benchmark
    };
}
