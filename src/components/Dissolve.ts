import { IUniform, Material, MeshStandardMaterial, WebGLProgramParametersWithUniforms } from "three";
import snoise from '../lib/noise/snoise.glsl?raw';
import { dissolveUniformData } from "../helpers/constants";

// export class Dissolve extends MeshStandardMaterial {

//     baseMaterial: Material;
//     uniforms: { [uniform: string]: IUniform<any> } = dissolveUniformData;

//     constructor(baseMaterial: MeshStandardMaterial) {
//         super();
//         this.baseMaterial = baseMaterial;
//         this.copy(baseMaterial);
//         this.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
//             this.setupUniforms(shader, this.uniforms);
//             this.setupDissolveShader(shader);

//         };
//         this.needsUpdate = true;
//     }

//     private setupUniforms(shader: WebGLProgramParametersWithUniforms, uniforms: { [uniform: string]: IUniform<any> }) {
//         const keys = Object.keys(uniforms);
//         for (let i = 0; i < keys.length; i++) {
//             const key = keys[i];
//             shader.uniforms[key] = uniforms[key];
//         }
//     }

//     private setupDissolveShader(shader: WebGLProgramParametersWithUniforms) {
//         // vertex shader snippet outside main
//         shader.vertexShader = shader.vertexShader.replace(
//             '#include <common>', 
//             `
//                 #include <common>
//                 varying vec3 vPos;
//             `
//         );
    
//         // vertex shader snippet inside main
//         shader.vertexShader = shader.vertexShader.replace(
//             '#include <begin_vertex>', 
//             `
//                 #include <begin_vertex>
//                 vPos = position;
//             `
//         );
    
//         // fragment shader snippet outside main
//         shader.fragmentShader = shader.fragmentShader.replace(
//             '#include <common>', 
//             `
//                 #include <common>
//                 varying vec3 vPos;
        
//                 uniform float uFreq;
//                 uniform float uAmp;
//                 uniform float uProgress;
//                 uniform float uEdge;
//                 uniform vec3 uEdgeColor;
        
//                 ${cnoise}
//             `
//         );
    
//         // fragment shader snippet inside main
//         shader.fragmentShader = shader.fragmentShader.replace(
//             '#include <dithering_fragment>', 
//             `
//                 #include <dithering_fragment>
        
//                 float noise = cnoise(vPos * uFreq) * uAmp; // calculate snoise in fragment shader for smooth dissolve edges
        
//                 if(noise < uProgress) discard; // discard any fragment where noise is lower than progress
        
//                 float edgeWidth = uProgress + uEdge;
        
//                 if(noise > uProgress && noise < edgeWidth){
//                     // gl_FragColor = vec4(mix(uEdgeColor, gl_FragColor.xyz * noise, (noise - uProgress) / uEdge), 1.0); // colors the edge
//                     gl_FragColor = vec4(vec3(uEdgeColor),noise); // colors the edge
//                     // gl_FragColor *= noise;
//                     // gl_FragColor = vec4(vec3(noise), 1.0); 
//                 }else{
//                     gl_FragColor = vec4(gl_FragColor.xyz, 1.0);
//                 }
//             `
//         );
    
//     }
// }

export class Dissolve extends MeshStandardMaterial {

    baseMaterial: Material;
    uniforms: { [uniform: string]: IUniform<any> } = dissolveUniformData;

    constructor(baseMaterial: Material) {
        super();
        this.baseMaterial = baseMaterial;
        this.copy(baseMaterial);
        this.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
            this.setupUniforms(shader, this.uniforms);
            this.setupDissolveShader(shader);
        };
        this.needsUpdate = true;
    }

    private setupUniforms(shader: WebGLProgramParametersWithUniforms, uniforms: { [uniform: string]: IUniform<any> }) {
        Object.keys(uniforms).forEach(key => {
            shader.uniforms[key] = uniforms[key];
        });
    }

    private setupDissolveShader(shader: WebGLProgramParametersWithUniforms) {
        // Vertex shader snippet outside main
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>', 
            `
                #include <common>
                varying vec3 vWorldPosition;
            `
        );

        // Vertex shader snippet inside main
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>', 
            `
                #include <begin_vertex>
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            `
        );

        // Fragment shader snippet outside main
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>', 
            `
                #include <common>
                varying vec3 vWorldPosition;

                uniform float uDissolveThreshold;
                uniform float uEdge;
                uniform vec3 uEdgeColor;
                uniform float uFreq;
                uniform float uAmp;

                ${snoise}
            `
        );

        // Fragment shader snippet inside main
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>', 
            `
                #include <dithering_fragment>

                // float noiseValue = snoise(vWorldPosition * 10.0); // Generate noise based on world position
                float noiseValue = snoise(vWorldPosition * uFreq) * uAmp;
                float dissolveFactor = smoothstep(uDissolveThreshold - uEdge, uDissolveThreshold, noiseValue);

                if (noiseValue < uDissolveThreshold) {
                    discard; // Discard fragments below the dissolve threshold
                }

                float edgeFactor = smoothstep(uDissolveThreshold, uDissolveThreshold + uEdge, noiseValue);
                vec3 finalColor = mix(uEdgeColor, gl_FragColor.rgb, edgeFactor);

                gl_FragColor = vec4(finalColor, 1.0);
            `
        );
    }
}