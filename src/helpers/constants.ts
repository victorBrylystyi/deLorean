import { Color, Uniform } from "three";


export const dissolveUniformData = {
    uEdgeColor: {
        value: new Color(0x4d9bff),
    },
    engineColor: {
        value: new Color(0xff7b00),
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
        value: 1.82
    },
    uEdgeWidth: {
        value: 0.3
    }
};

export const bloomUniformData = {
    uStrength: new Uniform(1.66),
    uRadius: new Uniform(0.1),
    uThreshold: new Uniform(0.0),
};

export const materialParams = {
    metalness: 0.7,
    roughness: 0.26,
};

export const dissolveSettings = {
    animate: false,
    progress: -20.0,
    k: 20,
    kFreg: 0.45
}

export const particleDataConstants = {
    particleSpeedFactor: 0.01, // for tweaking velocity 
    velocityFactor: { x: 0, y: -10 },
    waveAmplitude: 0,
};
