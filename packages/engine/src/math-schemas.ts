import {
    number,
    NumberSchema,
    tuple,
    TupleSchema,
    typedArray,
    TypedArraySchema,
    union,
    UnionSchema,
} from '@timefold/ecs';

export type Vec2Schema = UnionSchema<[TupleSchema<[NumberSchema, NumberSchema]>, TypedArraySchema]>;
export const vec2: Vec2Schema = union(tuple(number, number), typedArray);

export type Vec3Schema = UnionSchema<[TupleSchema<[NumberSchema, NumberSchema, NumberSchema]>, TypedArraySchema]>;
export const vec3: Vec3Schema = union(tuple(number, number, number), typedArray);

export type QuatSchema = UnionSchema<
    [TupleSchema<[NumberSchema, NumberSchema, NumberSchema, NumberSchema]>, TypedArraySchema]
>;
export const quat: QuatSchema = union(tuple(number, number, number, number), typedArray);
