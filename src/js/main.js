/**
 * Anypose - 3D Pose Reference Tool
 * Main Application Entry Point
 */

// Global application state
window.AnyposeApp = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    model: null,
    mixer: null,
    clock: new THREE.Clock(),
    isLoading: false,
    currentPose: null,
    humanModelManager: null,
    interactionController: null
};

// Initialize application when DOM is ready
$(document).ready(function() {
    console.log('Anypose App Starting...');
    
    // Show loading state
    showLoading('Initializing 3D Engine...');
    
    // Wait for all dependencies to be loaded
    function waitForDependencies() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            function checkDependencies() {
                attempts++;
                
                if (typeof THREE !== 'undefined' && 
                    typeof SceneManager !== 'undefined' && 
                    typeof CameraManager !== 'undefined') {
                    console.log('All dependencies loaded successfully');
                    resolve();
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    const missing = [];
                    if (typeof THREE === 'undefined') missing.push('THREE.js');
                    if (typeof SceneManager === 'undefined') missing.push('SceneManager');
                    if (typeof CameraManager === 'undefined') missing.push('CameraManager');
                    
                    reject(new Error(`Missing dependencies: ${missing.join(', ')}`));
                    return;
                }
                
                setTimeout(checkDependencies, 100);
            }
            
            checkDependencies();
        });
    }
    
    // Initialize after dependencies are ready
    waitForDependencies().then(() => {
        try {
            initializeRenderer();
            initializeScene();
            initializeCamera();
            initializeLighting();
            initializeControls();
            initializeUI();
            
            // Initialize human model manager
            AnyposeApp.humanModelManager = new HumanModelManager(AnyposeApp.scene);
            AnyposeApp.humanModelManager.createHumanModel();
            console.log('Human model manager initialized');
            
            // Initialize interaction controller
            AnyposeApp.interactionController = new InteractionController(
                AnyposeApp.camera,
                AnyposeApp.renderer,
                AnyposeApp.humanModelManager
            );
            console.log('Interaction controller initialized');
            
            // Load default model
            loadDefaultModel();
            
            // Start render loop
            animate();
            
            hideLoading();
            updateStatus('Ready - Load a model to begin');
            
            console.log('Anypose App initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize Anypose App:', error);
            updateStatus(`Error: ${error.message}`);
            hideLoading();
        }
    }).catch(error => {
        console.error('Failed to load dependencies:', error);
        updateStatus(`Error: ${error.message}`);
        hideLoading();
    });
});

/**
 * Initialize Three.js scene
 */
function initializeScene() {
    console.log('Initializing scene...');
    
    // Create scene manager and initialize
    AnyposeApp.sceneManager = new SceneManager();
    AnyposeApp.scene = AnyposeApp.sceneManager.initialize();
    
    console.log('Scene initialized');
}

/**
 * Initialize camera
 */
function initializeCamera() {
    console.log('Initializing camera...');
    
    const container = document.getElementById('canvas-container');
    
    // Create camera manager and initialize
    AnyposeApp.cameraManager = new CameraManager(AnyposeApp.renderer);
    AnyposeApp.camera = AnyposeApp.cameraManager.initialize(container);
    
    console.log('Camera initialized');
}

/**
 * Initialize renderer
 */
function initializeRenderer() {
    const canvas = document.getElementById('three-canvas');
    const container = $('#canvas-container');
    
    AnyposeApp.renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    });
    
    AnyposeApp.renderer.setSize(container.width(), container.height());
    AnyposeApp.renderer.setPixelRatio(window.devicePixelRatio);
    AnyposeApp.renderer.shadowMap.enabled = true;
    AnyposeApp.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    AnyposeApp.renderer.outputColorSpace = THREE.SRGBColorSpace;
}

/**
 * Initialize lighting
 */
function initializeLighting() {
    console.log('Setting up lighting...');
    
    // Lighting is now handled by SceneManager
    // Get reference to main light for UI controls
    AnyposeApp.mainLight = AnyposeApp.sceneManager.getLight('directional');
    
    console.log('Lighting setup complete');
}

/**
 * Initialize controls
 */
function initializeControls() {
    console.log('Setting up controls...');
    
    // Controls are now handled by CameraManager
    // No additional setup needed
    
    console.log('Controls initialized');
}

/**
 * Initialize UI event handlers
 */
function initializeUI() {
    // Toolbar buttons
    $('#load-model-btn').on('click', loadModel);
    $('#save-pose-btn').on('click', savePose);
    $('#load-pose-btn').on('click', loadPose);
    $('#export-btn').on('click', exportModel);
    
    // Camera controls
    $('#reset-camera').on('click', resetCamera);
    $('#zoom-slider').on('input', function() {
        const zoom = parseFloat($(this).val());
        AnyposeApp.camera.position.normalize().multiplyScalar(10 / zoom);
    });
    
    // Lighting controls
    $('#light-intensity').on('input', function() {
        const intensity = parseFloat($(this).val());
        if (AnyposeApp.sceneManager) {
            AnyposeApp.sceneManager.updateLighting('directional', 'intensity', intensity);
        }
    });
    
    $('#light-x').on('input', function() {
        const x = parseFloat($(this).val());
        if (AnyposeApp.sceneManager && AnyposeApp.mainLight) {
            const currentPos = AnyposeApp.mainLight.position;
            AnyposeApp.sceneManager.updateLighting('directional', 'position', {
                x: x, y: currentPos.y, z: currentPos.z
            });
        }
    });
    
    $('#light-y').on('input', function() {
        const y = parseFloat($(this).val());
        if (AnyposeApp.sceneManager && AnyposeApp.mainLight) {
            const currentPos = AnyposeApp.mainLight.position;
            AnyposeApp.sceneManager.updateLighting('directional', 'position', {
                x: currentPos.x, y: y, z: currentPos.z
            });
        }
    });
    
    // Camera preset buttons
    $('.preset-btn').on('click', function() {
        const preset = $(this).data('preset');
        if (AnyposeApp.cameraManager) {
            AnyposeApp.cameraManager.setPresetView(preset, true);
            updateStatus(`Camera view: ${preset}`);
        }
    });
    
    // Scene controls
    $('#show-grid').on('change', function() {
        const visible = $(this).is(':checked');
        if (AnyposeApp.sceneManager) {
            AnyposeApp.sceneManager.toggleHelper('grid', visible);
        }
    });
    
    $('#show-axes').on('change', function() {
        const visible = $(this).is(':checked');
        if (AnyposeApp.sceneManager) {
            AnyposeApp.sceneManager.toggleHelper('axes', visible);
        }
    });
    
    $('#background-select').on('change', function() {
        const color = parseInt($(this).val());
        if (AnyposeApp.sceneManager) {
            AnyposeApp.sceneManager.setBackground(color);
            updateStatus('Background changed');
        }
    });
    
    // Pose library buttons
    $('.pose-btn').on('click', function() {
        const pose = $(this).data('pose');
        applyPose(pose);
    });
    
    // Window resize handler
    $(window).on('resize', onWindowResize);
}

/**
 * Load default model (simple cube for now)
 */
function loadDefaultModel() {
    // Create a simple humanoid figure using basic geometries
    const group = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(1, 2, 0.5);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8e44ad });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.5;
    head.castShadow = true;
    group.add(head);
    
    // Arms
    const armGeometry = new THREE.BoxGeometry(0.3, 1.5, 0.3);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x3498db });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, 1.2, 0);
    leftArm.castShadow = true;
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, 1.2, 0);
    rightArm.castShadow = true;
    group.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.4, 1.8, 0.4);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x2ecc71 });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, -0.9, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, -0.9, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);
    
    // Ground plane is now added by SceneManager
    
    AnyposeApp.model = group;
    AnyposeApp.scene.add(group);
    
    updateStatus('Default model loaded');
}

/**
 * Main animation loop
 */
function animate() {
    requestAnimationFrame(animate);
    
    const delta = AnyposeApp.clock.getDelta();
    
    // Update camera controls
    if (AnyposeApp.cameraManager) {
        AnyposeApp.cameraManager.update();
    }
    
    // Update animations
    if (AnyposeApp.mixer) {
        AnyposeApp.mixer.update(delta);
    }
    
    // Render scene
    AnyposeApp.renderer.render(AnyposeApp.scene, AnyposeApp.camera);
    
    // Update FPS counter
    updateFPS();
}

/**
 * Utility functions
 */
function showLoading(message = 'Loading...') {
    if ($('.loading').length === 0) {
        $('body').append(`<div class="loading">${message}</div>`);
    } else {
        $('.loading').text(message);
    }
    AnyposeApp.isLoading = true;
}

function hideLoading() {
    $('.loading').remove();
    AnyposeApp.isLoading = false;
}

function updateStatus(message) {
    $('#status-text').text(message);
}

function updateFPS() {
    // Simple FPS calculation
    const fps = Math.round(1 / AnyposeApp.clock.getDelta());
    $('#fps-counter').text(`FPS: ${fps}`);
}

function onWindowResize() {
    if (AnyposeApp.cameraManager) {
        AnyposeApp.cameraManager.onWindowResize();
    }
}

function resetCamera() {
    if (AnyposeApp.cameraManager) {
        AnyposeApp.cameraManager.reset();
        updateStatus('Camera reset');
    }
}

// Placeholder functions for future implementation
function loadModel() {
    updateStatus('Load model feature coming soon...');
}

function savePose() {
    updateStatus('Save pose feature coming soon...');
}

function loadPose() {
    updateStatus('Load pose feature coming soon...');
}

function exportModel() {
    updateStatus('Export feature coming soon...');
}

function applyPose(poseName) {
    updateStatus(`Applied pose: ${poseName}`);
    // Pose application logic will be implemented here
}

// Export for global access
window.AnyposeApp = AnyposeApp;