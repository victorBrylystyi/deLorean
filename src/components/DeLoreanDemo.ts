import { CatmullRomCurve3, CineonToneMapping, Clock, Data3DTexture, DataTexture, Group, Line, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, PlaneGeometry, PMREMGenerator, RepeatWrapping, Texture, TextureLoader, TubeGeometry, Vector2 } from "three";
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

// const blackColor = new Color(0x000000);

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

    clockDissolve = 0;

    enableControls = false;

    car!: Mesh;
    curveMesh!: Line | Mesh;
    clock = new Clock();
    t = 0;
    visibleCurve = true;
    curve!: CatmullRomCurve3;

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
        this.envTexture = generator.fromEquirectangular(texture).texture;

        // this.scene.background = this.envTexture;
        this.scene.environment = this.envTexture;
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
            envPath + 'bismarckturm_hillside_1k.hdr',
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

        this.mountScene();

        this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
        this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);

        // this.scene.background = this.envTexture;
        // this.scene.backgroundBlurriness = 0.7;
        this.scene.environment = this.envTexture;

    }

    mountScene() {

        const aspect = this.rootElement.clientWidth / this.rootElement.clientHeight; 

        this.renderer.toneMapping = CineonToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        this.camera = new PerspectiveCamera( 70, aspect, 0.01, 1000 );

        // this.camera.position.set(-9, 0.5, -2);
        this.camera.position.set(-7, 0.5, 0);
        this.camera.lookAt(10, 0, 0);
        // this.camera.rotation.y = -Math.PI/2;

        if (this.enableControls) {

            this.controls = new OrbitControls(this.camera, this.canvas);
            this.controls.enableDamping = true;
            this.controls.autoRotate = false;
            this.controls.enabled = this.enableControls;
        }


        this.postprocessing(this.scene, this.camera);

        const floor = new Mesh(
            new PlaneGeometry(20, 20),
            new MeshStandardMaterial({
                transparent: true,
                color: 0xFFFFFF,
                roughness: 1.0,
                metalness: 0.5,
                // envMap: this.envTexture,
            })
        );

        floor.rotation.x = - Math.PI / 2;
        floor.position.y = -0.26;

        const floorPath = texturePath + 'texture_08.png';
        const floorAlphaPath = texturePath + 'alpha.png';

        new TextureLoader().load(floorPath, (texture) => {
            texture.flipY = false;
            texture.wrapS = texture.wrapT = RepeatWrapping;
            texture.repeat.set(16, 16);

            floor.material.map = texture;
            floor.material.needsUpdate = true;
        });
        new TextureLoader().load(floorAlphaPath, (texture) => {
            texture.flipY = false;

            floor.material.alphaMap = texture;
            floor.material.needsUpdate = true;
        });

        const car = this.model.scene.clone();
        car.traverse((child) => {
            if (child instanceof Mesh) {
 
                const childMaterial = child.material as MeshStandardMaterial;

                // const newMat = new CustomShaderMaterial({
                //     baseMaterial: MeshStandardMaterial,
                //     vertexShader: vertexShader,
                //     fragmentShader: fragmentShader,
                //     uniforms: {
                //         uProgress: { value: this.progress },
                //         uThickness: { value: 0.05 },
                //         uColor: { value: new Color().setStyle('#eb5a13').multiplyScalar(50) },
                //     },
                //     color: currentMaterial.color,
                //     roughness: currentMaterial.roughness,
                //     metalness: currentMaterial.metalness,
                //     emissive: currentMaterial.emissive,
                //     emissiveIntensity: currentMaterial.emissiveIntensity,
                //     side: currentMaterial.side,
                //     depthWrite: true,
                //     depthTest: true,
                //     transparent: true,
                //     toneMapped: true,
                //     alphaTest: 0.1,

                //     wireframe: currentMaterial.wireframe,
                //     map: currentMaterial.map,
                //     normalMap: currentMaterial.normalMap,
                //     normalScale: currentMaterial.normalScale,
                //     aoMap: currentMaterial.aoMap,
                //     aoMapIntensity: currentMaterial.aoMapIntensity,
                //     emissiveMap: currentMaterial.emissiveMap,
                //     metalnessMap: currentMaterial.metalnessMap,
                //     roughnessMap: currentMaterial.roughnessMap,
                //     alphaMap: currentMaterial.alphaMap,
                //     envMap: this.envTexture,
                //     envMapIntensity: currentMaterial.envMapIntensity,
                // });

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

                // console.log(child.material);

                const particle = new ParticleMesh(this.renderer, child, this.particleTexture);
                this.particles.push(particle);
                // this.scene.add(particle);
            }
        });
        car.rotation.y = Math.PI/2;

        this.setGui();

        this.modelContainer.add(car);
        // this.modelContainer.position.set(0, -0.7, 0);
        // this.modelContainer.rotation.y = Math.PI;

        this.container.add(floor);
        this.container.add(this.modelContainer);

        this.contactShadow.position.set(0, -0.2, 0);
        this.scene.add(this.contactShadow);

        this.scene.add(this.container);

        // this.car = new Mesh(new BoxGeometry(1, 1, 2), new MeshStandardMaterial({
        //     color: 0x00ff00,
        //     roughness: 0.5,
        //     metalness: 0.5,
        //     transparent: true,
        //     opacity: 0.5,
        // }));
        // const y = 0.5
        // this.car.position.set(0, y, 0);
        // this.scene.add(this.car);

        // const points = [
        //     new Vector3(0, 0, 0), 
        //     new Vector3(20, 0, -10),
        //     new Vector3(23, 3, 0), 
        //     new Vector3(20, 2, 0),
        //     new Vector3(-10, 2, 0),
        // ];

        // this.curve = new CatmullRomCurve3(points);
        this.modelContainer.position.set(0, -0.5, 0);
        // this.modelContainer.visible = false;
        const animation = new Animation(this.modelContainer, this.camera);
        const tubeGeometry = new TubeGeometry( animation.curve, 500, 0.1, 4, false );
        const material = new MeshBasicMaterial( { color: 0xff00ff } );
		// const wireframeMaterial = new MeshBasicMaterial( { color: 0x000000, opacity: 0.3, wireframe: true, transparent: true } );

        this.curveMesh = new Mesh( tubeGeometry, material );
        // const divisions = 50; // Количество сегментов для каждой кривой в path
                      // Если у вас 5 bezierSegments, то общее количество точек будет (5 * divisions) + 1
        // const curvePoints = animation.path.getPoints(divisions); 

        // // 4. Создаем BufferGeometry из этих точек
        // const lineGeometry = new BufferGeometry().setFromPoints(curvePoints);
        // // 5. Создаем материал для линии
        // const lineMaterial = new LineBasicMaterial({ color: 0xff0000 }); // Красная линия

        // 6. Создаем объект Line
        // this.curveMesh = new Line(lineGeometry, lineMaterial);

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

        this.particles.forEach(mesh => {
            mesh.update(t);
        });

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
        this.composer.render();


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