/**
 * Joint Rotation Controller Module
 * 关节旋转控制器模块
 * 
 * 使用Three.js的TransformControls实现直观的3D关节旋转控制
 * 支持鼠标拖拽旋转、旋转约束、层次结构管理等功能
 */

class JointRotationController {
    constructor(scene, camera, renderer, humanModelManager) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.humanModelManager = humanModelManager;
        
        // Transform控制器实例
        this.transformControls = null;
        
        // 当前控制的关节
        this.currentJoint = null;
        
        // 关节旋转约束配置 - 按标准骨骼层级
        this.rotationConstraints = {
            // 根关节
            'Hips': {
                x: { min: -Math.PI/4, max: Math.PI/4 },
                y: { min: -Math.PI/4, max: Math.PI/4 },
                z: { min: -Math.PI/4, max: Math.PI/4 }
            },
            // 脊椎关节
            'Spine': {
                x: { min: -Math.PI/6, max: Math.PI/6 },
                y: { min: -Math.PI/6, max: Math.PI/6 },
                z: { min: -Math.PI/6, max: Math.PI/6 }
            },
            'Spine1': {
                x: { min: -Math.PI/6, max: Math.PI/6 },
                y: { min: -Math.PI/6, max: Math.PI/6 },
                z: { min: -Math.PI/6, max: Math.PI/6 }
            },
            'Spine2': {
                x: { min: -Math.PI/6, max: Math.PI/6 },
                y: { min: -Math.PI/6, max: Math.PI/6 },
                z: { min: -Math.PI/6, max: Math.PI/6 }
            },
            // 颈部和头部
            'Neck': {
                x: { min: -Math.PI/4, max: Math.PI/4 },
                y: { min: -Math.PI/3, max: Math.PI/3 },
                z: { min: -Math.PI/4, max: Math.PI/4 }
            },
            'Head': {
                x: { min: -Math.PI/6, max: Math.PI/6 },
                y: { min: -Math.PI/4, max: Math.PI/4 },
                z: { min: -Math.PI/6, max: Math.PI/6 }
            },
            // 左肩膀和手臂
            'LeftShoulder': {
                x: { min: -Math.PI/2, max: Math.PI },
                y: { min: -Math.PI/2, max: Math.PI/2 },
                z: { min: -Math.PI/3, max: Math.PI/3 }
            },
            'LeftArm': {
                x: { min: -Math.PI/2, max: Math.PI },
                y: { min: -Math.PI/2, max: Math.PI/2 },
                z: { min: -Math.PI/3, max: Math.PI/3 }
            },
            'LeftForeArm': {
                x: { min: 0, max: Math.PI*0.8 },
                y: { min: -Math.PI/12, max: Math.PI/12 },
                z: { min: -Math.PI/12, max: Math.PI/12 }
            },
            'LeftHand': {
                x: { min: -Math.PI/4, max: Math.PI/4 },
                y: { min: -Math.PI/6, max: Math.PI/6 },
                z: { min: -Math.PI/6, max: Math.PI/6 }
            },
            // 右肩膀和手臂 (与左侧对称)
            'RightShoulder': {
                x: { min: -Math.PI/2, max: Math.PI },
                y: { min: -Math.PI/2, max: Math.PI/2 },
                z: { min: -Math.PI/3, max: Math.PI/3 }
            },
            'RightArm': {
                x: { min: -Math.PI/2, max: Math.PI },
                y: { min: -Math.PI/2, max: Math.PI/2 },
                z: { min: -Math.PI/3, max: Math.PI/3 }
            },
            'RightForeArm': {
                x: { min: 0, max: Math.PI*0.8 },
                y: { min: -Math.PI/12, max: Math.PI/12 },
                z: { min: -Math.PI/12, max: Math.PI/12 }
            },
            'RightHand': {
                x: { min: -Math.PI/4, max: Math.PI/4 },
                y: { min: -Math.PI/6, max: Math.PI/6 },
                z: { min: -Math.PI/6, max: Math.PI/6 }
            },
            // 左腿部
            'LeftUpLeg': {
                x: { min: -Math.PI/3, max: Math.PI/2 },
                y: { min: -Math.PI/6, max: Math.PI/3 },
                z: { min: -Math.PI/6, max: Math.PI/6 }
            },
            'LeftLeg': {
                x: { min: -Math.PI*0.8, max: 0 },
                y: { min: -Math.PI/24, max: Math.PI/24 },
                z: { min: -Math.PI/24, max: Math.PI/24 }
            },
            'LeftFoot': {
                x: { min: -Math.PI/4, max: Math.PI/6 },
                y: { min: -Math.PI/12, max: Math.PI/12 },
                z: { min: -Math.PI/12, max: Math.PI/12 }
            },
            // 右腿部 (与左侧对称)
            'RightUpLeg': {
                x: { min: -Math.PI/3, max: Math.PI/2 },
                y: { min: -Math.PI/3, max: Math.PI/6 },
                z: { min: -Math.PI/6, max: Math.PI/6 }
            },
            'RightLeg': {
                x: { min: -Math.PI*0.8, max: 0 },
                y: { min: -Math.PI/24, max: Math.PI/24 },
                z: { min: -Math.PI/24, max: Math.PI/24 }
            },
            'RightFoot': {
                x: { min: -Math.PI/4, max: Math.PI/6 },
                y: { min: -Math.PI/12, max: Math.PI/12 },
                z: { min: -Math.PI/12, max: Math.PI/12 }
            }
        };
        
        // 关节层次结构映射 - 按标准骨骼层级
        this.jointHierarchy = {
            // 根关节 Hips 是所有关节的起点
            'Hips': ['Spine', 'LeftUpLeg', 'RightUpLeg'],
            
            // 脊椎链
            'Spine': ['Spine1'],
            'Spine1': ['Spine2'],
            'Spine2': ['Neck', 'LeftShoulder', 'RightShoulder'],
            
            // 头颈链
            'Neck': ['Head'],
            'Head': ['HeadTop_End'],
            
            // 左臂链
            'LeftShoulder': ['LeftArm'],
            'LeftArm': ['LeftForeArm'],
            'LeftForeArm': ['LeftHand'],
            'LeftHand': ['LeftHandThumb1', 'LeftHandIndex1', 'LeftHandMiddle1', 'LeftHandRing1', 'LeftHandPinky1'],
            
            // 右臂链 (与左臂对称)
            'RightShoulder': ['RightArm'],
            'RightArm': ['RightForeArm'],
            'RightForeArm': ['RightHand'],
            'RightHand': ['RightHandThumb1', 'RightHandIndex1', 'RightHandMiddle1', 'RightHandRing1', 'RightHandPinky1'],
            
            // 左腿链
            'LeftUpLeg': ['LeftLeg'],
            'LeftLeg': ['LeftFoot'],
            'LeftFoot': ['LeftToeBase'],
            'LeftToeBase': ['LeftToe_End'],
            
            // 右腿链 (与左腿对称)
            'RightUpLeg': ['RightLeg'],
            'RightLeg': ['RightFoot'],
            'RightFoot': ['RightToeBase'],
            'RightToeBase': ['RightToe_End']
        };
        
        // 初始化Transform控制器
        this.initializeTransformControls();
        
        console.log('Joint rotation controller initialized');
    }

    /**
     * 初始化Transform控制器
     */
    initializeTransformControls() {
        // 创建TransformControls实例
        this.transformControls = new THREE.TransformControls(this.camera, this.renderer.domElement);
        
        // 设置控制器模式为旋转
        this.transformControls.setMode('rotate');
        
        // 设置控制器大小
        this.transformControls.setSize(0.8);
        
        // 设置控制器空间为局部空间
        this.transformControls.setSpace('local');
        
        // 监听控制器事件
        this.setupTransformControlsEvents();
        
        // 将控制器添加到场景中（初始时隐藏）
        this.scene.add(this.transformControls);
        this.transformControls.visible = false;
    }

    /**
     * 设置Transform控制器事件监听
     */
    setupTransformControlsEvents() {
        // 开始拖拽事件
        this.transformControls.addEventListener('dragging-changed', (event) => {
            // 拖拽时禁用相机控制器，避免冲突
            if (window.AnyposeApp && window.AnyposeApp.cameraManager && window.AnyposeApp.cameraManager.controls) {
                window.AnyposeApp.cameraManager.controls.enabled = !event.value;
                console.log('Camera controls', event.value ? 'disabled' : 'enabled', 'for transform operation');
            }
        });
        
        // 对象变换事件
        this.transformControls.addEventListener('objectChange', () => {
            if (this.currentJoint) {
                // 应用旋转约束
                this.applyRotationConstraints(this.currentJoint);
                
                // 更新子关节位置
                this.updateChildJoints(this.currentJoint);
                
                // 触发旋转变化事件
                this.onJointRotationChanged(this.currentJoint);
            }
        });
    }

    /**
     * 激活关节旋转控制
     * @param {THREE.Object3D} joint - 要控制的关节对象
     */
    activateJointControl(joint) {
        if (!joint || !joint.userData.jointName) {
            console.warn('Invalid joint object for rotation control');
            return;
        }
        
        // 设置当前控制的关节
        this.currentJoint = joint;
        
        // 将Transform控制器附加到关节
        this.transformControls.attach(joint);
        
        // 显示控制器
        this.transformControls.visible = true;
        
        // 更新关节信息显示
        this.updateJointRotationInfo(joint);
        
        console.log(`Activated rotation control for joint: ${joint.userData.jointName}`);
    }

    /**
     * 取消关节旋转控制
     */
    deactivateJointControl() {
        if (this.currentJoint) {
            console.log(`Deactivated rotation control for joint: ${this.currentJoint.userData.jointName}`);
            this.currentJoint = null;
        }
        
        // 分离Transform控制器
        this.transformControls.detach();
        
        // 隐藏控制器
        this.transformControls.visible = false;
        
        // 清除关节信息显示
        this.clearJointRotationInfo();
    }

    /**
     * 应用旋转约束
     * @param {THREE.Object3D} joint - 关节对象
     */
    applyRotationConstraints(joint) {
        const jointName = joint.userData.jointName;
        const constraints = this.rotationConstraints[jointName];
        
        if (!constraints) {
            return; // 没有约束配置的关节不限制旋转
        }
        
        // 获取当前旋转角度
        const rotation = joint.rotation;
        
        // 应用X轴约束
        if (constraints.x) {
            rotation.x = Math.max(constraints.x.min, Math.min(constraints.x.max, rotation.x));
        }
        
        // 应用Y轴约束
        if (constraints.y) {
            rotation.y = Math.max(constraints.y.min, Math.min(constraints.y.max, rotation.y));
        }
        
        // 应用Z轴约束
        if (constraints.z) {
            rotation.z = Math.max(constraints.z.min, Math.min(constraints.z.max, rotation.z));
        }
    }

    /**
     * 更新子关节位置
     * @param {THREE.Object3D} parentJoint - 父关节对象
     */
    updateChildJoints(parentJoint) {
        const jointName = parentJoint.userData.jointName;
        const childJointNames = this.jointHierarchy[jointName];
        
        if (!childJointNames || !this.humanModelManager.joints) {
            return;
        }
        
        // 更新所有子关节的位置和方向
        childJointNames.forEach(childJointName => {
            const childJoint = this.humanModelManager.joints[childJointName];
            if (childJoint) {
                // 这里可以添加更复杂的IK（反向运动学）计算
                // 目前简单地更新子关节的世界变换矩阵
                childJoint.updateMatrixWorld(true);
            }
        });
    }

    /**
     * 重置关节旋转
     * @param {string} jointName - 关节名称，如果不提供则重置当前关节
     */
    resetJointRotation(jointName = null) {
        let targetJoint = null;
        
        if (jointName) {
            targetJoint = this.humanModelManager.joints[jointName];
        } else if (this.currentJoint) {
            targetJoint = this.currentJoint;
        }
        
        if (targetJoint) {
            // 重置旋转为初始状态
            targetJoint.rotation.set(0, 0, 0);
            
            // 更新子关节
            this.updateChildJoints(targetJoint);
            
            // 更新信息显示
            if (targetJoint === this.currentJoint) {
                this.updateJointRotationInfo(targetJoint);
            }
            
            console.log(`Reset rotation for joint: ${targetJoint.userData.jointName}`);
        }
    }

    /**
     * 重置所有关节旋转
     */
    resetAllJoints() {
        if (!this.humanModelManager.joints) {
            return;
        }
        
        // 重置所有关节的旋转
        Object.values(this.humanModelManager.joints).forEach(joint => {
            joint.rotation.set(0, 0, 0);
        });
        
        // 更新当前关节信息显示
        if (this.currentJoint) {
            this.updateJointRotationInfo(this.currentJoint);
        }
        
        console.log('Reset all joint rotations');
    }

    /**
     * 设置关节旋转角度
     * @param {string} jointName - 关节名称
     * @param {Object} rotation - 旋转角度 {x, y, z}
     */
    setJointRotation(jointName, rotation) {
        const joint = this.humanModelManager.joints[jointName];
        if (!joint) {
            console.warn(`Joint not found: ${jointName}`);
            return;
        }
        
        // 设置旋转角度
        if (rotation.x !== undefined) joint.rotation.x = rotation.x;
        if (rotation.y !== undefined) joint.rotation.y = rotation.y;
        if (rotation.z !== undefined) joint.rotation.z = rotation.z;
        
        // 应用约束
        this.applyRotationConstraints(joint);
        
        // 更新子关节
        this.updateChildJoints(joint);
        
        // 如果是当前控制的关节，更新信息显示
        if (joint === this.currentJoint) {
            this.updateJointRotationInfo(joint);
        }
    }

    /**
     * 获取关节旋转角度
     * @param {string} jointName - 关节名称
     * @returns {Object} 旋转角度 {x, y, z}
     */
    getJointRotation(jointName) {
        const joint = this.humanModelManager.joints[jointName];
        if (!joint) {
            console.warn(`Joint not found: ${jointName}`);
            return null;
        }
        
        return {
            x: joint.rotation.x,
            y: joint.rotation.y,
            z: joint.rotation.z
        };
    }

    /**
     * 关节旋转变化事件回调
     * @param {THREE.Object3D} joint - 发生旋转变化的关节
     */
    onJointRotationChanged(joint) {
        // 可以在这里添加旋转变化的回调处理
        // 例如：更新UI、保存状态、触发动画等
        
        // 更新关节信息显示
        this.updateJointRotationInfo(joint);
    }

    /**
     * 更新关节旋转信息显示
     * @param {THREE.Object3D} joint - 关节对象
     */
    updateJointRotationInfo(joint) {
        const infoElement = document.getElementById('joint-info');
        if (!infoElement || !joint) {
            return;
        }
        
        const rotation = joint.rotation;
        const jointName = joint.userData.jointName;
        
        // 将弧度转换为度数显示
        const rotationDegrees = {
            x: (rotation.x * 180 / Math.PI).toFixed(1),
            y: (rotation.y * 180 / Math.PI).toFixed(1),
            z: (rotation.z * 180 / Math.PI).toFixed(1)
        };
        
        infoElement.innerHTML = `
            <h4>关节旋转控制</h4>
            <p><strong>关节:</strong> ${jointName}</p>
            <p><strong>旋转角度:</strong></p>
            <div style="margin-left: 10px;">
                <p>X轴: ${rotationDegrees.x}°</p>
                <p>Y轴: ${rotationDegrees.y}°</p>
                <p>Z轴: ${rotationDegrees.z}°</p>
            </div>
            <p><strong>操作:</strong></p>
            <div style="margin-left: 10px;">
                <p>• 拖拽彩色环进行旋转</p>
                <p>• 点击其他关节切换控制</p>
                <p>• 点击空白区域取消控制</p>
            </div>
        `;
        
        infoElement.style.display = 'block';
    }

    /**
     * 清除关节旋转信息显示
     */
    clearJointRotationInfo() {
        const infoElement = document.getElementById('joint-info');
        if (infoElement) {
            infoElement.style.display = 'none';
        }
    }

    /**
     * 获取当前控制的关节
     * @returns {THREE.Object3D|null} 当前控制的关节对象
     */
    getCurrentJoint() {
        return this.currentJoint;
    }

    /**
     * 检查是否正在控制某个关节
     * @returns {boolean} 是否正在控制关节
     */
    isControllingJoint() {
        return this.currentJoint !== null && this.transformControls.visible;
    }

    /**
     * 设置控制器可见性
     * @param {boolean} visible - 是否可见
     */
    setVisible(visible) {
        this.transformControls.visible = visible && this.currentJoint !== null;
    }

    /**
     * 销毁旋转控制器
     */
    dispose() {
        // 取消当前控制
        this.deactivateJointControl();
        
        // 从场景中移除Transform控制器
        if (this.transformControls) {
            this.scene.remove(this.transformControls);
            this.transformControls.dispose();
        }
        
        // 清理引用
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.humanModelManager = null;
        this.transformControls = null;
        this.currentJoint = null;
        
        console.log('Joint rotation controller disposed');
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JointRotationController;
} else {
    window.JointRotationController = JointRotationController;
}