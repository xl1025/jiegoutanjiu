/** 渲染与性能引擎 (RenderEngine.js) - 专职负责帧率调度与节流 */
class RenderEngine {
    constructor(sceneManager) {
        this.sm = sceneManager;
        this.clock = new THREE.Clock();
        this.physicsAccumulator = 0;
        this.PHYSICS_STEP = 1 / 60; // 锁定物理刷新率为 60FPS
        this.animate = this.animate.bind(this);
        this._tempUp = new THREE.Vector3(0, 1, 0); // 内部缓存向量防报错
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.sm.renderer.setAnimationLoop(this.animate);
    }

    stop() {
        this.isRunning = false;
        this.sm.renderer.setAnimationLoop(null);
    }

    animate() {
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // 1. 物理引擎独立调度 (节流防卡死)
        if (this.sm.physicsEngine) {
            this.physicsAccumulator += delta;
            let steps = 0;
            while (this.physicsAccumulator >= this.PHYSICS_STEP && steps < 3) {
                if (typeof this.sm.physicsEngine.applyPhysics === 'function') {
                    this.sm.physicsEngine.applyPhysics();
                }
                this.physicsAccumulator -= this.PHYSICS_STEP;
                steps++;
            }
        }

        // 2. 更新化学键脏检查
        if (typeof this.sm.updateBondTransforms === 'function') {
            this.sm.updateBondTransforms();
        }

        // 3. 视觉特效更新
        this.updateVisualEffects(time);

        // 4. 提交渲染
        this.sm.renderer.render(this.sm.scene, this.sm.camera);
    }

    updateVisualEffects(time) {
        const atoms = this.sm.atoms;
        const camQuat = this.sm.camera.quaternion;

        // 原子悬浮与广告牌效果
        for (let i = 0, len = atoms.length; i < len; i++) {
            const atom = atoms[i];
            if (atom.userData.bonds === 0 && !atom.userData.isDragging) {
                atom.position.y += Math.sin(time * 2 + i) * 0.002;
            }
            atom.quaternion.copy(camQuat);
        }

        // 断键与半键跟踪
        if (this.sm.brokenHalves) {
            for (let i = 0, len = this.sm.brokenHalves.length; i < len; i++) {
                const hb = this.sm.brokenHalves[i];
                if (hb.mesh && hb.atom) {
                    hb.mesh.position.copy(hb.atom.position);
                    if (hb.dir) hb.mesh.quaternion.setFromUnitVectors(this._tempUp, hb.dir);
                }
            }
        }

        // 高亮光环跟踪
        if (this.sm.highlightHalos) {
            for (let i = 0, len = this.sm.highlightHalos.length; i < len; i++) {
                const halo = this.sm.highlightHalos[i];
                if (halo.mesh && halo.target) halo.mesh.position.copy(halo.target.position);
            }
        }
    }
}