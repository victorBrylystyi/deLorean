
import { Mesh, MeshBasicMaterial, MeshDepthMaterial, Object3D, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderer, WebGLRenderTarget } from 'three';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';

export type ContactShadowsProps = {
    renderer: WebGLRenderer;
    scene: Scene;
    width?: number;
    height?: number;
};

export class ContactShadows extends Object3D {

    renderer: WebGLRenderer;
    scene: Scene;

    PLANE_WIDTH = 20;
    PLANE_HEIGHT = 20;
    CAMERA_HEIGHT = 2;

    blur = 1.5;
    darkness = 4;
    opacity = 1;

    planeOpacity = 0;
    color = '#ffffff';

    width = 1024;
    height = 1024;

    renderTarget = new WebGLRenderTarget(this.width, this.height);
    renderTargetBlur = new WebGLRenderTarget(this.width, this.height);
    horizontalBlurMaterial = new ShaderMaterial( HorizontalBlurShader );
    verticalBlurMaterial = new ShaderMaterial( VerticalBlurShader );
    depthMaterial = new MeshDepthMaterial();

    plane = new Mesh();
    blurPlane = new Mesh();
    fillPlane = new Mesh();

    shadowCamera = new OrthographicCamera( 
        - this.PLANE_WIDTH / 2, 
        this.PLANE_WIDTH / 2, 
        this.PLANE_HEIGHT / 2, 
        - this.PLANE_HEIGHT / 2, 
        0, 
        this.CAMERA_HEIGHT 
    );

    constructor(params: ContactShadowsProps) {
        super();
        this.renderer = params.renderer;
        this.width = params.width || this.width;
        this.height = params.height || this.height;
        this.scene = params.scene;

        this.init();
    }

    init() {

        const planeGeometry = new PlaneGeometry( this.PLANE_WIDTH, this.PLANE_HEIGHT ).rotateX( Math.PI / 2 );
        const planeMaterial = new MeshBasicMaterial( {
            map: this.renderTarget.texture,
            opacity: this.opacity,
            transparent: true,
            depthWrite: false,
        } );
        this.plane.geometry = planeGeometry;
        this.plane.material = planeMaterial;
        // make sure it's rendered after the fillPlane
        this.plane.renderOrder = 1;
        // the y from the texture is flipped!
        this.plane.scale.y = - 1;
        this.add( this.plane );

        // blurPlane = new THREE.Mesh( planeGeometry );
        this.blurPlane.geometry = planeGeometry;
        this.blurPlane.visible = false;
        this.add( this.blurPlane );

        const fillPlaneMaterial = new MeshBasicMaterial( {
            color: this.color,
            opacity: this.planeOpacity,
            transparent: true,
            depthWrite: false,
        } );
        // fillPlane = new THREE.Mesh( planeGeometry, fillPlaneMaterial );
        this.fillPlane.geometry = planeGeometry;
        this.fillPlane.material = fillPlaneMaterial;

        this.fillPlane.rotateX( Math.PI );
        this.add( this.fillPlane );


        this.horizontalBlurMaterial.depthTest = false;
        this.verticalBlurMaterial.depthTest = false;

        this.depthMaterial.userData.darkness = { value: this.darkness };
        this.depthMaterial.onBeforeCompile = ( shader ) => {

            shader.uniforms.darkness = this.depthMaterial.userData.darkness;
            shader.fragmentShader = /* glsl */`
                uniform float darkness;
                ${shader.fragmentShader.replace(
            'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
            'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );'
        )}
            `;
    
        };
        this.depthMaterial.depthTest = false;
        this.depthMaterial.depthWrite = false;

        this.renderTarget.texture.generateMipmaps = false;
        this.renderTargetBlur.texture.generateMipmaps = false;

        this.shadowCamera.rotation.x = Math.PI / 2; 
        this.add(this.shadowCamera); // get the camera to look up

    }

    resize() {

    }

    blurShadow( amount: number ) {
        this.blurPlane.visible = true;

        // blur horizontally and draw in the renderTargetBlur
        this.blurPlane.material = this.horizontalBlurMaterial;
        (this.blurPlane.material as ShaderMaterial).uniforms.tDiffuse.value = this.renderTarget.texture;
        this.horizontalBlurMaterial.uniforms.h.value = amount * 1 / 256;
    
        this.renderer.setRenderTarget( this.renderTargetBlur );
        this.renderer.render( this.blurPlane, this.shadowCamera );
    
        // blur vertically and draw in the main renderTarget
        this.blurPlane.material = this.verticalBlurMaterial;
        (this.blurPlane.material as ShaderMaterial).uniforms.tDiffuse.value = this.renderTargetBlur.texture;
        this.verticalBlurMaterial.uniforms.v.value = amount * 1 / 256;
    
        this.renderer.setRenderTarget( this.renderTarget );
        this.renderer.render( this.blurPlane, this.shadowCamera );
    
        this.blurPlane.visible = false;
    }

    render(opacity?: number) {
        // remove the background
        const initialBackground = this.scene.background;
        this.scene.background = null;

        if (opacity) {
            // (this.plane.material as MeshBasicMaterial).opacity = opacity;
            this.depthMaterial.userData.darkness.value = opacity * 4;
        }
        

        // force the depthMaterial to everything
        // cameraHelper.visible = false;
        this.scene.overrideMaterial = this.depthMaterial;
        // set renderer clear alpha
        const initialClearAlpha = this.renderer.getClearAlpha();
        this.renderer.setClearAlpha( 0 );

        // render to the render target to get the depths
        this.renderer.setRenderTarget( this.renderTarget );
        this.renderer.render( this.scene, this.shadowCamera );

        // and reset the override material
        this.scene.overrideMaterial = null;
        // cameraHelper.visible = true;

        this.blurShadow( this.blur );

        // a second pass to reduce the artifacts
        // (0.4 is the minimum blur amount so that the artifacts are gone)
        this.blurShadow( this.blur * 0.4 );

        // reset and render the normal scene
        this.renderer.setRenderTarget( null );
        this.renderer.setClearAlpha( initialClearAlpha );
        this.scene.background = initialBackground;
        // render main scene
    }
};