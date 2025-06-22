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
        // 身体部位材质
        this.materials.body = new THREE.MeshLambertMaterial({
            color: 0xfdbcb4,
            transparent: true,
            opacity: 0.8
        });
        
        // 关节材质
        this.materials.joint = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        
        // 选中关节材质
        this.materials.jointSelected = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 1.0
        });
        
        // 悬停关节材质
        this.materials.jointHover = new THREE.MeshBasicMaterial({
            color: 0xff8888,
            transparent: true,
            opacity: 0.9
        });
        
        console.log('Materials initialized');
    }

    /**
     * 创建基础人体模型
     */
    createHumanModel() {
        console.log('Creating basic human model...');
        
        // 创建人体模型组
        this.humanModel = new THREE.Group();
        this.humanModel.name = 'HumanModel';
        
        // 创建身体各部分
        this.createHead();
        this.createTorso();
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
        this.humanModel.add(head);
        
        // 创建颈部关节
        this.createJoint('neck', 0, 3, 0);
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
        this.humanModel.add(chest);
        this.humanModel.add(waist);
        
        // 创建脊椎关节
        this.createJoint('spine_chest', 0, 2.5, 0);
        this.createJoint('spine_waist', 0, 1, 0);
        this.createJoint('hip_center', 0, 0, 0);
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
        
        this.humanModel.add(upperArm);
        this.humanModel.add(forearm);
        this.humanModel.add(hand);
        
        // 创建关节
        this.createJoint(`${side}_shoulder`, direction * 1.2, 2.4, 0);
        this.createJoint(`${side}_elbow`, direction * 1.2, 1.05, 0);
        this.createJoint(`${side}_wrist`, direction * 1.2, -0.25, 0);
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
        
        this.humanModel.add(thigh);
        this.humanModel.add(calf);
        this.humanModel.add(foot);
        
        // 创建关节
        this.createJoint(`${side}_hip`, direction * 0.4, -0.1, 0);
        this.createJoint(`${side}_knee`, direction * 0.4, -1.9, 0);
        this.createJoint(`${side}_ankle`, direction * 0.4, -3.5, 0);
    }

    /**
     * 创建关节控制点
     * @param {string} name - 关节名称
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} z - Z坐标
     */
    createJoint(name, x, y, z) {
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
        
        this.joints[name] = joint;
        this.humanModel.add(joint);
        
        console.log(`Created joint: ${name} at position (${x}, ${y}, ${z})`);
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