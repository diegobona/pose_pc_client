/**
 * Interaction Controller Module
 * Handles mouse interactions with human model joints and body parts
 */

class InteractionController {
    constructor(camera, renderer, humanModelManager, scene) {
        this.camera = camera;
        this.renderer = renderer;
        this.humanModelManager = humanModelManager;
        this.scene = scene;
        this.container = renderer.domElement.parentElement;
        
        // 射线投射器用于检测鼠标点击
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // 交互状态
        this.selectedJoint = null;
        this.hoveredJoint = null;
        this.isDragging = false;
        this.isEnabled = true;
        
        // 关节旋转控制器
        this.jointRotationController = null;
        
        // 初始化关节旋转控制器
        this.initializeJointRotationController();
        
        // 事件监听器
        this.eventListeners = {
            mousedown: null,
            mousemove: null,
            mouseup: null,
            click: null
        };
        
        // 初始化事件监听
        this.initializeEventListeners();
        
        console.log('Interaction controller initialized');
    }

    /**
     * 初始化关节旋转控制器
     */
    initializeJointRotationController() {
        if (this.scene && this.camera && this.renderer && this.humanModelManager) {
            this.jointRotationController = new JointRotationController(
                this.scene,
                this.camera,
                this.renderer,
                this.humanModelManager
            );
            console.log('Joint rotation controller integrated');
        } else {
            console.warn('Cannot initialize joint rotation controller: missing dependencies');
        }
    }

    /**
     * 初始化事件监听器
     */
    initializeEventListeners() {
        // 鼠标点击事件
        this.eventListeners.click = (event) => {
            if (!this.isEnabled) return;
            this.handleClick(event);
        };
        
        // 鼠标移动事件
        this.eventListeners.mousemove = (event) => {
            if (!this.isEnabled) return;
            this.handleMouseMove(event);
        };
        
        // 鼠标按下事件
        this.eventListeners.mousedown = (event) => {
            if (!this.isEnabled) return;
            this.handleMouseDown(event);
        };
        
        // 鼠标释放事件
        this.eventListeners.mouseup = (event) => {
            if (!this.isEnabled) return;
            this.handleMouseUp(event);
        };
        
        // 绑定事件
        this.container.addEventListener('click', this.eventListeners.click);
        this.container.addEventListener('mousemove', this.eventListeners.mousemove);
        this.container.addEventListener('mousedown', this.eventListeners.mousedown);
        this.container.addEventListener('mouseup', this.eventListeners.mouseup);
        
        // 防止右键菜单
        this.container.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }

    /**
     * 处理鼠标点击事件
     * @param {MouseEvent} event - 鼠标事件
     */
    handleClick(event) {
        // 更新鼠标坐标
        this.updateMousePosition(event);
        
        // 进行射线检测
        const intersects = this.performRaycast();
        
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            
            // 检查是否点击了关节
            if (clickedObject.userData.type === 'joint') {
                this.selectJoint(clickedObject);
            } else {
                // 点击了其他物体，取消选择
                this.deselectJoint();
            }
        } else {
            // 点击了空白区域，取消选择
            this.deselectJoint();
        }
    }

    /**
     * 处理鼠标移动事件
     * @param {MouseEvent} event - 鼠标事件
     */
    handleMouseMove(event) {
        // 更新鼠标坐标
        this.updateMousePosition(event);
        
        // 进行射线检测
        const intersects = this.performRaycast();
        
        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;
            
            // 检查是否悬停在关节上
            if (hoveredObject.userData.type === 'joint') {
                this.setHoveredJoint(hoveredObject);
                this.container.style.cursor = 'pointer';
            } else {
                this.clearHoveredJoint();
                this.container.style.cursor = 'default';
            }
        } else {
            this.clearHoveredJoint();
            this.container.style.cursor = 'default';
        }
    }

    /**
     * 处理鼠标按下事件
     * @param {MouseEvent} event - 鼠标事件
     */
    handleMouseDown(event) {
        if (event.button === 0 && this.selectedJoint) { // 左键
            this.isDragging = true;
            this.container.style.cursor = 'grabbing';
        }
    }

    /**
     * 处理鼠标释放事件
     * @param {MouseEvent} event - 鼠标事件
     */
    handleMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;
            this.container.style.cursor = this.hoveredJoint ? 'pointer' : 'default';
        }
    }

    /**
     * 更新鼠标位置坐标
     * @param {MouseEvent} event - 鼠标事件
     */
    updateMousePosition(event) {
        const rect = this.container.getBoundingClientRect();
        
        // 将鼠标坐标转换为标准化设备坐标 (-1 到 +1)
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * 执行射线投射检测
     * @returns {Array} 相交的物体数组
     */
    performRaycast() {
        // 设置射线投射器
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // 获取人体模型中的所有可交互对象
        const interactableObjects = [];
        
        if (this.humanModelManager.humanModel) {
            this.humanModelManager.humanModel.traverse((child) => {
                if (child.userData.type === 'joint' || child.userData.type === 'bodyPart') {
                    interactableObjects.push(child);
                }
            });
        }
        
        // 进行射线检测
        return this.raycaster.intersectObjects(interactableObjects);
    }

    /**
     * 选择关节
     * @param {THREE.Object3D} joint - 关节对象
     */
    selectJoint(joint) {
        // 取消之前的选择
        this.deselectJoint();
        
        // 设置新的选择
        this.selectedJoint = joint;
        
        // 改变关节颜色表示选中状态
        if (this.humanModelManager.materials && this.humanModelManager.materials.jointSelected) {
            joint.material = this.humanModelManager.materials.jointSelected;
        } else {
            // 如果没有专门的选中材质，创建一个高亮材质
            const selectedMaterial = this.humanModelManager.materials.joint.clone();
            selectedMaterial.color.setHex(0xff6600); // 橙色高亮
            joint.material = selectedMaterial;
        }
        
        // 激活关节旋转控制
        if (this.jointRotationController) {
            this.jointRotationController.activateJointControl(joint);
        }
        
        // 触发选择事件
        this.onJointSelected(joint.userData.jointName);
        
        console.log(`Joint selected: ${joint.userData.jointName}`);
    }

    /**
     * 取消选择关节
     */
    deselectJoint() {
        if (this.selectedJoint) {
            // 恢复原始颜色
            this.selectedJoint.material = this.humanModelManager.materials.joint;
            
            // 取消关节旋转控制
            if (this.jointRotationController) {
                this.jointRotationController.deactivateJointControl();
            }
            
            // 触发取消选择事件
            this.onJointDeselected(this.selectedJoint.userData.jointName);
            
            console.log(`Joint deselected: ${this.selectedJoint.userData.jointName}`);
            this.selectedJoint = null;
        }
    }

    /**
     * 设置悬停的关节
     * @param {THREE.Object3D} joint - 关节对象
     */
    setHoveredJoint(joint) {
        if (this.hoveredJoint !== joint) {
            // 清除之前的悬停状态
            this.clearHoveredJoint();
            
            // 设置新的悬停状态
            this.hoveredJoint = joint;
            
            // 如果不是选中的关节，使用悬停材质
            if (joint !== this.selectedJoint) {
                if (this.humanModelManager.materials && this.humanModelManager.materials.jointHover) {
                    joint.material = this.humanModelManager.materials.jointHover;
                } else {
                    // 如果没有专门的悬停材质，创建一个
                    const hoverMaterial = this.humanModelManager.materials.joint.clone();
                    hoverMaterial.color.multiplyScalar(1.3); // 稍微变亮
                    joint.material = hoverMaterial;
                }
            }
        }
    }

    /**
     * 清除悬停状态
     */
    clearHoveredJoint() {
        if (this.hoveredJoint && this.hoveredJoint !== this.selectedJoint) {
            // 恢复原始颜色
            this.hoveredJoint.material = this.humanModelManager.materials.joint;
        }
        this.hoveredJoint = null;
    }

    /**
     * 关节选择事件回调
     * @param {string} jointName - 关节名称
     */
    onJointSelected(jointName) {
        // 关节旋转控制器会处理信息显示，这里不再重复更新
        // 可以在这里添加其他选择后的操作
        // 例如：显示关节控制面板、更新属性面板等
    }

    /**
     * 关节取消选择事件回调
     * @param {string} jointName - 关节名称
     */
    onJointDeselected(jointName) {
        // 关节旋转控制器会处理信息清除，这里不再重复操作
        // 可以在这里添加其他取消选择后的操作
    }

    /**
     * 更新关节信息显示
     * @param {string} jointName - 关节名称
     */
    updateJointInfo(jointName) {
        const infoElement = document.getElementById('joint-info');
        if (infoElement) {
            infoElement.innerHTML = `
                <h4>选中关节</h4>
                <p><strong>名称:</strong> ${jointName}</p>
                <p><strong>类型:</strong> 关节控制点</p>
                <p><strong>操作:</strong> 点击其他关节或空白区域取消选择</p>
            `;
            infoElement.style.display = 'block';
        }
    }

    /**
     * 清除关节信息显示
     */
    clearJointInfo() {
        const infoElement = document.getElementById('joint-info');
        if (infoElement) {
            infoElement.style.display = 'none';
        }
    }

    /**
     * 启用/禁用交互
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (!enabled) {
            this.deselectJoint();
            this.clearHoveredJoint();
            this.container.style.cursor = 'default';
        }
    }

    /**
     * 获取当前选中的关节
     * @returns {THREE.Object3D|null} 选中的关节对象
     */
    getSelectedJoint() {
        return this.selectedJoint;
    }

    /**
     * 销毁交互控制器
     */
    dispose() {
        // 移除事件监听器
        if (this.container) {
            this.container.removeEventListener('click', this.eventListeners.click);
            this.container.removeEventListener('mousemove', this.eventListeners.mousemove);
            this.container.removeEventListener('mousedown', this.eventListeners.mousedown);
            this.container.removeEventListener('mouseup', this.eventListeners.mouseup);
        }
        
        // 清理状态
        this.deselectJoint();
        this.clearHoveredJoint();
        
        // 销毁关节旋转控制器
        if (this.jointRotationController) {
            this.jointRotationController.dispose();
            this.jointRotationController = null;
        }
        
        // 重置属性
        this.camera = null;
        this.renderer = null;
        this.humanModelManager = null;
        this.scene = null;
        this.container = null;
        
        console.log('Interaction controller disposed');
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InteractionController;
} else {
    window.InteractionController = InteractionController;
}