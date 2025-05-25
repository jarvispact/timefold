import { Uniform, WebgpuUtils, defineRenderPass, RenderPipelineContext } from '@timefold/webgpu';

const UniformGroup = Uniform.group(0, {
    color_sampler: Uniform.sampler(0),
    color_texture: Uniform.texture(1),
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
    let color = textureSample(color_texture, color_sampler, fsIn.uv);
    return vec4f(color * 0.5);
}
`.trim();

export const PostProcessingRenderPass = defineRenderPass({
    name: 'PostProcessing',
    fn: (ctx: RenderPipelineContext<[typeof MultiMaterialRenderPass]>) => {
        const { device, context, format } = ctx.args;
        const { renderTexture } = ctx.MultiMaterialRenderPass;

        const Layout = WebgpuUtils.createPipelineLayout({
            device,
            uniformGroups: [UniformGroup],
        });

        const module = device.createShaderModule({ code });

        const pipeline = device.createRenderPipeline({
            layout: Layout.layout,
            vertex: { module },
            fragment: { module, targets: [{ format }] },
        });

        const Uniforms = Layout.createBindGroups(0, {
            color_sampler: WebgpuUtils.createSampler(device),
            color_texture: renderTexture,
        });

        const renderPassDescriptor = {
            colorAttachments: [
                WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView(), {
                    clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
                }),
            ],
        };

        const render = () => {
            renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
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
