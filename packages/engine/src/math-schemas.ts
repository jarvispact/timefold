import { number, Schema, tuple, typedArray, union } from '@timefold/ecs';
import { QuatType, Vec2Type, Vec3Type } from '@timefold/math';

export type Vec2Schema = Schema<'union', Vec2Type>;
export const vec2 = union(tuple(number, number), typedArray) as Vec2Schema;

export type Vec3Schema = Schema<'union', Vec3Type>;
export const vec3 = union(tuple(number, number, number), typedArray) as Vec3Schema;

export type QuatSchema = Schema<'union', QuatType>;
export const quat = union(tuple(number, number, number, number), typedArray) as QuatSchema;
