import { worldBuilder, defineComponentTypes, createComponent, queryBuilder } from '@timefold/ecs';
import { Vec2, Vec2Type } from '@timefold/math';

const T = defineComponentTypes(['Position', 'Velocity', 'Shape', 'Player', 'Ball']);

const createPosition = (pos: Vec2Type) => createComponent(T.Position, pos);
type PositionComponent = ReturnType<typeof createPosition>;

const createVelocity = (pos: Vec2Type) => createComponent(T.Velocity, pos);
type VelocityComponent = ReturnType<typeof createVelocity>;

const Shape = { Box: 0, Circle: 1 } as const;
type Shape = (typeof Shape)[keyof typeof Shape];

const createShape = (shape: Shape) => createComponent(T.Shape, shape);
type ShapeComponent = ReturnType<typeof createShape>;

const createPlayerTag = () => createComponent(T.Player);
type PlayerTag = ReturnType<typeof createPlayerTag>;

const createBallTag = () => createComponent(T.Ball);
type BallTag = ReturnType<typeof createBallTag>;

type WorldComponent = PositionComponent | VelocityComponent | ShapeComponent | PlayerTag | BallTag;

const world = worldBuilder<WorldComponent>()
    .defineQueries({
        player: queryBuilder<WorldComponent>().with(T.Player).with(T.Position).compile(),
        ball: queryBuilder<WorldComponent>().with(T.Ball).with(T.Position).compile(),
    })
    .compile();

const playerQuery = world.getQuery('player').result;
const ballQuery = world.getQuery('ball').result;

let entity = 0;
const nextEntityId = () => entity++;

const player1 = nextEntityId();
const player2 = nextEntityId();
const ball = nextEntityId();

world.spawn(player1, [
    createPlayerTag(),
    createPosition(Vec2.create(0, 0)),
    createVelocity(Vec2.create(1, 1)),
    createShape(Shape.Box),
]);
world.spawn(player2, [
    createPlayerTag(),
    createPosition(Vec2.create(0, 0)),
    createVelocity(Vec2.create(1, 1)),
    createShape(Shape.Box),
]);
world.spawn(ball, [
    createBallTag(),
    createPosition(Vec2.create(0, 0)),
    createVelocity(Vec2.create(1, 1)),
    createShape(Shape.Circle),
]);

console.log({ player1, player2, ball, playerQuery, ballQuery });
