import { createWorld, defineComponentTypes, createComponent, Component } from '@timefold/ecs';
import { Vec2, Easings } from '@timefold/math';
import type { Vec2Type } from '@timefold/math';

// =============================================================================
// SPACE SURVIVAL - A Complete 2D Game using ECS
// =============================================================================
// Control your spaceship, dodge asteroids, collect power-ups, and survive!
// Controls: WASD/Arrow keys to move, Space to shoot, P to pause
// =============================================================================

// -----------------------------------------------------------------------------
// Component Type Definitions
// -----------------------------------------------------------------------------
const { T } = defineComponentTypes([
    'Position',
    'Velocity',
    'Rotation',
    'Scale',
    'Sprite',
    'Player',
    'Enemy',
    'Asteroid',
    'Bullet',
    'PowerUp',
    'Health',
    'Damage',
    'Lifetime',
    'Collider',
    'ParticleEmitter',
    'Particle',
    'Trail',
    'Score',
    'Invincible',
    'Shield',
    'RapidFire',
    'HomingMissile',
    'ExplosionEffect',
    'ScreenShake',
    'StarField',
    'UIElement',
]);

// -----------------------------------------------------------------------------
// Component Types
// -----------------------------------------------------------------------------
type PositionComponent = Component<typeof T.Position, { pos: Vec2Type }>;
type VelocityComponent = Component<typeof T.Velocity, { vel: Vec2Type; friction: number }>;
type RotationComponent = Component<typeof T.Rotation, { angle: number; angularVelocity: number }>;
type ScaleComponent = Component<typeof T.Scale, { scale: Vec2Type }>;
type SpriteComponent = Component<
    typeof T.Sprite,
    {
        shape: 'triangle' | 'circle' | 'rect' | 'star' | 'diamond' | 'hexagon';
        color: string;
        strokeColor?: string;
        strokeWidth?: number;
        glow?: boolean;
    }
>;
type PlayerComponent = Component<typeof T.Player, { shootCooldown: number; lastShot: number }>;
type EnemyComponent = Component<
    typeof T.Enemy,
    { type: 'chaser' | 'shooter' | 'bomber'; shootCooldown: number; lastShot: number }
>;
type AsteroidComponent = Component<typeof T.Asteroid, { size: 'large' | 'medium' | 'small' }>;
type BulletComponent = Component<typeof T.Bullet, { owner: 'player' | 'enemy' }>;
type PowerUpComponent = Component<typeof T.PowerUp, { type: 'health' | 'shield' | 'rapidFire' | 'missile' }>;
type HealthComponent = Component<typeof T.Health, { current: number; max: number }>;
type DamageComponent = Component<typeof T.Damage, { amount: number }>;
type LifetimeComponent = Component<typeof T.Lifetime, { remaining: number; initial: number }>;
type ColliderComponent = Component<typeof T.Collider, { radius: number }>;
type ParticleEmitterComponent = Component<
    typeof T.ParticleEmitter,
    { rate: number; timer: number; color: string; speed: number; lifetime: number }
>;
type ParticleComponent = Component<typeof T.Particle, { alpha: number }>;
type TrailComponent = Component<typeof T.Trail, { positions: Vec2Type[]; maxLength: number }>;
type ScoreComponent = Component<
    typeof T.Score,
    { value: number; multiplier: number; combo: number; lastKillTime: number }
>;
type InvincibleComponent = Component<typeof T.Invincible, { duration: number }>;
type ShieldComponent = Component<typeof T.Shield, { duration: number; hits: number }>;
type RapidFireComponent = Component<typeof T.RapidFire, { duration: number }>;
type HomingMissileComponent = Component<typeof T.HomingMissile, { target: number | null }>;
type ExplosionEffectComponent = Component<typeof T.ExplosionEffect, { progress: number; maxRadius: number }>;
type ScreenShakeComponent = Component<typeof T.ScreenShake, { intensity: number; duration: number }>;
type StarFieldComponent = Component<
    typeof T.StarField,
    { stars: { x: number; y: number; size: number; speed: number }[] }
>;
type UIElementComponent = Component<typeof T.UIElement, { type: 'healthBar' | 'scoreDisplay' | 'powerUpIndicator' }>;

type WorldComponent =
    | PositionComponent
    | VelocityComponent
    | RotationComponent
    | ScaleComponent
    | SpriteComponent
    | PlayerComponent
    | EnemyComponent
    | AsteroidComponent
    | BulletComponent
    | PowerUpComponent
    | HealthComponent
    | DamageComponent
    | LifetimeComponent
    | ColliderComponent
    | ParticleEmitterComponent
    | ParticleComponent
    | TrailComponent
    | ScoreComponent
    | InvincibleComponent
    | ShieldComponent
    | RapidFireComponent
    | HomingMissileComponent
    | ExplosionEffectComponent
    | ScreenShakeComponent
    | StarFieldComponent
    | UIElementComponent;

// -----------------------------------------------------------------------------
// Custom Events
// -----------------------------------------------------------------------------
type GameEvent =
    | { type: 'game/start' }
    | { type: 'game/pause' }
    | { type: 'game/resume' }
    | { type: 'game/over'; payload: { finalScore: number } }
    | { type: 'game/spawn-asteroid' }
    | { type: 'game/spawn-enemy' }
    | { type: 'game/spawn-powerup'; payload: { position: Vec2Type } }
    | { type: 'game/explosion'; payload: { position: Vec2Type; color: string } }
    | { type: 'game/score'; payload: { amount: number } };

// -----------------------------------------------------------------------------
// Resources
// -----------------------------------------------------------------------------
type GameResources = {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    input: {
        up: boolean;
        down: boolean;
        left: boolean;
        right: boolean;
        shoot: boolean;
        pause: boolean;
    };
    gameState: 'menu' | 'playing' | 'paused' | 'gameOver';
    difficulty: number;
    wave: number;
    time: number;
    deltaTime: number;
};

// -----------------------------------------------------------------------------
// World Creation
// -----------------------------------------------------------------------------
const world = createWorld<WorldComponent, GameEvent, GameResources>();

// -----------------------------------------------------------------------------
// Canvas Setup
// -----------------------------------------------------------------------------
const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
canvas.style.background = '#0a0a1a';
canvas.style.display = 'block';
canvas.style.margin = '0 auto';
canvas.style.border = '2px solid #333';
document.body.style.background = '#000';
document.body.style.margin = '0';
document.body.style.padding = '20px';
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Could not get 2D context');

// Store resources
world.setResource('canvas', canvas);
world.setResource('ctx', ctx);
world.setResource('input', { up: false, down: false, left: false, right: false, shoot: false, pause: false });
world.setResource('gameState', 'menu');
world.setResource('difficulty', 1);
world.setResource('wave', 1);
world.setResource('time', 0);
world.setResource('deltaTime', 0);

// -----------------------------------------------------------------------------
// Input Handling
// -----------------------------------------------------------------------------
const keyMap: Record<string, keyof GameResources['input'] | undefined> = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    Space: 'shoot',
    KeyP: 'pause',
};

document.addEventListener('keydown', (e) => {
    const input = world.getResource('input');
    const key = keyMap[e.code];
    if (key !== undefined) {
        input[key] = true;
        e.preventDefault();
    }

    // Start game from menu
    if (e.code === 'Space' && world.getResource('gameState') === 'menu') {
        world.emit({ type: 'game/start' });
    }

    // Toggle pause
    if (e.code === 'KeyP') {
        const state = world.getResource('gameState');
        if (state === 'playing') {
            world.emit({ type: 'game/pause' });
        } else if (state === 'paused') {
            world.emit({ type: 'game/resume' });
        }
    }

    // Restart from game over
    if (e.code === 'KeyR' && world.getResource('gameState') === 'gameOver') {
        location.reload();
    }
});

document.addEventListener('keyup', (e) => {
    const input = world.getResource('input');
    const key = keyMap[e.code];
    if (key !== undefined) {
        input[key] = false;
    }
});

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------
function randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

function wrapPosition(pos: Vec2Type, width: number, height: number): void {
    if (pos[0] < 0) pos[0] = width;
    if (pos[0] > width) pos[0] = 0;
    if (pos[1] < 0) pos[1] = height;
    if (pos[1] > height) pos[1] = 0;
}

function isOutOfBounds(pos: Vec2Type, margin: number = 50): boolean {
    return pos[0] < -margin || pos[0] > canvas.width + margin || pos[1] < -margin || pos[1] > canvas.height + margin;
}

function distanceSquared(a: Vec2Type, b: Vec2Type): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return dx * dx + dy * dy;
}

// -----------------------------------------------------------------------------
// Entity Factory Functions
// -----------------------------------------------------------------------------
function createPlayer(): void {
    const entity = world.createEntity();
    world.spawn(entity, [
        createComponent(T.Position, { pos: Vec2.create(canvas.width / 2, canvas.height / 2) }),
        createComponent(T.Velocity, { vel: Vec2.zero(), friction: 0.98 }),
        createComponent(T.Rotation, { angle: -Math.PI / 2, angularVelocity: 0 }),
        createComponent(T.Scale, { scale: Vec2.create(20, 20) }),
        createComponent(T.Sprite, {
            shape: 'triangle' as const,
            color: '#4ecdc4',
            strokeColor: '#fff',
            strokeWidth: 2,
            glow: true,
        }),
        createComponent(T.Player, { shootCooldown: 200, lastShot: 0 }),
        createComponent(T.Health, { current: 100, max: 100 }),
        createComponent(T.Collider, { radius: 15 }),
        createComponent(T.Trail, { positions: [], maxLength: 20 }),
        createComponent(T.Score, { value: 0, multiplier: 1, combo: 0, lastKillTime: 0 }),
    ]);
}

function spawnAsteroid(size: 'large' | 'medium' | 'small' = 'large', position?: Vec2Type): void {
    const entity = world.createEntity();
    const sizeMap = { large: 40, medium: 25, small: 15 };
    const healthMap = { large: 3, medium: 2, small: 1 };
    const scoreMap = { large: 100, medium: 50, small: 25 };
    const radius = sizeMap[size];

    // Spawn from edges if no position given
    const pos =
        position ||
        (() => {
            const edge = Math.floor(Math.random() * 4);
            switch (edge) {
                case 0:
                    return Vec2.create(randomRange(0, canvas.width), -radius);
                case 1:
                    return Vec2.create(canvas.width + radius, randomRange(0, canvas.height));
                case 2:
                    return Vec2.create(randomRange(0, canvas.width), canvas.height + radius);
                default:
                    return Vec2.create(-radius, randomRange(0, canvas.height));
            }
        })();

    const speed = randomRange(50, 150) * (1 + world.getResource('difficulty') * 0.1);
    const angle = randomRange(0, Math.PI * 2);
    const vel = Vec2.create(Math.cos(angle) * speed, Math.sin(angle) * speed);

    world.spawn(entity, [
        createComponent(T.Position, { pos }),
        createComponent(T.Velocity, { vel, friction: 1 }),
        createComponent(T.Rotation, { angle: randomRange(0, Math.PI * 2), angularVelocity: randomRange(-2, 2) }),
        createComponent(T.Scale, { scale: Vec2.create(radius, radius) }),
        createComponent(T.Sprite, {
            shape: 'hexagon' as const,
            color: '#6c5ce7',
            strokeColor: '#a29bfe',
            strokeWidth: 2,
        }),
        createComponent(T.Asteroid, { size }),
        createComponent(T.Health, { current: healthMap[size], max: healthMap[size] }),
        createComponent(T.Damage, { amount: 20 }),
        createComponent(T.Collider, { radius }),
        createComponent(T.Score, { value: scoreMap[size], multiplier: 1, combo: 0, lastKillTime: 0 }),
    ]);
}

function spawnEnemy(type: 'chaser' | 'shooter' | 'bomber' = 'chaser'): void {
    const entity = world.createEntity();
    const colors = { chaser: '#e74c3c', shooter: '#e67e22', bomber: '#9b59b6' };
    const shapes: Record<string, SpriteComponent['data']['shape']> = {
        chaser: 'diamond',
        shooter: 'star',
        bomber: 'circle',
    };

    const edge = Math.floor(Math.random() * 4);
    const pos =
        edge === 0
            ? Vec2.create(randomRange(0, canvas.width), -30)
            : edge === 1
              ? Vec2.create(canvas.width + 30, randomRange(0, canvas.height))
              : edge === 2
                ? Vec2.create(randomRange(0, canvas.width), canvas.height + 30)
                : Vec2.create(-30, randomRange(0, canvas.height));

    world.spawn(entity, [
        createComponent(T.Position, { pos }),
        createComponent(T.Velocity, { vel: Vec2.zero(), friction: 0.95 }),
        createComponent(T.Rotation, { angle: 0, angularVelocity: type === 'bomber' ? 3 : 0 }),
        createComponent(T.Scale, { scale: Vec2.create(25, 25) }),
        createComponent(T.Sprite, {
            shape: shapes[type],
            color: colors[type],
            strokeColor: '#fff',
            strokeWidth: 1,
            glow: true,
        }),
        createComponent(T.Enemy, { type, shootCooldown: type === 'shooter' ? 1500 : 0, lastShot: 0 }),
        createComponent(T.Health, { current: type === 'bomber' ? 5 : 2, max: type === 'bomber' ? 5 : 2 }),
        createComponent(T.Damage, { amount: type === 'bomber' ? 40 : 15 }),
        createComponent(T.Collider, { radius: 20 }),
        createComponent(T.Score, { value: type === 'bomber' ? 300 : 150, multiplier: 1, combo: 0, lastKillTime: 0 }),
    ]);
}

function spawnBullet(position: Vec2Type, angle: number, owner: 'player' | 'enemy', isHoming = false): void {
    const entity = world.createEntity();
    const speed = owner === 'player' ? 500 : 300;
    const vel = Vec2.create(Math.cos(angle) * speed, Math.sin(angle) * speed);

    const components: WorldComponent[] = [
        createComponent(T.Position, { pos: Vec2.createCopy(position) }),
        createComponent(T.Velocity, { vel, friction: 1 }),
        createComponent(T.Rotation, { angle, angularVelocity: 0 }),
        createComponent(T.Scale, { scale: Vec2.create(8, 4) }),
        createComponent(T.Sprite, {
            shape: 'rect' as const,
            color: owner === 'player' ? '#4ecdc4' : '#e74c3c',
            glow: true,
        }),
        createComponent(T.Bullet, { owner }),
        createComponent(T.Damage, { amount: owner === 'player' ? 1 : 10 }),
        createComponent(T.Lifetime, { remaining: 2, initial: 2 }),
        createComponent(T.Collider, { radius: 5 }),
    ];

    if (isHoming) {
        components.push(createComponent(T.HomingMissile, { target: null }));
    }

    world.spawn(entity, components);
}

function spawnPowerUp(position: Vec2Type): void {
    const entity = world.createEntity();
    const types: PowerUpComponent['data']['type'][] = ['health', 'shield', 'rapidFire', 'missile'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = { health: '#2ecc71', shield: '#3498db', rapidFire: '#f39c12', missile: '#e74c3c' };

    world.spawn(entity, [
        createComponent(T.Position, { pos: Vec2.createCopy(position) }),
        createComponent(T.Velocity, { vel: Vec2.create(0, 30), friction: 1 }),
        createComponent(T.Rotation, { angle: 0, angularVelocity: 2 }),
        createComponent(T.Scale, { scale: Vec2.create(15, 15) }),
        createComponent(T.Sprite, { shape: 'star' as const, color: colors[type], glow: true }),
        createComponent(T.PowerUp, { type }),
        createComponent(T.Lifetime, { remaining: 10, initial: 10 }),
        createComponent(T.Collider, { radius: 12 }),
    ]);
}

function spawnParticle(position: Vec2Type, color: string, velocity?: Vec2Type): void {
    const entity = world.createEntity();
    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(50, 200);
    const vel = velocity || Vec2.create(Math.cos(angle) * speed, Math.sin(angle) * speed);

    world.spawn(entity, [
        createComponent(T.Position, { pos: Vec2.createCopy(position) }),
        createComponent(T.Velocity, { vel, friction: 0.95 }),
        createComponent(T.Rotation, { angle: randomRange(0, Math.PI * 2), angularVelocity: randomRange(-5, 5) }),
        createComponent(T.Scale, { scale: Vec2.create(randomRange(2, 6), randomRange(2, 6)) }),
        createComponent(T.Sprite, { shape: 'rect' as const, color }),
        createComponent(T.Particle, { alpha: 1 }),
        createComponent(T.Lifetime, { remaining: randomRange(0.3, 1), initial: 1 }),
    ]);
}

function spawnExplosion(position: Vec2Type, color: string, particleCount = 15): void {
    for (let i = 0; i < particleCount; i++) {
        spawnParticle(position, color);
    }

    // Add screen shake
    const shakeEntity = world.createEntity();
    world.spawn(shakeEntity, [
        createComponent(T.ScreenShake, { intensity: 5, duration: 0.2 }),
        createComponent(T.Lifetime, { remaining: 0.2, initial: 0.2 }),
    ]);
}

function createStarField(): void {
    const entity = world.createEntity();
    const stars: StarFieldComponent['data']['stars'] = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: randomRange(0, canvas.width),
            y: randomRange(0, canvas.height),
            size: randomRange(1, 3),
            speed: randomRange(20, 100),
        });
    }
    world.spawn(entity, [createComponent(T.StarField, { stars })]);
}

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

// Player queries - specialized for each system's needs
const playerInputQuery = world.createQuery({
    query: {
        includeEntity: true,
        tuple: [T.Position, T.Velocity, T.Rotation, T.Player, T.Trail, T.Score],
    },
});

const playerPositionQuery = world.createQuery({
    query: { tuple: [T.Position, T.Player] },
});

const playerCollisionQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Position, T.Health, T.Collider, T.Player] },
});

const playerScoreQuery = world.createQuery({
    query: { tuple: [T.Score, T.Player] },
});

const playerHealthScoreQuery = world.createQuery({
    query: { tuple: [T.Health, T.Score, T.Player] },
});

const playerTrailQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Trail, T.Player] },
});

const playerShieldRenderQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Position, T.Player] },
});

const playerUIQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Health, T.Score, T.Player] },
});

const playerEntityQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Player] },
});

// Render query
const renderQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Position, T.Rotation, T.Scale, T.Sprite] },
});

// Physics queries
const physicsQuery = world.createQuery({
    query: { tuple: [T.Position, T.Velocity] },
});

const rotationQuery = world.createQuery({
    query: { tuple: [T.Rotation] },
});

const lifetimeQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Lifetime] },
});

// Asteroid queries - specialized for each use case
const asteroidPositionQuery = world.createQuery({
    query: { tuple: [T.Position, T.Asteroid] },
});

const asteroidCollisionQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Position, T.Collider, T.Asteroid] },
});

const asteroidFullQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Position, T.Asteroid, T.Health, T.Collider, T.Score] },
});

// Enemy queries - specialized for each use case
const enemyPositionQuery = world.createQuery({
    query: { tuple: [T.Position, T.Enemy] },
});

const enemyAIQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Position, T.Velocity, T.Enemy] },
});

const enemyCollisionQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Position, T.Velocity, T.Enemy, T.Health, T.Collider, T.Score] },
});

// Bullet query
const bulletQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Position, T.Bullet, T.Damage, T.Collider] },
});

// Power-up query
const powerUpQuery = world.createQuery({
    query: { includeEntity: true, tuple: [T.Position, T.PowerUp, T.Collider] },
});

// Particle query
const particleQuery = world.createQuery({
    query: { tuple: [T.Particle, T.Lifetime] },
});

// Effect queries
const screenShakeQuery = world.createQuery({
    query: { tuple: [T.ScreenShake] },
});

const starFieldQuery = world.createQuery({
    query: { tuple: [T.StarField] },
});

const homingQuery = world.createQuery({
    query: { tuple: [T.Position, T.Velocity, T.HomingMissile] },
});

// -----------------------------------------------------------------------------
// Systems
// -----------------------------------------------------------------------------
function playerInputSystem(dt: number): void {
    const input = world.getResource('input');
    const time = world.getResource('time');

    for (const [entity, pos, vel, rot, player, trail, score] of playerInputQuery) {
        // Movement
        const acceleration = 800;
        const maxSpeed = 350;

        if (input.up) {
            Vec2.add(
                vel.data.vel,
                Vec2.create(Math.cos(rot.data.angle) * acceleration * dt, Math.sin(rot.data.angle) * acceleration * dt),
            );
        }
        if (input.down) {
            Vec2.add(
                vel.data.vel,
                Vec2.create(
                    -Math.cos(rot.data.angle) * acceleration * dt * 0.5,
                    -Math.sin(rot.data.angle) * acceleration * dt * 0.5,
                ),
            );
        }

        // Rotation
        const turnSpeed = 5;
        if (input.left) rot.data.angle -= turnSpeed * dt;
        if (input.right) rot.data.angle += turnSpeed * dt;

        // Clamp velocity
        const speed = Math.sqrt(vel.data.vel[0] ** 2 + vel.data.vel[1] ** 2);
        if (speed > maxSpeed) {
            Vec2.scale(vel.data.vel, maxSpeed / speed);
        }

        // Shooting
        const rapidFire = world.getComponent(entity, T.RapidFire);
        const cooldown = rapidFire ? player.data.shootCooldown / 3 : player.data.shootCooldown;

        if (input.shoot && time - player.data.lastShot > cooldown / 1000) {
            const bulletPos = Vec2.create(
                pos.data.pos[0] + Math.cos(rot.data.angle) * 20,
                pos.data.pos[1] + Math.sin(rot.data.angle) * 20,
            );
            const hasMissile = world.getComponent(entity, T.HomingMissile);
            spawnBullet(bulletPos, rot.data.angle, 'player', !!hasMissile);
            player.data.lastShot = time;
        }

        // Update trail
        trail.data.positions.unshift(Vec2.createCopy(pos.data.pos));
        if (trail.data.positions.length > trail.data.maxLength) {
            trail.data.positions.pop();
        }

        // Wrap around screen
        wrapPosition(pos.data.pos, canvas.width, canvas.height);

        // Combo decay
        if (time - score.data.lastKillTime > 3) {
            score.data.combo = 0;
            score.data.multiplier = 1;
        }
    }
}

function enemyAISystem(dt: number): void {
    const time = world.getResource('time');

    // Find player position
    let playerPos: Vec2Type | null = null;
    for (const [pos] of playerPositionQuery) {
        playerPos = pos.data.pos;
        break;
    }
    if (!playerPos) return;

    for (const [enemyEntity, pos, vel, enemy] of enemyAIQuery) {
        const toPlayer = Vec2.subtraction(Vec2.zero(), playerPos, pos.data.pos);
        const dist = Math.sqrt(toPlayer[0] ** 2 + toPlayer[1] ** 2);
        Vec2.normalize(toPlayer);

        switch (enemy.data.type) {
            case 'chaser': {
                const chaseSpeed = 150 + world.getResource('difficulty') * 20;
                Vec2.add(vel.data.vel, Vec2.scale(Vec2.createCopy(toPlayer), chaseSpeed * dt));
                break;
            }
            case 'shooter': {
                // Keep distance and shoot
                const targetDist = 200;
                if (dist < targetDist - 50) {
                    Vec2.add(vel.data.vel, Vec2.scale(Vec2.createCopy(toPlayer), -100 * dt));
                } else if (dist > targetDist + 50) {
                    Vec2.add(vel.data.vel, Vec2.scale(Vec2.createCopy(toPlayer), 100 * dt));
                }

                // Shoot at player
                if (time - enemy.data.lastShot > enemy.data.shootCooldown / 1000) {
                    const angle = Math.atan2(toPlayer[1], toPlayer[0]);
                    spawnBullet(Vec2.createCopy(pos.data.pos), angle, 'enemy');
                    enemy.data.lastShot = time;
                }
                break;
            }
            case 'bomber': {
                // Slowly approach, then explode
                Vec2.add(vel.data.vel, Vec2.scale(Vec2.createCopy(toPlayer), 80 * dt));
                if (dist < 60) {
                    // Explode!
                    spawnExplosion(pos.data.pos, '#9b59b6', 30);
                    world.despawn(enemyEntity);
                }
                break;
            }
        }

        // Clamp enemy velocity
        const maxEnemySpeed = 200;
        const speed = Math.sqrt(vel.data.vel[0] ** 2 + vel.data.vel[1] ** 2);
        if (speed > maxEnemySpeed) {
            Vec2.scale(vel.data.vel, maxEnemySpeed / speed);
        }
    }
}

function homingMissileSystem(dt: number): void {
    for (const [pos, vel] of homingQuery) {
        // Find nearest enemy or asteroid
        let nearestDist = Infinity;
        let nearestPos: Vec2Type | null = null;

        for (const [enemyPos] of enemyPositionQuery) {
            const dist = distanceSquared(pos.data.pos, enemyPos.data.pos);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestPos = enemyPos.data.pos;
            }
        }

        for (const [asteroidPos] of asteroidPositionQuery) {
            const dist = distanceSquared(pos.data.pos, asteroidPos.data.pos);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestPos = asteroidPos.data.pos;
            }
        }

        if (nearestPos) {
            const toTarget = Vec2.subtraction(Vec2.zero(), nearestPos, pos.data.pos);
            Vec2.normalize(toTarget);
            const currentDir = Vec2.normalize(Vec2.createCopy(vel.data.vel));
            const newDir = Vec2.lerp(Vec2.createCopy(currentDir), toTarget, 5 * dt);
            Vec2.normalize(newDir);
            const speed = Math.sqrt(vel.data.vel[0] ** 2 + vel.data.vel[1] ** 2);
            Vec2.set(vel.data.vel, newDir[0] * speed, newDir[1] * speed);
        }
    }
}

function physicsSystem(dt: number): void {
    for (const [pos, vel] of physicsQuery) {
        Vec2.add(pos.data.pos, vel.data.vel, dt);
        Vec2.scale(vel.data.vel, vel.data.friction);
    }
}

function rotationSystem(dt: number): void {
    for (const [rot] of rotationQuery) {
        rot.data.angle += rot.data.angularVelocity * dt;
    }
}

function lifetimeSystem(dt: number): void {
    for (const [entity, lifetime] of lifetimeQuery) {
        lifetime.data.remaining -= dt;
        if (lifetime.data.remaining <= 0) {
            world.despawn(entity);
        }
    }
}

function particleSystem(): void {
    for (const [particle, lifetime] of particleQuery) {
        particle.data.alpha = Easings.easeOutCubic(lifetime.data.remaining / lifetime.data.initial);
    }
}

function collisionSystem(): void {
    const time = world.getResource('time');

    // Player bullets vs enemies/asteroids
    for (const [bulletEntity, bulletPos, bullet, bulletDamage, bulletCollider] of bulletQuery) {
        if (bullet.data.owner !== 'player') continue;

        // Check enemies
        for (const [enemyEntity, enemyPos, vel, , enemyHealth, enemyCollider, enemyScore] of enemyCollisionQuery) {
            const dist = distanceSquared(bulletPos.data.pos, enemyPos.data.pos);
            const minDist = bulletCollider.data.radius + enemyCollider.data.radius;
            if (dist < minDist * minDist) {
                enemyHealth.data.current -= bulletDamage.data.amount;
                world.despawn(bulletEntity);

                if (enemyHealth.data.current <= 0) {
                    spawnExplosion(enemyPos.data.pos, '#e74c3c', 20);

                    // Award score
                    for (const [playerScore] of playerScoreQuery) {
                        playerScore.data.combo++;
                        playerScore.data.multiplier = Math.min(1 + playerScore.data.combo * 0.1, 5);
                        playerScore.data.value += Math.floor(enemyScore.data.value * playerScore.data.multiplier);
                        playerScore.data.lastKillTime = time;
                    }

                    // Chance to spawn power-up
                    if (Math.random() < 0.15) {
                        spawnPowerUp(enemyPos.data.pos);
                    }

                    world.despawn(enemyEntity);
                } else {
                    // Knockback
                    const knockback = Vec2.subtraction(Vec2.zero(), enemyPos.data.pos, bulletPos.data.pos);
                    Vec2.normalize(knockback);
                    Vec2.scale(knockback, 100);
                    Vec2.add(vel.data.vel, knockback);
                }
                break;
            }
        }

        // Check asteroids
        for (const [
            asteroidEntity,
            asteroidPos,
            asteroid,
            asteroidHealth,
            asteroidCollider,
            asteroidScore,
        ] of asteroidFullQuery) {
            const dist = distanceSquared(bulletPos.data.pos, asteroidPos.data.pos);
            const minDist = bulletCollider.data.radius + asteroidCollider.data.radius;
            if (dist < minDist * minDist) {
                asteroidHealth.data.current -= bulletDamage.data.amount;
                world.despawn(bulletEntity);

                if (asteroidHealth.data.current <= 0) {
                    spawnExplosion(asteroidPos.data.pos, '#6c5ce7', 12);

                    // Award score
                    for (const [playerScore] of playerScoreQuery) {
                        playerScore.data.combo++;
                        playerScore.data.multiplier = Math.min(1 + playerScore.data.combo * 0.1, 5);
                        playerScore.data.value += Math.floor(asteroidScore.data.value * playerScore.data.multiplier);
                        playerScore.data.lastKillTime = time;
                    }

                    // Split asteroid
                    if (asteroid.data.size === 'large') {
                        spawnAsteroid('medium', Vec2.createCopy(asteroidPos.data.pos));
                        spawnAsteroid('medium', Vec2.createCopy(asteroidPos.data.pos));
                    } else if (asteroid.data.size === 'medium') {
                        spawnAsteroid('small', Vec2.createCopy(asteroidPos.data.pos));
                        spawnAsteroid('small', Vec2.createCopy(asteroidPos.data.pos));
                    }

                    world.despawn(asteroidEntity);
                }
                break;
            }
        }
    }

    // Enemy bullets vs player
    for (const [bulletEntity, bulletPos, bullet, bulletDamage, bulletCollider] of bulletQuery) {
        if (bullet.data.owner !== 'enemy') continue;

        for (const [playerEntity, playerPos, playerHealth, playerCollider] of playerCollisionQuery) {
            const invincible = world.getComponent(playerEntity, T.Invincible);
            const shield = world.getComponent(playerEntity, T.Shield);
            if (invincible) continue;

            const dist = distanceSquared(bulletPos.data.pos, playerPos.data.pos);
            const minDist = bulletCollider.data.radius + playerCollider.data.radius;
            if (dist < minDist * minDist) {
                if (shield && shield.data.hits > 0) {
                    shield.data.hits--;
                    spawnExplosion(bulletPos.data.pos, '#3498db', 5);
                } else {
                    playerHealth.data.current -= bulletDamage.data.amount;
                    spawnExplosion(playerPos.data.pos, '#4ecdc4', 8);
                }
                world.despawn(bulletEntity);
                break;
            }
        }
    }

    // Enemies/asteroids vs player
    for (const [playerEntity, playerPos, playerHealth, playerCollider] of playerCollisionQuery) {
        const invincible = world.getComponent(playerEntity, T.Invincible);
        if (invincible) continue;

        for (const [asteroidEntity, asteroidPos, asteroidCollider] of asteroidCollisionQuery) {
            const dist = distanceSquared(playerPos.data.pos, asteroidPos.data.pos);
            const minDist = playerCollider.data.radius + asteroidCollider.data.radius;
            if (dist < minDist * minDist) {
                const shield = world.getComponent(playerEntity, T.Shield);
                if (shield && shield.data.hits > 0) {
                    shield.data.hits--;
                } else {
                    playerHealth.data.current -= 20;
                }
                spawnExplosion(asteroidPos.data.pos, '#6c5ce7', 10);

                // Add invincibility frames
                world.addComponent(playerEntity, createComponent(T.Invincible, { duration: 1 }));
                world.despawn(asteroidEntity);
                break;
            }
        }
    }

    // Power-ups vs player
    for (const [powerUpEntity, powerUpPos, powerUp, powerUpCollider] of powerUpQuery) {
        for (const [playerEntity, playerPos, playerHealth, playerCollider] of playerCollisionQuery) {
            const dist = distanceSquared(playerPos.data.pos, powerUpPos.data.pos);
            const minDist = powerUpCollider.data.radius + playerCollider.data.radius;
            if (dist < minDist * minDist) {
                switch (powerUp.data.type) {
                    case 'health':
                        playerHealth.data.current = Math.min(playerHealth.data.current + 30, playerHealth.data.max);
                        break;
                    case 'shield':
                        world.addComponent(playerEntity, createComponent(T.Shield, { duration: 10, hits: 3 }));
                        break;
                    case 'rapidFire':
                        world.addComponent(playerEntity, createComponent(T.RapidFire, { duration: 8 }));
                        break;
                    case 'missile':
                        world.addComponent(playerEntity, createComponent(T.HomingMissile, { target: null }));
                        break;
                }
                spawnExplosion(powerUpPos.data.pos, '#f39c12', 10);
                world.despawn(powerUpEntity);
                break;
            }
        }
    }

    // Check player death
    for (const [playerHealth, playerScore] of playerHealthScoreQuery) {
        if (playerHealth.data.current <= 0) {
            world.emit({ type: 'game/over', payload: { finalScore: playerScore.data.value } });
            world.setResource('gameState', 'gameOver');
        }
    }
}

function powerUpTimerSystem(dt: number): void {
    for (const [entity] of playerEntityQuery) {
        // Invincibility
        const invincible = world.getComponent(entity, T.Invincible);
        if (invincible) {
            invincible.data.duration -= dt;
            if (invincible.data.duration <= 0) {
                world.removeComponent(entity, T.Invincible);
            }
        }

        // Shield
        const shield = world.getComponent(entity, T.Shield);
        if (shield) {
            shield.data.duration -= dt;
            if (shield.data.duration <= 0 || shield.data.hits <= 0) {
                world.removeComponent(entity, T.Shield);
            }
        }

        // Rapid fire
        const rapidFire = world.getComponent(entity, T.RapidFire);
        if (rapidFire) {
            rapidFire.data.duration -= dt;
            if (rapidFire.data.duration <= 0) {
                world.removeComponent(entity, T.RapidFire);
            }
        }
    }
}

function cleanupSystem(): void {
    // Remove out of bounds bullets
    for (const [entity, pos] of bulletQuery) {
        if (isOutOfBounds(pos.data.pos)) {
            world.despawn(entity);
        }
    }
}

function spawnSystem(dt: number): void {
    const difficulty = world.getResource('difficulty');
    const time = world.getResource('time');

    // Gradually increase difficulty
    world.setResource('difficulty', 1 + Math.floor(time / 30) * 0.5);

    // Spawn asteroids
    const asteroidSpawnRate = Math.max(0.3, 2 - difficulty * 0.1);
    if (Math.random() < dt / asteroidSpawnRate) {
        spawnAsteroid();
    }

    // Spawn enemies (after some time)
    if (time > 10) {
        const enemySpawnRate = Math.max(1, 4 - difficulty * 0.3);
        if (Math.random() < dt / enemySpawnRate) {
            const types: ('chaser' | 'shooter' | 'bomber')[] = ['chaser', 'shooter'];
            if (time > 30) types.push('bomber');
            spawnEnemy(types[Math.floor(Math.random() * types.length)]);
        }
    }
}

function starFieldSystem(dt: number): void {
    for (const [starField] of starFieldQuery) {
        for (const star of starField.data.stars) {
            star.y += star.speed * dt;
            if (star.y > canvas.height) {
                star.y = 0;
                star.x = randomRange(0, canvas.width);
            }
        }
    }
}

// -----------------------------------------------------------------------------
// Rendering Functions
// -----------------------------------------------------------------------------
function drawShape(
    ctx: CanvasRenderingContext2D,
    shape: SpriteComponent['data']['shape'],
    color: string,
    strokeColor?: string,
    strokeWidth?: number,
    glow?: boolean,
): void {
    if (glow) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
    }

    ctx.fillStyle = color;
    ctx.beginPath();

    switch (shape) {
        case 'triangle':
            ctx.moveTo(1, 0);
            ctx.lineTo(-0.7, -0.7);
            ctx.lineTo(-0.4, 0);
            ctx.lineTo(-0.7, 0.7);
            ctx.closePath();
            break;
        case 'circle':
            ctx.arc(0, 0, 1, 0, Math.PI * 2);
            break;
        case 'rect':
            ctx.rect(-1, -0.5, 2, 1);
            break;
        case 'star': {
            const spikes = 5;
            const outerRadius = 1;
            const innerRadius = 0.5;
            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / spikes - Math.PI / 2;
                if (i === 0) {
                    ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                } else {
                    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
                }
            }
            ctx.closePath();
            break;
        }
        case 'diamond':
            ctx.moveTo(0, -1);
            ctx.lineTo(0.7, 0);
            ctx.lineTo(0, 1);
            ctx.lineTo(-0.7, 0);
            ctx.closePath();
            break;
        case 'hexagon': {
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                if (i === 0) {
                    ctx.moveTo(Math.cos(angle), Math.sin(angle));
                } else {
                    ctx.lineTo(Math.cos(angle), Math.sin(angle));
                }
            }
            ctx.closePath();
            break;
        }
    }

    ctx.fill();

    if (strokeColor && strokeWidth) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth / 20; // Normalize for scale
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
}

function renderSystem(): void {
    const ctx = world.getResource('ctx');
    const canvas = world.getResource('canvas');

    // Get screen shake
    let shakeX = 0;
    let shakeY = 0;
    for (const [shake] of screenShakeQuery) {
        shakeX = (Math.random() - 0.5) * shake.data.intensity * 2;
        shakeY = (Math.random() - 0.5) * shake.data.intensity * 2;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);

    // Draw star field
    for (const [starField] of starFieldQuery) {
        ctx.fillStyle = '#fff';
        for (const star of starField.data.stars) {
            ctx.globalAlpha = 0.3 + star.size * 0.2;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Draw player trail
    for (const [entity, trail] of playerTrailQuery) {
        const invincible = world.getComponent(entity, T.Invincible);
        if (trail.data.positions.length > 1) {
            ctx.strokeStyle = invincible ? '#fff' : '#4ecdc4';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let i = 0; i < trail.data.positions.length; i++) {
                ctx.globalAlpha = 1 - i / trail.data.positions.length;
                const p = trail.data.positions[i];
                if (i === 0) ctx.moveTo(p[0], p[1]);
                else ctx.lineTo(p[0], p[1]);
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    // Draw all sprites
    for (const [entity, pos, rot, scale, sprite] of renderQuery) {
        ctx.save();
        ctx.translate(pos.data.pos[0], pos.data.pos[1]);
        ctx.rotate(rot.data.angle);
        ctx.scale(scale.data.scale[0], scale.data.scale[1]);

        // Flicker effect for invincibility
        const invincible = world.getComponent(entity, T.Invincible);
        if (invincible) {
            ctx.globalAlpha = Math.sin(world.getResource('time') * 20) * 0.3 + 0.7;
        }

        // Particle alpha
        const particle = world.getComponent(entity, T.Particle);
        if (particle) {
            ctx.globalAlpha = particle.data.alpha;
        }

        // Lifetime fade for power-ups
        const lifetime = world.getComponent(entity, T.Lifetime);
        const powerUp = world.getComponent(entity, T.PowerUp);
        if (lifetime && powerUp && lifetime.data.remaining < 3) {
            ctx.globalAlpha = (Math.sin(world.getResource('time') * 10) * 0.5 + 0.5) * (lifetime.data.remaining / 3);
        }

        drawShape(
            ctx,
            sprite.data.shape,
            sprite.data.color,
            sprite.data.strokeColor,
            sprite.data.strokeWidth,
            sprite.data.glow,
        );

        ctx.restore();
    }

    // Draw shield effect
    for (const [entity, pos] of playerShieldRenderQuery) {
        const shield = world.getComponent(entity, T.Shield);
        if (shield) {
            ctx.save();
            ctx.translate(pos.data.pos[0], pos.data.pos[1]);
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5 + Math.sin(world.getResource('time') * 5) * 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    ctx.restore();
}

function renderUISystem(): void {
    const ctx = world.getResource('ctx');
    const canvas = world.getResource('canvas');
    const gameState = world.getResource('gameState');

    if (gameState === 'menu') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#4ecdc4';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SPACE SURVIVAL', canvas.width / 2, canvas.height / 2 - 80);

        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.fillText('Press SPACE to Start', canvas.width / 2, canvas.height / 2);

        ctx.font = '16px Arial';
        ctx.fillStyle = '#aaa';
        ctx.fillText('WASD / Arrow Keys - Move', canvas.width / 2, canvas.height / 2 + 60);
        ctx.fillText('SPACE - Shoot', canvas.width / 2, canvas.height / 2 + 85);
        ctx.fillText('P - Pause', canvas.width / 2, canvas.height / 2 + 110);
        return;
    }

    if (gameState === 'paused') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#f39c12';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);

        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        ctx.fillText('Press P to Resume', canvas.width / 2, canvas.height / 2 + 50);
        return;
    }

    if (gameState === 'gameOver') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);

        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        let finalScore = 0;
        for (const [score] of playerScoreQuery) {
            finalScore = score.data.value;
        }
        ctx.fillText(`Final Score: ${finalScore}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 60);
        return;
    }

    // HUD
    ctx.textAlign = 'left';

    // Health bar
    for (const [entity, health, score] of playerUIQuery) {
        const barWidth = 200;
        const barHeight = 20;
        const x = 20;
        const y = 20;

        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, barWidth, barHeight);

        const healthPercent = health.data.current / health.data.max;
        const healthColor = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillStyle = healthColor;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Score
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`Score: ${score.data.value}`, x, y + 50);

        // Multiplier
        if (score.data.multiplier > 1) {
            ctx.fillStyle = '#f39c12';
            ctx.font = '18px Arial';
            ctx.fillText(`x${score.data.multiplier.toFixed(1)} Combo!`, x, y + 75);
        }

        // Power-up indicators
        let indicatorY = y + 100;
        const shield = world.getComponent(entity, T.Shield);
        if (shield) {
            ctx.fillStyle = '#3498db';
            ctx.fillText(`🛡️ Shield (${shield.data.hits} hits)`, x, indicatorY);
            indicatorY += 25;
        }

        const rapidFire = world.getComponent(entity, T.RapidFire);
        if (rapidFire) {
            ctx.fillStyle = '#f39c12';
            ctx.fillText(`⚡ Rapid Fire (${rapidFire.data.duration.toFixed(1)}s)`, x, indicatorY);
            indicatorY += 25;
        }

        const missile = world.getComponent(entity, T.HomingMissile);
        if (missile) {
            ctx.fillStyle = '#e74c3c';
            ctx.fillText('🚀 Homing Missiles', x, indicatorY);
        }
    }

    // Wave/difficulty indicator
    ctx.fillStyle = '#aaa';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Difficulty: ${world.getResource('difficulty').toFixed(1)}`, canvas.width - 20, 30);
}

// -----------------------------------------------------------------------------
// Event Handlers
// -----------------------------------------------------------------------------
world.on('game/start', () => {
    world.setResource('gameState', 'playing');
    world.setResource('time', 0);
    createPlayer();
    createStarField();
});

world.on('game/pause', () => {
    world.setResource('gameState', 'paused');
});

world.on('game/resume', () => {
    world.setResource('gameState', 'playing');
});

world.on('game/over', (payload) => {
    console.log('Game Over! Final Score:', payload.finalScore);
});

// -----------------------------------------------------------------------------
// Game Loop
// -----------------------------------------------------------------------------
let lastTime = performance.now();

function gameLoop(currentTime: number): void {
    const dt = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap delta time
    lastTime = currentTime;

    const gameState = world.getResource('gameState');

    if (gameState === 'playing') {
        world.setResource('deltaTime', dt);
        world.setResource('time', world.getResource('time') + dt);

        // Update systems
        playerInputSystem(dt);
        enemyAISystem(dt);
        homingMissileSystem(dt);
        physicsSystem(dt);
        rotationSystem(dt);
        collisionSystem();
        powerUpTimerSystem(dt);
        lifetimeSystem(dt);
        particleSystem();
        cleanupSystem();
        spawnSystem(dt);
        starFieldSystem(dt);
    }

    // Always render
    renderSystem();
    renderUISystem();

    requestAnimationFrame(gameLoop);
}

// Start the game loop (menu will show first)
requestAnimationFrame(gameLoop);
