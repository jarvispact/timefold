import { ecs } from '@timefold/ecs';
import { math } from '@timefold/math';
import { webgpu } from '@timefold/webgpu';
import { obj } from '@timefold/obj';
import { gltf2 } from '@timefold/gltf2';
import { engine } from '@timefold/engine';

console.log('✓ All imports resolved successfully!');
console.log('Testing library exports:');
console.log(ecs('Hello ECS!'));
console.log(math('Hello Math!'));
console.log(webgpu('Hello WebGPU!'));
console.log(obj('Hello OBJ!'));
console.log(gltf2('Hello glTF2!'));
console.log(engine('Hello Engine!'));
