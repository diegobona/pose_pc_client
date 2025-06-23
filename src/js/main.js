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
    
    // Mark this object as a loaded model
    group.userData.isLoadedModel = true;
    group.userData.modelName = 'default';
    
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

// Model loading functionality
function loadModel() {
    showModelSelector();
}

function showModelSelector() {
    // Remove existing dropdown if any
    $('.model-dropdown').remove();
    
    // Create dropdown container
    const dropdown = $(`
        <div class="model-dropdown">
            <div class="dropdown-overlay"></div>
            <div class="dropdown-content">
                <h3>选择人体模型</h3>
                <div class="model-list">
                    <div class="model-item" data-model="male_base.fbx">
                        <span class="model-name">男性基础模型</span>
                    </div>
                    <div class="model-item" data-model="female_base.fbx">
                        <span class="model-name">女性基础模型</span>
                    </div>
                    <div class="model-item" data-model="child_base.fbx">
                        <span class="model-name">儿童基础模型</span>
                    </div>
                    <div class="model-item" data-model="athletic_male.fbx">
                        <span class="model-name">运动男性模型</span>
                    </div>
                </div>
                <div class="dropdown-actions">
                    <button class="btn-cancel">取消</button>
                </div>
            </div>
        </div>
    `);
    
    // Add to body
    $('body').append(dropdown);
    
    // Animate in
    setTimeout(() => {
        dropdown.addClass('show');
    }, 10);
    
    // Event handlers
    dropdown.find('.dropdown-overlay, .btn-cancel').on('click', hideModelSelector);
    
    dropdown.find('.model-item').on('click', function() {
        const modelFile = $(this).data('model');
        const modelName = $(this).find('.model-name').text();
        hideModelSelector();
        loadFBXModel(modelFile, modelName);
    });
}

function hideModelSelector() {
    const dropdown = $('.model-dropdown');
    dropdown.removeClass('show');
    setTimeout(() => {
        dropdown.remove();
    }, 300);
}

function loadFBXModel(filename, displayName) {
    showLoading(`正在加载 ${displayName}...`);
    updateStatus(`Loading ${displayName}...`);
    
    // Try to load real FBX file first
    const modelPath = `/models/${filename}`;
    
    // Check if FBXLoader is available
    if (typeof THREE.FBXLoader !== 'undefined') {
        const loader = new THREE.FBXLoader();
        
        loader.load(
            modelPath,
            function(object) {
                // Success callback - real FBX file loaded
                console.log('FBX model loaded successfully:', filename);
                
                // Keep existing models, don't remove them
                // Calculate position offset for new model to avoid overlap
                const existingModels = AnyposeApp.scene.children.filter(child => 
                    child.userData && child.userData.isLoadedModel
                );
                const offsetX = existingModels.length * 3; // 3 units spacing between models
                
                // Configure the loaded model
                console.log('FBX model bounds:', object);
                console.log('FBX model children count:', object.children.length);
                
                // Calculate model bounds to determine appropriate scale
                const box = new THREE.Box3().setFromObject(object);
                const size = box.getSize(new THREE.Vector3());
                console.log('Model size:', size);
                
                // Scale model to reasonable size (target height ~2 units)
                const targetHeight = 2;
                const currentHeight = size.y;
                const scale = currentHeight > 0 ? targetHeight / currentHeight : 1;
                object.scale.setScalar(scale);
                
                // Position the model with offset to avoid overlap
                const center = box.getCenter(new THREE.Vector3());
                object.position.set(
                    offsetX - center.x * scale, 
                    -center.y * scale, 
                    -center.z * scale
                );
                
                // Mark this object as a loaded model
                object.userData.isLoadedModel = true;
                object.userData.modelName = filename;
                
                console.log('Applied scale:', scale, 'Position:', object.position);
                
                // Enable shadows for all meshes
                object.traverse(function(child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Ensure materials are properly configured
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat.map) mat.map.flipY = false;
                                });
                            } else {
                                if (child.material.map) child.material.map.flipY = false;
                            }
                        }
                    }
                });
                
                // Add to scene (keep reference to last loaded model)
                AnyposeApp.model = object;
                AnyposeApp.scene.add(object);
                
                // Add joint controls to the FBX model
                addJointsToFBXModel(object);
                
                console.log(`Model ${filename} positioned at:`, object.position);
                
                hideLoading();
                updateStatus(`${displayName} 加载完成`);
                
                // Reset camera to show the new model
                if (AnyposeApp.cameraManager) {
                    AnyposeApp.cameraManager.reset();
                }
            },
            function(progress) {
                // Progress callback
                const percentComplete = (progress.loaded / progress.total) * 100;
                updateStatus(`Loading ${displayName}... ${Math.round(percentComplete)}%`);
            },
            function(error) {
                // Error callback - fallback to placeholder model
                console.warn('Failed to load FBX file, using placeholder:', error);
                loadPlaceholderModel(filename, displayName);
            }
        );
    } else {
        // FBXLoader not available, load placeholder
        console.warn('FBXLoader not available, using placeholder model');
        loadPlaceholderModel(filename, displayName);
    }
}

function loadPlaceholderModel(filename, displayName) {
    // Keep existing models, don't remove them
    // Calculate position offset for new model to avoid overlap
    const existingModels = AnyposeApp.scene.children.filter(child => 
        child.userData && child.userData.isLoadedModel
    );
    const offsetX = existingModels.length * 3; // 3 units spacing between models
    
    // Create a different colored model to simulate different models
    const colors = {
        'male_base.fbx': { body: 0x3498db, head: 0xe74c3c },
        'female_base.fbx': { body: 0xe91e63, head: 0xffc107 },
        'child_base.fbx': { body: 0x4caf50, head: 0xff9800 },
        'athletic_male.fbx': { body: 0x9c27b0, head: 0x607d8b }
    };
    
    const modelColors = colors[filename] || { body: 0x8e44ad, head: 0xe74c3c };
    
    // Create model with different colors
    const group = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(1, 2, 0.5);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: modelColors.body });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: modelColors.head });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.5;
    head.castShadow = true;
    group.add(head);
    
    // Arms
    const armGeometry = new THREE.BoxGeometry(0.3, 1.5, 0.3);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x95a5a6 });
    
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
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x34495e });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, -0.9, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, -0.9, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);
    
    // Position the placeholder model with offset
    group.position.x = offsetX;
    
    // Mark this object as a loaded model
    group.userData.isLoadedModel = true;
    group.userData.modelName = filename;
    
    AnyposeApp.model = group;
    AnyposeApp.scene.add(group);
    
    console.log(`Placeholder model ${filename} positioned at:`, group.position);
    
    hideLoading();
    updateStatus(`${displayName} 加载完成 (占位模型)`);
    
    // Reset camera to show the new model
    if (AnyposeApp.cameraManager) {
        AnyposeApp.cameraManager.reset();
    }
}

function savePose() {
    updateStatus('Save pose feature coming soon...');
}

/**
 * 为FBX模型添加关节控制点
 * @param {THREE.Object3D} fbxModel - 加载的FBX模型
 */
function addJointsToFBXModel(fbxModel) {
    console.log('Adding joints to FBX model...');
    
    // 查找FBX模型中的骨骼
    let skeleton = null;
    let skinnedMesh = null;
    
    fbxModel.traverse((child) => {
        if (child.isSkinnedMesh && child.skeleton) {
            skinnedMesh = child;
            skeleton = child.skeleton;
            console.log('Found skeleton with', skeleton.bones.length, 'bones');
            return;
        }
    });
    
    if (!skeleton || !skeleton.bones || skeleton.bones.length === 0) {
        console.warn('No skeleton found in FBX model, cannot add joints');
        return;
    }
    
    // 创建关节控制点组
    const jointsGroup = new THREE.Group();
    jointsGroup.name = 'FBXJoints';
    jointsGroup.userData = {
        type: 'jointControls',
        modelName: fbxModel.userData.modelName
    };
    
    // 关节材质
    const jointMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.9,
        depthTest: false
    });
    
    const selectedJointMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.95,
        depthTest: false
    });
    
    // 为每个骨骼创建关节控制点
    skeleton.bones.forEach((bone, index) => {
        // 创建关节球体
        const jointGeometry = new THREE.SphereGeometry(3, 8, 8);
        const joint = new THREE.Mesh(jointGeometry, jointMaterial.clone());
        
        // 获取骨骼的世界位置
        const worldPosition = new THREE.Vector3();
        bone.getWorldPosition(worldPosition);
        
        // 将世界位置转换为FBX模型的本地坐标
        const localPosition = fbxModel.worldToLocal(worldPosition.clone());
        joint.position.copy(localPosition);
        
        // 设置关节属性
        joint.name = `joint_${bone.name || `bone_${index}`}`;
        joint.userData = {
            type: 'joint',
            jointName: bone.name || `bone_${index}`,
            boneIndex: index,
            bone: bone,
            originalColor: jointMaterial.color.clone(),
            selectedMaterial: selectedJointMaterial
        };
        
        // 关节不投射阴影，但可以接收阴影
        joint.castShadow = false;
        joint.receiveShadow = true;
        joint.renderOrder = 999;
        
        jointsGroup.add(joint);
        
        console.log(`Created joint for bone: ${bone.name || `bone_${index}`} at position:`, localPosition);
    });
    
    // 将关节组添加到FBX模型
    fbxModel.add(jointsGroup);
    
    // 存储关节信息到模型的userData中
    fbxModel.userData.joints = jointsGroup;
    fbxModel.userData.skeleton = skeleton;
    
    console.log(`Successfully added ${skeleton.bones.length} joints to FBX model`);
    
    // 显示关节控制点
    setFBXJointsVisible(fbxModel, true);
}

/**
 * 显示/隐藏FBX模型的关节控制点
 * @param {THREE.Object3D} fbxModel - FBX模型
 * @param {boolean} visible - 是否显示
 */
function setFBXJointsVisible(fbxModel, visible) {
    if (fbxModel.userData.joints) {
        fbxModel.userData.joints.visible = visible;
        console.log(`FBX joints visibility set to: ${visible}`);
    }
}

/**
 * 获取FBX模型的所有关节
 * @param {THREE.Object3D} fbxModel - FBX模型
 * @returns {Array} 关节数组
 */
function getFBXJoints(fbxModel) {
    if (fbxModel.userData.joints) {
        return fbxModel.userData.joints.children;
    }
    return [];
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