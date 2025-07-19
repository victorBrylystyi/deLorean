import { gsap } from 'gsap';
import { CatmullRomCurve3, Color, CubicBezierCurve3, CurvePath, Line, Mesh, Object3D, PerspectiveCamera, QuadraticBezierCurve3, Vector3 } from 'three';
import { dissolveSettings, dissolveUniformData } from '../helpers/constants';
import { Dissolve } from './Dissolve';

const yStart = 0;
const startColor = new Color(0, 0, 0);





export class Animation {
  private car: Object3D;
  private camera: PerspectiveCamera;
  private timeline: gsap.core.Timeline;

// points = [
//     new Vector3(0, yStart, 0),     
//     new Vector3(5, yStart, 0),       

//     new Vector3(10, yStart, -2), 
//     new Vector3(20, yStart, -4),   

//     new Vector3(21, yStart + 1, -3),   
//     new Vector3(22, yStart + 2, -2),   
//     new Vector3(23, yStart + 3, -1),    
//     new Vector3(24, yStart + 4, 0),


//     new Vector3(15, yStart + 0.5, 0),  // Flyby, slightly lower than the previous point
//     // new Vector3(5, yStart + 0.8, 0),   // Added: Smoother lead-in to final departure
//     new Vector3(-4, yStart + 1, 0),    // Departure, lifts slightly for smoothness
//     new Vector3(-8, yStart + 3, 0),    // Final departure (maintains height)
//     new Vector3(-15, yStart + 4, 0),   // Final departure (maintains height)
// ];

// Vector3(z, y, x)
// from https://threejs.org/examples/#webgl_geometry_spline_editor
  editorPoints: Vector3[] = [
    new Vector3(0, -181, 0),
    new Vector3(-9.255922367393794, -178.5196865774753, -118.17890548143589),
    new Vector3(-66.53357616641155, -160.65123379495873, -436.9631271510253),
    new Vector3(-3.826958639067712, -117.12688716855976, -464.28841371646547),
    new Vector3(7.721903808554387, -161.4928718158995, -223.380277868082),
    new Vector3(1.8740014655876482, -179.97564915387775, -47.026429884388946),
    new Vector3(-1.170724070320432, -136.12570024616315, 127.42946899071606)
  ];
  points: Vector3[] = [];
  curve!: CatmullRomCurve3;
  curveMesh!: Line;

  public bezierSegments: (CubicBezierCurve3 | QuadraticBezierCurve3)[] = [];
  public path!: CurvePath<Vector3>;

  private step = {
    x: 0,
    y: 0,
    z: -0.5,
    a: 0
  };

  private engineMaterial: Dissolve[] = [];

  constructor(car: Object3D, camera: PerspectiveCamera) {
    this.car = car;
    this.camera = camera;

    this.editorPoints.forEach((point: Vector3) => {
      const {x, y, z} = point;

      this.points.push(new Vector3(
        -z/10, 
        (181 + y)/10, 
        x/10,
      ));
    });

    this.curve = new CatmullRomCurve3(this.points, false, 'centripetal', 0.58);

    this.timeline = gsap.timeline({ repeat: -1, defaults: {
      ease: "power2.inOut",
      yoyo: true 
    }});


    
    const segment1_start = new Vector3(0, yStart, 0);
    const segment1_control = new Vector3(6.5, yStart-0.1, 0);
    const segment1_end = new Vector3(8, yStart, -0.5);
    this.bezierSegments.push(new QuadraticBezierCurve3(segment1_start, segment1_control, segment1_end)); // linear segment

    // const segment2_start = segment1_end; 
    // const segment2_control = new Vector3(23, yStart + 1, -4.5)
    // const segment2_end = new Vector3(25, yStart + 2, -3);
    // this.bezierSegments.push(new QuadraticBezierCurve3(segment2_start, segment2_control, segment2_end));

    // --- Segment 2: Ascent and first curve ---
const segment2_start = segment1_end; // (8, 0, -0.5)

// Ensure G1 continuity for segment2_control relative to segment1_control and segment1_end
// C2 = P + (P - C1) where P is segment2_start, C1 is segment1_control
const baseControl2 = segment2_start.clone().add(segment2_start.clone().sub(segment1_control));

// Adjust segment2_control for the desired curve shape (ascent and turn)
const segment2_control = new Vector3(
    baseControl2.x + 12,  // Pull it forward for a longer initial curve
    yStart + 1.6,         // Active ascent
    baseControl2.z - 4    // Active turn left (negative Z)
);
// The original (23, yStart + 1, -4.5) might have been close after calculation.
// Let's use it as a guide if the calculated one is too far:
// If you want to stick closer to your original intent while maintaining G1,
// then the calculated baseControl2 must guide how you *adjust* segment2_control.
// For example, if you want (23, yStart + 1, -4.5) to be the *actual* control point:
// const segment2_control = new Vector3(23, yStart + 1, -4.5);
// Then you'd need to ensure segment1_control is set correctly for continuity.
// For now, let's stick to generating it based on G1 for smooth transition.

const segment2_end = new Vector3(25, yStart + 2, -3); // End of Segment 2 / Start of Segment 3
this.bezierSegments.push(new QuadraticBezierCurve3(segment2_start, segment2_control, segment2_end));

    // const segment3_start = segment2_end; 
    // const segment3_control = new Vector3(27, yStart + 2.5, -2.5); 
    // const segment3_end = new Vector3(24, yStart + 3, 1);
    // this.bezierSegments.push(new QuadraticBezierCurve3(segment3_start, segment3_control, segment3_end));

    // const segment4_start = segment3_end; 
    // const segment4_control = new Vector3(10, yStart + 2, 3); 
    // const segment4_end = new Vector3(0, yStart + 1, 0); 
    // this.bezierSegments.push(new QuadraticBezierCurve3(segment4_start, segment4_control, segment4_end));

    // --- Segment 3: Continuation of arc and leveling out (Focus: Smooth this segment!) ---
// const segment3_start = segment2_end; // (25, 2, -3)

// // **CALCULATE segment3_control for G1 continuity from segment2_end:**
// // C3 = P + (P - C2) where P is segment3_start, C2 is segment2_control
// const baseControl3 = segment3_start.clone().add(segment3_start.clone().sub(segment2_control));

// // **ADJUST segment3_control for desired arc shape and leveling out:**
// // We want the curve to continue rising, but start returning on Z (from -3 towards +1)
// // and flow smoothly towards segment3_end.
// const segment3_control = new Vector3(
//     baseControl3.x + 1,      // Use base X for continuity
//     baseControl3.y + 0.1, // Add a bit of vertical pull for the arc (e.g., +0.5)
//     baseControl3.z  // Pull Z towards positive to bring it back (e.g., +2.5)
// );
// // Example calculated base: (25 + (25-21.5), 2 + (2-1), -3 + (-3 - (-4.5))) = (28.5, 3, -1.5)
// // Example final adjusted: (28.5, 3.5, 1) - This makes it smoother and directs the curve.

// const segment3_end = new Vector3(24, yStart + 3, 1); // End of Segment 3 / Start of Segment 4
// this.bezierSegments.push(new QuadraticBezierCurve3(segment3_start, segment3_control, segment3_end));

const segment3_start = segment2_end; // (25, 2, -3)
const segment3_control1 = new Vector3(28, yStart + 2.3, -0.5); // Adjusted control point for smoother arc
const segment3_end = new Vector3(24, yStart + 2, 0.2); // End of Segment
this.bezierSegments.push(new QuadraticBezierCurve3(segment3_start, segment3_control1, segment3_end));

// --- Segment 4: Flyover and descent (Focus: Smooth this segment!) ---
const segment4_start = segment3_end; // (24, 3, 1)

// **CALCULATE segment4_control for G1 continuity from segment3_end:**
// C4 = P + (P - C3) where P is segment4_start, C3 is segment3_control
// const baseControl4 = segment4_start.clone().add(segment4_start.clone().sub(segment3_control1));

// **ADJUST segment4_control for desired flyover shape and descent:**
// We want the curve to go towards the camera (X=0, Z=0) while descending.
const segment4_control = new Vector3(
    // baseControl4.x - 1,  // Pull X back significantly to bring it towards the camera
    // baseControl4.y + 0, // Pull Y down for descent
    // baseControl4.z + 1.0   // Pull Z towards 0
    19.5,
    yStart + 1.5,
    0.5 + 0.2
);

// Example calculated base: (24 + (24-28.5), 3 + (3-3.5), 1 + (1-1)) = (19.5, 2.5, 1)
// Example final adjusted: (9.5, 1.0, 0)

const segment4_end = new Vector3(15, yStart + 1, 0); // End of Segment 4
this.bezierSegments.push(new QuadraticBezierCurve3(segment4_start, segment4_control, segment4_end));

    // const segment4_start = segment3_end; 
    // const segment4_control = new Vector3(27, yStart + 2.4, 2.5); 
    // const segment4_end = new Vector3(25, yStart + 2, 3);
    // this.bezierSegments.push(new QuadraticBezierCurve3(segment4_start, segment4_control, segment4_end));

    // const segment5_start = segment4_end; 
    // const segment5_control = new Vector3(-3, yStart + 1.5, 0.1); 
    // const segment5_end = new Vector3(-20, yStart + 4, 0);
    // --- Segment 5: Final ascent "into camera" and departure (Focus: Smooth this segment!) ---
const segment5_start = segment4_end; // (0, 1, 0)

// **КЛЮЧЕВОЙ РАСЧЕТ ДЛЯ G1-НЕПРЕРЫВНОСТИ НА СТЫКЕ SEGMENT 4 И SEGMENT 5:**
// C5 = P + (P - C4), где P = segment5_start, C4 = segment4_control
// const baseControl5 = segment5_start.clone().add(segment5_start.clone().sub(segment4_control));

// **КОРРЕКТИРУЕМ segment5_control для желаемого финального подъема и удаления:**
// Начинаем с baseControl5 для плавности, затем смещаем для формы.
// const segment5_control = new Vector3(
//     baseControl5.x + 16, // Тянем X назад (в отрицательное направление) для движения "в камеру"
//     baseControl5.y + 1.0, // Тянем Y значительно вверх для подъема
//     baseControl5.z + 1.8 // Небольшое смещение по Z, если нужно для формы
// );

// const segment5_control = new Vector3(
//     baseControl5.x - 7, // Тянем X назад (в отрицательное направление) для движения "в камеру"
//     baseControl5.y + 2.5, // Тянем Y значительно вверх для подъема
//     baseControl5.z + 1.2 // Небольшое смещение по Z, если нужно для формы
// );
const segment5_control = new Vector3(
    segment5_start.x - 4,   // Тянем назад по X, но не слишком далеко
    segment5_start.y - 0.6, // Тянем вверх, чтобы сформировать плавный подъем
    segment5_start.z - 0.3  // Держим близко к оси Z=0, если цель - прямое удаление
);

// Ваш оригинальный segment5_control = new Vector3(-3, yStart + 1.5, 0.1); был очень близок к этому.

const segment5_end = new Vector3(3, yStart, 0); // End of Segment 5
this.bezierSegments.push(new QuadraticBezierCurve3(segment5_start, segment5_control, segment5_end));

   // --- Segment 6: Final ascent "into camera" and departure (Focus: Smooth this segment!) ---
const segment6_start = segment5_end; // (0, 1, 0)

// **КЛЮЧЕВОЙ РАСЧЕТ ДЛЯ G1-НЕПРЕРЫВНОСТИ НА СТЫКЕ SEGMENT 4 И SEGMENT 5:**
// C5 = P + (P - C4), где P = segment5_start, C4 = segment4_control
// const baseControl6 = segment5_start.clone().add(segment5_start.clone().sub(segment4_control));

// **КОРРЕКТИРУЕМ segment5_control для желаемого финального подъема и удаления:**
// Начинаем с baseControl5 для плавности, затем смещаем для формы.
// const segment5_control = new Vector3(
//     baseControl5.x + 16, // Тянем X назад (в отрицательное направление) для движения "в камеру"
//     baseControl5.y + 1.0, // Тянем Y значительно вверх для подъема
//     baseControl5.z + 1.8 // Небольшое смещение по Z, если нужно для формы
// );

// const segment5_control = new Vector3(
//     baseControl5.x - 7, // Тянем X назад (в отрицательное направление) для движения "в камеру"
//     baseControl5.y + 2.5, // Тянем Y значительно вверх для подъема
//     baseControl5.z + 1.2 // Небольшое смещение по Z, если нужно для формы
// );
const segment6_control = new Vector3(
    segment6_start.x - 3.5,   // Тянем назад по X, но не слишком далеко
    segment6_start.y, // Тянем вверх, чтобы сформировать плавный подъем
    segment6_start.z  // Держим близко к оси Z=0, если цель - прямое удаление
);

// Ваш оригинальный segment5_control = new Vector3(-3, yStart + 1.5, 0.1); был очень близок к этому.

const segment6_end = new Vector3(-15, yStart + 3, 0); // End of Segment 5
this.bezierSegments.push(new QuadraticBezierCurve3(segment6_start, segment6_control, segment6_end));






// const segment1_start = new Vector3(0, yStart, 0);
// const segment1_control = new Vector3(10.29, yStart, 0);
// const segment1_end = new Vector3(12.83, yStart, -0.65);
// this.bezierSegments.push(new QuadraticBezierCurve3(segment1_start, segment1_control, segment1_end));

// const segment2_start = segment1_end; // (10.48, 0, -2.98)
// const segment2_control = new Vector3(24.31, yStart + 3, -4.04);
// const segment2_end = new Vector3(22.51, yStart + 3, -0.77);
// this.bezierSegments.push(new QuadraticBezierCurve3(segment2_start, segment2_control, segment2_end));

// const segment3_start = segment2_end; // (19.46, 0, -0.76)
// const segment3_control1 = new Vector3(20.96, yStart+3, 1.41);
// const segment3_end = new Vector3(14.26, yStart, 0.38);
// this.bezierSegments.push(new QuadraticBezierCurve3(segment3_start, segment3_control1, segment3_end));

// const segment4_start = segment3_end; // (19.46, 0, -0.76)
// const segment4_control1 = new Vector3(3.72, yStart, 0);
// const segment4_end = new Vector3(-10, yStart+3, 0);
// this.bezierSegments.push(new QuadraticBezierCurve3(segment4_start, segment4_control1, segment4_end));


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

        // const path = this.path;
        const path = this.curve;

        const position = path.getPoint(t); 
        this.car.position.copy(position);
        const bias = 0.1;

        const timeRotation = t + bias < 1 ? t + bias : 1; // Prevents out of bounds error

        // const tangent = this.path.getTangent(timeRotation);
        // const lookAtTarget = new Vector3().addVectors(position, tangent);
        // this.car.lookAt(lookAtTarget);

        let tangent: Vector3 = new Vector3();

        if (t > 0.12 && t < 0.7) {
          tangent.copy(path.getTangent(timeRotation));
        } else {
          tangent.copy(path.getTangent(t));
        }

        const tempObject = new Object3D();
        tempObject.position.copy(position);
        tempObject.lookAt(position.clone().add(tangent)); 
        
        const targetQuaternion = tempObject.quaternion;

        this.car.quaternion.slerp(targetQuaternion, 0.06); // (0.05 - 0.2) for smoothness

      }
    }, 1);

    this.timeline.to(this.step, {y: 2.5, duration: 5, 
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

    this.timeline.to(this.camera.position, { y: 3.4, duration: 9 }, 0);

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