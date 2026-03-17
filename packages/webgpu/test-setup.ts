import { vi } from 'vitest';

vi.stubGlobal('GPUShaderStage', { VERTEX: 0, FRAGMENT: 1, COMPUTE: 2 });
