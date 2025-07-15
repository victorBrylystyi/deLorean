import { gsap } from 'gsap';
import { CatmullRomCurve3, Color, Mesh, Object3D, PerspectiveCamera, Quaternion, Vector3 } from 'three';
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

  curve: CatmullRomCurve3;
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
    this.curve = new CatmullRomCurve3(this.points);
    console.log(this.curve);
    this.curve.tension = 0.7;
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

        const position = this.curve.getPoint(t); 
        this.car.position.copy(position);

        // const tangent = this.curve.getTangent(t);
        // const lookAtTarget = new Vector3().addVectors(position, tangent);
        // this.car.lookAt(lookAtTarget);
        
        const tangent = this.curve.getTangent(t).normalize();
        const targetQuaternion = new Quaternion();
        targetQuaternion.setFromUnitVectors(new Vector3(0, 0, 1), tangent); 
        // If car rotation order is YXZ, you can use:
        // const m = new THREE.Matrix4().lookAt(position, position.clone().add(tangent), up);
        // targetQuaternion.setFromRotationMatrix(m);

        this.car.quaternion.slerp(targetQuaternion, 0.2);
      }
    }, 1);

    this.timeline.to(this.step, {y: 2.5, duration: 4, 
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


    this.timeline.to(this.camera.position, { y: 2.2, duration: 8 }, 0);

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