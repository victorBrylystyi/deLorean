import { BufferGeometry, CatmullRomCurve3, CineonToneMapping, Clock, Color, Data3DTexture, DataTexture, GridHelper, Group, Line, LineBasicMaterial, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, PlaneGeometry, PMREMGenerator, PointLight, ShaderMaterial, SphereGeometry, Texture, TextureLoader, Vector2, Vector3 } from "three";
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
import { LightningStrike, RayParameters } from "three-stdlib";
// import { gsap } from 'gsap';

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


// const darkMaterial = new MeshBasicMaterial({
//     color: 0x000000,
// });

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
    visibleCurve = false;
    curve!: CatmullRomCurve3;
    flashLight = new PointLight(0xffffff, 0, 100);
    carPosition = new Vector3();
    floorMesh!: Mesh;
    floorMaterial!: ShaderMaterial;

    // lightningInterval!: number | null | undefined;
    lightningMesh!: Line;
    lightning!: LightningStrike;
    lightningGeometry!: BufferGeometry;
    lightningGroup: Group = new Group();
    lightningMaterial!: MeshBasicMaterial;
    lightningStrikes: Mesh[] = [];

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

        const w = 90, h = 100;

        const floorGeometry = new PlaneGeometry(w, h, 100, 100);
        floorGeometry.rotateX(-Math.PI / 2); 

        this.floorMaterial = new ShaderMaterial({
            uniforms: {
                uCarPosition: { value: this.carPosition.copy(car.position) }, // Point 
                uEffectRadius: { value: 0.0 }, // Радиус эффекта
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
                uniform float uEffectRadius;

                varying vec2 vUv;
                varying vec3 vPosition;
                varying float vDisplacement;

                void main() {
                    vUv = uv;
                    vPosition = position;

                    float distToCar = distance(position.xz, uCarPosition.xz); 

                    float displacementStrength = 0.0;
                    float effectRadius = uEffectRadius; 
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

        // --- INITIALIZATION LIGHTNING ---
        this.lightningMaterial = new MeshBasicMaterial({
            color: 0xADD8E6, 
            // linewidth: 5,
            transparent: true,
            opacity: 0,     
            depthTest: true,
            depthWrite: true
            // blending: AdditiveBlending // for glow effect
        });
        // this.lightningGeometry = new BufferGeometry();
        // this.lightningMesh = new Line(this.lightningGeometry, this.lightningMaterial);


        // this.lightning = new LightningStrike({
        //     sourceOffset: new Vector3(0, 5, 0),
        //     destOffset: new Vector3(0, -5, 0),
        //     radius0: 0.2,
        //     radius1: 0.05,
        //     minRadius: 0.01,
        //     maxIterations: 9,
        //     isEternal: true,
        // });

        // const mesh = new Mesh(this.lightning, this.lightningMaterial);
        // this.lightningGroup.add(mesh);

        // this.createStaticLightningStrikes();

        this.modelContainer.add(this.lightningGroup);
        this.scene.add(this.container);

        this.modelContainer.position.set(0, -0.5, 0);
        // this.modelContainer.visible = false;

        const divisions = 50; // Количество сегментов для каждой кривой в path
        const animation = new Animation(this.modelContainer, this);
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

    createStaticLightningStrikes() {
        // 1. Очищаем this.lightningGroup от всех предыдущих молний
        while (this.lightningGroup.children.length > 0) {
            const child = this.lightningGroup.children[0];
            this.lightningGroup.remove(child);
            if (child instanceof Mesh) { // LightningStrike - это Mesh
                if (child.geometry) child.geometry.dispose();
                if (child.material) (child.material as Material).dispose();
            }
        }
        this.lightningStrikes = []; // Очищаем массив ссылок

        // --- Определяем начальные и конечные точки молнии в локальных координатах машины ---
        // Предполагаем, что нос автомобиля находится в (0, 1, 3) относительно this.car,
        // и его "вправо" - это +X в локальных координатах this.car.
        const carNoseLocalOffset = new Vector3(0, 1, 3);

        // Примерные точки для 3 молний, чтобы они огибали машину
        // Эти точки будут служить началом и концом для каждой LightningStrike
        const boltDefinitions = [
            {
                start: carNoseLocalOffset.clone().add(new Vector3(0.6, 0, 0)), // Справа от центра
                end: carNoseLocalOffset.clone().add(new Vector3(1.6, 0, -8)) // Справа, далеко вперед
            },
            {
                start: carNoseLocalOffset.clone().add(new Vector3(0, 0, 0)), // Сверху от центра
                end: carNoseLocalOffset.clone().add(new Vector3(0, 1, -4)) // Сверху, далеко вперед
            },
            {
                start: carNoseLocalOffset.clone().add(new Vector3(-0.6, 0, 0)), // Слева от центра
                end: carNoseLocalOffset.clone().add(new Vector3(-1.6, 0, -8)) // Слева, далеко вперед
            },
            {
                start: carNoseLocalOffset.clone().add(new Vector3(0, 0, 0)), // Сверху от центра
                end: carNoseLocalOffset.clone().add(new Vector3(0, -1.4, -4)) // Сверху, далеко вперед
            },
        ];

        // --- Создаем несколько экземпляров LightningStrike ---
        boltDefinitions.forEach((def) => {
            // Параметры для LightningStrike
            const lightningParams: RayParameters = {
                // Начальная и конечная точка молнии
                sourceOffset: def.start,
                destOffset: def.end,
                radius0: 0.02,
                radius1: 0.15,
                minRadius: 0.01,
                maxIterations: 9,
                isEternal: true,
                // Настройки внешнего вида молнии

                // roughness: 0.9,      // Хаотичность изгибов (0-1)
                // straightness: 0.7,   // Насколько прямая молния (0-1)
                // maxIterations: 9,    // Количество итераций для генерации веток
                // isStatic  : false, // Не генерировать ветки

                // branchProbability: 0.6, // Вероятность генерации ветки (если branchEnabled: true)
                // branchLength: 0.8,      // Длина ветки относительно основной молнии
                // branchAngle: 0.1,       // Угол отклонения ветки
                // minRadius: 0.1,         // Минимальный радиус молнии
                // maxRadius: 0.3,         // Максимальный радиус молнии
                // fadingTime: 0.5,        // Время затухания (для анимации, пока не используем)
                // subs: 10,               // Количество подразделений для каждой линии (больше = плавнее)
                // timeScale: 0.7,         // Скорость анимации (для анимации, пока не используем)
                // delay: 0,               // Задержка перед началом (для анимации)
            };

            const lightning = new LightningStrike(lightningParams);

            const mesh = new Mesh(lightning, this.lightningMaterial)
            this.lightningGroup.add(mesh);
            this.lightningStrikes.push(mesh);
        });

        // boltDefinitions.forEach(def => {
        //     this.addDebugSpheres([def.start]); // Красные для старта
        //     this.addDebugSpheres([def.end]);   // Синие для конца
        // });
    }

    // generateLightningBoltPoints(
    //     baseAnchorPoints: Vector3[],
    //     maxOffset: number,
    //     subdivisionsPerSegment: number = 5
    // ): Vector3[] {
    //     const finalPoints: Vector3[] = [];
    //     if (baseAnchorPoints.length < 2) return finalPoints;

    //     finalPoints.push(baseAnchorPoints[0].clone());

    //     for (let i = 0; i < baseAnchorPoints.length - 1; i++) {
    //         const p1 = baseAnchorPoints[i];
    //         const p2 = baseAnchorPoints[i + 1];

    //         for (let j = 1; j <= subdivisionsPerSegment; j++) {
    //             const t = j / subdivisionsPerSegment;
    //             const interpolatedBasePoint = new Vector3().lerpVectors(p1, p2, t);

    //             const offset = new Vector3(
    //                 (Math.random() - 0.5) * maxOffset,
    //                 (Math.random() - 0.5) * maxOffset,
    //                 (Math.random() - 0.5) * maxOffset
    //             );
    //             finalPoints.push(interpolatedBasePoint.add(offset));
    //         }
    //     }
    //     return finalPoints;
    // }

    // createStaticMultipleLightningBolts(
    //     numBolts: number,
    //     maxOffset: number,
    //     subdivisionsPerSegment: number,
    //     baseOffsetRandomness: number) {
    //         // 1. Очищаем this.lightningGroup от всех предыдущих линий и сфер
    //     while (this.lightningGroup.children.length > 0) {
    //         const child = this.lightningGroup.children[0];
    //         this.lightningGroup.remove(child);
    //         if (child instanceof Mesh || child instanceof Line) {
    //             if (child.geometry) child.geometry.dispose();
    //             if (child.material) (child.material as Material).dispose();
    //         }
    //     }

    //     // --- Определяем базовые якоря для молнии (относительно this.car) ---
    //     // Эти значения определяют базовую форму "огибания".
    //     // Предполагается, что нос автомобиля находится в (0, 1, 3) относительно this.car,
    //     // и его "вправо" - это +X в локальных координатах this.car.
    //     const carNoseLocalOffset = new Vector3(0, 1, 3);

    //     const offsets = [
    //         new Vector3(0.6, 0, 0), 
    //         new Vector3(0, 0.4, 0), 
    //         new Vector3(-0.6, 0, 0)  
    //     ];

    //     // --- Создаем несколько линий молнии (numBolts) ---
    //     for (let i = 0; i < numBolts; i++) {

    //         const carLocalOffset = offsets[i];

    //         const p0_nose_local = carNoseLocalOffset.clone();
    //         const p1_side_local = p0_nose_local.clone()
    //                                             .add(new Vector3(0, 0, -2))
    //                                             .add(carLocalOffset.clone().multiplyScalar(2));
    //         const p2_cross_local = p1_side_local.clone()
    //                                             .add(new Vector3(0, 0, -2))
    //                                             .add(carLocalOffset.clone().multiplyScalar(2));
    //         const p3_end_local = p2_cross_local.clone()
    //                                             .add(new Vector3(0, 0, -2));

    //         const baseCurveAnchorPointsLocal = [p0_nose_local, p1_side_local, p2_cross_local, p3_end_local];

    //         // --- Для отладки статической формы базовой кривой (не забудьте удалить!) ---
    //         // this.addDebugSpheres(baseCurveAnchorPointsLocal);
    //         // Применяем небольшое случайное смещение к базовой форме каждой молнии
    //         const randomBaseOffsetVector = new Vector3(
    //             (Math.random() - 0.5) * baseOffsetRandomness,
    //             (Math.random() - 0.5) * baseOffsetRandomness,
    //             (Math.random() - 0.5) * baseOffsetRandomness // Если вы хотите смещать по оси Z тоже
    //         );
    //         const currentBaseAnchorPoints = baseCurveAnchorPointsLocal.map(p => p.clone().add(randomBaseOffsetVector));

    //         const currentMaxOffset = maxOffset + (Math.random() - 0.5) * (maxOffset * 0.5); // Немного рандомизируем maxOffset
    //         const currentSubdivisions = subdivisionsPerSegment + Math.floor((Math.random() - 0.5) * 2); // Немного рандомизируем subdivisions

    //         const points = this.generateLightningBoltPoints(
    //             currentBaseAnchorPoints,
    //             currentMaxOffset,
    //             currentSubdivisions
    //         );

    //         const geometry = new BufferGeometry().setFromPoints(points);
    //         const line = new Line(geometry, this.lightningMaterial); // Используем общий материал
    //         this.lightningGroup.add(line); // Добавляем линию в группу
    //     }
    // }

    // createStaticLightningLines() {
    //     // Внимание: Позиции здесь будут *относительными* к this.car!
    //     // this.car.position уже (0,0,0) в локальной системе координат this.car.
    //     // Направление this.car.getWorldDirection() здесь не нужно,
    //     // так как мы работаем в локальной системе координат car.

    //     // Предположим, нос автомобиля находится на (0, 0, some_forward_offset)
    //     // или используем простые относительные смещения.
    //     // По умолчанию, модель авто может быть центрирована в (0,0,0) внутри this.car.
    //     // Если нос авто направлен по X+, тогда смещение по X+.
    //     // Если нос авто направлен по Z+, тогда смещение по Z+.

    //     // Давайте предположим, что нос автомобиля находится в (0, 0, 0) относительно this.car,
    //     // и его "вперед" - это +Z в локальных координатах this.car.
    //     // (Если это не так, вам нужно будет скорректировать смещения ниже).

    //     const carNoseLocalOffset = new Vector3(0, 1, 3); 
    //     const carRightLocalOffset = new Vector3(1, 0, 0); // Пример: 1 ед. вправо по X в локальных коорд.

    //     // --- ОПРЕДЕЛЯЕМ БАЗОВЫЕ ЯКОРНЫЕ ТОЧКИ ДЛЯ ИЗОГНУТОЙ МОЛНИИ (В ЛОКАЛЬНЫХ КООРДИНАТАХ МАШИНЫ) ---
    //     // P0: Начинается перед носом машины
    //     const p0_nose_local = carNoseLocalOffset.clone();

    //     // P1: Слегка вперед и в сторону
    //     const p1_side_local = p0_nose_local.clone()
    //                                     .add(new Vector3(0, 0, -3))
    //                                     .add(carRightLocalOffset.clone().multiplyScalar(2));

    //     // P2: Дальше вперед, пересекаясь обратно к другой стороне или центру
    //     const p2_cross_local = p1_side_local.clone()
    //                                         .add(new Vector3(0, 0, -4))
    //                                         .add(carRightLocalOffset.clone().multiplyScalar(2));

    //     // P3: Конечная точка молнии, прямо вперед от машины
    //     const p3_end_local = p2_cross_local.clone()
    //                                     .add(new Vector3(0, 0, -5));

    //     const baseCurveAnchorPointsLocal = [p0_nose_local, p1_side_local, p2_cross_local, p3_end_local];

    //     // Генерируем точки для статической молнии
    //     const staticLightningPoints = this.generateLightningBoltPoints(
    //         baseCurveAnchorPointsLocal,
    //         0.5, // maxOffset: Максимальное случайное смещение для зигзага (можно увеличить для большей "зигзагообразности")
    //         5    // subdivisionsPerSegment: Количество сегментов между базовыми точками (больше = более детальная кривая)
    //     );

    //     this.lightningGeometry = new BufferGeometry().setFromPoints(staticLightningPoints);
    //     this.lightningMesh = new Line(this.lightningGeometry, this.lightningMaterial);

    //     this.lightningGroup.add(this.lightningMesh);

    //     this.addDebugSpheres(baseCurveAnchorPointsLocal);
    // }

    addDebugSpheres(points: Vector3[]) {
        const sphereGeometry = new SphereGeometry(0.15, 8, 8);
        const sphereMaterial = new MeshBasicMaterial({ color: 0xFFFFFF });

        points.forEach(point => {
            const sphere = new Mesh(sphereGeometry, sphereMaterial);
            sphere.position.copy(point);
            this.lightningGroup.add(sphere);
        });
    }

    // public generateLightningBoltPoints(
    //     start: Vector3,
    //     direction: Vector3, // Основное направление молнии
    //     length: number,           // Общая длина молнии
    //     segments: number,         // Количество сегментов основной линии
    //     maxOffset: number         // Максимальное случайное смещение для каждого сегмента
    // ): Vector3[] {
    //     const points: Vector3[] = [];
    //     points.push(start.clone()); // Начальная точка

    //     const currentPoint = start.clone();
    //     const segmentLength = length / segments;

    //     for (let i = 0; i < segments; i++) {
    //         currentPoint.add(direction.clone().multiplyScalar(segmentLength)); // Двигаемся по основному направлению
    //         const offset = new Vector3(
    //             (Math.random() - 0.5) * maxOffset,
    //             (Math.random() - 0.5) * maxOffset,
    //             (Math.random() - 0.5) * maxOffset
    //         );
    //         points.push(currentPoint.clone().add(offset)); // Добавляем случайное смещение
    //     }
    //     return points;
    // }

    // public triggerLightningEffect(
    //     carPosition: Vector3,
    //     carForwardDirection: Vector3 // Куда смотрит машина
    // ) {
    //     // Очищаем предыдущий интервал, если молния уже мерцает
    //     if (this.lightningInterval) {
    //         clearInterval(this.lightningInterval);
    //         this.lightningInterval = null;
    //     }
    //     this.lightningMaterial.opacity = 0; // Убеждаемся, что начинается невидимой

    //     const lightningDuration = 0.4; // Общая длительность вспышки молнии (например, 0.4 секунды)
    //     const flickerIntervalMs = 40; // Как часто обновляются вершины (например, 25 раз в секунду)
    //     let flickerCount = 0;
    //     const maxFlickers = Math.floor(lightningDuration * 1000 / flickerIntervalMs);

    //     // Определяем базовые параметры молнии
    //     const boltStart = carPosition.clone().add(carForwardDirection.clone().multiplyScalar(1)); // Начинается немного перед носом машины
    //     const boltMainDirection = carForwardDirection.clone(); // Направление "вперед"
    //     const boltLength = 15 + Math.random() * 5; // Длина молнии, немного случайная
    //     const boltSegments = 7; // Количество основных сегментов
    //     const boltMaxOffset = 3 + Math.random() * 2; // Максимальное случайное смещение

    //     // --- Анимация появления молнии ---
    //     gsap.to(this.lightningMaterial, {
    //         opacity: 1,
    //         duration: 0.05, // Очень быстрое появление
    //         ease: "power2.out",
    //         onComplete: () => {
    //             // Начинаем мерцание (генерацию новых вершин)
    //             this.lightningInterval = setInterval(() => {
    //                 if (flickerCount >= maxFlickers) {
    //                     clearInterval(this.lightningInterval as number);
    //                     this.lightningInterval = null;
    //                     // Анимация затухания молнии
    //                     gsap.to(this.lightningMaterial, { opacity: 0, duration: 0.2 });
    //                     return;
    //                 }

    //                 const points = this.generateLightningBoltPoints(
    //                     boltStart,
    //                     boltMainDirection,
    //                     boltLength,
    //                     boltSegments,
    //                     boltMaxOffset
    //                 );
    //                 this.lightningGeometry.setFromPoints(points);
    //                 this.lightningGeometry.attributes.position.needsUpdate = true;

    //                 flickerCount++;
    //             }, flickerIntervalMs);
    //         }
    //     });
    // }

    setGui() {
        if (this.mountStats) {
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

        // reconst t = dt / 2000;
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

        // const t = this.t / 100;
        // const position = this.curve.getPoint(t); 
        // this.modelContainer.position.copy(position);

        // const tangent = this.curve.getTangent(t);
        // const lookAtTarget = new Vector3().addVectors(position, tangent);
        // this.modelContainer.lookAt(lookAtTarget);

        this.lightningStrikes.forEach((strike) => {
            (strike.geometry as LightningStrike).update(dt/1000);
        });

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