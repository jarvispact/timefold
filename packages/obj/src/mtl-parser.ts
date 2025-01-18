import { MtlMaterial, MtlParserResult } from './types';

export const createParser = () => {
    return (mtlFileSource: string): MtlParserResult => {
        const lines = mtlFileSource.trim().split('\n');

        const materials: MtlMaterial[] = [];
        let materialIdx = 0;

        for (let i = 0; i < lines.length; i++) {
            const trimmedLine = lines[i].trim();
            if (!trimmedLine) continue;
            if (trimmedLine.startsWith('#')) continue;

            const newMtl = trimmedLine.startsWith('newmtl ');
            const ambientColor = trimmedLine.startsWith('Ka ');
            const diffuseColor = trimmedLine.startsWith('Kd ');
            const specularColor = trimmedLine.startsWith('Ks ');
            const specularExponent = trimmedLine.startsWith('Ns ');

            const ambientMapPath = trimmedLine.startsWith('map_Ka ');
            const diffuseMapPath = trimmedLine.startsWith('map_Kd ');
            const specularMapPath = trimmedLine.startsWith('map_Ks ');
            const normalMapPath = trimmedLine.startsWith('map_Disp ');

            if (newMtl) {
                const name = trimmedLine.substring(6).trim();

                materials.push({
                    name,
                    ambientColor: [0, 0, 0],
                    diffuseColor: [0, 0, 0],
                    specularColor: [0, 0, 0],
                    specularExponent: 512,
                    ambientMapPath: undefined,
                    diffuseMapPath: undefined,
                    specularMapPath: undefined,
                    normalMapPath: undefined,
                });

                materialIdx = materials.length - 1;
            }

            if (ambientColor) {
                const [r, g, b] = trimmedLine.substring(2).trim().split(' ').map(Number.parseFloat);
                materials[materialIdx].ambientColor[0] = r;
                materials[materialIdx].ambientColor[1] = g;
                materials[materialIdx].ambientColor[2] = b;
            }

            if (diffuseColor) {
                const [r, g, b] = trimmedLine.substring(2).trim().split(' ').map(Number.parseFloat);
                materials[materialIdx].diffuseColor[0] = r;
                materials[materialIdx].diffuseColor[1] = g;
                materials[materialIdx].diffuseColor[2] = b;
            }

            if (specularColor) {
                const [r, g, b] = trimmedLine.substring(2).trim().split(' ').map(Number.parseFloat);
                materials[materialIdx].specularColor[0] = r;
                materials[materialIdx].specularColor[1] = g;
                materials[materialIdx].specularColor[2] = b;
            }

            if (specularExponent) {
                const specularExponent = Number.parseFloat(trimmedLine.substring(2).trim());
                materials[materialIdx].specularExponent = specularExponent;
            }

            if (ambientMapPath) {
                const path = trimmedLine.substring(6).trim();
                materials[materialIdx].ambientMapPath = path;
            }

            if (diffuseMapPath) {
                const path = trimmedLine.substring(6).trim();
                materials[materialIdx].diffuseMapPath = path;
            }

            if (specularMapPath) {
                const path = trimmedLine.substring(6).trim();
                materials[materialIdx].specularMapPath = path;
            }

            if (normalMapPath) {
                const path = trimmedLine.substring(8).trim();
                materials[materialIdx].normalMapPath = path;
            }
        }

        return { materials };
    };
};
