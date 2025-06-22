/**
 * Camera Management Module
 * Handles camera initialization, controls, and view presets
 */

class CameraManager {
    constructor(renderer) {
        this.camera = null;
        this.controls = null;
        this.renderer = renderer;
        this.container = null;
        
        // Camera settings
        this.settings = {
            fov: 75,
            near: 0.1,
            far: 1000,
            position: { x: 5, y: 5, z: 5 },
            target: { x: 0, y: 0, z: 0 }
        };
        
        // View presets
        this.presets = {
            front: { position: { x: 0, y: 0, z: 8 }, target: { x: 0, y: 0, z: 0 } },
            back: { position: { x: 0, y: 0, z: -8 }, target: { x: 0, y: 0, z: 0 } },
            left: { position: { x: -8, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
            right: { position: { x: 8, y: 0, z: 0 }, target: { x: 0, y: 0, z: 0 } },
            top: { position: { x: 0, y: 8, z: 0 }, target: { x: 0, y: 0, z: 0 } },
            bottom: { position: { x: 0, y: -8, z: 0 }, target: { x: 0, y: 0, z: 0 } },
            isometric: { position: { x: 5, y: 5, z: 5 }, target: { x: 0, y: 0, z: 0 } }
        };
        
        this.isAnimating = false;
    }

    /**
     * Initialize camera and controls
     */
    initialize(container) {
        this.container = container;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        console.log('Initializing camera...');
        
        // Create perspective camera
        this.camera = new THREE.PerspectiveCamera(
            this.settings.fov,
            width / height,
            this.settings.near,
            this.settings.far
        );
        
        // Set initial position
        this.camera.position.set(
            this.settings.position.x,
            this.settings.position.y,
            this.settings.position.z
        );
        
        // Initialize controls
        this.initializeControls();
        
        console.log('Camera initialized successfully');
        return this.camera;
    }

    /**
     * Initialize camera controls
     */
    initializeControls() {
        // Manual controls implementation
        this.controls = {
            enabled: true,
            target: new THREE.Vector3(0, 0, 0),
            minDistance: 2,
            maxDistance: 50,
            enableDamping: true,
            dampingFactor: 0.05,
            enableZoom: true,
            enableRotate: true,
            enablePan: true,
            
            // Internal state
            isMouseDown: false,
            mouseButtons: { LEFT: 0, MIDDLE: 1, RIGHT: 2 },
            currentAction: null,
            lastMousePosition: { x: 0, y: 0 },
            spherical: new THREE.Spherical(),
            sphericalDelta: new THREE.Spherical(),
            panOffset: new THREE.Vector3(),
            zoomChanged: false,
            scale: 1
        };
        
        // Set up spherical coordinates from current camera position
        this.updateSphericalFromCamera();
        
        // Bind event listeners
        this.bindEvents();
    }

    /**
     * Update spherical coordinates from camera position
     */
    updateSphericalFromCamera() {
        const offset = new THREE.Vector3();
        offset.copy(this.camera.position).sub(this.controls.target);
        this.controls.spherical.setFromVector3(offset);
    }

    /**
     * Bind mouse and keyboard events
     */
    bindEvents() {
        const canvas = this.renderer.domElement;
        
        // Mouse events
        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        canvas.addEventListener('wheel', this.onMouseWheel.bind(this));
        
        // Touch events for mobile support
        canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        // Context menu disable
        canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }

    /**
     * Mouse down event handler
     */
    onMouseDown(event) {
        if (!this.controls.enabled) return;
        
        this.controls.isMouseDown = true;
        this.controls.lastMousePosition.x = event.clientX;
        this.controls.lastMousePosition.y = event.clientY;
        
        if (event.button === this.controls.mouseButtons.LEFT) {
            this.controls.currentAction = 'rotate';
        } else if (event.button === this.controls.mouseButtons.RIGHT) {
            this.controls.currentAction = 'pan';
        }
    }

    /**
     * Mouse move event handler
     */
    onMouseMove(event) {
        if (!this.controls.enabled || !this.controls.isMouseDown) return;
        
        const deltaX = event.clientX - this.controls.lastMousePosition.x;
        const deltaY = event.clientY - this.controls.lastMousePosition.y;
        
        if (this.controls.currentAction === 'rotate') {
            this.rotateCamera(deltaX, deltaY);
        } else if (this.controls.currentAction === 'pan') {
            this.panCamera(deltaX, deltaY);
        }
        
        this.controls.lastMousePosition.x = event.clientX;
        this.controls.lastMousePosition.y = event.clientY;
    }

    /**
     * Mouse up event handler
     */
    onMouseUp(event) {
        this.controls.isMouseDown = false;
        this.controls.currentAction = null;
    }

    /**
     * Mouse wheel event handler
     */
    onMouseWheel(event) {
        if (!this.controls.enabled || !this.controls.enableZoom) return;
        
        event.preventDefault();
        
        // 降低缩放灵敏度：从 1.1/0.9 改为 1.05/0.95
        const scale = event.deltaY > 0 ? 1.05 : 0.95;
        this.zoomCamera(scale);
    }

    /**
     * Rotate camera around target
     */
    rotateCamera(deltaX, deltaY) {
        if (!this.controls.enableRotate) return;
        
        const element = this.renderer.domElement;
        // 降低旋转灵敏度：从 2 * Math.PI 改为 0.8 * Math.PI
        const rotateSpeed = 0.8 * Math.PI / element.clientHeight;
        
        this.controls.sphericalDelta.theta -= deltaX * rotateSpeed;
        this.controls.sphericalDelta.phi -= deltaY * rotateSpeed;
    }

    /**
     * Pan camera
     */
    panCamera(deltaX, deltaY) {
        if (!this.controls.enablePan) return;
        
        const element = this.renderer.domElement;
        const targetDistance = this.controls.spherical.radius;
        // 降低平移灵敏度：从 2 * targetDistance 改为 0.8 * targetDistance
        const panSpeed = 0.8 * targetDistance * Math.tan((this.camera.fov / 2) * Math.PI / 180) / element.clientHeight;
        
        const panLeft = new THREE.Vector3();
        const panUp = new THREE.Vector3();
        
        // Calculate pan vectors
        panLeft.setFromMatrixColumn(this.camera.matrix, 0);
        panUp.setFromMatrixColumn(this.camera.matrix, 1);
        
        panLeft.multiplyScalar(-deltaX * panSpeed);
        panUp.multiplyScalar(deltaY * panSpeed);
        
        this.controls.panOffset.add(panLeft).add(panUp);
    }

    /**
     * Zoom camera
     */
    zoomCamera(scale) {
        this.controls.scale *= scale;
        this.controls.zoomChanged = true;
    }

    /**
     * Update camera position and controls
     */
    update() {
        if (!this.controls.enabled) return;
        
        const offset = new THREE.Vector3();
        
        // Apply spherical delta
        this.controls.spherical.theta += this.controls.sphericalDelta.theta;
        this.controls.spherical.phi += this.controls.sphericalDelta.phi;
        
        // Restrict phi to be between desired limits
        this.controls.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.controls.spherical.phi));
        
        // Apply zoom
        if (this.controls.zoomChanged) {
            this.controls.spherical.radius *= this.controls.scale;
            this.controls.spherical.radius = Math.max(this.controls.minDistance, 
                Math.min(this.controls.maxDistance, this.controls.spherical.radius));
            this.controls.scale = 1;
            this.controls.zoomChanged = false;
        }
        
        // Apply pan offset
        this.controls.target.add(this.controls.panOffset);
        
        // Convert spherical to cartesian coordinates
        offset.setFromSpherical(this.controls.spherical);
        this.camera.position.copy(this.controls.target).add(offset);
        this.camera.lookAt(this.controls.target);
        
        // Apply damping
        if (this.controls.enableDamping) {
            this.controls.sphericalDelta.theta *= (1 - this.controls.dampingFactor);
            this.controls.sphericalDelta.phi *= (1 - this.controls.dampingFactor);
            this.controls.panOffset.multiplyScalar(1 - this.controls.dampingFactor);
        } else {
            this.controls.sphericalDelta.set(0, 0, 0);
            this.controls.panOffset.set(0, 0, 0);
        }
    }

    /**
     * Set camera to preset view with animation
     */
    setPresetView(presetName, animate = true) {
        if (!this.presets[presetName]) {
            console.warn(`Camera preset '${presetName}' not found`);
            return;
        }
        
        const preset = this.presets[presetName];
        
        if (animate) {
            this.animateToPosition(preset.position, preset.target);
        } else {
            this.camera.position.set(preset.position.x, preset.position.y, preset.position.z);
            this.controls.target.set(preset.target.x, preset.target.y, preset.target.z);
            this.camera.lookAt(this.controls.target);
            this.updateSphericalFromCamera();
        }
    }

    /**
     * Animate camera to position
     */
    animateToPosition(targetPosition, targetLookAt, duration = 1000) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        const startPosition = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const endPosition = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
        const endTarget = new THREE.Vector3(targetLookAt.x, targetLookAt.y, targetLookAt.z);
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-in-out)
            const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Interpolate position and target
            this.camera.position.lerpVectors(startPosition, endPosition, eased);
            this.controls.target.lerpVectors(startTarget, endTarget, eased);
            
            this.camera.lookAt(this.controls.target);
            this.updateSphericalFromCamera();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        };
        
        animate();
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        if (!this.container || !this.camera) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Reset camera to default position
     */
    reset() {
        this.setPresetView('isometric', true);
    }

    /**
     * Touch event handlers for mobile support
     */
    onTouchStart(event) {
        if (event.touches.length === 1) {
            this.onMouseDown({
                clientX: event.touches[0].clientX,
                clientY: event.touches[0].clientY,
                button: 0
            });
        }
    }

    onTouchMove(event) {
        if (event.touches.length === 1) {
            this.onMouseMove({
                clientX: event.touches[0].clientX,
                clientY: event.touches[0].clientY
            });
        }
        event.preventDefault();
    }

    onTouchEnd(event) {
        this.onMouseUp({});
    }

    /**
     * Get camera reference
     */
    getCamera() {
        return this.camera;
    }

    /**
     * Get controls reference
     */
    getControls() {
        return this.controls;
    }

    /**
     * Dispose of camera resources
     */
    dispose() {
        // Remove event listeners
        const canvas = this.renderer.domElement;
        canvas.removeEventListener('mousedown', this.onMouseDown);
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('mouseup', this.onMouseUp);
        canvas.removeEventListener('wheel', this.onMouseWheel);
        canvas.removeEventListener('touchstart', this.onTouchStart);
        canvas.removeEventListener('touchmove', this.onTouchMove);
        canvas.removeEventListener('touchend', this.onTouchEnd);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraManager;
} else {
    window.CameraManager = CameraManager;
}