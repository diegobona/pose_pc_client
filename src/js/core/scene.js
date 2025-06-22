/**
 * Scene Management Module
 * Handles Three.js scene initialization, lighting, and environment
 */

class SceneManager {
    constructor() {
        this.scene = null;
        this.lights = {
            ambient: null,
            directional: null,
            point: null,
            hemisphere: null
        };
        this.helpers = {
            grid: null,
            axes: null
        };
        this.environment = {
            background: 0x2c3e50,
            fog: null
        };
    }

    /**
     * Initialize the Three.js scene
     */
    initialize() {
        try {
            console.log('Initializing scene...');
            
            // Check if THREE.js is available
            if (typeof THREE === 'undefined') {
                throw new Error('THREE.js is not loaded');
            }
            
            // Create scene
            this.scene = new THREE.Scene();
            console.log('Scene object created');
            
            // Set up environment
            this.setupEnvironment();
            console.log('Environment setup complete');
            
            // Set up lighting
            this.setupLighting();
            console.log('Lighting setup complete');
            
            // Add helpers
            this.addHelpers();
            console.log('Helpers added');
            
            console.log('Scene initialized successfully');
            return this.scene;
        } catch (error) {
            console.error('Failed to initialize scene:', error);
            throw new Error(`SceneManager initialization failed: ${error.message}`);
        }
    }

    /**
     * Set up scene environment (background, fog, etc.)
     */
    setupEnvironment() {
        // Set background color
        this.scene.background = new THREE.Color(this.environment.background);
        
        // Add fog for depth perception
        this.environment.fog = new THREE.Fog(this.environment.background, 10, 50);
        this.scene.fog = this.environment.fog;
    }

    /**
     * Set up comprehensive lighting system
     */
    setupLighting() {
        // 1. Ambient light - provides base illumination
        this.lights.ambient = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(this.lights.ambient);
        
        // 2. Hemisphere light - simulates sky and ground lighting
        this.lights.hemisphere = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.3);
        this.lights.hemisphere.position.set(0, 20, 0);
        this.scene.add(this.lights.hemisphere);
        
        // 3. Main directional light - simulates sun
        this.lights.directional = new THREE.DirectionalLight(0xffffff, 1.2);
        this.lights.directional.position.set(5, 10, 5);
        this.lights.directional.castShadow = true;
        
        // Configure shadow properties
        this.lights.directional.shadow.mapSize.width = 2048;
        this.lights.directional.shadow.mapSize.height = 2048;
        this.lights.directional.shadow.camera.near = 0.5;
        this.lights.directional.shadow.camera.far = 50;
        this.lights.directional.shadow.camera.left = -10;
        this.lights.directional.shadow.camera.right = 10;
        this.lights.directional.shadow.camera.top = 10;
        this.lights.directional.shadow.camera.bottom = -10;
        
        this.scene.add(this.lights.directional);
        
        // 4. Fill light - reduces harsh shadows
        this.lights.point = new THREE.PointLight(0xffffff, 0.6, 100);
        this.lights.point.position.set(-5, 3, 5);
        this.scene.add(this.lights.point);
    }

    /**
     * Add visual helpers for development and reference
     */
    addHelpers() {
        // Grid helper - shows ground plane reference
        this.helpers.grid = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
        this.helpers.grid.material.opacity = 0.8;
        this.helpers.grid.material.transparent = true;
        this.scene.add(this.helpers.grid);
        
        // Axes helper - shows coordinate system
        this.helpers.axes = new THREE.AxesHelper(3);
        this.scene.add(this.helpers.axes);
    }

    /**
     * Update lighting properties
     */
    updateLighting(lightType, property, value) {
        if (!this.lights[lightType]) {
            console.warn(`Light type '${lightType}' not found`);
            return;
        }
        
        const light = this.lights[lightType];
        
        switch (property) {
            case 'intensity':
                light.intensity = value;
                break;
            case 'color':
                light.color.setHex(value);
                break;
            case 'position':
                if (typeof value === 'object' && value.x !== undefined) {
                    light.position.set(value.x, value.y, value.z);
                }
                break;
            default:
                console.warn(`Property '${property}' not supported`);
        }
    }

    /**
     * Change scene background
     */
    setBackground(color) {
        this.environment.background = color;
        this.scene.background = new THREE.Color(color);
        
        // Update fog color to match
        if (this.environment.fog) {
            this.environment.fog.color.setHex(color);
        }
    }

    /**
     * Toggle helpers visibility
     */
    toggleHelper(helperType, visible) {
        if (this.helpers[helperType]) {
            this.helpers[helperType].visible = visible;
        }
    }

    /**
     * Add ground plane
     */
    addGroundPlane() {
        const planeGeometry = new THREE.PlaneGeometry(20, 20);
        const planeMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x34495e,
            transparent: true,
            opacity: 0.8
        });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -2;
        plane.receiveShadow = true;
        plane.name = 'groundPlane';
        this.scene.add(plane);
        
        return plane;
    }

    /**
     * Get scene reference
     */
    getScene() {
        return this.scene;
    }

    /**
     * Get light reference
     */
    getLight(lightType) {
        return this.lights[lightType];
    }

    /**
     * Dispose of scene resources
     */
    dispose() {
        if (this.scene) {
            // Remove all objects and dispose geometries/materials
            while (this.scene.children.length > 0) {
                const object = this.scene.children[0];
                this.scene.remove(object);
                
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SceneManager;
} else {
    window.SceneManager = SceneManager;
}