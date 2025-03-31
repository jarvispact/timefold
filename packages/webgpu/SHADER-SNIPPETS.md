## Draw a smooth circle

```wgsl
@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
    if (entity.shape == 2) {
        let radius = 0.5;
        let center = vec2f(radius, radius);
        let dist = distance(vsOut.uv, center);
        let feather = fwidth(dist);
        let alpha = 1.0 - smoothstep(radius - feather, radius + feather, dist);
        return vec4f(1.0, 0.0, 0.0, alpha);
    }

    return vec4f(1.0, 0.0, 0.0, 1.0);
}
```