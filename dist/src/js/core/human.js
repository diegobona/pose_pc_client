/**
 * Human Model Management Module
 * Handles human body geometry creation, skeleton structure, and joint controls
 */

class HumanModelManager {
    constructor(scene) {
        this.scene = scene;
        this.humanModel = null;
        this.skeleton = null;
        this.joints = {};
        this.bodyParts = {};
        
        // 人体比例参数 (基于成人平均比例)
        this.proportions = {
            totalHeight: 8, // 总高度 (头部为单位)
            headHeight: 1,
            torsoHeight: 3,
            armLength: 2.5,
            legLength: 4,
            shoulderWidth: 2,
            hipWidth: 1.5
        };
        
        // 材质配置
        this.materials = {
            body: null,
            joint: null,
            selected: null
        };
        
        // 交互状态
        this.selectedJoint = null;
        this.isInteracting = false;
        
        this.initializeMaterials();
    }

    /**
     * 初始化材质
     */
    initializeMaterials() {
        // 身体材质 - 肤色
        this.materials.body = new THREE.MeshLambertMaterial({
            color: 0xffdbac,
            transparent: true,
            opacity: 0.9
        });
        
        // 关节材质 - 红色球体
        this.materials.joint = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.9,
            depthTest: false  // 禁用深度测试，确保始终可见
        });
        
        // 选中状态材质 - 亮黄色
        this.materials.selected = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.95,
            depthTest: false  // 禁用深度测试，确保始终可见
        });
    }

    /**
     * 创建基础人体模型
     */
    createHumanModel() {
        console.log('Creating basic human model...');
        
        // 创建人体模型组
        this.humanModel = new THREE.Group();
        this.humanModel.name = 'HumanModel';
        
        // 创建身体各部分 - 注意顺序：先创建躯干（包含Neck关节），再创建头部
        this.createTorso();
        this.createHead();
        this.createArms();
        this.createLegs();
        
        // 添加到场景
        this.scene.add(this.humanModel);
        
        console.log('Basic human model created successfully');
        return this.humanModel;
    }

    /**
     * 创建头部
     */
    createHead() {
        const headRadius = 0.5;
        const headGeometry = new THREE.SphereGeometry(headRadius, 16, 16);
        const head = new THREE.Mesh(headGeometry, this.materials.body);
        
        // 头部位置 (顶部)
        head.position.set(0, 3.5, 0);
        head.name = 'head';
        head.castShadow = true;
        head.receiveShadow = true;
        
        this.bodyParts.head = head;
        
        // 创建头部关节
        this.createJoint('Head', 0, 3.2, 0, 'Neck');         // 头部
        this.createJoint('HeadTop_End', 0, 4, 0, 'Head');    // 头顶端点
        
        // 将头部添加到Head关节上
        const headJoint = this.joints['Head'];
        head.position.set(0, 0.3, 0); // 相对于关节的位置
        headJoint.add(head);
    }

    /**
     * 创建躯干
     */
    createTorso() {
        // 胸部
        const chestGeometry = new THREE.CylinderGeometry(0.8, 0.9, 1.5, 12);
        const chest = new THREE.Mesh(chestGeometry, this.materials.body);
        chest.position.set(0, 2, 0);
        chest.name = 'chest';
        chest.castShadow = true;
        chest.receiveShadow = true;
        
        // 腰部
        const waistGeometry = new THREE.CylinderGeometry(0.7, 0.8, 1, 12);
        const waist = new THREE.Mesh(waistGeometry, this.materials.body);
        waist.position.set(0, 0.5, 0);
        waist.name = 'waist';
        waist.castShadow = true;
        waist.receiveShadow = true;
        
        this.bodyParts.chest = chest;
        this.bodyParts.waist = waist;
        
        // 创建脊椎关节 - 按标准骨骼层级
        this.createJoint('Hips', 0, 0, 0);           // 根关节
        this.createJoint('Spine', 0, 0.5, 0, 'Hips');        // 脊椎1
        this.createJoint('Spine1', 0, 1.2, 0, 'Spine');       // 脊椎2
        this.createJoint('Spine2', 0, 2, 0, 'Spine1');         // 脊椎3
        this.createJoint('Neck', 0, 2.8, 0, 'Spine2');         // 颈部
        
        // 将身体部位添加到对应的关节上
        const spineJoint = this.joints['Spine'];
        const spine2Joint = this.joints['Spine2'];
        
        // 腰部添加到脊椎关节
        waist.position.set(0, 0, 0); // 相对于关节的位置
        spineJoint.add(waist);
        
        // 胸部添加到脊椎2关节
        chest.position.set(0, 0, 0); // 相对于关节的位置
        spine2Joint.add(chest);
    }

    /**
     * 创建手臂
     */
    createArms() {
        // 左臂
        this.createArm('left', -1);
        // 右臂
        this.createArm('right', 1);
    }

    /**
     * 创建单个手臂
     * @param {string} side - 'left' 或 'right'
     * @param {number} direction - -1 (左) 或 1 (右)
     */
    createArm(side, direction) {
        // 上臂
        const upperArmGeometry = new THREE.CylinderGeometry(0.25, 0.3, 1.2, 8);
        const upperArm = new THREE.Mesh(upperArmGeometry, this.materials.body);
        upperArm.position.set(direction * 1.2, 1.8, 0);
        upperArm.name = `${side}_upper_arm`;
        upperArm.castShadow = true;
        upperArm.receiveShadow = true;
        
        // 前臂
        const forearmGeometry = new THREE.CylinderGeometry(0.2, 0.25, 1, 8);
        const forearm = new THREE.Mesh(forearmGeometry, this.materials.body);
        forearm.position.set(direction * 1.2, 0.3, 0);
        forearm.name = `${side}_forearm`;
        forearm.castShadow = true;
        forearm.receiveShadow = true;
        
        // 手部
        const handGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const hand = new THREE.Mesh(handGeometry, this.materials.body);
        hand.position.set(direction * 1.2, -0.4, 0);
        hand.name = `${side}_hand`;
        hand.castShadow = true;
        hand.receiveShadow = true;
        
        this.bodyParts[`${side}_upper_arm`] = upperArm;
        this.bodyParts[`${side}_forearm`] = forearm;
        this.bodyParts[`${side}_hand`] = hand;
        
        // 创建手臂关节 - 按标准骨骼层级
        const shoulderName = side === 'left' ? 'LeftShoulder' : 'RightShoulder';
        const armName = side === 'left' ? 'LeftArm' : 'RightArm';
        const foreArmName = side === 'left' ? 'LeftForeArm' : 'RightForeArm';
        const handName = side === 'left' ? 'LeftHand' : 'RightHand';
        
        this.createJoint(shoulderName, direction * 1.0, 2.4, 0, 'Spine2');     // 肩膀
        this.createJoint(armName, direction * 1.2, 2.1, 0, shoulderName);          // 上臂
        this.createJoint(foreArmName, direction * 1.2, 1.05, 0, armName);     // 前臂
        this.createJoint(handName, direction * 1.2, -0.25, 0, foreArmName);       // 手部
        
        // 将身体部位添加到对应的关节上，并调整相对位置
        const armJoint = this.joints[armName];
        const foreArmJoint = this.joints[foreArmName];
        const handJoint = this.joints[handName];
        
        // 上臂添加到上臂关节 (上臂关节在肩膀下方0.3，上臂长度1，所以中心在关节下方0.5)
        upperArm.position.set(0, -0.5, 0);
        armJoint.add(upperArm);
        
        // 前臂添加到前臂关节 (前臂长度1，所以中心在关节下方0.5)
        forearm.position.set(0, -0.5, 0);
        foreArmJoint.add(forearm);
        
        // 手部添加到手部关节 (手部是球体，半径0.15，所以中心在关节位置)
        hand.position.set(0, 0, 0);
        handJoint.add(hand);
        
        // 创建手指关节
        const thumbName = side === 'left' ? 'LeftHandThumb1' : 'RightHandThumb1';
        const indexName = side === 'left' ? 'LeftHandIndex1' : 'RightHandIndex1';
        const middleName = side === 'left' ? 'LeftHandMiddle1' : 'RightHandMiddle1';
        const ringName = side === 'left' ? 'LeftHandRing1' : 'RightHandRing1';
        const pinkyName = side === 'left' ? 'LeftHandPinky1' : 'RightHandPinky1';
        
        this.createJoint(thumbName, direction * 1.35, -0.35, 0.1, handName);   // 拇指
        this.createJoint(indexName, direction * 1.35, -0.45, 0.05, handName);  // 食指
        this.createJoint(middleName, direction * 1.35, -0.45, 0, handName);    // 中指
        this.createJoint(ringName, direction * 1.35, -0.45, -0.05, handName);  // 无名指
        this.createJoint(pinkyName, direction * 1.35, -0.45, -0.1, handName);  // 小指
    }

    /**
     * 创建腿部
     */
    createLegs() {
        // 左腿
        this.createLeg('left', -1);
        // 右腿
        this.createLeg('right', 1);
    }

    /**
     * 创建单个腿部
     * @param {string} side - 'left' 或 'right'
     * @param {number} direction - -1 (左) 或 1 (右)
     */
    createLeg(side, direction) {
        // 大腿
        const thighGeometry = new THREE.CylinderGeometry(0.3, 0.35, 1.8, 8);
        const thigh = new THREE.Mesh(thighGeometry, this.materials.body);
        thigh.position.set(direction * 0.4, -1, 0);
        thigh.name = `${side}_thigh`;
        thigh.castShadow = true;
        thigh.receiveShadow = true;
        
        // 小腿
        const calfGeometry = new THREE.CylinderGeometry(0.2, 0.25, 1.6, 8);
        const calf = new THREE.Mesh(calfGeometry, this.materials.body);
        calf.position.set(direction * 0.4, -2.7, 0);
        calf.name = `${side}_calf`;
        calf.castShadow = true;
        calf.receiveShadow = true;
        
        // 脚部
        const footGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.8);
        const foot = new THREE.Mesh(footGeometry, this.materials.body);
        foot.position.set(direction * 0.4, -3.7, 0.2);
        foot.name = `${side}_foot`;
        foot.castShadow = true;
        foot.receiveShadow = true;
        
        this.bodyParts[`${side}_thigh`] = thigh;
        this.bodyParts[`${side}_calf`] = calf;
        this.bodyParts[`${side}_foot`] = foot;
        
        // 创建腿部关节 - 按标准骨骼层级
        const upLegName = side === 'left' ? 'LeftUpLeg' : 'RightUpLeg';
        const legName = side === 'left' ? 'LeftLeg' : 'RightLeg';
        const footName = side === 'left' ? 'LeftFoot' : 'RightFoot';
        const toeBaseName = side === 'left' ? 'LeftToeBase' : 'RightToeBase';
        const toeEndName = side === 'left' ? 'LeftToe_End' : 'RightToe_End';
        
        this.createJoint(upLegName, direction * 0.4, -0.1, 0, 'Hips');       // 大腿
        this.createJoint(legName, direction * 0.4, -1.9, 0, upLegName);         // 小腿
        this.createJoint(footName, direction * 0.4, -3.5, 0, legName);        // 脚踝
        this.createJoint(toeBaseName, direction * 0.4, -3.8, 0.3, footName);   // 脚趾根部
        this.createJoint(toeEndName, direction * 0.4, -3.8, 0.5, toeBaseName);    // 脚趾端点
        
        // 将身体部位添加到对应的关节上，并调整相对位置
        const upLegJoint = this.joints[upLegName];
        const legJoint = this.joints[legName];
        const footJoint = this.joints[footName];
        
        // 大腿添加到大腿关节 (大腿长度1.8，所以中心在关节下方0.9)
        thigh.position.set(0, -0.9, 0);
        upLegJoint.add(thigh);
        
        // 小腿添加到小腿关节 (小腿长度1.6，所以中心在关节下方0.8)
        calf.position.set(0, -0.8, 0);
        legJoint.add(calf);
        
        // 脚部添加到脚部关节 (脚部高度0.2，所以中心在关节下方0.1，向前偏移0.2)
        foot.position.set(0, -0.1, 0.2);
        footJoint.add(foot);
    }

    /**
     * 创建关节控制点
     * @param {string} name - 关节名称
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} z - Z坐标
     * @param {string} parentName - 父关节名称（可选）
     */
    createJoint(name, x, y, z, parentName = null) {
        const jointGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const joint = new THREE.Mesh(jointGeometry, this.materials.joint);
        
        joint.position.set(x, y, z);
        joint.name = `joint_${name}`;
        joint.userData = {
            type: 'joint',
            jointName: name,
            originalColor: this.materials.joint.color.clone()
        };
        
        // 关节不投射阴影，但可以接收阴影
        joint.castShadow = false;
        joint.receiveShadow = true;
        
        // 确保关节始终显示在最上层
        joint.renderOrder = 999;           // 设置高渲染优先级
        
        this.joints[name] = joint;
        
        // 建立父子关系
        if (parentName && this.joints[parentName]) {
            const parentJoint = this.joints[parentName];
            // 获取父关节的世界位置
            const parentWorldPos = new THREE.Vector3();
            parentJoint.getWorldPosition(parentWorldPos);
            
            // 计算相对于父关节的位置
            const relativePos = new THREE.Vector3(x - parentWorldPos.x, y - parentWorldPos.y, z - parentWorldPos.z);
            joint.position.copy(relativePos);
            parentJoint.add(joint);
            console.log(`Created joint: ${name} as child of ${parentName} at relative position (${relativePos.x.toFixed(2)}, ${relativePos.y.toFixed(2)}, ${relativePos.z.toFixed(2)})`);
        } else {
            // 根关节或没有父关节的关节直接添加到人体模型
            this.humanModel.add(joint);
            console.log(`Created root joint: ${name} at position (${x}, ${y}, ${z})`);
        }
    }

    /**
     * 获取人体模型
     */
    getModel() {
        return this.humanModel;
    }

    /**
     * 获取所有关节
     */
    getJoints() {
        return this.joints;
    }

    /**
     * 获取指定关节
     * @param {string} jointName - 关节名称
     */
    getJoint(jointName) {
        return this.joints[jointName];
    }

    /**
     * 显示/隐藏关节
     * @param {boolean} visible - 是否显示
     */
    setJointsVisible(visible) {
        Object.values(this.joints).forEach(joint => {
            joint.visible = visible;
        });
    }

    /**
     * 重置人体模型到初始姿态
     */
    resetPose() {
        if (this.humanModel) {
            this.humanModel.rotation.set(0, 0, 0);
            this.humanModel.position.set(0, 0, 0);
            
            // 重置所有身体部分的旋转
            Object.values(this.bodyParts).forEach(part => {
                part.rotation.set(0, 0, 0);
            });
            
            console.log('Human model pose reset to initial state');
        }
    }

    /**
     * 销毁人体模型
     */
    dispose() {
        if (this.humanModel) {
            this.scene.remove(this.humanModel);
            
            // 清理几何体和材质
            this.humanModel.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            
            this.humanModel = null;
            this.joints = {};
            this.bodyParts = {};
            
            console.log('Human model disposed');
        }
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HumanModelManager;
} else {
    window.HumanModelManager = HumanModelManager;
}