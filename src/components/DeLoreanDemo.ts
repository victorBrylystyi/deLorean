import { BufferGeometry, CatmullRomCurve3, CineonToneMapping, Clock, Color, Data3DTexture, DataTexture, GridHelper, Group, Line, LineBasicMaterial, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, PlaneGeometry, PMREMGenerator, PointLight, ShaderMaterial, Texture, TextureLoader, Vector2, Vector3 } from "three";
import { Demo } from "./Demo";
import { loadLutTexture } from "./helpers";
import { GLTF, GLTFLoader, RGBELoader } from "three/examples/jsm/Addons";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import { fragmentShader, vertexShader } from "./DissolveMaterial";
// import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import { Dissolve } from "./Dissolve";
import { dissolveSettings, dissolveUniformData, materialParams } from "../helpers/constants";
import { ParticleMesh } from "./ParticleMesh";
import { Animation } from "./Animation";

const lutPath = '/assets/lut/';
const envPath = '/assets/env/';
const texturePath = '/assets/texture/';
const modelPath = '/assets/model/';

// const SCENE = 2;
// const sceneLayer = new Layers();
// sceneLayer.set(SCENE);

// const BLOOM_SCENE = 1;
// const bloomLayer = new Layers();
// bloomLayer.set(BLOOM_SCENE);
// console.log(bloomLayer.mask, sceneLayer.mask);
// console.log(bloomLayer.test(bloomLayer), sceneLayer.test(sceneLayer));


const darkMaterial = new MeshBasicMaterial({
    color: 0x000000,
});

// const blackColor = new Color(0x000000);
type MatType = {
    [key: string]: Material;
}

export class DeLoreanDemo extends Demo {

    progress = 0.0;
    materials: Dissolve[] = [];
    particles: ParticleMesh[] = [];

    camera!: PerspectiveCamera;

    container = new Group();
    modelContainer = new Object3D();
    controls!: OrbitControls;

    envTexture!: Texture;
    particleTexture!: Texture;
    mouse = new Vector2();
    model!: GLTF;
    axels: Mesh[] = [];

    mat: MatType = {};

    gridHelper!: GridHelper;

    clockDissolve = 0;

    enableControls = false;

    car!: Mesh;
    curveMesh!: Line | Mesh;
    clock = new Clock();
    t = 0;
    visibleCurve = true;
    curve!: CatmullRomCurve3;
    flashLight = new PointLight(0xffffff, 0, 100);
    carPosition = new Vector3();
    floorMesh!: Mesh;
    floorMaterial!: ShaderMaterial;

    // nonBloomed = (obj: Object3D) => {
    //     if (obj instanceof Mesh && (bloomLayer.test(obj.layers) === false)) {
    //         // console.log('nonBloomed', obj.layers.mask, bloomLayer.mask);
    //         this.mat[ obj.uuid ] = obj.material;
    //         obj.material = darkMaterial;
    //     }
    // };

    // restoreMat = (obj: Object3D) => {
    //     if (obj instanceof Mesh && this.mat[obj.uuid]) {
    //         obj.material = this.mat[obj.uuid];
    //         delete this.mat[obj.uuid];
    //     }
    // }

    onPointerMove = (event: PointerEvent) => {

        // calculate pointer position in normalized device coordinates
        // (-1 to +1) for both components

        // if (!this.enableMouseControls) return;

        const w = this.renderer.domElement.clientWidth;
        const h = this.renderer.domElement.clientHeight;
    
        this.mouse.x = ( event.offsetX / w ) * 2 - 1;
        this.mouse.y = - ( event.offsetY / h ) * 2 + 1;
    
    };

    onLoadEnv = (texture: DataTexture) => {
        const generator = new PMREMGenerator(this.renderer);
        const envTexture = generator.fromEquirectangular(texture).texture;
        this.envTexture = texture;

        // this.scene.background = this.envTexture;
        this.scene.environment = envTexture
        // this.scene.backgroundBlurriness = 0.7;
        // this.scene.backgroundIntensity = 0.2;

        generator.dispose();
        texture.dispose();
    };

    onLoadModel = (gltf: GLTF) => {
        this.model = gltf;
    };

    onLoadLut = (lut: DataTexture | Data3DTexture | null) => {
        this.lutTexture = lut;
    };

    onLoadParticleTexture = (texture: Texture) => {
        this.particleTexture = texture;
    };

    onPointerLeave = () => this.mouse.set(0, 0);

    constructor(rootElement: HTMLDivElement, mountStats?: boolean) {
        super(rootElement, mountStats);
        this.rootElement = rootElement;

        this.preLoad();
    }

    async preLoad() {

        await this.initLoad([
            envPath + 'rogland_clear_night_1k.hdr',
            lutPath + 'Cinematic-2.cube',
            modelPath + 'deLorean_C.glb',
            texturePath + 'particle.png'
        ]);

        this.mount();
        this.resizeDemo();
        this.startAnimation();
        
    }

    mount() {
        super.mount();

        // this.backgroundScene.background = this.envTexture;

        // const backGroundMesh = new Mesh(
        //     new SphereGeometry(100, 64, 64),
        //     new MeshBasicMaterial({
        //         map: this.envTexture,
        //         side: BackSide,
        //         depthWrite: false,
        //         depthTest: false,
        //     })
        // );
        // backGroundMesh.layers.enable(SCENE);
        // console.log(backGroundMesh.layers, bloomLayer.test(backGroundMesh.layers));

        // this.scene.add(backGroundMesh);

        this.backgroundScene.traverse((child) => {
            if (child instanceof Mesh) {
                console.log(child)
            }
        });
        
        this.mountScene();

        this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
        this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);

        // this.scene.background = this.envTexture;
        // this.scene.backgroundBlurriness = 0.7;
        // this.scene.environment = this.envTexture;

    }

    mountScene() {

        const aspect = this.rootElement.clientWidth / this.rootElement.clientHeight; 

        this.renderer.toneMapping = CineonToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        this.camera = new PerspectiveCamera( 70, aspect, 0.01, 1000 );

        // this.camera.position.set(-9, 0.5, -2);
        this.camera.position.set(-5, 0.5, 0);
        this.camera.lookAt(10, 0, 0);
        // this.camera.rotation.y = -Math.PI/2;

        if (this.enableControls) {
            this.controls = new OrbitControls(this.camera, this.canvas);
            this.controls.enableDamping = true;
            this.controls.autoRotate = false;
            this.controls.enabled = this.enableControls;
        }

        this.postprocessing(this.scene, this.camera);

        // const floor = new Mesh(
        //     new PlaneGeometry(20, 20),
        //     new MeshStandardMaterial({
        //         transparent: true,
        //         color: 0xFFFFFF,
        //         roughness: 1.0,
        //         metalness: 0.5,
        //         // envMap: this.envTexture,
        //     })
        // );

        // floor.rotation.x = - Math.PI / 2;
        // floor.position.y = -0.26;



        // const floorPath = texturePath + 'texture_08.png';
        // const floorAlphaPath = texturePath + 'alpha.png';
        // const floorDisplPath = texturePath + 'displacementmap.png';

        // new TextureLoader().load(floorPath, (texture) => {
        //     texture.flipY = false;
        //     texture.wrapS = texture.wrapT = RepeatWrapping;
        //     texture.repeat.set(16, 16);

        //     floor.material.map = texture;
        //     floor.material.needsUpdate = true;
        // });
        // new TextureLoader().load(floorAlphaPath, (texture) => {
        //     texture.flipY = false;

        //     floor.material.alphaMap = texture;
        //     floor.material.needsUpdate = true;
        // });

        // new TextureLoader().load(floorDisplPath, (texture) => {
        //     texture.flipY = false;

        //     texture.wrapS = texture.wrapT = RepeatWrapping;
        //     // texture.repeat.set(16, 16);

        //     floor.material.map = texture;
        //     floor.material.needsUpdate = true;


        //     floor.material.displacementMap = texture;
        //     floor.material.displacementScale = 2;
        //     floor.material.needsUpdate = true;
        // });

        const car = this.model.scene.clone();
        car.traverse((child) => {
            if (child instanceof Mesh) {
 
                const childMaterial = child.material as MeshStandardMaterial;

                const newMat = new Dissolve(childMaterial);

                if (newMat.color.r === 1 && newMat.color.g === 1 && newMat.color.b === 1) {
                    newMat.color.setStyle('#767474');
                    newMat.metalness = materialParams.metalness;
                    newMat.roughness = materialParams.roughness;
                    this.materials.push(newMat);
                }
                // newMat.alphaTest = 0.1;
                newMat.transparent = true;
                if (newMat.name.includes('MTL')) {
                    // console.log('found mtl', newMat.name);
                    // newMat.emissive.copy(dissolveUniformData.engineColor.value);
                    this.engineMaterial.push(newMat);
                }

                child.material = newMat;

                // child.layers.enable(BLOOM_SCENE);
                // console.log(child.layers.mask)

                // console.log(child.material);

                // const particle = new ParticleMesh(this.renderer, child, this.particleTexture);
                // this.particles.push(particle);
                // this.scene.add(particle);
            }
        });
        car.rotation.y = Math.PI/2;

        this.setGui();

        this.modelContainer.add(car);
        // this.modelContainer.position.set(0, -0.7, 0);
        // this.modelContainer.rotation.y = Math.PI;

        // this.container.add(floor);
        this.container.add(this.modelContainer);

        this.contactShadow.position.set(0, -0.2, 0);
        this.scene.add(this.contactShadow);

        const w = 100, h = 70;

        const floorGeometry = new PlaneGeometry(w, h, 100, 100);
        floorGeometry.rotateX(-Math.PI / 2); 

        this.floorMaterial = new ShaderMaterial({
            uniforms: {
                uCarPosition: { value: this.carPosition.copy(car.position) }, // Point 
                uTime: { value: 0.0 }, // Время для анимации, если нужна
                uResolution: { value: new Vector2(window.innerWidth, window.innerHeight) }, // Разрешение экрана
                uGridOffset: { value: new Vector2(w / 2, h / 2) }, // (100, 100)
                uGridScale: { value: new Vector2(w, h) },  
                uGridColor: { value: new Color(0x1253ff) }, // Цвет линий сетки
                uBackgroundColor: { value: new Color(0x000000) }, // Цвет фона сетки (очень темный)
                uGradientColor1: { value: new Color(0x0000FF) }, // Цвет для градиента (например, синий)
                uGradientColor2: { value: new Color(0xFF00FF) }, // Второй цвет для градиента (например, фиолетовый)
                uGradientCenter: { value: new Vector2(0.5, 0.5) }, // Центр градиента на сетке
                uGradientRadius: { value: 1.7 } // Радиус градиента
            },
            vertexShader: /* glsl */`
                uniform float uTime;
                uniform vec3 uCarPosition; 

                varying vec2 vUv;
                varying vec3 vPosition;
                varying float vDisplacement;

                void main() {
                    vUv = uv;
                    vPosition = position;

                    float distToCar = distance(position.xz, uCarPosition.xz); 

                    float displacementStrength = 0.0;
                    float effectRadius = 20.0; 
                    float maxDisplacement = 2.0; 

                    if (distToCar < effectRadius) {
                        displacementStrength = maxDisplacement * (1.0 - distToCar / effectRadius);
                        displacementStrength = pow(displacementStrength, 2.0);
                    }

                    vDisplacement = displacementStrength; 

                    vec3 displacedPosition = position - normal * displacementStrength; 

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uTime;
                uniform vec2 uResolution;
                uniform vec3 uCarPosition; 
                uniform vec2 uGridOffset;
                uniform vec2 uGridScale;
                
                uniform vec3 uGridColor;      
                uniform vec3 uBackgroundColor; 
                
                uniform vec3 uGradientColor1;
                uniform vec3 uGradientColor2; 
                uniform vec2 uGradientCenter; 
                uniform float uGradientRadius; 

                varying vec2 vUv;
                varying vec3 vPosition;      
                varying float vDisplacement; 

                void main() {
    
                    vec2 coord = vPosition.xz;

                    float gridDensity = 0.2;
                    float gridLineThickness = 0.03;

                    vec2 grid = abs(fract(coord * gridDensity) - 0.5);
                    float line = min(grid.x, grid.y);

                    // Smoothing the grid lines
                    float strength = fwidth(line);
                    float gridFactor = smoothstep(gridLineThickness - strength, gridLineThickness, line);

                    vec3 finalColor = mix(uGridColor, uBackgroundColor, gridFactor); 

                    vec2 gradientCoord = (vPosition.xz + uGridOffset) / uGridScale;
                    vec2 normalizedCarPos = (uCarPosition.xz + uGridOffset) / uGridScale;

                    float distToGradientCenter = distance(gradientCoord, normalizedCarPos);
                    // float distToGradientCenter = distance(gradientCoord, uGradientCenter);

                    float gradientFactor = smoothstep(uGradientRadius, uGradientRadius - 0.2, distToGradientCenter); 

                    vec3 gradientColor = mix(uGradientColor1, uGradientColor2, distToGradientCenter * 2.0);

                    // or aply gradient based on gridFactor
                    finalColor = mix(uBackgroundColor, gradientColor, 1.0 - gridFactor); 

                    float blendedGridFactor = max(0.0, gridLineThickness - line); 
                    vec3 gridLinesWithGradient = mix(uBackgroundColor, gradientColor, blendedGridFactor / gridLineThickness);
                    finalColor = mix(finalColor, gridLinesWithGradient, 1.0 - gridFactor);

                    float displacementEffect = vDisplacement / 5.0;

                    // Maximize the effect of displacement on the grid color
                    // finalColor += uGridColor * displacementEffect * 0.8;

                    // if grid must be with transparent effect
                    float transparencyEffect = displacementEffect;
                    gl_FragColor = vec4(finalColor, 1.0 - transparencyEffect);

                    // gl_FragColor = vec4(finalColor, 1.0); // default no transparency
                }
            `,
            transparent: true,
            depthTest: true,
            depthWrite: true,
        });

        this.floorMesh = new Mesh(floorGeometry, this.floorMaterial);
        this.floorMesh.position.y = -2; // Размещаем на уровне земли
        this.scene.add(this.floorMesh);

           // --- ИНИЦИАЛИЗАЦИЯ ОБЪЕКТА МОЛНИИ ---
        const lightningMaterial = new LineBasicMaterial({
            color: 0xADD8E6, // Светло-голубой/бирюзовый для электричества
            linewidth: 3,    // Толщина линии (может не работать на всех GPU)
            transparent: true,
            opacity: 1,      // Начинается невидимой
            // blending: THREE.AdditiveBlending // Для эффекта свечения
        });
        const lightningGeometry = new BufferGeometry(); // Пустая геометрия, которую будем обновлять
        const lightningMesh = new Line(lightningGeometry, lightningMaterial);
        this.scene.add(lightningMesh); // Добавляем на сцену
        
        
        // this.scene.add(this.flashLight);

                
        // const size = 300; // Размер сетки (например, от -50 до 50 по X и Z)
        // const divisionsGrid = 200; // Количество делений
        // const colorCenterLine = 0x1253ff; // Цвет центральной линии
        // const colorGrid = 0x1253ff;       // Цвет остальных линий

        // this.gridHelper = new GridHelper(size, divisionsGrid, colorCenterLine, colorGrid);
        // this.gridHelper.position.y = -0.21; // Размещаем на уровне земли
        // this.scene.add(this.gridHelper);

        this.scene.add(this.container);

        this.modelContainer.position.set(0, -0.5, 0);
        // this.modelContainer.visible = false;

        // const animation = new Animation(this.modelContainer, this.camera);
        // const tubeGeometry = new TubeGeometry( animation.curve, 500, 0.05, 4, true );
        // const material = new MeshBasicMaterial( { color: 0xff00ff } );
        // this.curveMesh = new Mesh( tubeGeometry, material );

        const divisions = 50; // Количество сегментов для каждой кривой в path
        const animation = new Animation(this.modelContainer, this.camera, this);
        const curvePoints = animation.path.getPoints(divisions); 
        const lineGeometry = new BufferGeometry().setFromPoints(curvePoints);
        const lineMaterial = new LineBasicMaterial({ color: 0xff0000 }); // Красная линия
        this.curveMesh = new Line(lineGeometry, lineMaterial);

        this.curveMesh.visible = this.visibleCurve;
        // const wireframe = new Mesh( tubeGeometry, wireframeMaterial );
        // this.curveMesh.add( wireframe );
        // this.scene.add(mesh);
        this.scene.add( this.curveMesh );

    }

    setGui() {

        this.gui.add(materialParams, "metalness", 0.0, 1.0, 0.001).name("Metalness").onChange((value: number) => {
            this.materials.forEach(material => {
                material.metalness = value;
            });
            materialParams.metalness = value;
        });
        this.gui.add(materialParams, "roughness", 0.0, 1.0, 0.001).name("Roughness").onChange((value: number) => {
            this.materials.forEach(material => {
                material.roughness = value;
            });
            materialParams.roughness = value;
        });

        this.gui.add(dissolveSettings, "animate").name("Animate").onChange((value: boolean) => {
            dissolveSettings.animate = value;
        });
        this.gui.add(dissolveSettings, "progress", -dissolveSettings.k, dissolveSettings.k, 0.001).name("Progress");

        this.gui.add(dissolveSettings, "kFreg", 0.0, 1.0, 0.001).name("K Freg");
        // this.gui.add(this, "enableControls").name("Controls").onChange((value: boolean) => {
        //     this.controls.enabled = value;
        // });
        this.gui.add(this, "visibleCurve").name("Curve Visibility").onChange((value: boolean) => {
            if (this.curveMesh) {
                this.curveMesh.visible = value;
            }
        });
    }

    unmount() {
        // dispose of all the things
        super.unmount();

        this.stopAnimation();

        this.controls.dispose();
        this.controls = null!;

        this.camera.clear();
        this.camera = null!;
        
        this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
        this.renderer.domElement.removeEventListener('pointerleave', this.onPointerLeave);
    }

    render(dt: number) {

        super.render(dt);

        const t = dt / 2000;
        // this.modelContainer.position.y = -0.3;
        // this.modelContainer.position.y = -0.3 + Math.sin(t)/8;
        // this.modelContainer.rotation.z = Math.cos(t)/16;
        // this.modelContainer.rotation.x = Math.sin(t)/20;
        // this.modelContainer.rotation.y = Math.sin(t)/14;

        // this.axels.forEach(mesh => {
        //     mesh.rotation.y = Math.sin(t* 2) / 2;
        //     // mesh.rotation.x = Math.sin(t) / 2;
        //     // mesh.rotation.z = Math.cos(t) / 2;
        // });

        if (this.floorMaterial) {
            this.floorMaterial.uniforms.uTime.value += dt;
            // this.floorMaterial.uniforms.uMouse.value = this.mousePosition; // Обновляем позицию мыши
        }
        if (dissolveSettings.animate) {
            this.clockDissolve += 0.005;
            const t = this.clockDissolve;
            // console.log(t);
            dissolveSettings.progress = Math.cos(this.clockDissolve) * -dissolveSettings.k;
            // this.modelContainer.position.y = -0.3;
            // this.modelContainer.position.y = -0.3 + Math.sin(t)/8;
            // this.modelContainer.rotation.z = Math.cos(t)/16;
            // this.modelContainer.rotation.x = Math.sin(t)/20;
            // this.modelContainer.rotation.y = Math.sin(t)/14;

            dissolveUniformData.uFreq.value = Math.abs(Math.cos(t * dissolveSettings.kFreg)) * 2.0;

            // this.axels.forEach(mesh => {
            //     mesh.rotation.y = Math.sin(t* 2) / 2;
            //     // mesh.rotation.x = Math.sin(t) / 2;
            //     // mesh.rotation.z = Math.cos(t) / 2;
            // });
        } else {
            if (this.clockDissolve !== 0.0) this.clockDissolve = 0.0;
        }
        // this.progress = Math.cos(t) * -20.0;
        // console.log(this.progress);

        const opacity = Math.abs((dissolveSettings.progress / dissolveSettings.k) - 1) / 2;

        dissolveUniformData.uProgress.value = dissolveSettings.progress;
        dissolveUniformData.uDissolveThreshold.value = dissolveSettings.progress;

        // this.particles.forEach(mesh => {
        //     mesh.update(t);
        // });

        this.contactShadow.render(opacity);

        if (this.enableControls) {
            this.controls.update();
        }

        // this.t += this.clock.getDelta();
        // if (this.t > 10) {
        //     this.t = 0; 
        // }

        // const t = this.t / 10;
        // const position = this.curve.getPoint(t); 
        // this.modelContainer.position.copy(position);

        // const tangent = this.curve.getTangent(t);
        // const lookAtTarget = new Vector3().addVectors(position, tangent);
        // this.modelContainer.lookAt(lookAtTarget);



        // this.particles.forEach(mesh => {
        // })

        // this.controls.update();

        // this.camera.lookAt(this.modelContainer.position)

        // this.scene.background = blackColor;
        // this.scene.traverse(this.nonBloomed);
        this.bloomComposer.render();
        // this.scene.traverse(this.restoreMat);
        // this.mixPass.uniforms.uBloomTexture.value = this.composer.renderTarget2.texture;
        this.composer.render();
        // this.renderer.render(this.scene, this.camera);


        // this.scene.background = this.envTexture;
        // this.composer1.render();

    }

    async initLoad(assets: string[]) {

        if (assets.length === 0) return;

        const promises: Promise<any>[] = [];

        for (let i = 0; i < assets.length; i++) {

            const asset = assets[i];

            if (asset.includes('.hdr')) {
                promises.push(
                    new Promise<DataTexture>((resolve, reject) => {
                        new RGBELoader().load(asset, (texture) => {
                            this.onLoadEnv(texture);
                            resolve(texture);
                        }, undefined, reject);
                    })
                );
            }

            if (asset.includes('.cube') || asset.includes('.3dl')) {
                promises.push(
                    loadLutTexture(asset, this.onLoadLut)
                );
            }

            if (asset.includes('.glb') || asset.includes('.gltf')) {
                promises.push(
                    new Promise<GLTF>((resolve, reject) => {
                        const gltfLoader = new GLTFLoader();
                        gltfLoader.load(asset, (gltf) => {
                            this.onLoadModel(gltf);
                            resolve(gltf);
                        }, undefined, reject);
                    })
                );
            }

            if (asset.includes('.png') || asset.includes('.jpg')) {
                promises.push(
                    new Promise<Texture>((resolve, reject) => {
                        new TextureLoader().load(asset, (texture) => {
                            this.onLoadParticleTexture(texture);
                            resolve(texture);
                        }, undefined, reject);
                    })
                );
            }

        }

        await Promise.all(promises);

    }

    resize() {

        super.resize();

        const w = this.rootElement.clientWidth;
        const h = this.rootElement.clientHeight;
        const aspect = w / h;

        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();

    }
}