/**
 * 高阶微观全息投影仪 (MiniModelRenderer.js)
 * 🌟 内存优化完整版：加入深度 WebGL 显存释放机制，包含所有推演动画完整逻辑
 * 🌟 修复版：彻底恢复基础乙烷(ethane)的3D结构建模与底层映射，解决第一关乙烷全息模块不显示的问题
 * 🌟 完美构图版：取消氧化铜过度放大，缩短铜漂浮距离，确保最终镜头完美容纳铜、水和乙醛三者
 */
class MiniModelRenderer {
    constructor(containerId, moleculeType) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.container.innerHTML = ''; 
        this.isDisposed = false; 

        this.scene = new THREE.Scene();
        this.pivot = new THREE.Group(); 
        this.scene.add(this.pivot);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const light = new THREE.PointLight(0xffffff, 1.2);
        light.position.set(10, 10, 10);
        this.scene.add(light);

        const width = this.container.clientWidth || 370;
        const height = this.container.clientHeight || 350;

        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
        this.camera.position.set(0, 0, 11); 

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        this.renderer.domElement.style.pointerEvents = 'auto';
        this.renderer.domElement.style.touchAction = 'none'; 
        this.container.appendChild(this.renderer.domElement);

        this.interactionState = {
            isDragging: false, isClick: true, isAnimating: false, previousMouse: { x: 0, y: 0 },
            targetRotationX: 0, targetRotationY: 0, targetCameraZ: 11, lastInteractionTime: Date.now() 
        };

        this.transientMeshes = { 
            atomH: null, bondOH: null, atomNa: null, ionicField: null,
            atomC2: null, atomO1: null, atomH_C1: null, atomH_C2: null, bondCH1: null, bondCH2: null, bondCO: null,
            atomC1: null, atomO: null 
        };
        
        this.bonds = []; 
        this.brokenHalves = []; 
        this.atoms = []; 

        this.initCaches();

        // 🌟 修复：增强类型匹配鲁棒性，确保乙烷能够被准确渲染
        const typeStr = (moleculeType || '').toLowerCase();
        if (typeStr === 'ethanol') this.createEthanolModel();
        else if (typeStr === 'dimethyl_ether') this.createDimethylEtherModel();
        else if (typeStr === 'sodium_ethoxide') this.createSodiumEthoxideModel(); 
        else if (typeStr === 'acetaldehyde') this.createAcetaldehydeModel(); 
        else if (typeStr === 'ethane') this.createEthaneModel(); 

        this.initNativeInteraction(); 

        const animateStaticModel = () => {
            if (this.isDisposed) return; 
            requestAnimationFrame(animateStaticModel);
            
            this.pivot.rotation.y += (this.interactionState.targetRotationY - this.pivot.rotation.y) * 0.1;
            this.pivot.rotation.x += (this.interactionState.targetRotationX - this.pivot.rotation.x) * 0.1;
            this.camera.position.z += (this.interactionState.targetCameraZ - this.camera.position.z) * 0.1;

            if (Date.now() - this.interactionState.lastInteractionTime > 3000 && !this.interactionState.isDragging && !this.interactionState.isAnimating) {
                this.interactionState.targetRotationY += 0.003; 
            }

            this.bonds.forEach(bond => {
                if (!bond.mesh.parent) return; 
                if (bond.isBroken) return; 
                const posA = bond.a.position;
                const posB = bond.b.position;
                const distance = posA.distanceTo(posB);
                if (distance === 0) return;

                const midPoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
                const direction = new THREE.Vector3().subVectors(posB, posA).normalize();

                bond.mesh.position.copy(midPoint);
                bond.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

                if (bond.type === 'double') {
                    bond.mesh.children.forEach(child => child.scale.y = distance);
                    bond.mesh.rotateY(Date.now() * 0.002);
                } else {
                    bond.mesh.scale.y = distance;
                }
            });

            if (this.brokenHalves) {
                this.brokenHalves.forEach(hb => {
                    if (hb.mesh && hb.atom) {
                        hb.mesh.position.copy(hb.atom.position);
                        if (hb.dir) {
                            hb.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hb.dir);
                        }
                    }
                });
            }

            const invPivotQuat = this.pivot.quaternion.clone().invert();
            const targetQuat = invPivotQuat.multiply(this.camera.quaternion);

            this.atoms.forEach(atom => {
                if (atom.userData.type === 'Na' || atom.userData.type === 'Cu') {
                    if (atom.parent === this.pivot) {
                        atom.quaternion.copy(targetQuat);
                    } else {
                        atom.quaternion.copy(this.camera.quaternion);
                    }
                }
            });

            this.renderer.render(this.scene, this.camera);
        };
        animateStaticModel();
    }

    initCaches() {
        this.materialCache = {};
        this.geometryCache = {};
        const elements = ['C', 'H', 'O', 'Na', 'Cu'];
        elements.forEach(el => {
            this.materialCache[el] = this.createAtomMaterial(el);
            let radius = el === 'C' ? 0.7 : (el === 'H' ? 0.4 : (el === 'O' ? 0.6 : 0.8));
            this.geometryCache[el] = new THREE.SphereGeometry(radius, 32, 32);
        });
    }

    createAtomMaterial(element) {
        let colorHex = element === 'C' ? 0x333333 : (element === 'O' ? 0xff0000 : (element === 'Na' ? 0xaaaaaa : (element === 'Cu' ? 0xb87333 : 0xffffff)));
        let emissiveHex = element === 'Na' ? 0x222255 : (element === 'Cu' ? 0x442200 : 0x000000);
        let metalnessVal = (element === 'Na' || element === 'Cu') ? 0.8 : 0.6;
        let roughnessVal = 0.1; 

        if (element === 'Na' || element === 'Cu') {
            const canvas = document.createElement('canvas');
            canvas.width = 512; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = element === 'Na' ? '#aaaaaa' : '#b87333';
            ctx.fillRect(0, 0, 512, 256);
            
            ctx.font = 'bold 120px "Courier New", Arial, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText(element, 128, 128); 
            ctx.fillText(element, 384, 128);
            
            const colorMap = new THREE.CanvasTexture(canvas);
            colorMap.needsUpdate = true;
            if (typeof THREE.SRGBColorSpace !== 'undefined') colorMap.colorSpace = THREE.SRGBColorSpace;
            
            return new THREE.MeshStandardMaterial({ 
                map: colorMap, roughness: roughnessVal, metalness: metalnessVal, emissive: emissiveHex 
            });
        } else {
            return new THREE.MeshStandardMaterial({ 
                color: colorHex, roughness: roughnessVal, metalness: metalnessVal, emissive: emissiveHex 
            });
        }
    }

    dispose() {
        this.isDisposed = true;
        
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf(this.pivot.rotation);
            gsap.killTweensOf(this.pivot.position);
            gsap.killTweensOf(this.camera.position);
            this.pivot.traverse(obj => gsap.killTweensOf(obj));
        }

        if (this.geometryCache) Object.values(this.geometryCache).forEach(geo => geo.dispose());
        if (this.materialCache) {
            Object.values(this.materialCache).forEach(mat => {
                if (mat.map) mat.map.dispose(); 
                mat.dispose();
            });
        }

        this.scene.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            }
        });

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss(); 
            const canvas = this.renderer.domElement;
            if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        }
        
        if (this.tooltip && this.tooltip.parentNode) this.tooltip.parentNode.removeChild(this.tooltip);
    }

    resetIdleTimer() { this.interactionState.lastInteractionTime = Date.now(); }

    initNativeInteraction() {
        const canvas = this.renderer.domElement;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.tooltip = document.createElement('div');
        this.tooltip.style.cssText = 'position: absolute; color: #ffd700; background: rgba(26, 26, 46, 0.9); padding: 12px 20px; border: 2px solid #8b5a2b; border-radius: 8px; pointer-events: none; opacity: 0; transition: opacity 0.3s; font-size: 3em; font-weight: bold; z-index: 100; font-family: "Courier New", monospace; text-shadow: 2px 2px 4px #000; box-shadow: 0 0 15px rgba(139, 90, 43, 0.8);';
        this.container.appendChild(this.tooltip);

        canvas.addEventListener('pointerdown', (e) => {
            if (this.interactionState.isAnimating) return; 
            this.interactionState.isDragging = true; this.interactionState.isClick = true; 
            this.interactionState.previousMouse = { x: e.clientX, y: e.clientY };
            this.resetIdleTimer(); canvas.setPointerCapture(e.pointerId); 
        });

        canvas.addEventListener('pointermove', (e) => {
            if (this.interactionState.isDragging) {
                const deltaX = e.clientX - this.interactionState.previousMouse.x;
                const deltaY = e.clientY - this.interactionState.previousMouse.y;
                if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) this.interactionState.isClick = false; 
                this.interactionState.targetRotationY += deltaX * 0.01;
                this.interactionState.targetRotationX += deltaY * 0.01;
                this.interactionState.previousMouse = { x: e.clientX, y: e.clientY };
                this.resetIdleTimer();
            }
        });

        canvas.addEventListener('pointerup', (e) => {
            this.interactionState.isDragging = false; canvas.releasePointerCapture(e.pointerId);
            this.resetIdleTimer();
            if (this.interactionState.isClick && !this.interactionState.isAnimating) this.handleRaycast(e);
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault(); 
            if (this.interactionState.isAnimating) return;
            this.interactionState.targetCameraZ += e.deltaY * 0.005;
            this.interactionState.targetCameraZ = Math.max(4, Math.min(25, this.interactionState.targetCameraZ)); 
            this.resetIdleTimer(); 
        }, { passive: false });
    }

    handleRaycast(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.pivot.children, true);
        let clickedAtom = intersects.find(obj => obj.object.userData && obj.object.userData.type);
        
        if (clickedAtom) {
            const type = clickedAtom.object.userData.type;
            const nameMap = { 'C': '碳原子 (C)', 'H': '氢原子 (H)', 'O': '氧原子 (O)', 'Na': '钠离子 (Na⁺)', 'Cu': '氧化铜 (CuO) / 铜 (Cu)' };
            this.tooltip.innerText = `🔍 探知: ${nameMap[type] || type}`;
            this.tooltip.style.left = (event.clientX - rect.left + 15) + 'px';
            this.tooltip.style.top = (event.clientY - rect.top + 15) + 'px';
            this.tooltip.style.opacity = '1';
            setTimeout(() => { if (!this.isDisposed) this.tooltip.style.opacity = '0'; }, 2000);
        }
    }

    addAtom(type, positionVector) {
        const material = this.materialCache[type] || this.materialCache['C'];
        const geometry = this.geometryCache[type] || this.geometryCache['C'];
        
        const mesh = new THREE.Mesh(geometry, material.clone());
        mesh.position.copy(positionVector);
        mesh.userData = { type: type, bonds: 0 }; 
        this.pivot.add(mesh);
        
        if (!this.atoms) this.atoms = [];
        this.atoms.push(mesh);
        return mesh;
    }

    addBond(atomAMesh, atomBMesh, type = 'single') {
        const posA = atomAMesh.position; 
        const posB = atomBMesh.position;
        const distance = posA.distanceTo(posB);
        
        let mesh;
        if (type === 'double') {
            mesh = new THREE.Group();
            const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.2, emissive: 0xff4400, emissiveIntensity: 1.5 });
            const bond1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 12), mat);
            const bond2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 12), mat);
            bond1.position.x = 0.18; bond2.position.x = -0.18; 
            bond1.scale.y = distance; bond2.scale.y = distance;
            mesh.add(bond1); mesh.add(bond2);
        } else {
            let geo, mat;
            if(type === 'ionic') {
                geo = new THREE.CylinderGeometry(0.15, 0.15, 1, 12);
                mat = new THREE.MeshBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 0.3, wireframe: true, blending: THREE.AdditiveBlending });
            } else {
                geo = new THREE.CylinderGeometry(0.12, 0.12, 1, 12);
                mat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
            }
            mesh = new THREE.Mesh(geo, mat);
            mesh.scale.y = distance;
        }

        mesh.userData = { a: atomAMesh, b: atomBMesh, type: type };
        
        const midPoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
        mesh.position.copy(midPoint);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), posB.clone().sub(posA).normalize());
        
        this.pivot.add(mesh);
        
        const bondObj = { mesh: mesh, a: atomAMesh, b: atomBMesh, type: type };
        this.bonds.push(bondObj);
        return bondObj;
    }

    breakBondIntoHalves(bondMesh) {
        const bond = this.bonds.find(b => b.mesh === bondMesh || b.halfA === bondMesh);
        if (!bond) return { trackA: null, trackB: null };
        
        bond.isBroken = true; 
        this.brokenHalves = this.brokenHalves || [];
        
        const dirA = new THREE.Vector3().subVectors(bond.b.position, bond.a.position).normalize();
        const dirB = dirA.clone().negate();

        if (bond.mesh) bond.mesh.visible = false;
        
        const geo = new THREE.CylinderGeometry(0.12, 0.12, 1, 8);
        geo.translate(0, 0.5, 0); 
        
        const colorHex = (bond.mesh && bond.mesh.material) ? bond.mesh.material.color.getHex() : 0xaaaaaa;
        const matA = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.8, roughness: 0.2 });
        const matB = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.8, roughness: 0.2 });
        
        const meshA = new THREE.Mesh(geo, matA);
        const meshB = new THREE.Mesh(geo, matB);
        
        this.pivot.add(meshA);
        this.pivot.add(meshB);
        
        const dist = Math.max(0.1, bond.a.position.distanceTo(bond.b.position));
        meshA.scale.set(1, dist/2, 1);
        meshB.scale.set(1, dist/2, 1);

        const trackA = { mesh: meshA, atom: bond.a, dir: dirA };
        const trackB = { mesh: meshB, atom: bond.b, dir: dirB };
        this.brokenHalves.push(trackA);
        this.brokenHalves.push(trackB);

        return { trackA, trackB };
    }

    // 🌟 修复：恢复最纯净的乙烷坐标阵列，确保模型 100% 被绘制
    createEthaneModel() {
        const c1 = this.addAtom('C', new THREE.Vector3(-1.2, 0, 0));
        const c2 = this.addAtom('C', new THREE.Vector3(1.2, 0, 0));
        this.addBond(c1, c2);
        
        this.addBond(c1, this.addAtom('H', new THREE.Vector3(-1.9, 1.1, 0)));
        this.addBond(c1, this.addAtom('H', new THREE.Vector3(-1.9, -0.5, 1.0)));
        this.addBond(c1, this.addAtom('H', new THREE.Vector3(-1.9, -0.5, -1.0)));
        
        this.addBond(c2, this.addAtom('H', new THREE.Vector3(1.9, 1.1, 0)));
        this.addBond(c2, this.addAtom('H', new THREE.Vector3(1.9, -0.5, 1.0)));
        this.addBond(c2, this.addAtom('H', new THREE.Vector3(1.9, -0.5, -1.0)));
    }

    createEthanolModel() {
        const c1 = this.addAtom('C', new THREE.Vector3(-1.5, -0.5, 0)); 
        const c2 = this.addAtom('C', new THREE.Vector3(0.5, 0.5, 0)); 
        const o1 = this.addAtom('O', new THREE.Vector3(1.8, -0.5, 0));
        this.addBond(c1, c2); 
        const bondCO = this.addBond(c2, o1);
        
        const h_c2_1 = this.addAtom('H', new THREE.Vector3(0.5, 1.3, 0.8)); 
        const h_c2_2 = this.addAtom('H', new THREE.Vector3(0.5, 1.3, -0.8));
        const bondCH1 = this.addBond(c2, h_c2_1); 
        const bondCH2 = this.addBond(c2, h_c2_2);
        
        const h_c1_1 = this.addAtom('H', new THREE.Vector3(-2.3, 0.3, 0)); 
        const h_c1_2 = this.addAtom('H', new THREE.Vector3(-1.5, -1.3, 0.8)); 
        const h_c1_3 = this.addAtom('H', new THREE.Vector3(-1.5, -1.3, -0.8));
        this.addBond(c1, h_c1_1); this.addBond(c1, h_c1_2); this.addBond(c1, h_c1_3);
        
        const h_o1 = this.addAtom('H', new THREE.Vector3(2.5, 0.2, 0));
        const bondOH = this.addBond(o1, h_o1);

        this.transientMeshes.atomH = h_o1;
        this.transientMeshes.bondOH = bondOH;
        this.transientMeshes.atomC2 = c2;
        this.transientMeshes.atomO1 = o1;
        this.transientMeshes.atomH_C1 = h_c2_1; 
        this.transientMeshes.atomH_C2 = h_c2_2; 
        this.transientMeshes.bondCH1 = bondCH1;
        this.transientMeshes.bondCH2 = bondCH2;
        this.transientMeshes.bondCO = bondCO;
    }

    createDimethylEtherModel() {
        const c1 = this.addAtom('C', new THREE.Vector3(-1.5, -0.8, 0)); 
        const o1 = this.addAtom('O', new THREE.Vector3(0, 0.5, 0)); 
        const c2 = this.addAtom('C', new THREE.Vector3(1.5, -0.8, 0));
        this.addBond(c1, o1); this.addBond(c2, o1);
        
        this.addBond(c1, this.addAtom('H', new THREE.Vector3(-2.3, -0.1, 0))); 
        this.addBond(c1, this.addAtom('H', new THREE.Vector3(-1.5, -1.6, 0.8))); 
        this.addBond(c1, this.addAtom('H', new THREE.Vector3(-1.5, -1.6, -0.8)));
        
        this.addBond(c2, this.addAtom('H', new THREE.Vector3(2.3, -0.1, 0))); 
        this.addBond(c2, this.addAtom('H', new THREE.Vector3(1.5, -1.6, 0.8))); 
        this.addBond(c2, this.addAtom('H', new THREE.Vector3(1.5, -1.6, -0.8)));
    }

    createSodiumEthoxideModel() {
        const c1 = this.addAtom('C', new THREE.Vector3(-1.5, -0.5, 0)); 
        const c2 = this.addAtom('C', new THREE.Vector3(0.5, 0.5, 0)); 
        const o1 = this.addAtom('O', new THREE.Vector3(1.8, -0.5, 0));
        this.addBond(c1, c2); this.addBond(c2, o1);
        
        const h_c2_1 = this.addAtom('H', new THREE.Vector3(0.5, 1.3, 0.8)); 
        const h_c2_2 = this.addAtom('H', new THREE.Vector3(0.5, 1.3, -0.8));
        this.addBond(c2, h_c2_1); this.addBond(c2, h_c2_2);
        
        const h_c1_1 = this.addAtom('H', new THREE.Vector3(-2.3, 0.3, 0)); 
        const h_c1_2 = this.addAtom('H', new THREE.Vector3(-1.5, -1.3, 0.8)); 
        const h_c1_3 = this.addAtom('H', new THREE.Vector3(-1.5, -1.3, -0.8));
        this.addBond(c1, h_c1_1); this.addBond(c1, h_c1_2); this.addBond(c1, h_c1_3);
        
        const na_o1 = this.addAtom('Na', new THREE.Vector3(3.2, 0.2, 0)); 
        this.addBond(o1, na_o1, 'ionic');
    }

    createAcetaldehydeModel() {
        const c1 = this.addAtom('C', new THREE.Vector3(-1.5, -0.5, 0)); 
        const c2 = this.addAtom('C', new THREE.Vector3(0.5, 0.5, 0)); 
        const o1 = this.addAtom('O', new THREE.Vector3(1.8, -0.5, 0)); 
        this.addBond(c1, c2); 
        this.addBond(c2, o1, 'double'); 
        
        const h_c2_remain = this.addAtom('H', new THREE.Vector3(0.5, 1.7, 0)); 
        this.addBond(c2, h_c2_remain);
        
        const h_c1_1 = this.addAtom('H', new THREE.Vector3(-2.3, 0.3, 0)); 
        const h_c1_2 = this.addAtom('H', new THREE.Vector3(-1.5, -1.3, 0.8)); 
        const h_c1_3 = this.addAtom('H', new THREE.Vector3(-1.5, -1.3, -0.8));
        this.addBond(c1, h_c1_1); this.addBond(c1, h_c1_2); this.addBond(c1, h_c1_3);
    }

    showMagicTitle(text) {
        const titleEl = document.getElementById('mini-vision-title');
        if(titleEl) {
            titleEl.innerText = text;
            titleEl.style.opacity = 1;
            setTimeout(() => { if(!this.isDisposed) titleEl.style.opacity = 0; }, 3500);
        }
    }

    async animateTransitionToSodiumEthoxide() {
        if (this.isDisposed || !this.transientMeshes.atomH || !this.transientMeshes.bondOH) return;
        this.showMagicTitle("置换推演：O-H 键断裂");
        this.interactionState.isAnimating = true; 

        const tl = gsap.timeline();
        const startPosNa = new THREE.Vector3(6, 4, -4); 
        const targetPosNa = new THREE.Vector3(4.0, 1.5, 0); 
        
        const atomNa = this.addAtom('Na', startPosNa);
        atomNa.material.transparent = true;
        atomNa.material.opacity = 0;
        this.transientMeshes.atomNa = atomNa;

        const atomO = this.transientMeshes.bondOH.a.userData.type === 'O' ? this.transientMeshes.bondOH.a : this.transientMeshes.bondOH.b;

        tl.addLabel("focus")
            .to(this.interactionState, { targetCameraZ: 7, targetRotationX: 0, targetRotationY: 0, duration: 1.5, ease: "power2.inOut" }, "focus") 
            .to(this.pivot.rotation, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.inOut" }, "focus") 
            .to(this.pivot.position, { x: -1.8, y: 0.5, duration: 1.5, ease: "power2.inOut" }, "focus"); 

        tl.addLabel("naAdsorb", "-=0.2")
            .to(atomNa.material, { opacity: 1, duration: 0.4 }, "naAdsorb")
            .to(atomNa.position, { x: targetPosNa.x, y: targetPosNa.y, z: targetPosNa.z, duration: 1.0, ease: "power2.out" }, "naAdsorb"); 

        const haloGeo = new THREE.SphereGeometry(1.5, 32, 32);
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, wireframe: true });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        atomO.add(halo);

        tl.addLabel("tension", "+=0.2")
            .to(halo.material, { opacity: 0.8, duration: 0.4, yoyo: true, repeat: 3 }, "tension") 
            .to(halo.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.4, yoyo: true, repeat: 3 }, "tension")
            .to(this.transientMeshes.bondOH.mesh.material.emissive, { r: 1, duration: 0.3, yoyo: true, repeat: 4 }, "tension")
            .to(this.transientMeshes.bondOH.mesh.scale, { x: 0.4, z: 0.4, duration: 1.2, ease: "rough({ strength: 3, points: 30 })" }, "tension") 
            .to(this.transientMeshes.atomH.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 1.2, ease: "rough({ strength: 3, points: 30 })" }, "tension");

        tl.addLabel("break", "+=0.1")
            .set(this.transientMeshes.bondOH.mesh, { visible: false }, "break")
            .to(this.transientMeshes.atomH.position, { x: "+=3", y: "+=3", z: "+=8", duration: 1.2, ease: "power2.in" }, "break") 
            .to(this.transientMeshes.atomH.material, { opacity: 0, transparent: true, duration: 0.8, ease: "power1.in" }, "break")
            .to(halo.material, { opacity: 0, duration: 0.5 }, "break");

        tl.addLabel("formIonic", "+=0.2")
            .to(atomNa.position, { x: atomO.position.x + 1.4, y: atomO.position.y + 0.8, duration: 1.5 }, "formIonic")
            .add(() => {
                if (!this.isDisposed) {
                   const field = this.addBond(atomO, atomNa, 'ionic');
                   this.transientMeshes.ionicField = field;
                   gsap.to(field.mesh.material, { opacity: 0.3, duration: 1.0, yoyo: true, repeat: -1, ease: "sine.inOut" });
                   gsap.to(field.mesh.scale, { x: 1.2, z: 1.2, duration: 1.0, yoyo: true, repeat: -1, ease: "sine.inOut" });
                }
            }, "formIonic+=1.5")
            .to(this.camera.position, { x: "+=0.3", y: "+=0.3", duration: 0.05, yoyo: true, repeat: 5 }, "formIonic+=1.5")
            .to(this.camera.position, { x: 0, y: 0, duration: 0.1 })
            .to(this.interactionState, { targetCameraZ: 11, duration: 1.5, ease: "power2.inOut" }, "+=0.5")
            .to(this.pivot.position, { x: 0, y: 0, duration: 1.5, ease: "power2.inOut" }, "-=1.5")
            .add(() => { 
                if(halo.parent) halo.parent.remove(halo);
                this.interactionState.isAnimating = false; 
                this.resetIdleTimer(); 
            });
            
        return tl;
    }

    async animateTransitionToAcetaldehyde() {
        if (this.isDisposed || !this.transientMeshes.atomH || !this.transientMeshes.bondOH || !this.transientMeshes.bondCH1) return;
        this.showMagicTitle("氧化推演：氧化铜(CuO)介入");
        this.interactionState.isAnimating = true; 
        
        const tl = gsap.timeline();
        const { atomO1, atomC2, atomH, atomH_C1, atomH_C2, bondOH, bondCH1, bondCH2, bondCO } = this.transientMeshes;

        tl.addLabel("focus")
            .to(this.interactionState, { targetCameraZ: 10.5, targetRotationX: 0, targetRotationY: 0, duration: 2.0, ease: "power2.inOut" }, "focus")
            .to(this.pivot.rotation, { x: 0, y: 0, z: 0, duration: 2.0, ease: "power2.inOut" }, "focus")
            .to(this.pivot.position, { x: -1.0, y: -0.8, duration: 2.0, ease: "power2.inOut" }, "focus");

        const atomCuGroup = new THREE.Group();
        atomCuGroup.position.set(atomC2.position.x - 5, atomC2.position.y + 4, 2);
        atomCuGroup.scale.set(0.65, 0.65, 0.65);
        this.pivot.add(atomCuGroup);

        const meshCu = new THREE.Mesh(this.geometryCache['Cu'], this.materialCache['Cu'].clone());
        meshCu.material.color.setHex(0x444444); 
        meshCu.material.emissive.setHex(0x151515);
        meshCu.material.transparent = true; meshCu.material.opacity = 0;
        atomCuGroup.add(meshCu);
        
        const meshO_cat = new THREE.Mesh(this.geometryCache['O'], this.materialCache['O'].clone());
        meshO_cat.position.set(1.3, 0, 0); 
        meshO_cat.scale.set(0.8, 0.8, 0.8);
        meshO_cat.material.transparent = true; meshO_cat.material.opacity = 0;
        atomCuGroup.add(meshO_cat);
        
        const bondCuO = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.3, 8), new THREE.MeshStandardMaterial({color: 0xaaaaaa, transparent: true, opacity: 0}));
        bondCuO.position.set(0.65, 0, 0);
        bondCuO.rotation.z = Math.PI / 2;
        atomCuGroup.add(bondCuO);
        
        tl.to([meshCu.material, meshO_cat.material], { opacity: 1, duration: 0.5 }, "focus+=0.5")
          .to(atomCuGroup.position, { 
              x: atomC2.position.x + 0.5, y: atomC2.position.y + 1.5, duration: 2.0, ease: "power1.inOut" 
          }, "focus+=1.0");

        const halo = new THREE.Mesh(new THREE.SphereGeometry(1.8, 32, 32), new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0, wireframe: true }));
        atomC2.add(halo);

        tl.addLabel("tension", "+=0.5")
            .to(halo.material, { opacity: 0.6, duration: 0.6, yoyo: true, repeat: 3 }, "tension")
            .to([bondOH.mesh.material.emissive, bondCH1.mesh.material.emissive, bondCH2.mesh.material.emissive], { r: 1, duration: 0.4, yoyo: true, repeat: 4 }, "tension");

        tl.addLabel("break", "+=0.5")
            .add(() => {
                gsap.killTweensOf(bondCH2.mesh.material.emissive);
                bondCH2.mesh.material.emissive.setHex(0x224488);

                const halves1 = this.breakBondIntoHalves(bondOH.mesh);
                this.trackO = halves1.trackA.atom === atomO1 ? halves1.trackA : halves1.trackB;
                this.trackH_O = halves1.trackA.atom === atomH ? halves1.trackA : halves1.trackB;

                const halves2 = this.breakBondIntoHalves(bondCH1.mesh);
                this.trackC = halves2.trackA.atom === atomC2 ? halves2.trackA : halves2.trackB;
                this.trackH_C = halves2.trackA.atom === atomH_C1 ? halves2.trackA : halves2.trackB;
                
                gsap.to(meshCu.material.color, { r: 184/255, g: 115/255, b: 51/255, duration: 1.0 });
                gsap.to(meshCu.material.emissive, { r: 0.26, g: 0.13, b: 0, duration: 1.0 });
            }, "break")
            .to(atomH.position, { x: 3, y: 4, z: 0, duration: 1.5, ease: "power2.out" }, "break")
            .to(atomH_C1.position, { x: 4.5, y: 4, z: 0, duration: 1.5, ease: "power2.out" }, "break")
            .to(halo.material, { opacity: 0, duration: 0.5 }, "break");

        tl.to(atomCuGroup.position, { y: "+=1.2", duration: 2.0, ease: "power2.out" }, "break+=1.0");

        tl.addLabel("autoAttract", "-=0.2")
            .add(() => {
                let worldPos = new THREE.Vector3();
                meshO_cat.getWorldPosition(worldPos);
                atomCuGroup.remove(meshO_cat);
                this.pivot.add(meshO_cat);
                meshO_cat.position.copy(worldPos);
                meshO_cat.scale.set(0.8 * 0.65, 0.8 * 0.65, 0.8 * 0.65);

                const targetOX = atomC2.position.x + 2.2; 
                const targetOY = atomC2.position.y - 2.2; 
                
                gsap.to(meshO_cat.position, { x: targetOX, y: targetOY, z: 0, duration: 1.5, ease: "power2.inOut" });
                
                gsap.to(atomH.position, { x: targetOX - 0.7, y: targetOY - 0.7, z: 0.6, duration: 1.5, ease: "power2.inOut" });
                gsap.to(atomH_C1.position, { x: targetOX + 0.7, y: targetOY - 0.7, z: -0.6, duration: 1.5, ease: "power2.inOut" });
                
                if(this.trackH_O && this.trackH_C) {
                    gsap.to(this.trackH_O.mesh.scale, { y: 0.1, duration: 1.0 });
                    gsap.to(this.trackH_C.mesh.scale, { y: 0.1, duration: 1.0 });
                }
                
                if (bondCO && bondCO.mesh) {
                    bondCO.mesh.visible = false;
                    this.pivot.remove(bondCO.mesh);
                    this.bonds = this.bonds.filter(b => b.mesh !== bondCO.mesh);
                }
                
                const dbGroup = this.addBond(atomC2, atomO1, 'double'); 
                dbGroup.mesh.children.forEach(c => {
                    c.material.emissiveIntensity = 4; c.material.emissive.setHex(0xffffff); 
                    gsap.to(c.material.emissive, { r: 0.26, g: 0.13, b: 0, duration: 2.0, ease: "power2.out" }); 
                    gsap.to(c.material, { emissiveIntensity: 1, duration: 2.0, ease: "power2.out" });
                });
                
                if(this.trackO && this.trackO.mesh) this.trackO.mesh.visible = false;
                if(this.trackC && this.trackC.mesh) this.trackC.mesh.visible = false;

                setTimeout(() => {
                    if(!this.isDisposed) {
                        const h2oBond1 = this.addBond(atomH, meshO_cat, 'single');
                        const h2oBond2 = this.addBond(atomH_C1, meshO_cat, 'single');
                        
                        if(this.trackH_O && this.trackH_O.mesh) this.trackH_O.mesh.visible = false;
                        if(this.trackH_C && this.trackH_C.mesh) this.trackH_C.mesh.visible = false;
                        
                        atomH.material.transparent = true; atomH_C1.material.transparent = true; 
                        meshO_cat.material.transparent = true;
                        h2oBond1.mesh.material.transparent = true; h2oBond2.mesh.material.transparent = true;
                        
                        gsap.to([atomH.position, atomH_C1.position, meshO_cat.position], { y: "+=0.2", duration: 2.0, yoyo: true, repeat: -1, ease: "sine.inOut" });
                        this.showMagicTitle("推演结果：生成乙醛与水");
                    }
                }, 1200); 
                
            }, "autoAttract") 
            .to(atomH_C2.position, { x: atomC2.position.x + 0.0, y: atomC2.position.y + 1.3, duration: 1.5, ease: "power2.inOut" }, "autoAttract")
            .to(this.camera.position, { x: "+=0.3", y: "+=0.3", duration: 0.05, yoyo: true, repeat: 7 }, "autoAttract");

        tl.to(this.interactionState, { targetCameraZ: 13.0, duration: 2.0 }, "+=2.0")
          .to(this.pivot.position, { x: -0.5, y: -0.5, duration: 2.0 }, "-=2.0")
          .to(this.pivot.rotation, { x: 0, y: 0, z: 0, duration: 2.0 }, "-=2.0")
          .add(() => { 
              this.interactionState.isAnimating = false; 
              this.resetIdleTimer(); 
          });
          
        return tl;
    }
}
