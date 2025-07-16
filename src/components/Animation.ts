import { gsap } from 'gsap';
import { Color, CurvePath, Mesh, Object3D, PerspectiveCamera, QuadraticBezierCurve3, Vector3 } from 'three';
import { dissolveSettings, dissolveUniformData } from '../helpers/constants';
import { Dissolve } from './Dissolve';
import { CustomEase } from 'gsap/all';

const yStart = 0;
const startColor = new Color(0, 0, 0);

export class Animation {
  private car: Object3D;
  private camera: PerspectiveCamera;
  private timeline: gsap.core.Timeline;

  // points = [
  //   // --- Phase 1: Initial forward movement ---
  //   new Vector3(0, yStart, 0),   // Start
  //   new Vector3(2, yStart, 0),   // Slightly forward

  //   // --- Phase 2: Ascent and curve (making it rounder) ---
  //   // Goal: Ascend and turn "left" (negative Z)

  //   // Point where ascent and turn begin
  //   new Vector3(15, yStart, -2),  // Car begins to shift slightly left before ascending

  //   // Points to form a round arc upwards and to the left
  //   new Vector3(18, yStart + 1.5, -5), // Active ascent and turn
  //   new Vector3(21, yStart + 3, -7),   // Peak of ascent and maximum left shift

  //   // --- Phase 3: Transition to forward-down movement (start of flyover/descent) ---
  //   // Goal: Car levels out in height and direction, preparing for descent/flyover
  //   new Vector3(23, yStart + 3, -5),   // Exiting peak of ascent, Z-offset decreases
  //   new Vector3(25, yStart + 2, 0),    // Car levels out on Z, begins a slight descent

  //   // --- Phase 4: Flyover/further descent and departure ---
  //   // Goal: Fly past the "camera" and depart

  //   new Vector3(15, yStart + 0.5, 0),  // Flyby, slightly lower than the previous point
  //   new Vector3(-4, yStart + 1, 0),    // Departure, lifts slightly for smoothness
  //   new Vector3(-8, yStart + 3, 0),    // Final departure (maintains height)
  //   new Vector3(-15, yStart + 3, 0),   // Final departure (maintains height)
  // ];

  // points = [
  //   // --- Phase 1: Initial forward movement ---
  //   new Vector3(0, yStart, 0),   // Start
  //   new Vector3(2, yStart, 0),   // Slightly forward
  //   new Vector3(10, yStart, -1), // Added: More gentle lead-in to the curve

  //   // --- Phase 2: Ascent and curve (making it rounder) ---
  //   // Goal: Ascend and turn "left" (negative Z)

  //   // Point where ascent and turn begin
  //   new Vector3(15, yStart, -2),  // Car begins to shift slightly left before ascending

  //   // Points to form a round arc upwards and to the left
  //   new Vector3(18, yStart + 1.5, -5), // Active ascent and turn
  //   new Vector3(20, yStart + 2.5, -6.5), // Added: Intermediate point for smoother peak
  //   new Vector3(21, yStart + 3, -7),   // Peak of ascent and maximum left shift

  //   // --- Phase 3: Transition to forward-down movement (start of flyover/descent) ---
  //   // Goal: Car levels out in height and direction, preparing for descent/flyover
  //   new Vector3(23, yStart + 3, -5),   // Exiting peak of ascent, Z-offset decreases
  //   new Vector3(24, yStart + 2.5, -2), // Added: Smoother transition out of peak
  //   new Vector3(25, yStart + 2, 0),    // Car levels out on Z, begins a slight descent

  //   // --- Phase 4: Flyover/further descent and departure ---
  //   // Goal: Fly past the "camera" and depart

  //   new Vector3(15, yStart + 0.5, 0),  // Flyby, slightly lower than the previous point
  //   new Vector3(5, yStart + 0.8, 0),   // Added: Smoother lead-in to final departure
  //   new Vector3(-4, yStart + 1, 0),    // Departure, lifts slightly for smoothness
  //   new Vector3(-8, yStart + 3, 0),    // Final departure (maintains height)
  //   new Vector3(-15, yStart + 3, 0),   // Final departure (maintains height)
  // ];

points = [
    new Vector3(0, yStart, 0),     
    new Vector3(5, yStart, 0),       

    new Vector3(10, yStart, -2), 
    new Vector3(20, yStart, -4),   

    new Vector3(21, yStart + 1, -3),   
    new Vector3(22, yStart + 2, -2),   
    new Vector3(23, yStart + 3, -1),    
    new Vector3(24, yStart + 4, 0),


    new Vector3(15, yStart + 0.5, 0),  // Flyby, slightly lower than the previous point
    // new Vector3(5, yStart + 0.8, 0),   // Added: Smoother lead-in to final departure
    new Vector3(-4, yStart + 1, 0),    // Departure, lifts slightly for smoothness
    new Vector3(-8, yStart + 3, 0),    // Final departure (maintains height)
    new Vector3(-15, yStart + 4, 0),   // Final departure (maintains height)
];

bezierSegments: QuadraticBezierCurve3[] = [];

  path!: CurvePath<Vector3>;

  // curve: QuadraticBezierCurve3;
  step = {
    x: 0,
    y: 0,
    z: -0.5,
    a: 0
  }
  engineMaterial: Dissolve[] = [];

  constructor(car: Object3D, camera: PerspectiveCamera) {
    this.car = car;
    this.camera = camera;

    gsap.registerPlugin(CustomEase);
    CustomEase.create("myPathSpeedAccelerated", "M0,0 L0.2,0.2 C0.3,0.3 0.6,0.98 0.8,0.95 L1,1");

    this.timeline = gsap.timeline({ repeat: -1, defaults: {
      // ease: "sine.out",
// ease: "expoScale(0.5,7,power2.out)",
    ease: "power2.inOut",
      yoyo: true 
    }});

//     // --- Сегмент 1: Начальный разгон по прямой ---
// // Машина стартует и движется вперед. Это почти прямая линия, но QuadraticBezierCurve3
// // всегда имеет изгиб, если controlPoint не лежит на прямой между start и end.
// // Для прямой линии controlPoint должен быть на этой прямой.
// const segment1_start = new Vector3(0, yStart, 0);
// const segment1_control = new Vector3(2.5, yStart, 0); // Посередине, для прямой линии
// const segment1_end = new Vector3(5, yStart, 0);
// this.bezierSegments.push(new QuadraticBezierCurve3(segment1_start, segment1_control, segment1_end));

// // --- Сегмент 2: Отрыв от земли и начало подъема с поворотом влево ---
// // Машина отрывается, поднимается и начинает поворот влево (-Z).
// const segment2_start = segment1_end; // Продолжаем с конца предыдущего сегмента
// const segment2_control = new Vector3(12.5, yStart + 1, -4); // Тянем кривую вверх и влево
// const segment2_end = new Vector3(15, yStart + 2, -6); // Максимальный подъем и сдвиг влево
// this.bezierSegments.push(new QuadraticBezierCurve3(segment2_start, segment2_control, segment2_end));

// // --- Сегмент 3: Полет по дуге, выравнивание и возврат Z к 0 ---
// // Машина находится на высоте, завершает изгиб влево и плавно выравнивается по Z к 0.
// const segment3_start = segment2_end; // Продолжаем
// const segment3_control = new Vector3(19, yStart + 3.5, -6.5); // Тянем вверх и немного выравниваем Z
// const segment3_end = new Vector3(22, yStart + 3, 0); // Выравнивание по Z к 0, пик по X
// this.bezierSegments.push(new QuadraticBezierCurve3(segment3_start, segment3_control, segment3_end));

// // --- Сегмент 4: Пролет над камерой с небольшим снижением ---
// // Машина движется вперед (от нас), пролетая над точкой обзора, плавно снижаясь.
// const segment4_start = segment3_end; // Продолжаем
// const segment4_control = new Vector3(15, yStart + 2.5, 0); // Тянем кривую вниз, сохраняя Z=0
// const segment4_end = new Vector3(0, yStart + 1, 0); // Пролет над начальной точкой (X=0)
// this.bezierSegments.push(new QuadraticBezierCurve3(segment4_start, segment4_control, segment4_end));

// // --- Сегмент 5: Финальный подъем "в камеру" и удаление ---
// // Машина поднимается вверх и одновременно движется "назад" (-X), уходя из поля зрения.
// const segment5_start = segment4_end; // Продолжаем
// const segment5_control = new Vector3(-7.5, yStart + 4, 0); // Тянем вверх и "назад" по X
// const segment5_end = new Vector3(-20, yStart + 6, 0); // Окончательное удаление
// this.bezierSegments.push(new QuadraticBezierCurve3(segment5_start, segment5_control, segment5_end));

// // --- Сегмент 1: Начальный разгон по прямой ---
// const segment1_start = new Vector3(0, yStart, 0);
// const segment1_control = new Vector3(2.5, yStart, 0); 
// const segment1_end = new Vector3(5, yStart, 0);
// this.bezierSegments.push(new QuadraticBezierCurve3(segment1_start, segment1_control, segment1_end));

// // --- Сегмент 2: Отрыв от земли и начало подъема с плавным поворотом влево ---
// const segment2_start = segment1_end; // (5, 0, 0)

// // Базовая касательная точка для G1 непрерывности:
// const baseTangentPoint = segment2_start.clone().add(segment2_start.clone().sub(segment1_control)); // (7.5, 0, 0)

// const segment2_control = new Vector3(
//     baseTangentPoint.x + 2, // Продолжаем движение вперед, немного больше чем базовая касательная
//     yStart + 0.5,           // Начало подъема
//     -2                      // Начало поворота влево
// ); 
// // Итоговый segment2_control будет примерно (9.5, 0.5, -2)
// const segment2_end = new Vector3(15, yStart + 2, -6); // Максимальный подъем и сдвиг влево
// this.bezierSegments.push(new QuadraticBezierCurve3(segment2_start, segment2_control, segment2_end));

/*

// --- Сегмент 1: Начальный разгон по прямой ---
const segment1_start = new Vector3(0, yStart, 0); 
const segment1_end = new Vector3(8, yStart, 0); // <-- Точка P
// Контрольная точка 1 будет рассчитана далее для G1 непрерывности
// const calculated_segment1_control = ...; 

// --- Сегмент 2: Отрыв от земли и начало подъема с плавным поворотом влево ---
const segment2_start = segment1_end; // (8, 0, 0)

// **Ключевая корректировка для уменьшения радиуса**
// controlPoint2 теперь будет ближе к startPoint2, и z-смещение будет более "интенсивным" на меньшем расстоянии.
const segment2_control = new Vector3(
    segment2_start.x + 1, // Уменьшаем X-смещение (было +2), чтобы контрольная точка была ближе
    yStart + 0.6,         // Меньший подъем Y в начале, чтобы сделать изгиб более компактным по вертикали
    -2.5                    // Более агрессивное Z-смещение (было -3), чтобы "затянуть" поворот
); 
// Теперь segment2_control будет примерно (9.5, 0.6, -2.5)

// Расчет segment1_control для G1 непрерывности (C1 = P * 2 - C2)
const calculated_segment1_control = segment2_start.clone().multiplyScalar(2).sub(segment2_control);
this.bezierSegments.push(new QuadraticBezierCurve3(segment1_start, calculated_segment1_control, segment1_end));
const segment2_end = new Vector3(15, yStart + 2, -6); // Максимальный подъем и сдвиг влево
this.bezierSegments.push(new QuadraticBezierCurve3(segment2_start, segment2_control, segment2_end));

// --- Сегмент 3: Полет по дуге, выравнивание и возврат Z к 0 ---
const segment3_start = segment2_end; // (15, 2, -6)

// const prevControl2EndVec = segment2_end.clone().sub(segment2_control); // Вектор от старой контрольной до конца
// const segment3_control = segment3_start.clone().add(prevControl2EndVec.multiplyScalar(0.5)); // Примерная симметрия

// const segment3_control_adjusted = new Vector3(
//     segment3_start.x + (segment3_start.x - segment2_control.x), // Сдвиг по X
//     segment3_start.y + (segment3_start.y - segment2_control.y) + 1.5, // Сдвиг по Y с подъемом
//     segment3_start.z + (segment3_start.z - segment2_control.z) - 0.5 // Сдвиг по Z, чтобы продолжить изгиб
// );
// segment3_control_adjusted = (15 + (15 - 7.5), 2 + (2-1)+1.5, -6 + (-6 - (-2)) - 0.5)
// = (22.5, 4.5, -10.5) -- это слишком много!

// const calculated_segment3_control = segment3_start.clone().add(segment3_start.clone().sub(segment2_control));

const segment3_control = new Vector3(18.5, yStart + 2.8, -6.8); // Корректировка для плавности и формы дуги
const segment3_end = new Vector3(22, yStart + 3, 0);
this.bezierSegments.push(new QuadraticBezierCurve3(segment3_start, segment3_control, segment3_end));

// --- Сегмент 4: Пролет над камерой с небольшим снижением ---
const segment4_start = segment3_end; // (22, 3, 0)

const segment4_control = new Vector3(
    segment4_start.x + (segment4_start.x - segment3_control.x), // 22 + (22-18.5) = 25.5
    segment4_start.y + (segment4_start.y - segment3_control.y), // 3 + (3-2.8) = 3.2
    segment4_start.z + (segment4_start.z - segment3_control.z)  // 0 + (0-(-6.8)) = 6.8
);

const segment4_end = new Vector3(0, yStart + 1, 0); // Пролет над начальной точкой (X=0)
this.bezierSegments.push(new QuadraticBezierCurve3(segment4_start, segment4_control, segment4_end));

// --- Сегмент 5: Финальный подъем "в камеру" и удаление ---
const segment5_start = segment4_end; // (0, 1, 0)

const segment5_control = new Vector3(
    segment5_start.x + (segment5_start.x - segment4_control.x), // 0 + (0-25.5) = -25.5
    segment5_start.y + (segment5_start.y - segment4_control.y), // 1 + (1-3.2) = -1.2
    segment5_start.z + (segment5_start.z - segment4_control.z)  // 0 + (0-6.8) = -6.8
);
// Это будет симметричная контрольная точка. Она создает "отскок" по Y и Z, который может быть нежелателен.

// Для финального подъема "в камеру и вверх", нам нужно, чтобы control_point_5
// "тянула" кривую вверх и в отрицательное X (назад).
// Старые: new Vector3(-7.5, yStart + 4, 0);
// const segment5_control_adjusted = new Vector3(-7.5, yStart + 4, 0); // Сохраняем логику подъема и движения назад
// Мы жертвуем строгой математической G1 непрерывностью ради желаемой формы для последнего сегмента,
// так как это конец пути и он должен выглядеть динамично.
// Если же нужна строгая G1, то придется корректировать и Segment 4 control.

const segment5_end = new Vector3(-20, yStart + 6, 0); 
this.bezierSegments.push(new QuadraticBezierCurve3(segment5_start, segment5_control, segment5_end));
*/

// // --- Сегмент 1: Начальный разгон по прямой (или с очень плавным входом в поворот) ---
// // Мы зададим startPoint и endPoint для первого сегмента.
// // controlPoint1 будет рассчитана, чтобы быть на одной линии с endPoint1 и controlPoint2.
// const segment1_start = new Vector3(0, yStart, 0); 
// const segment1_end = new Vector3(8, yStart, 0); // <-- Новая точка: конец прямого участка и начало изгиба

// // --- Сегмент 2: Отрыв от земли и начало подъема с плавным поворотом влево ---
// const segment2_start = segment1_end; // (8, 0, 0) - Это точка сочленения P

// // Теперь давайте рассчитаем segment2_control, чтобы она задавала направление начала изгиба.
// // Эта точка будет диктовать начальную касательную для изгиба вверх и влево.
// // Мы хотим, чтобы она "тянула" кривую вверх и влево сразу после (8,0,0).
// const segment2_control = new Vector3(
//     segment2_start.x + 3, // Немного вперед от точки сочленения
//     yStart + 1.0,         // Значительный подъем сразу
//     -4                    // Активный поворот влево сразу
// ); 
// // Итого: примерно (11, 1.0, -4)

// // Теперь, зная segment2_start (P) и segment2_control (C2),
// // мы можем вычислить segment1_control (C1) для G1 непрерывности:
// // P = C1 + t * (C2 - C1)
// // Если P - середина C1C2 (что обеспечивает самую плавную G1 непрерывность): C1 = P * 2 - C2
// const calculated_segment1_control = segment2_start.clone().multiplyScalar(2).sub(segment2_control);
// // calculated_segment1_control будет примерно:
// // (8*2 - 11, 0*2 - 1.0, 0*2 - (-4)) = (16 - 11, -1.0, 4) = (5, -1.0, 4)
// // Это гарантирует, что segment1_control, segment1_end, segment2_control будут на одной линии.

// // Добавляем сегмент 1 с рассчитанным control_point_1
// this.bezierSegments.push(new QuadraticBezierCurve3(segment1_start, calculated_segment1_control, segment1_end));
// // И добавляем сегмент 2
// const segment2_end = new Vector3(15, yStart + 2, -6);
// this.bezierSegments.push(new QuadraticBezierCurve3(segment2_start, segment2_control, segment2_end));

// // --- Сегмент 3: Полет по дуге, выравнивание и возврат Z к 0 ---
// const segment3_start = segment2_end; 
// // Расчет control_point_3 для плавности на стыке Segment 2 и Segment 3 (G1 непрерывность):
// const segment3_control = segment3_start.clone().add(segment3_start.clone().sub(segment2_control));
// // Корректируем, чтобы лучше формировала арку
// segment3_control.y += 1.5; 
// segment3_control.z += 0.5; 

// const segment3_end = new Vector3(22, yStart + 3, 0); 
// this.bezierSegments.push(new QuadraticBezierCurve3(segment3_start, segment3_control, segment3_end));

// // --- Сегмент 4: Пролет над камерой с небольшим снижением ---
// const segment4_start = segment3_end; 
// // Расчет control_point_4 для плавности на стыке Segment 3 и Segment 4:
// const segment4_control = segment4_start.clone().add(segment4_start.clone().sub(segment3_control));
// // Корректируем
// segment4_control.y -= 1.0; 

// const segment4_end = new Vector3(0, yStart + 1, 0); 
// this.bezierSegments.push(new QuadraticBezierCurve3(segment4_start, segment4_control, segment4_end));

// // --- Сегмент 5: Финальный подъем "в камеру" и удаление ---
// const segment5_start = segment4_end; 
// // Расчет control_point_5 для плавности на стыке Segment 4 и Segment 5:
// const segment5_control = segment5_start.clone().add(segment5_start.clone().sub(segment4_control));
// // Корректируем для финального подъема
// segment5_control.x -= 7.5; 
// segment5_control.y += 3.0; 

// const segment5_end = new Vector3(-20, yStart + 6, 0); 
// this.bezierSegments.push(new QuadraticBezierCurve3(segment5_start, segment5_control, segment5_end));

const segment1_start = new Vector3(0, yStart, 0);
const segment1_control = new Vector3(6.5, yStart, 0.1);
const segment1_end = new Vector3(8, yStart, -0.5);
this.bezierSegments.push(new QuadraticBezierCurve3(segment1_start, segment1_control, segment1_end));
const segment2_start = segment1_end; 
const segment2_control = new Vector3(23, yStart + 1, -4.5)
const segment2_end = new Vector3(25, yStart + 2, -3);
this.bezierSegments.push(new QuadraticBezierCurve3(segment2_start, segment2_control, segment2_end));
const segment3_start = segment2_end; 
const segment3_control = new Vector3(27, yStart + 2.4, -2.5); // Корректировка для плавности и формы дуги
const segment3_end = new Vector3(22, yStart + 3, 0.2);
this.bezierSegments.push(new QuadraticBezierCurve3(segment3_start, segment3_control, segment3_end));

const segment4_start = segment3_end; 
const segment4_control = new Vector3(20, yStart + 1.5, -0.1); // Тянем кривую вниз, сохраняя Z=0
const segment4_end = new Vector3(0, yStart + 1, 0); // Пролет над начальной точкой (X=0)
this.bezierSegments.push(new QuadraticBezierCurve3(segment4_start, segment4_control, segment4_end));
const segment5_start = segment4_end; 
const segment5_control = new Vector3(-3, yStart + 0.5, 0.1); // Тянем вверх и "назад" по X
const segment5_end = new Vector3(-20, yStart + 4, 0); // Окончательное удаление
this.bezierSegments.push(new QuadraticBezierCurve3(segment5_start, segment5_control, segment5_end));




this.path = new CurvePath();
this.bezierSegments.forEach(segment => {
    this.path.add(segment);
});


    // this.curve = new QuadraticBezierCurve3(startPoint, controlPoint, endPoint);
    // console.log(this.curve);
    // this.curve.tension = 0.7;
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

  createAnimation() {

    this.timeline.to(this.car.position, {y: 0, duration: 1, 
      onStart: () => {
        this.car.position.set(0,-0.5, 0);
        this.car.lookAt(new Vector3(2, -0.5, 0));
        dissolveSettings.progress = -dissolveSettings.k;
        dissolveUniformData.uFreq.value = dissolveSettings.kFreg * 2.0;
      }, 
    }, 0);

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
    },  1);

    this.timeline.to(this.step, {x: 1, duration: 8, 
      onUpdate: () => {
        // const t = this.step.x; 

        // const position = this.curve.getPoint(t); 
        // this.car.position.copy(position);

        // // const tangent = this.curve.getTangent(t);
        // // const lookAtTarget = new Vector3().addVectors(position, tangent);
        // // this.car.lookAt(lookAtTarget);
        
        // const tangent = this.curve.getTangent(t).normalize();
        // const targetQuaternion = new Quaternion();
        // targetQuaternion.setFromUnitVectors(new Vector3(0, 0, 1), tangent); 
        // // If car rotation order is YXZ, you can use:
        // // const m = new THREE.Matrix4().lookAt(position, position.clone().add(tangent), up);
        // // targetQuaternion.setFromRotationMatrix(m);

        // this.car.quaternion.slerp(targetQuaternion, 0.2);

        const t = this.step.x; // t от 0 до 1
        const position = this.path.getPoint(t); 
        this.car.position.copy(position);

        // const tangent = this.path.getTangent(t);
        // const lookAtTarget = new Vector3().addVectors(position, tangent);
        // this.car.lookAt(lookAtTarget);

        // --- Вращение с использованием slerp ---
        // 1. Получаем касательную (tangent) в текущей точке пути.
        const tangent = this.path.getTangent(t);

        // 2. Создаем матрицу ориентации, "смотрящую" вдоль касательной.
        // Используем вспомогательный вектор "вверх", чтобы правильно ориентировать объект.
        // Это более надежный способ, чем просто lookAt(position + tangent),
        // так как он учитывает "крены" объекта.
        // const m = new Matrix4();
        // m.lookAt(position, position.clone().add(tangent), this._upVector); 
        // Или, чтобы объект всегда смотрел "вперед" относительно своего локального X, 
        // а не глобального X, используем setFromMatrixAndQuaternion или что-то подобное.
        // Проще всего использовать lookAt, но с пониманием ее поведения.

        // Для корректной ориентации объекта вдоль пути, 
        // можно использовать временный объект и его lookAt, а потом slerp его кватернион
        const tempObject = new Object3D();
        tempObject.position.copy(position); // Установите временный объект в ту же позицию
        tempObject.lookAt(position.clone().add(tangent)); // Заставьте его смотреть вдоль касательной
        
        // 3. Целевой кватернион - это кватернион временного объекта
        const targetQuaternion = tempObject.quaternion;

        // 4. Плавно интерполируем текущий кватернион автомобиля к целевому.
        // Фактор slerp (например, 0.1) определяет "скорость" вращения.
        // Чем ближе к 0, тем медленнее и плавнее вращение (большая инерция).
        // Чем ближе к 1, тем быстрее и менее плавно вращение (почти как моментальный lookAt).
        // Вам нужно будет подобрать это значение.
        this.car.quaternion.slerp(targetQuaternion, 0.07); // <-- Настраиваемый параметр плавности
                                                            // Обычно это значение должно быть небольшим
                                                            // (0.05 - 0.2) для плавности.
      }
    }, 1);

    this.timeline.to(this.step, {y: 2.5, duration: 3.5, 
      onUpdate: () => {
        const t = this.step.y;
        const progress = Math.cos(t) * -dissolveSettings.k;

        dissolveSettings.progress = progress;
        dissolveUniformData.uFreq.value = Math.abs(Math.cos(t * dissolveSettings.kFreg)) * 2.0;
      },
      onStart: () => {
          this.engineMaterial.forEach((mat: Dissolve) => {
            mat.emissive.setRGB(0, 0, 0);
          }); 
      }
    }, 4);


    this.timeline.to(this.camera.position, { y: 2.5, duration: 9 }, 0);

  }
};

// export class Animation {
//     private car: Object3D;
//     private camera:  PerspectiveCamera;

//     private carRotationState: number = 0;
//     private timeline = gsap.timeline({ repeat: -1, paused: true });
//     private initialModelPosition: Vector3;
//     private initialModelRotation: Euler;
//     private initialCameraPosition: Vector3;

//     constructor(car:  Object3D, camera:  PerspectiveCamera) {
//         this.car = car;
//         this.camera = camera;
//         this.initialModelPosition = car.position.clone();
//         this.initialModelRotation = car.rotation.clone();
//         this.initialCameraPosition = camera.position.clone();
//     }

//     // public start() {
        
//     // }

//     public start() {
//         gsap.to(this.car.position, {
//             x: 50, // End position of the car on the X axis
//             y: 2,
//             duration: 5,
//             ease: "power1.inOut",
//             repeat: -1,  // Infinite repeat
//             yoyo: true,  // Reverse
//             onRepeat: () => {
//                 // Rotation of the car
//                 if (this.carRotationState === 0) {
//                 gsap.to(this.car.rotation, {
//                     y: 0, 
//                     duration: 1,
//                     ease: "power1.inOut",
//                 });
//                 this.carRotationState = 1; 
//                 } else {
//                 gsap.to(this.car.rotation, {
//                     y: Math.PI,
//                     duration: 1,
//                     ease: "power1.inOut",
//                 });
//                 this.carRotationState = 0; 
//                 }
//             }
//         });

//         // Camera animation
//         gsap.to(this.camera.position, {
//             // x: 4,  // Final position of the camera on the X axis
//             // z: 0,  // Final position of the camera on the Z axis
//             y: 2,
//             duration: 5,
//             ease: "power1.inOut",
//             onUpdate: () => {
//                 this.camera.lookAt(this.car.position);  // The camera always looks at the car
//                 // console.log(this.camera.position.toArray(), this.camera.rotation.toArray());

//             },
//         });
//     }

//     public stop() {
//         gsap.killTweensOf(this.car.position); // Stop the car animation
//         gsap.killTweensOf(this.car.rotation); // Stop the car rotation animation
//         gsap.killTweensOf(this.camera.position); // Stop the camera animation
//     }
// }



 // private createAnimation() {

  //   const step = {
  //     x: 0,
  //     y: 0
  //   };

  //   const endPosX = 10;
  //   const endPosZ = 6;
  //   const endPosY = 0;

  //   const finalPosX = 10;
  //   const finalPosY = 2;
  //   const finalPosZ = 0;

  //   // Stage 1: Car rises up to y = 0
  //   this.timeline.to(this.car.position, { y: endPosY, duration: 1 }, 0);

  //   const obj = this.car.clone();
  //   obj.position.copy(this.car.position);
  //   obj.lookAt(-(endPosZ-1), 0, -endPosX);
  //   this.timeline.to(this.car.quaternion, { x: obj.quaternion.x, y: obj.quaternion.y, z: obj.quaternion.z, w: obj.quaternion.w, duration: 1.5 }, 1);

  //   obj.lookAt(0.01, 0, -endPosX);
  //   // this.timeline.to(this.car.quaternion, { x: obj.quaternion.x, y: obj.quaternion.y, z: obj.quaternion.z, w: obj.quaternion.w, duration: 2 }, 2);
  //   this.timeline.to(this.car.quaternion, { x: obj.quaternion.x, y: obj.quaternion.y, z: obj.quaternion.z, w: obj.quaternion.w, duration: 1.4 }, 2.5);

    
  //   // Stage 3: Arc movement
  //   // const arcDuration = 4;
  //   const arcRadius = endPosZ/2;
  //   const arcCenter = new Vector3(endPosX, endPosY, -endPosZ/2);
  //   const arcStartAngle = -Math.PI/2;
  //   const arcEndAngle = Math.PI/2;

  //   const q = new Quaternion();
  //   const e = new Euler(0, 0+0.001, 0);
  //   q.setFromEuler(e);

  //   this.timeline.to(step, {x: 1, duration: 2.8, onUpdate: () => {
  //     this.car.quaternion.slerpQuaternions(obj.quaternion, q, step.x);
  //   }}, 3.75);

  //   this.timeline.to(step, {y: 1, duration: 3, onUpdate: () => {
  //     // this.car.quaternion.slerpQuaternions(obj.quaternion, q, step.x);
  //     this.car.position.x = arcCenter.x + arcRadius * Math.cos(arcStartAngle + (arcEndAngle - arcStartAngle) * step.y);
  //     this.car.position.y = arcCenter.y + arcRadius * Math.cos(arcStartAngle + (arcEndAngle - arcStartAngle) * step.y); // Rise up to y=2
  //     this.car.position.z = arcCenter.z + arcRadius * Math.sin(arcStartAngle + (arcEndAngle - arcStartAngle) * step.y);

  //   }}, 3.8);

  //       // Stage 2: Move forward to x = 20 with a smooth shift to the left by z = 1
  //   this.timeline.to(this.car.position, { x: endPosX, z: -endPosZ, duration: 3 }, 1);

  //   // Stage 4: Move towards the camera and fly over
  //   this.timeline.to(this.car.position, { x: -finalPosX, y: finalPosY, z: finalPosZ, duration: 2 }, 6.3);

  //   // Camera rises up from y = 0.5 to y = 2
  //   this.timeline.to(this.camera.position, { y: 2, duration: 8 }, 0);
  // }