import { ObjLoader } from '@timefold/obj';
import { RenderPassDescriptor, WebgpuUtils, createRenderer, definePrimitiveTemplate } from '@timefold/webgpu';
import { definePhongMaterialTemplate } from './phong-material-template';
import { defineUnlitMaterialTemplate } from './unlit-material-template';
import { CameraStruct, DirLightStructArray, PhongEntityStruct, UnlitEntityStruct } from '@timefold/engine';
import { Mat4x4, MathUtils, Vec3 } from '@timefold/math';

const main = async () => {
    // =========================
    // Load and prepare Geometry

    const { info, objects } = await ObjLoader.load('./webgpu-plane.obj');
    const planePrimitive = objects.Plane.primitives.default;

    // ================================
    // Setup canvas and webgpu

    const dpr = window.devicePixelRatio || 1;
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;

    const { device, context, format } = await WebgpuUtils.createDeviceAndContext({ canvas });

    const renderPassDescriptor: RenderPassDescriptor = {
        colorAttachments: [WebgpuUtils.createColorAttachmentFromView(context.getCurrentTexture().createView())],
    };

    // ====================
    // Define vertex

    const Vertex = WebgpuUtils.createVertexBufferLayout('interleaved', {
        position: { format: 'float32x3', offset: info.positionOffset },
        uv: { format: 'float32x2', offset: info.uvOffset },
        normal: { format: 'float32x3', offset: info.normalOffset },
    });

    // ====================
    // scene uniforms

    const lights = DirLightStructArray.create();
    const camera = CameraStruct.create();

    Vec3.copy(lights.views[0].direction, Vec3.normalize([2, 3, 5]));
    Vec3.copy(lights.views[0].color, [1, 1, 1]);

    const view = Mat4x4.createLookAt([2, 5, 10], Vec3.zero(), Vec3.up());
    const proj = Mat4x4.createPerspective(MathUtils.degreesToRadians(65), canvas.width / canvas.height, 0);
    Mat4x4.multiplication(camera.views.view_projection_matrix, proj, view);

    // ===================
    // renderer

    const renderer = createRenderer({
        canvas,
        device,
        context,
        format,
        renderPassDescriptor,
        materialTemplates: {
            unlit: defineUnlitMaterialTemplate({
                device,
                uniforms: { camera: camera.buffer },
                vertexWgsl: Vertex.wgsl,
            }),
            phong: definePhongMaterialTemplate({
                device,
                uniforms: { lights: lights.buffer, camera: camera.buffer },
                vertexWgsl: Vertex.wgsl,
            }),
        },
        primitiveTemplates: {
            default: definePrimitiveTemplate(Vertex),
        },
    });

    // ====================
    // entities

    const unlitEntity = UnlitEntityStruct.create();
    Mat4x4.fromTranslation(unlitEntity.views.transform.model_matrix, [-2, 0, 0]);
    Vec3.copy(unlitEntity.views.material.color, [1, 0, 0]);

    renderer.addEntity({
        id: 'unlit',
        mesh: {
            material: { template: 'unlit', uniforms: { entity: unlitEntity.buffer } },
            primitive: {
                template: 'default',
                vertex: Vertex.createBuffer(device, planePrimitive.vertices),
                index: WebgpuUtils.createIndexBuffer(device, { format: 'uint32', data: planePrimitive.indices }),
            },
        },
    });

    const phongEntity = PhongEntityStruct.create();
    Mat4x4.fromTranslation(phongEntity.views.transform.model_matrix, [2, 0, 0]);
    Mat4x4.modelToNormal(phongEntity.views.transform.normal_matrix, phongEntity.views.transform.model_matrix);
    Vec3.copy(phongEntity.views.material.diffuse_color, [1, 0, 0]);

    renderer.addEntity({
        id: 'phong',
        mesh: {
            material: { template: 'phong', uniforms: { entity: phongEntity.buffer } },
            primitive: {
                template: 'default',
                vertex: Vertex.createBuffer(device, planePrimitive.vertices),
                index: WebgpuUtils.createIndexBuffer(device, { format: 'uint32', data: planePrimitive.indices }),
            },
        },
    });

    const tick = () => {
        renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
        renderer.render();
        window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
};

void main();
