/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { defineRenderPass, RenderPassDescriptor, RenderPipelineContext, Uniform, WebgpuUtils } from '@timefold/webgpu';
import { DepthPass } from './depth-pass';
import { CameraStruct, DirLightStructArray, MAX_DIR_LIGHTS, PhongMaterialStruct, TransformStruct } from '../../structs';
import {
    InterleavedLayout,
    NonInterleavedAttributes,
    PhongMaterialComponent,
    PrimitiveComponent,
} from '../../components';
import { getVertexAndIndexFromPrimitive, Index, Vertex } from './internal-utils';

type Entity = {
    id: string | number;
    material: PhongMaterialComponent;
    materialData: ArrayBufferLike;
    primitive: PrimitiveComponent;
    // transform: TransformComponent;
    transformData: ArrayBufferLike;
};

type EntityBinding = {
    buffer: GPUBuffer;
    data: ArrayBufferLike;
};

type EntityBindGroup = {
    group: number;
    bindgroup: GPUBindGroup;
    bindings: {
        material: EntityBinding;
        transform: EntityBinding;
    };
};

type Renderable = {
    id: Entity['id'];
    sortId: number;
    pipeline: GPURenderPipeline;
    entity: EntityBindGroup;
    primitive: { vertex: Vertex; index?: Index };
};

const serializePrimitiveState = (primitive: GPUPrimitiveState) => {
    return [
        primitive.cullMode ?? 'back',
        primitive.frontFace ?? 'ccw',
        primitive.topology ?? 'triangle-list',
        primitive.stripIndexFormat,
        primitive.unclippedDepth,
    ].join(':');
};

const serializeLayout = (layout: InterleavedLayout) => {
    return Object.keys(layout)
        .map((key) => {
            const value = layout[key];
            return `${key}:${value.format}:${value.stride}`;
        })
        .join('|');
};

const serializeAttribs = (attribs: NonInterleavedAttributes) => {
    return Object.keys(attribs)
        .map((key) => {
            const value = attribs[key];
            return `${key}:${value.format}`;
        })
        .join('|');
};

const getShaderCode = (uniformsWgsl: string, vertexWgsl: string) => {
    const code = /* wgsl */ `
${vertexWgsl}

struct VsOut {
    @builtin(position) position: vec4f,
    @location(0) world_position: vec3f,
    @location(1) uv: vec2f,
    @location(2) normal: vec3f,
}

${uniformsWgsl}

const RECIPROCAL_PI = 0.3183098861837907;
const GAMMA = 2.2;
const RECIPROCAL_GAMMA = 0.454545;

@vertex fn vs(vert: Vertex) -> VsOut {
    var vsOut: VsOut;
    vsOut.position = camera.view_projection_matrix * transform.model_matrix * vec4f(vert.position, 1.0);
    vsOut.world_position = (transform.model_matrix * vec4f(vert.position, 1.0)).xyz;
    vsOut.uv = vert.uv;
    vsOut.normal = (transform.normal_matrix * vec4f(vert.normal, 0.0)).xyz;
    return vsOut;
}

fn brdf_lambert(diffuse_color: vec3f) -> vec3f {
	return RECIPROCAL_PI * diffuse_color;
}

fn gamma_to_linear_space(color: vec3f) -> vec3f {
    return pow(color, vec3(GAMMA));
}

fn linear_to_gamma_space(color: vec3f) -> vec3f {
    return pow(color, vec3(RECIPROCAL_GAMMA));
}

fn calc_light(
    light_dir: vec3f,
    light_color: vec3f,
    light_intensity: f32,
    normal: vec3f,
    view_dir: vec3f,
    diffuse_color: vec3f,
    specular_color: vec3f,
    specular_shininess: f32
) -> vec3f {
    let half_dir = normalize(light_dir + view_dir);

    // diffuse
    let irradiance = saturate(dot(normal, light_dir)) * light_color * light_intensity;
    let diffuse = irradiance * diffuse_color;

    // specular
    let spec = pow(saturate(dot(normal, half_dir)), specular_shininess);
    let specular = irradiance * spec * specular_color;

    return diffuse + specular;
}

fn calc_dir_light(
    light: DirLight,
    normal: vec3f,
    view_dir: vec3f,
    diffuse_color: vec3f,
    specular_color: vec3f,
    specular_shininess: f32
) -> vec3f {
    let L = normalize(-light.direction);
    return calc_light(L, light.color, light.intensity, normal, view_dir, diffuse_color, specular_color, specular_shininess);
}

@fragment fn fs(fsIn: VsOut) -> @location(0) vec4f {
    let N = normalize(fsIn.normal);
    let V = normalize(camera.position - fsIn.world_position);
    let diffuse_color = brdf_lambert(material.diffuse_color);
    let specular_color = material.specular_color;
    
    // ambient
    var result = diffuse_color * 0.005;

    for (var i = 0u; i < ${MAX_DIR_LIGHTS}u; i++) {
        let light = dir_lights[i];
        if (light.intensity == 0.0) { continue; }
        result += calc_dir_light(light, N, V, diffuse_color, specular_color, material.shininess);
    }

    return vec4f(linear_to_gamma_space(result), material.opacity);
}
    `.trim();

    return code;
};

export const PhongPass = defineRenderPass({
    name: 'PhongPass',
    build: (ctx: RenderPipelineContext<[typeof DepthPass]>) => {
        const { device, canvas, context, format, msaa } = ctx.args;
        const { depthTexture } = ctx.DepthPass;

        const colorTexture =
            msaa > 1
                ? device.createTexture({
                      format,
                      usage: GPUTextureUsage.RENDER_ATTACHMENT,
                      size: [canvas.width, canvas.height],
                      sampleCount: msaa,
                  })
                : context.getCurrentTexture();

        const renderPassDescriptor: RenderPassDescriptor = {
            colorAttachments: [WebgpuUtils.createColorAttachmentFromView(colorTexture.createView())],
            depthStencilAttachment: WebgpuUtils.createDepthAttachmentFromView(depthTexture.createView(), {
                depthLoadOp: 'load', // Important!!!
                depthStoreOp: 'discard', // TODO: check if this is correct!!!
            }),
        };

        const FrameGroup = Uniform.group(0, {
            dir_lights: Uniform.buffer(0, DirLightStructArray),
            camera: Uniform.buffer(1, CameraStruct),
        });

        const EntityGroup = Uniform.group(1, {
            material: Uniform.buffer(0, PhongMaterialStruct),
            transform: Uniform.buffer(1, TransformStruct),
        });

        const PipelineLayout = WebgpuUtils.createPipelineLayout({
            device: device,
            uniformGroups: [FrameGroup, EntityGroup],
        });

        const frameBindgroup = PipelineLayout.createBindGroups(0, {
            dir_lights: WebgpuUtils.createBufferDescriptor(),
            camera: WebgpuUtils.createBufferDescriptor(),
        });

        const frameData = {
            dirLights: new ArrayBuffer(0),
            camera: new ArrayBuffer(0),
        };

        const renderables: Renderable[] = [];

        const pipelineMap = new Map<string, GPURenderPipeline>();
        let pipelineCounter = -1;

        const entityMap = new Map<PhongMaterialComponent, EntityBindGroup>();
        let entityCounter = -1;

        const primitiveMap = new Map<PrimitiveComponent, { vertex: Vertex; index?: Index }>();
        let primitiveCounter = -1;

        return {
            setDirLights: (lights: ArrayBufferLike) => {
                frameData.dirLights = lights;
            },
            setCamera: (camera: ArrayBufferLike) => {
                frameData.camera = camera;
            },
            addEntity: (entity: Entity) => {
                const primtiveKey = serializePrimitiveState(entity.primitive.data.primitive);

                const layoutKey =
                    entity.primitive.type === '@tf/InterleavedPrimitive'
                        ? serializeLayout(entity.primitive.data.layout)
                        : serializeAttribs(entity.primitive.data.attributes);

                const pipelineMapKey = `${entity.material.type}-${entity.primitive.type}-${primtiveKey}-${layoutKey}`;

                if (!pipelineMap.has(pipelineMapKey)) {
                    const uniformsWgsl = Uniform.getWgslFromGroups(PipelineLayout.uniformGroups);

                    const primitiveLayout =
                        entity.primitive.type === '@tf/InterleavedPrimitive'
                            ? WebgpuUtils.createVertexBufferLayout('interleaved', entity.primitive.data.layout)
                            : WebgpuUtils.createVertexBufferLayout('non-interleaved', entity.primitive.data.attributes);

                    const module = device.createShaderModule({
                        code: getShaderCode(uniformsWgsl, primitiveLayout.wgsl),
                    });

                    const pipeline = device.createRenderPipeline({
                        layout: PipelineLayout.layout,
                        vertex: { module, buffers: primitiveLayout.layout },
                        primitive: entity.primitive.data.primitive,
                        fragment: { module, targets: [{ format }] },
                        depthStencil: { depthWriteEnabled: false, depthCompare: 'less-equal', format: 'depth24plus' },
                        multisample: { count: msaa },
                    });

                    pipelineMap.set(pipelineMapKey, pipeline);
                    pipelineCounter++;
                }

                if (!entityMap.has(entity.material)) {
                    const entityBindgroup = PipelineLayout.createBindGroups(1, {
                        material: WebgpuUtils.createBufferDescriptor(),
                        transform: WebgpuUtils.createBufferDescriptor(),
                    });

                    entityMap.set(entity.material, {
                        group: entityBindgroup.group,
                        bindgroup: entityBindgroup.bindGroup,
                        bindings: {
                            material: { buffer: entityBindgroup.buffers.material, data: entity.materialData },
                            transform: { buffer: entityBindgroup.buffers.transform, data: entity.transformData },
                        },
                    });

                    entityCounter++;
                }

                if (!primitiveMap.has(entity.primitive)) {
                    const primitiveLayout =
                        entity.primitive.type === '@tf/InterleavedPrimitive'
                            ? WebgpuUtils.createVertexBufferLayout('interleaved', entity.primitive.data.layout)
                            : WebgpuUtils.createVertexBufferLayout('non-interleaved', entity.primitive.data.attributes);

                    const result = getVertexAndIndexFromPrimitive(device, primitiveLayout, entity.primitive);
                    if (result) {
                        primitiveMap.set(entity.primitive, result);
                        primitiveCounter++;
                    }
                }

                const pipeline = pipelineMap.get(pipelineMapKey)!;
                const entityEntry = entityMap.get(entity.material)!;
                const primitive = primitiveMap.get(entity.primitive)!;

                const pipelineId = pipelineCounter;
                const materialId = entityCounter;
                const primitiveId = primitiveCounter;
                const transformId = 0;
                const sortId = (pipelineId << 24) | (materialId << 16) | (primitiveId << 8) | transformId;

                renderables.push({
                    id: entity.id,
                    sortId,
                    pipeline,
                    entity: entityEntry,
                    primitive,
                });

                renderables.sort((a, b) => a.sortId - b.sortId);
            },
            render: () => {
                if (msaa > 1) {
                    renderPassDescriptor.colorAttachments[0].resolveTarget = context.getCurrentTexture().createView();
                } else {
                    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
                }

                const encoder = device.createCommandEncoder();
                const pass = encoder.beginRenderPass(renderPassDescriptor);

                for (let i = 0; i < renderables.length; i++) {
                    const prevRenderable = renderables[i - 1] as Renderable | undefined;
                    const renderable = renderables[i];

                    if (!prevRenderable || renderable.pipeline !== prevRenderable.pipeline) {
                        pass.setPipeline(renderable.pipeline);

                        pass.setBindGroup(frameBindgroup.group, frameBindgroup.bindGroup);
                        device.queue.writeBuffer(frameBindgroup.buffers.dir_lights, 0, frameData.dirLights);
                        device.queue.writeBuffer(frameBindgroup.buffers.camera, 0, frameData.camera);
                    }

                    if (!prevRenderable || renderable.entity !== prevRenderable.entity) {
                        pass.setBindGroup(renderable.entity.group, renderable.entity.bindgroup);
                        device.queue.writeBuffer(
                            renderable.entity.bindings.material.buffer,
                            0,
                            renderable.entity.bindings.material.data,
                        );
                    }

                    if (!prevRenderable || renderable.primitive !== prevRenderable.primitive) {
                        for (const vertex of renderable.primitive.vertex.buffers) {
                            pass.setVertexBuffer(vertex.slot, vertex.buffer);
                        }

                        if (renderable.primitive.index) {
                            pass.setIndexBuffer(renderable.primitive.index.buffer, renderable.primitive.index.format);
                        }
                    }

                    // TODO: Can we skip updates based on prevRenderable?
                    device.queue.writeBuffer(
                        renderable.entity.bindings.transform.buffer,
                        0,
                        renderable.entity.bindings.transform.data,
                    );

                    if (renderable.primitive.index) {
                        pass.drawIndexed(renderable.primitive.index.count);
                    } else {
                        pass.draw(renderable.primitive.vertex.count);
                    }
                }

                pass.end();
                device.queue.submit([encoder.finish()]);
            },
        };
    },
});
