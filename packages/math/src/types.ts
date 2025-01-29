type TypedArray = Float32Array | Int32Array | Uint32Array;

export type Mat4x4Type =
    | [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
      ]
    | TypedArray;

export type QuatType = [number, number, number, number] | TypedArray;
export type QuatAngleOrder = 'xyz' | 'xzy' | 'yxz' | 'yzx' | 'zxy' | 'zyx';

export type ScalarType = [number] | TypedArray;

export type Vec2Type = [number, number] | TypedArray;

export type Vec3Type = [number, number, number] | TypedArray;
