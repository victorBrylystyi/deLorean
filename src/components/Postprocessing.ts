import { Camera, Scene, WebGLRenderer } from "three";
import { EffectComposer } from "three/examples/jsm/Addons";


export class Postprocessing {
    renderer: WebGLRenderer;
    scene: Scene;
    camera: Camera;
    composer1: EffectComposer;
    composer2: EffectComposer;


    constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.composer1 = new EffectComposer(this.renderer);
        this.composer2 = new EffectComposer(this.renderer);

    }

    render() {

    }
}