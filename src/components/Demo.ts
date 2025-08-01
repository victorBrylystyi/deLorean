
import { Camera, Data3DTexture, DataTexture, Mesh, Scene, ShaderMaterial, SRGBColorSpace, Vector2, WebGLRenderer } from "three";
import { OutputPass, RenderPass, UnrealBloomPass, SSAARenderPass, EffectComposer, LUTPass, ShaderPass } from "three/examples/jsm/Addons.js";
import Stats from 'three/examples/jsm/libs/stats.module.js';
import GUI from "lil-gui";
import { ContactShadows } from "./ContactShadows";
import { bloomUniformData, dissolveUniformData, particleDataConstants } from "../helpers/constants";
import { Dissolve } from "./Dissolve";

export class Demo {
    rootElement: HTMLDivElement;
    canvas = document.createElement('canvas');
    renderer = new WebGLRenderer({ 
        canvas: this.canvas, 
        antialias: true, 
        // alpha: true,
    });
    scene = new Scene();
    backgroundScene = new Scene();
    stats = new Stats();
    gui!: GUI;
    processId = 0;
    lastUpdateTime = 0;

    composer = new EffectComposer(this.renderer);
    bloomComposer = new EffectComposer(this.renderer);
    // composer1 = new EffectComposer(this.renderer);
    bloomPass = new UnrealBloomPass(new Vector2(1024, 768), bloomUniformData.uStrength.value, bloomUniformData.uRadius.value, bloomUniformData.uThreshold.value);
    lutPass = new LUTPass({ intensity: 0.0 });
    lutTexture!: DataTexture | Data3DTexture | null;

    mountStats = false;
    contactShadow = new ContactShadows({
        scene: this.scene,
        renderer: this.renderer,
    })
    engineMaterial: Dissolve[] = [];

    scrollRoot = (e: Event) => {
        e.preventDefault();
    };
    resizeDemo = () => {
        this.resize();
    };

    constructor(rootElement: HTMLDivElement, mountStats?: boolean) {
        this.rootElement = rootElement;
        if (mountStats) this.mountStats = mountStats;
    }

    mount() {

        this.canvas.style.touchAction = 'none';
        this.rootElement.appendChild(this.canvas);

        this.renderer.outputColorSpace = SRGBColorSpace;

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.rootElement.clientWidth, this.rootElement.clientHeight, true);

        this.composer.setPixelRatio(window.devicePixelRatio);
        this.composer.setSize(this.rootElement.clientWidth, this.rootElement.clientHeight);

        this.bloomComposer.setPixelRatio(window.devicePixelRatio);
        this.bloomComposer.setSize(this.rootElement.clientWidth, this.rootElement.clientHeight);

        if (this.mountStats) {
            this.stats.dom.style.position = 'absolute';
            this.stats.dom.style.userSelect = 'none';
            this.rootElement.appendChild(this.stats.dom);

            this.gui = new GUI({
                container: this.rootElement,
                width: 300,
            });
            this.gui.domElement.style.position = 'absolute';
            this.gui.domElement.style.top = '0';
            this.gui.domElement.style.right = '0';

            this.initGUI();
        }

        window.addEventListener('resize', this.resizeDemo);
    }

    initGUI() {
        this.gui.add(dissolveUniformData.uEdge, "value", 0.001, 5.0, 0.001).name("Edge");
        this.gui.addColor(dissolveUniformData.uEdgeColor, "value").name("Edge Color").onChange((color: string) => {
            dissolveUniformData.uEdgeColor.value.set(color);
        });
        this.gui.addColor(dissolveUniformData.engineColor, "value").name("Engine Color").onChange((color: string) => {
            dissolveUniformData.engineColor.value.set(color);
            this.engineMaterial.forEach((mat: Dissolve) => {
                mat.emissive.set(color);
                // mat.needsUpdate = true;
            });
        });
        this.gui.add(dissolveUniformData.uFreq, "value", 0.001, 2.0, 0.001).name("Frequency");
        this.gui.add(dissolveUniformData.uAmp, "value", 0.1, 20.0, 0.001).name("Amplitude");

        this.gui.add(bloomUniformData.uStrength, "value", 0.0, 10.0, 0.001).name("Bloom Strength").onChange((value: number) => {
            this.bloomPass.strength = value;
        });
        this.gui.add(bloomUniformData.uRadius, "value", 0.0, 5.0, 0.001).name("Bloom Radius").onChange((value: number) => {
            this.bloomPass.radius = value;
        });
        this.gui.add(bloomUniformData.uThreshold, "value", 0.0, 1.0, 0.001).name("Bloom Threshold").onChange((value: number) => {
            this.bloomPass.threshold = value;
        });

        this.gui.add(particleDataConstants, "particleSpeedFactor", 0.0, 2.0, 0.001).name("Particle Speed Factor");
        this.gui.add(particleDataConstants.velocityFactor, "x", -10.0, 10.0, 0.001).name("Velocity X");
        this.gui.add(particleDataConstants.velocityFactor, "y", -10.0, 10.0, 0.001).name("Velocity Y");
        this.gui.add(particleDataConstants, "waveAmplitude", 0.0, 10.0, 0.001).name("Wave Amplitude");
    }

    unmount() {
        window.removeEventListener('resize', this.resizeDemo);

        this.scene.traverse(obj => {
            if (obj instanceof Mesh){
                obj.geometry.dispose();
                obj.material.dispose();
            }
        });

        while(this.scene.children.length > 0){ 
            this.scene.remove(this.scene.children[0]); 
        }

        this.renderer.dispose();
        this.rootElement.removeChild(this.canvas);
    }

    postprocessing(scene: Scene, camera: Camera) {

        this.bloomComposer.renderToScreen = false;

        const ssaaRenderPass = new SSAARenderPass( scene, camera );
        ssaaRenderPass.sampleLevel = 4;
        ssaaRenderPass.unbiased = true;

        if (this.lutTexture) {
            this.lutPass.lut = this.lutTexture;
        }

        const renderPass = new RenderPass(scene, camera);
        const outputPass = new OutputPass();

        const mixPass = new ShaderPass(new ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                uBloomTexture: {
                    value: this.bloomComposer.renderTarget2.texture
                },
                uStrength: bloomUniformData.uStrength
            },
            vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main(){
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                }
            `,
            fragmentShader: /* glsl */`
                uniform sampler2D tDiffuse;
                uniform sampler2D uBloomTexture;
                uniform float uStrength;
                varying vec2 vUv;
                void main(){
                    vec4 baseEffect = texture2D(tDiffuse,vUv);
                    vec4 bloomEffect = texture2D(uBloomTexture,vUv);
                    gl_FragColor = baseEffect + bloomEffect * uStrength;
                    // gl_FragColor = bloomEffect;
                }
            `,
        }));
        mixPass.needsSwap = true;

        this.bloomComposer.addPass(renderPass);
        this.bloomComposer.addPass(this.bloomPass);

        this.composer.addPass(renderPass);
        // this.composer.addPass(ssaaRenderPass);
        this.composer.addPass(mixPass);
        this.composer.addPass(outputPass);


        // this.bloomComposer.addPass(renderPass);
        // this.bloomComposer.addPass(mixPass);
        // this.bloomComposer.addPass(outputPass);



        // const shaderPass = new ShaderPass(new ShaderMaterial({
        //     uniforms: {
        //         tDiffuse: { value: null },
        //         uBloomTexture: {
        //             value: this.composer.renderTarget2.texture
        //         },
        //         uStrength: bloomUniformData.uStrength
        //     },
        
        //     vertexShader: `
        //         varying vec2 vUv;
        //         void main(){
        //             vUv = uv;
        //             gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        //         }
        //     `,
        
        //     fragmentShader: `
        //         uniform sampler2D tDiffuse;
        //         uniform sampler2D uBloomTexture;
        //         uniform float uStrength;
        //         varying vec2 vUv;
        //         void main(){
        //             vec4 baseEffect = texture2D(tDiffuse,vUv);
        //             vec4 bloomEffect = texture2D(uBloomTexture,vUv);
        //             gl_FragColor = baseEffect + bloomEffect * uStrength;
        //         }
        //     `,
        // }));

        // this.composer.addPass(new RenderPass(scene, camera));
        //     // this.composer.addPass(ssaaRenderPass);
        //     this.composer.addPass(this.bloomPass);
        //     this.composer.addPass(this.lutPass);
        // this.composer.addPass(new OutputPass());


        // this.composer.addPass(renderPass);
        // // this.composer.addPass(ssaaRenderPass);
        // this.composer.addPass(this.bloomPass);
        // // this.composer.addPass(this.lutPass);
        // this.composer.renderToScreen = false;

        // this.composer1.addPass(renderPass);
        // this.composer1.addPass(shaderPass);
        // this.composer1.addPass(new OutputPass());

    }

    resize(){        

        const w = this.rootElement.clientWidth;
        const h = this.rootElement.clientHeight;
        const dpr = window.devicePixelRatio;

        this.bloomPass.resolution.set(w * dpr, h * dpr);

        this.renderer.setSize(w, h, true);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.composer.setSize(w, h);
        this.composer.setPixelRatio(window.devicePixelRatio);

        this.bloomComposer.setSize(w, h);
        this.bloomComposer.setPixelRatio(window.devicePixelRatio);

        // this.composer1.setSize(w, h);
        // this.composer1.setPixelRatio(window.devicePixelRatio);
    }

    animate(dt: number = 0) {
        this.stats.begin();
            this.render(dt);
        this.stats.end();
        this.processId = requestAnimationFrame((dt)=>{
            this.animate(dt);
        });
    }
    
    startAnimation() {
        this.animate();
    }

    stopAnimation() {
        cancelAnimationFrame(this.processId);
    }

    render(_dt: number){}
};