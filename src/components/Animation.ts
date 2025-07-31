import { gsap } from 'gsap';
import { CatmullRomCurve3, Color, CubicBezierCurve3, CurvePath, Line, Mesh, Object3D, PerspectiveCamera, QuadraticBezierCurve3, Vector3 } from 'three';
import { dissolveSettings, dissolveUniformData } from '../helpers/constants';
import { Dissolve } from './Dissolve';
import { DeLoreanDemo } from './DeLoreanDemo';

const yStart = 0;
const startColor = new Color(0, 0, 0);

export class Animation {
  private car: Object3D;
  private camera: PerspectiveCamera;
  private timeline: gsap.core.Timeline;

  points: Vector3[] = [];
  curve!: CatmullRomCurve3;
  curveMesh!: Line;

  public bezierSegments: (CubicBezierCurve3 | QuadraticBezierCurve3)[] = [];
  public path!: CurvePath<Vector3>;

  demo: DeLoreanDemo;
  lightningInterval!: number | null | undefined;

  private step = {
    x: 0,
    y: 0,
    z: -0.5,
    a: 0
  };

  private engineMaterial: Dissolve[] = [];

  constructor(car: Object3D, camera: PerspectiveCamera, demo: DeLoreanDemo) {
    this.car = car;
    this.camera = camera;
    this.demo = demo;

    this.timeline = gsap.timeline({ repeat: -1, defaults: {
      ease: "power2.inOut",
      yoyo: true 
    }});

    const segment1_start = new Vector3(0, yStart, 0);
    const segment1_control = new Vector3(9, yStart+0.5, -0.2);
    const segment1_end = new Vector3(15.86, yStart+1.2, -3.08);

    const segment2_start = segment1_end;
    const segment2_control = new Vector3(27.95, yStart + 2.5, -5.65);
    const segment2_end = new Vector3(27.95, yStart + 3, 0);

    const segment3_start = segment2_end;
    const segment3_control = new Vector3(24.95, yStart + 3, 7.65);
    const segment3_end = new Vector3(15.86, yStart, 1.56);

    const segment4_start = segment3_end;
    const segment4_control = new Vector3(8, yStart-0.2, -1.58);
    const segment4_end = new Vector3(-12, yStart+3.8, 0.9);

    this.bezierSegments.push(new QuadraticBezierCurve3(segment1_start, segment1_control, segment1_end));
    this.bezierSegments.push(new QuadraticBezierCurve3(segment2_start, segment2_control, segment2_end));
    this.bezierSegments.push(new QuadraticBezierCurve3(segment3_start, segment3_control, segment3_end));
    this.bezierSegments.push(new QuadraticBezierCurve3(segment4_start, segment4_control, segment4_end));

    this.path = new CurvePath();
    this.bezierSegments.forEach(segment => {
        this.path.add(segment);
    });

    this.car.traverse((obj) => {
      if (obj instanceof Mesh) {
        const mat = obj.material;
        if (mat.name.includes('MTL')) {
          // mat.emissive.copy(dissolveUniformData.engineColor.value);
          this.engineMaterial.push(mat);
        }
      }
    })
    this.createAnimation();
  }

  public generateLightningBoltPoints(
      start: Vector3,
      direction: Vector3, // Основное направление молнии
      length: number,           // Общая длина молнии
      segments: number,         // Количество сегментов основной линии
      maxOffset: number         // Максимальное случайное смещение для каждого сегмента
  ): Vector3[] {
      const points: Vector3[] = [];
      points.push(start.clone()); // Начальная точка

      const currentPoint = start.clone();
      const segmentLength = length / segments;

      for (let i = 0; i < segments; i++) {
          currentPoint.add(direction.clone().multiplyScalar(segmentLength)); // Двигаемся по основному направлению
          const offset = new Vector3(
              (Math.random() - 0.5) * maxOffset,
              (Math.random() - 0.5) * maxOffset,
              (Math.random() - 0.5) * maxOffset
          );
          points.push(currentPoint.clone().add(offset)); // Добавляем случайное смещение
      }
      return points;
  }

  public triggerLightningEffect(
      carPosition: Vector3,
      carForwardDirection: Vector3 // Куда смотрит машина
  ) {
      // Очищаем предыдущий интервал, если молния уже мерцает
      if (this.lightningInterval) {
          clearInterval(this.lightningInterval);
          this.lightningInterval = null;
      }
      this.demo.lightningMaterial.opacity = 0; // Убеждаемся, что начинается невидимой

      const lightningDuration = 0.4; // Общая длительность вспышки молнии (например, 0.4 секунды)
      const flickerIntervalMs = 40; // Как часто обновляются вершины (например, 25 раз в секунду)
      let flickerCount = 0;
      const maxFlickers = Math.floor(lightningDuration * 1000 / flickerIntervalMs);

      // Определяем базовые параметры молнии
      const boltStart = carPosition.clone().add(carForwardDirection.clone().multiplyScalar(3)); // Начинается немного перед носом машины
      const boltMainDirection = carForwardDirection.clone(); // Направление "вперед"
      const boltLength = 15 + Math.random() * 5; // Длина молнии, немного случайная
      const boltSegments = 7; // Количество основных сегментов
      const boltMaxOffset = 3 + Math.random() * 2; // Максимальное случайное смещение

      // --- Анимация появления молнии ---
      gsap.to(this.demo.lightningMaterial, {
          opacity: 1,
          duration: 0.05, // Очень быстрое появление
          ease: "power2.out",
          onComplete: () => {
              // Начинаем мерцание (генерацию новых вершин)
              this.lightningInterval = setInterval(() => {
                  if (flickerCount >= maxFlickers) {
                      clearInterval(this.lightningInterval as number);
                      this.lightningInterval = null;
                      // Анимация затухания молнии
                      gsap.to(this.demo.lightningMaterial, { opacity: 0, duration: 0.2 });
                      return;
                  }

                  const points = this.generateLightningBoltPoints(
                      boltStart,
                      boltMainDirection,
                      boltLength,
                      boltSegments,
                      boltMaxOffset
                  );
                  this.demo.lightningGeometry.setFromPoints(points); // Обновляем точки геометрии
                  this.demo.lightningGeometry.attributes.position.needsUpdate = true; // Сообщаем Three.js, что буферы изменились

                  flickerCount++;
              }, flickerIntervalMs);
          }
      });
  }

  createAnimation() {

    this.timeline.to(this.car.position, {y: 0, duration: 3, 
      onStart: () => {
        this.car.position.set(0,-0.5, 0);
        this.car.lookAt(new Vector3(2, -0.5, 0));
        this.demo.carPosition.copy(this.car.position);

        const t = 0.001


        const path = this.path;

        const position = path.getPoint(t); 

        this.car.lookAt(position.clone());

        let tangent: Vector3 = new Vector3();

        tangent.copy(path.getTangent(t));


        const tempObject = new Object3D();
        tempObject.position.copy(position);
        tempObject.lookAt(position.clone().add(tangent)); 
        
        const targetQuaternion = tempObject.quaternion;

        this.car.quaternion.copy(targetQuaternion); // (0.05 - 0.2) for smoothness


        dissolveSettings.progress = dissolveSettings.k;
        dissolveUniformData.uFreq.value = dissolveSettings.kFreg * 2.0;

        this.demo.floorMaterial.uniforms.uEffectRadius.value = 0.0; 
      },
      onUpdate: () => {
        const t = (this.car.position.y + 0.5) * 5; // Adjusted to match the animation
        // const t = this.car.position.y;
        dissolveSettings.progress = Math.cos(t) * dissolveSettings.k;
        dissolveUniformData.uFreq.value = Math.abs(Math.cos(t * dissolveSettings.kFreg)) * 2.0;
        this.demo.floorMaterial.uniforms.uEffectRadius.value = t * 20/2.5; // Adjusted for effect radius
      }
    }, 0);

    // this.timeline.to(this.demo.flashLight, { intensity: 300, duration: 1, ease: "power1.out",
    //   onStart: () => {
 
    //     this.demo.flashLight.position.copy(this.car.position);
    //     this.demo.flashLight.position.x -= 1;
    //     this.demo.flashLight.position.y += 1;
    //            console.log('Flash light on', this.demo.flashLight.position.toArray());
    //   },
    //   onUpdate: () => {
    //   },
    //   onComplete: () => {
    //     this.demo.flashLight.intensity = 0;
    //   }
    // }, 8.3);

    this.timeline.to(this.step, {a: 1, z: 0, duration: 1, 
      onStart: () => {
        this.engineMaterial.forEach((mat: Dissolve) => {
          mat.emissive.copy(startColor);
        }); 
      },
      onUpdate: () => {
        const progress = this.step.a; 

        const interpolatedColor = new Color();
        interpolatedColor.copy(startColor).lerp(dissolveUniformData.engineColor.value, progress);

        this.engineMaterial.forEach((mat: Dissolve) => {
            mat.emissive.copy(interpolatedColor);
        });
      }, 
    },  '>');

    this.timeline.to(this.step, {x: 1, duration: 8, 
      onUpdate: () => {
        const t = this.step.x; 

        // const position = this.curve.getPoint(t); 
        // this.car.position.copy(position);

        // const tangent = this.curve.getTangent(t);
        // const lookAtTarget = new Vector3().addVectors(position, tangent);
        // this.car.lookAt(lookAtTarget);
        
        // const tangent = this.curve.getTangent(t).normalize();
        // const targetQuaternion = new Quaternion();
        // targetQuaternion.setFromUnitVectors(new Vector3(0, 0, 1), tangent); 
        // // If car rotation order is YXZ, you can use:
        // // const m = new THREE.Matrix4().lookAt(position, position.clone().add(tangent), up);
        // // targetQuaternion.setFromRotationMatrix(m);

        // this.car.quaternion.slerp(targetQuaternion, 0.2);

        const path = this.path;

        const position = path.getPoint(t); 
        this.car.position.copy(position);
        this.demo.carPosition.copy(position);

        const bias = 0.2;

        const timeRotation = t + bias < 1 ? t + bias : 1; // Prevents out of bounds error

        let tangent: Vector3 = new Vector3();
        if (t > 0.15 && t < 0.7) {
          const tt = path.getTangent(timeRotation)
          tangent.lerpVectors(tt, path.getTangent(t), 0.2);

          if (t > 0.4 && t < 0.7) {
            this.engineMaterial.forEach((mat: Dissolve) => {
                mat.emissive.copy(dissolveUniformData.engineColor.value);
            });
          }
          // tangent.copy(tt);
        } else {
          tangent.copy(path.getTangent(t));
        }


        const tempObject = new Object3D();
        tempObject.position.copy(position);
        tempObject.lookAt(position.clone().add(tangent)); 
        
        const targetQuaternion = tempObject.quaternion;

        this.car.quaternion.slerp(targetQuaternion, 0.06); // (0.05 - 0.2) for smoothness

        // const carForwardDirection = this.car.getWorldDirection(new Vector3());

        // if (t > 0.49 && t < 0.61 && !this.lightningInterval) { // Если t между 0.69 и 0.71
        //     this.triggerLightningEffect(this.car.position, carForwardDirection);
        // }

      }
    }, 3);

    this.timeline.to(this.step, {y: 2.5, duration: 4, 
      onUpdate: () => {
        const t = this.step.y;
        const progress = Math.cos(t) * -dissolveSettings.k;

        dissolveSettings.progress = progress;
        // console.log(dissolveSettings.progress);
        dissolveUniformData.uFreq.value = Math.abs(Math.cos(t * dissolveSettings.kFreg)) * 2.0;
      },
      onStart: () => {
          this.engineMaterial.forEach((mat: Dissolve) => {
            mat.emissive.setRGB(0, 0, 0);
          }); 
      }
    }, 6);

    this.timeline.to(this.camera.position, { y: 3.7, duration: 9+2 }, 0);

  }
};