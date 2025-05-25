import { Uniform, WebgpuUtils, defineRenderPass, RenderPipelineContext } from '@timefold/webgpu';
import { DepthPass } from './depth-pass';

export const DebugDepthMapPass = defineRenderPass({
    name: 'DebugDepthMapPass',
    build: (ctx: RenderPipelineContext<[typeof DepthPass]>) => {
        const { device, context, format, canvas, msaa } = ctx.args;
        const { depthTexture } = ctx.DepthPass;

        const UniformGroup = Uniform.group(0, {
            depth_texture: Uniform.texture(1, {
                visibility: GPUShaderStage.FRAGMENT,
                texture: { sampleType: 'unfilterable-float', multisampled: msaa > 1 },
            }),
        });

        const code = /* wgsl */ `
${Uniform.getWgslFromGroups([UniformGroup])}

struct VsOut {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@vertex fn vs(@builtin(vertex_index) vertexIndex : u32) -> VsOut {
    let pos = array(
        vec2f(-0.9,  0.9), // top left
        vec2f(-0.9, -0.9), // bottom left
        vec2f( 0.9, -0.9), // bottom right

        vec2f(-0.9,  0.9), // top left
        vec2f( 0.9, -0.9), // bottom right
        vec2f( 0.9,  0.9), // top right
    );

    let uv = array(
        vec2f(0.0, 0.0), // top left
        vec2f(0.0, 1.0), // bottom left
        vec2f(1.0, 1.0), // bottom right

        vec2f(0.0, 0.0), // top left
        vec2f(1.0, 1.0), // bottom right
        vec2f(1.0, 0.0), // top right
    );

    var vsOut: VsOut;
    vsOut.position = vec4f(pos[vertexIndex], 0.0, 1.0);
    vsOut.uv = uv[vertexIndex];
    return vsOut;
}

@fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
    let dimensions = vec2f(textureDimensions(depth_texture));
    // let uv = vec2u(fsIn.uv * dimensions);
    // Sometimes this is needed to avoid white borders around the shadowmap
    // but it depends on the viewport and wether we render it on the full canvas or inside.
    let uv = vec2u(fsIn.uv * dimensions - vec2f(1.0));
    var z = textureLoad(depth_texture, uv, 0).r;

    let min_depth = 0.6;
    let max_depth = 1.0;
    z = (z - min_depth) / (max_depth - min_depth);
    z = 1.0 - clamp(z, 0.0, 1.0);

    return vec4f(z, z, z, 1.0);
}
`.trim();

        const Layout = WebgpuUtils.createPipelineLayout({
            device,
            uniformGroups: [UniformGroup],
        });

        const module = device.createShaderModule({ code });

        const pipeline = device.createRenderPipeline({
            layout: Layout.layout,
            vertex: { module },
            primitive: { cullMode: 'back', topology: 'triangle-list' },
            fragment: { module, targets: [{ format }] },
            multisample: { count: msaa },
        });

        const Uniforms = Layout.createBindGroups(0, {
            depth_texture: depthTexture,
        });

        const colorTexture =
            msaa > 1
                ? device.createTexture({
                      format,
                      usage: GPUTextureUsage.RENDER_ATTACHMENT,
                      size: [canvas.width, canvas.height],
                      sampleCount: msaa,
                  })
                : context.getCurrentTexture();

        const renderPassDescriptor = {
            colorAttachments: [WebgpuUtils.createColorAttachmentFromView(colorTexture.createView())],
        };

        const render = () => {
            if (msaa > 1) {
                renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
            } else {
                renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
            }

            const encoder = device.createCommandEncoder();
            const pass = encoder.beginRenderPass(renderPassDescriptor);

            pass.setPipeline(pipeline);
            pass.setBindGroup(Uniforms.group, Uniforms.bindGroup);
            pass.draw(6);

            pass.end();
            device.queue.submit([encoder.finish()]);
        };

        return { render };
    },
});
