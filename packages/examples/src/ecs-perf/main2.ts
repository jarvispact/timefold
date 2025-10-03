function fullArgsSystem(args: { query: Item[]; res: Resources }) {
    for (const item of args.query) {
        item.pos[0] += item.pos[1] * args.res.ref.deltaTime;
    }
}

function partialArgsSystem(args: { query: Item[]; res: { deltaTime: number } }) {
    for (const item of args.query) {
        item.pos[0] += item.pos[1] * args.res.deltaTime;
    }
}

function destructuredArgsSystem({ query, res }: { query: Item[]; res: { deltaTime: number } }) {
    for (const item of query) {
        item.pos[0] += item.pos[1] * res.deltaTime;
    }
}

function parametersSystem(query: Item[], res: { deltaTime: number }) {
    for (const item of query) {
        item.pos[0] += item.pos[1] * res.deltaTime;
    }
}

const query = Array.from({ length: 100_000 }, (_, i) => {
    return { id: i, pos: [0, 1] };
});

type Item = (typeof query)[number];

const resources = {
    geometry: new Float32Array(100_000),
    ref: { deltaTime: 0.16 },
};

type Resources = typeof resources;

const samples = 100;

const times = {
    scope: 0,
    fullArgs: 0,
    partialArgs: 0,
    destructuredArgs: 0,
    parameters: 0,
};

function scopeSystem() {
    const dt = resources.ref.deltaTime;

    for (const item of query) {
        item.pos[0] += item.pos[1] * dt;
    }
}

const fullargs = { query, res: resources };
const partialArgs = { query, res: resources.ref };

// warmup
for (let i = 0; i < 1000; i++) {
    scopeSystem();
    fullArgsSystem(fullargs);
    partialArgsSystem(partialArgs);
    destructuredArgsSystem(partialArgs);
    parametersSystem(query, resources.ref);
}

for (let i = 0; i < samples; i++) {
    resources.ref.deltaTime += 0.16;

    const scopeT0 = performance.now();
    scopeSystem();
    const scopeT1 = performance.now();
    times.scope += scopeT1 - scopeT0;

    const fullArgsT0 = performance.now();
    fullArgsSystem(fullargs);
    const fullArgsT1 = performance.now();
    times.fullArgs += fullArgsT1 - fullArgsT0;

    const partialArgsT0 = performance.now();
    partialArgsSystem(partialArgs);
    const partialArgsT1 = performance.now();
    times.partialArgs += partialArgsT1 - partialArgsT0;

    const destructuredArgsT0 = performance.now();
    destructuredArgsSystem(partialArgs);
    const destructuredArgsT1 = performance.now();
    times.destructuredArgs += destructuredArgsT1 - destructuredArgsT0;

    const parametersT0 = performance.now();
    parametersSystem(query, resources.ref);
    const parametersT1 = performance.now();
    times.parameters += parametersT1 - parametersT0;
}

console.log({
    scope: times.scope / samples,
    fullargs: times.fullArgs / samples,
    partialargs: times.partialArgs / samples,
    destructArgs: times.destructuredArgs / samples,
    parameters: times.parameters / samples,
});
