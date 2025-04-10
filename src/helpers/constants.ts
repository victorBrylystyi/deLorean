import { Color, Uniform } from "three";


export const dissolveUniformData = {
    uEdgeColor: {
        value: new Color(0x4d9bff),
    },
    uFreq: {
        value: 1.55,
    },
    uAmp: {
        value: 18.2
    },
    uProgress: {
        value: 20.0
    },
    uDissolveThreshold: {
        value: 1.0
    },
    uEdge: {
        value: 0.8
    },
    uEdgeWidth: {
        value: 0.3
    }
};

export const bloomUniformData = {
    uStrength: new Uniform(1.0)
};

export const materialParams = {
    metalness: 0.7,
    roughness: 0.05,
};

export const dissolveSettings = {
    animate: true,
    progress: -20.0,
    k: 20
}
