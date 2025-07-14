import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Mesh, Points, ShaderMaterial, Texture, Vector3, WebGLRenderer } from "three";
import { dissolveUniformData, particleDataConstants } from "../helpers/constants";
import snoise from '../lib/noise/snoise.glsl?raw';


export class ParticleMesh extends Points {

    mesh: Mesh;
    meshGeometry: BufferGeometry;

    particleCount!: number
    particleMaxOffsetArr!: Float32Array; // -- how far a particle can go from its initial position 
    particleInitPosArr!: Float32Array; // store the initial position of the particles -- particle position will reset here if it exceed maxoffset
    particleCurrPosArr!: Float32Array; // use to update he position of the particle 
    particleVelocityArr!: Float32Array; // velocity of each particle
    particleDistArr!: Float32Array;
    particleRotationArr!: Float32Array;

    particleData = particleDataConstants;

    particlesUniformData = {
        uTexture: {
            value: Texture.DEFAULT_IMAGE,
        },
        uPixelDensity: {
            value: 1
        },
        uProgress: dissolveUniformData.uProgress,
        uEdge: dissolveUniformData.uEdge,
        uAmp: dissolveUniformData.uAmp,
        uFreq: dissolveUniformData.uFreq,
        uBaseSize: {
            value: 15,
        },
        uColor: {
            value: new Color(0x4d9bff),
        }
    }

    constructor(gl: WebGLRenderer, mesh: Mesh, particleTexture: Texture) {
        super();

        this.meshGeometry = mesh.geometry;
        this.mesh = mesh;


        this.particlesUniformData.uTexture.value = particleTexture;
        this.particlesUniformData.uPixelDensity.value = gl.getPixelRatio();

        const material = new ShaderMaterial();

        material.vertexShader = `

            ${snoise}

            uniform float uPixelDensity;
            uniform float uBaseSize;
            uniform float uFreq;
            uniform float uAmp;
            uniform float uEdge;
            uniform float uProgress;

            varying float vNoise;
            varying float vAngle;

            attribute vec3 aCurrentPos;
            attribute float aDist;
            attribute float aAngle;

            void main() {
                vec3 pos = position;

                float noise = snoise(pos * uFreq) * uAmp;
                vNoise =noise;

                vAngle = aAngle;

                if( vNoise > uProgress-2.0 && vNoise < uProgress + uEdge+2.0){
                    pos = aCurrentPos;
                }

                vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectedPosition = projectionMatrix * viewPosition;
                gl_Position = projectedPosition;

                float size = uBaseSize * uPixelDensity;
                size = size  / (aDist + 1.0);
                gl_PointSize = size / -viewPosition.z;
        }
        `;

        material.fragmentShader = `
            uniform vec3 uColor;
            uniform float uEdge;
            uniform float uProgress;
            uniform sampler2D uTexture;

            varying float vNoise;
            varying float vAngle;

            void main(){
                if( vNoise < uProgress ) discard;
                if( vNoise > uProgress + uEdge) discard;

                vec2 coord = gl_PointCoord;
                coord = coord - 0.5; // get the coordinate from 0-1 ot -0.5 to 0.5
                coord = coord * mat2(cos(vAngle),sin(vAngle) , -sin(vAngle), cos(vAngle)); // apply the rotation transformaion
                coord = coord +  0.5; // reset the coordinate to 0-1  

                vec4 texture = texture2D(uTexture,coord);

                gl_FragColor = vec4(vec3(uColor.xyz * texture.xyz),1.0);
            }
        `;

        material.uniforms = this.particlesUniformData;

        this.material = material;
        this.material.transparent = true;
        this.material.blending = AdditiveBlending;

        this.initParticleAttributes(this.meshGeometry);

        this.geometry = this.meshGeometry;

        this.mesh.matrixWorld.decompose(this.position, this.quaternion, this.scale);
        this.updateMatrixWorld();
        this.updateMatrix();
    }

    initParticleAttributes(meshGeo: BufferGeometry) {

        this.particleCount = meshGeo.attributes.position.count;
        this.particleMaxOffsetArr = new Float32Array(this.particleCount);
        this.particleInitPosArr = new Float32Array(meshGeo.getAttribute('position').array);
        this.particleCurrPosArr = new Float32Array(meshGeo.getAttribute('position').array);
        this.particleVelocityArr = new Float32Array(this.particleCount * 3);
        this.particleDistArr = new Float32Array(this.particleCount);
        this.particleRotationArr = new Float32Array(this.particleCount);
    
        for (let i = 0; i < this.particleCount; i++) {
            let x = i * 3 + 0;
            let y = i * 3 + 1;
            let z = i * 3 + 2;
    
            this.particleMaxOffsetArr[i] = Math.random() * 5.5 + 1.5;
    
            this.particleVelocityArr[x] = Math.random() * 0.5 + 0.5;
            this.particleVelocityArr[y] = Math.random() * 0.5 + 0.5;
            this.particleVelocityArr[z] = Math.random() * 0.1;
    
            this.particleDistArr[i] = 0.001;
            this.particleRotationArr[i] = Math.random() * Math.PI * 2;
    
        }
    
        meshGeo.setAttribute('aOffset', new BufferAttribute(this.particleMaxOffsetArr, 1));
        meshGeo.setAttribute('aCurrentPos', new BufferAttribute(this.particleCurrPosArr, 3));
        meshGeo.setAttribute('aVelocity', new BufferAttribute(this.particleVelocityArr, 3));
        meshGeo.setAttribute('aDist', new BufferAttribute(this.particleDistArr, 1));
        meshGeo.setAttribute('aAngle', new BufferAttribute(this.particleRotationArr, 1));
    }

    calculateWaveOffset(idx: number) {
        const posx = this.particleCurrPosArr[idx * 3 + 0];
        const posy = this.particleCurrPosArr[idx * 3 + 1];
    
        let xwave1 = Math.sin(posy * 2) * (0.8 + this.particleData.waveAmplitude);
        let ywave1 = Math.sin(posx * 2) * (0.6 + this.particleData.waveAmplitude);
    
        let xwave2 = Math.sin(posy * 5) * (0.2 + this.particleData.waveAmplitude);
        let ywave2 = Math.sin(posx * 1) * (0.9 + this.particleData.waveAmplitude);
    
        let xwave3 = Math.sin(posy * 8) * (0.8 + this.particleData.waveAmplitude);
        let ywave3 = Math.sin(posx * 5) * (0.6 + this.particleData.waveAmplitude);
    
        let xwave4 = Math.sin(posy * 3) * (0.8 + this.particleData.waveAmplitude);
        let ywave4 = Math.sin(posx * 7) * (0.6 + this.particleData.waveAmplitude);
    
        let xwave = xwave1 + xwave2 + xwave3 + xwave4;
        let ywave = ywave1 + ywave2 + ywave3 + ywave4;
    
        return { xwave, ywave }
    }

    updateVelocity(idx: number) {

        let vx = this.particleVelocityArr[idx * 3 + 0];
        let vy = this.particleVelocityArr[idx * 3 + 1];
        let vz = this.particleVelocityArr[idx * 3 + 2];
    
        vx *= this.particleData.velocityFactor.x;
        vy *= this.particleData.velocityFactor.y;
    
        let { xwave, ywave } = this.calculateWaveOffset(idx);
    
        vx += xwave;
        vy += ywave;
    
        vx *= Math.abs(this.particleData.particleSpeedFactor);
        vy *= Math.abs(this.particleData.particleSpeedFactor);
        vz *= Math.abs(this.particleData.particleSpeedFactor);
    
        return { vx, vy, vz }
    }

    updateParticleAttriutes() {

        for (let i = 0; i < this.particleCount; i++) {
            let x = i * 3 + 0;
            let y = i * 3 + 1;
            let z = i * 3 + 2;
    
            let { vx, vy, vz } = this.updateVelocity(i);
    
            this.particleCurrPosArr[x] += vx;
            this.particleCurrPosArr[y] += vy;
            this.particleCurrPosArr[z] += vz;
    
            const vec1 = new Vector3(this.particleInitPosArr[x], this.particleInitPosArr[y], this.particleInitPosArr[z]);
            const vec2 = new Vector3(this.particleCurrPosArr[x], this.particleCurrPosArr[y], this.particleCurrPosArr[z]);
            const dist = vec1.distanceTo(vec2);
    
            this.particleDistArr[i] = dist;
            this.particleRotationArr[i] += 0.01;
    
            if (dist > this.particleMaxOffsetArr[i]) {
                this.particleCurrPosArr[x] = this.particleInitPosArr[x];
                this.particleCurrPosArr[y] = this.particleInitPosArr[y];
                this.particleCurrPosArr[z] = this.particleInitPosArr[z];
            }
        }
    
        this.meshGeometry.setAttribute('aOffset', new BufferAttribute(this.particleMaxOffsetArr, 1));
        this.meshGeometry.setAttribute('aCurrentPos', new BufferAttribute(this.particleCurrPosArr, 3));
        this.meshGeometry.setAttribute('aVelocity', new BufferAttribute(this.particleVelocityArr, 3));
        this.meshGeometry.setAttribute('aDist', new BufferAttribute(this.particleDistArr, 1));
        this.meshGeometry.setAttribute('aAngle', new BufferAttribute(this.particleRotationArr, 1));
    }

    update(t: number) {

        this.updateParticleAttriutes();
        this.position.set(0, Math.sin(t * 2.0) * 0.5, 0);
    }
}