import { MtlMaterial, MtlParserResult } from './types';

export const createParser = () => {
    return (mtlFileSource: string): MtlParserResult => {
        const lines = mtlFileSource.trim().split('\n');

        const materials: Record<string, MtlMaterial> = {};
        let currentMaterialName = 'default';

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

                materials[name] = {
                    name,
                    ambientColor: [0, 0, 0],
                    diffuseColor: [0, 0, 0],
                    specularColor: [0, 0, 0],
                    specularExponent: 512,
                    ambientMapPath: undefined,
                    diffuseMapPath: undefined,
                    specularMapPath: undefined,
                    normalMapPath: undefined,
                };

                currentMaterialName = name;
            }

            if (ambientColor) {
                const [r, g, b] = trimmedLine.substring(2).trim().split(' ').map(Number.parseFloat);
                materials[currentMaterialName].ambientColor[0] = r;
                materials[currentMaterialName].ambientColor[1] = g;
                materials[currentMaterialName].ambientColor[2] = b;
            }

            if (diffuseColor) {
                const [r, g, b] = trimmedLine.substring(2).trim().split(' ').map(Number.parseFloat);
                materials[currentMaterialName].diffuseColor[0] = r;
                materials[currentMaterialName].diffuseColor[1] = g;
                materials[currentMaterialName].diffuseColor[2] = b;
            }

            if (specularColor) {
                const [r, g, b] = trimmedLine.substring(2).trim().split(' ').map(Number.parseFloat);
                materials[currentMaterialName].specularColor[0] = r;
                materials[currentMaterialName].specularColor[1] = g;
                materials[currentMaterialName].specularColor[2] = b;
            }

            if (specularExponent) {
                const specularExponent = Number.parseFloat(trimmedLine.substring(2).trim());
                materials[currentMaterialName].specularExponent = specularExponent;
            }

            if (ambientMapPath) {
                const path = trimmedLine.substring(6).trim();
                materials[currentMaterialName].ambientMapPath = path;
            }

            if (diffuseMapPath) {
                const path = trimmedLine.substring(6).trim();
                materials[currentMaterialName].diffuseMapPath = path;
            }

            if (specularMapPath) {
                const path = trimmedLine.substring(6).trim();
                materials[currentMaterialName].specularMapPath = path;
            }

            if (normalMapPath) {
                const path = trimmedLine.substring(8).trim();
                materials[currentMaterialName].normalMapPath = path;
            }
        }

        return { materials };
    };
};
