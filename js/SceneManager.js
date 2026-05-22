/** (SceneManager.js) 3D 场景与化学键渲染引擎 */
class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        const width = this.container ? this.container.clientWidth : window.innerWidth;
        const height = this.container ? this.container.clientHeight : window.innerHeight;
        
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.01);
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 0, 30);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); 
        if (this.container) this.container.appendChild(this.renderer.domElement);
        
        this.atoms = []; 
        this.bonds = []; 
        this.SNAP_DISTANCE = 4.0;
        this.isHighlighted = false; 
        this.highlightHalos = [];
        this.physicsEngine = null;
        this.materialCache = {};
        this.geometryCache = {};
        this.historyStack = []; 
        
        this.brokenHalves = []; 

        this._tempDir = new THREE.Vector3();
        this._tempDirB = new THREE.Vector3();
        this._tempMid = new THREE.Vector3();
        this._tempUp = new THREE.Vector3(0, 1, 0);
        this._tempRight = new THREE.Vector3();
        this._tempZ = new THREE.Vector3(0, 0, 1);

        this.initCaches();
        this.initLights();
        
        this.clock = new THREE.Clock();
        this.physicsAccumulator = 0;
        this.PHYSICS_STEP = 1 / 60; 
        this.animate = this.animate.bind(this);
        this.renderer.setAnimationLoop(this.animate);
        
        this.resizeTimeout = null;
        window.addEventListener('resize', () => {
            if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.onWindowResize(), 100);
        });
    }

    syncDragControls() {
        if (window.app && window.app.interactionManager && window.app.interactionManager.dragControls) {
            const dragObj = window.app.interactionManager.dragControls;
            const objectsArray = dragObj.getObjects ? dragObj.getObjects() : dragObj.objects;
            if (objectsArray && Array.isArray(objectsArray)) {
                if (objectsArray !== this.atoms) {
                    objectsArray.length = 0; 
                    this.atoms.forEach(a => objectsArray.push(a));
                }
            }
        }
    }
    
    initCaches() {
        const elements = ['C', 'H', 'O', 'Na', 'Cu'];
        elements.forEach(el => {
            this.materialCache[el] = this.createAtomMaterial(el);
            let radius = el === 'C' ? 1.2 : (el === 'H' ? 0.6 : (el === 'O' ? 1.0 : 1.3));
            this.geometryCache[el] = new THREE.SphereGeometry(radius, 32, 32);
        });
    }
    
    initLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const pointLight = new THREE.PointLight(0xffffff, 1.2);
        pointLight.position.set(10, 15, 10);
        this.scene.add(pointLight);
        const magicLight = new THREE.PointLight(0x4444ff, 0.8);
        magicLight.position.set(-10, -10, -10);
        this.scene.add(magicLight);
    }
    
    createAtomMaterial(element) {
        let bgColorStr, textColorStr, emissiveHex;
        if (element === 'C') { bgColorStr = '#2a2a2a'; textColorStr = '#ffffff'; emissiveHex = 0x111111; }
        else if (element === 'H') { bgColorStr = '#ffffff'; textColorStr = '#222222'; emissiveHex = 0x444444; }
        else if (element === 'O') { bgColorStr = '#cc0000'; textColorStr = '#ffffff'; emissiveHex = 0x660000; } // 纯正默认红
        else if (element === 'Na') { bgColorStr = '#aaaaaa'; textColorStr = '#ffdd00'; emissiveHex = 0x554400; }
        else if (element === 'Cu') { bgColorStr = '#cc5500'; textColorStr = '#ffffff'; emissiveHex = 0x883300; }
        else { bgColorStr = '#888888'; textColorStr = '#ffffff'; emissiveHex = 0x000000; }
        
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgColorStr; ctx.fillRect(0, 0, 512, 256);
        ctx.font = 'bold 120px "Courier New", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
        ctx.fillStyle = textColorStr;
        ctx.fillText(element, 128, 128); ctx.fillText(element, 384, 128);
        
        const colorMap = new THREE.CanvasTexture(canvas);
        colorMap.needsUpdate = true;
        if (typeof THREE.SRGBColorSpace !== 'undefined') colorMap.colorSpace = THREE.SRGBColorSpace;
        
        return new THREE.MeshStandardMaterial({ map: colorMap, roughness: 0.4, metalness: 0.3, emissive: emissiveHex, emissiveIntensity: 0.6 });
    }

    createAtom(element, position = null, skipHistory = false, instant = false) {
        let maxBonds = element === 'C' ? 4 : (element === 'H' ? 1 : (element === 'O' ? 2 : 1));
        const material = this.materialCache[element];
        const geometry = this.geometryCache[element];
        const mesh = new THREE.Mesh(geometry, material);
        
        if (position) { mesh.position.copy(position); } 
        else { mesh.position.set((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 16, 0); }

        mesh.userData = { type: element, bonds: 0, maxBonds: maxBonds, id: THREE.MathUtils.generateUUID(), isDragging: false };
        this.scene.add(mesh);
        this.atoms.push(mesh);
        
        this.syncDragControls();

        if (typeof gsap !== 'undefined' && !instant) {
            mesh.scale.set(0, 0, 0);
            gsap.to(mesh.scale, {x: 1, y: 1, z: 1, duration: 0.3, ease: "back.out(1.5)"});
        } else { mesh.scale.set(1, 1, 1); }

        if (!skipHistory) this.historyStack.push({ action: 'add', atoms: [mesh], bonds: [] });
        return mesh;
    }

    checkIfAlreadyBonded(atomA, atomB) {
        return this.bonds.some(bond => !bond.isBroken && ((bond.a === atomA && bond.b === atomB) || (bond.a === atomB && bond.b === atomA)));
    }
    
    createBondVisual(atomA, atomB, colorHex = 0x88ccff) {
        const distance = Math.max(0.1, atomA.position.distanceTo(atomB.position));
        const geometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 8); 
        const material = new THREE.MeshStandardMaterial({ color: colorHex, transparent: true, opacity: 0.7, emissive: 0x224488 });
        const bondMesh = new THREE.Mesh(geometry, material);
        this.scene.add(bondMesh);
        
        const bondObj = { mesh: bondMesh, a: atomA, b: atomB, baseDistance: distance, type: 'single', isBroken: false };
        this.bonds.push(bondObj);
        this.updateBondTransforms();
        return bondObj;
    }

    createSegmentedBondVisual(atomA, atomB, colorHex = 0x88ccff) {
        const distance = Math.max(0.1, atomA.position.distanceTo(atomB.position));
        const geometry = new THREE.CylinderGeometry(0.12, 0.12, 1, 8); geometry.translate(0, 0.5, 0); 
        const material = new THREE.MeshStandardMaterial({ color: colorHex, transparent: true, opacity: 0.8, emissive: 0x224488 });
        
        const halfA = new THREE.Mesh(geometry, material); const halfB = new THREE.Mesh(geometry, material);
        this.scene.add(halfA); this.scene.add(halfB);
        
        const bondObj = { halfA, halfB, a: atomA, b: atomB, baseDistance: distance, type: 'segmented', isBroken: false };
        this.bonds.push(bondObj);
        this.updateBondTransforms();
        return bondObj;
    }
    
    createDoubleBondVisual(atomA, atomB, colorHex = 0xffaa00) {
        const distance = Math.max(0.1, atomA.position.distanceTo(atomB.position));
        const geometry = new THREE.CylinderGeometry(0.12, 0.12, 1, 8);
        const material = new THREE.MeshStandardMaterial({ color: colorHex, transparent: true, opacity: 0.9, emissive: 0xff6600, emissiveIntensity: 1.2 });
        
        const mesh1 = new THREE.Mesh(geometry, material); const mesh2 = new THREE.Mesh(geometry, material);
        const group = new THREE.Group(); group.add(mesh1); group.add(mesh2);
        this.scene.add(group);
        
        const bondObj = { mesh: group, mesh1, mesh2, a: atomA, b: atomB, baseDistance: distance, type: 'double', isBroken: false };
        this.bonds.push(bondObj);
        this.updateBondTransforms();
        return bondObj;
    }
    
    createIonicBondVisual(atomA, atomB) {
        const distance = Math.max(0.1, atomA.position.distanceTo(atomB.position));
        const geometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 12);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, emissive: 0x00aaff, emissiveIntensity: 1.5 });
        const bondMesh = new THREE.Mesh(geometry, material);
        this.scene.add(bondMesh);
        
        const bondObj = { mesh: bondMesh, a: atomA, b: atomB, baseDistance: distance, type: 'ionic', isBroken: false };
        this.bonds.push(bondObj);
        this.updateBondTransforms();
        return bondObj;
    }

    // 🌟 核心修复2：全方位极限清理半键残影（连带子物体一并抹除）
    removeAndReturnHalfBond(atom) {
        let removed = null;
        if (this.brokenHalves) {
            this.brokenHalves = this.brokenHalves.filter(hb => {
                if (hb.atom === atom) {
                    removed = { atom: hb.atom, mesh: hb.mesh, dir: hb.dir ? hb.dir.clone() : new THREE.Vector3(0,1,0) };
                    if (hb.mesh) {
                        if (hb.mesh.parent) hb.mesh.parent.remove(hb.mesh);
                        else this.scene.remove(hb.mesh);
                    }
                    return false;
                }
                return true;
            });
        }
        
        // 【双重保险】如果有被 ReactionDirector 强制设为 H 原子子物体的半键，也强行剔除！
        if (atom && atom.children) {
            const toRemove = [];
            atom.children.forEach(child => {
                if (child.isMesh && child.geometry && child.geometry.type === 'CylinderGeometry') {
                    toRemove.push(child);
                }
            });
            toRemove.forEach(child => atom.remove(child));
        }
        return removed;
    }

    duplicateComponent(component) {
        let atomsToCopy = []; let bondsToCopy = [];
        if (component && component.atoms && component.atoms.length > 0) { atomsToCopy = component.atoms; bondsToCopy = component.bonds || []; } 
        else if (Array.isArray(component) && component.length > 0) { atomsToCopy = component; bondsToCopy = this.bonds.filter(b => atomsToCopy.includes(b.a) && atomsToCopy.includes(b.b)); } 
        else { atomsToCopy = [...this.atoms]; bondsToCopy = [...this.bonds]; }

        atomsToCopy = atomsToCopy.filter(a => this.atoms.includes(a));
        if (atomsToCopy.length === 0) return;

        const center = new THREE.Vector3(); atomsToCopy.forEach(a => center.add(a.position)); center.divideScalar(atomsToCopy.length);
        const offset = new THREE.Vector3(center.x < 0 ? 6 : -6, (Math.random() - 0.5) * 4, 0); 
        
        const atomMap = new Map(); const clonedAtoms = [];
        atomsToCopy.forEach(oldAtom => {
            const newPos = oldAtom.position.clone().add(offset);
            const newAtom = this.createAtom(oldAtom.userData.type, newPos, true, true); 
            newAtom.userData.bonds = 0; 
            
            // 🌟 核心修复1：强制让碳(C)、氢(H)、氧(O)这三种基础元素退去一切特效，回到最纯正默认材质
            if (oldAtom.userData.type === 'C' || oldAtom.userData.type === 'H' || oldAtom.userData.type === 'O') {
                const defaultMat = this.materialCache[oldAtom.userData.type];
                // 1. 重置新复制出来的原子
                newAtom.material = defaultMat;
                newAtom.userData.hasClonedMaterial = false;
                newAtom.userData.originalEmissive = defaultMat.emissive.getHex();
                // 2. 顺手将原结构的原子也还原回出厂的红色/黑色/白色
                oldAtom.material = defaultMat;
                oldAtom.userData.hasClonedMaterial = false;
                oldAtom.userData.originalEmissive = defaultMat.emissive.getHex();
            } else {
                // 对于 Na, Cu 这些金属，我们继承它当前的特殊材质，但洗去绿色框选发光
                if (oldAtom.material) {
                    newAtom.material = oldAtom.material.clone();
                    newAtom.userData.hasClonedMaterial = true;
                    if (oldAtom.userData.originalEmissive !== undefined) {
                        newAtom.material.emissive.setHex(oldAtom.userData.originalEmissive);
                        newAtom.userData.originalEmissive = oldAtom.userData.originalEmissive;
                    }
                }
            }

            atomMap.set(oldAtom, newAtom); clonedAtoms.push(newAtom);

            if (this.brokenHalves) {
                const half = this.brokenHalves.find(hb => hb.atom === oldAtom);
                if (half && half.mesh && half.mesh.geometry && half.mesh.material) {
                    const halfGeo = half.mesh.geometry.clone();
                    const halfMat = half.mesh.material.clone();
                    const halfMesh = new THREE.Mesh(halfGeo, halfMat);
                    halfMesh.position.copy(newPos);
                    this.scene.add(halfMesh);
                    this.brokenHalves.push({
                        atom: newAtom,
                        mesh: halfMesh,
                        dir: half.dir ? half.dir.clone() : new THREE.Vector3(0,1,0)
                    });
                }
            }
        });
        
        const clonedBonds = [];
        bondsToCopy.forEach(oldBond => {
            const newA = atomMap.get(oldBond.a); const newB = atomMap.get(oldBond.b);
            if (newA && newB) {
                let newBond;
                if (oldBond.type === 'double') newBond = this.createDoubleBondVisual(newA, newB);
                else if (oldBond.type === 'segmented') newBond = this.createSegmentedBondVisual(newA, newB, oldBond.halfA.material.color.getHex());
                else if (oldBond.type === 'ionic') newBond = this.createIonicBondVisual(newA, newB); 
                else newBond = this.createBondVisual(newA, newB, oldBond.mesh && oldBond.mesh.material ? oldBond.mesh.material.color.getHex() : 0x88ccff);
                
                newA.userData.bonds++; newB.userData.bonds++; clonedBonds.push(newBond);
                if (window.app && window.app.chemistryEngine) window.app.chemistryEngine.updateGraph(newA, newB);
            }
        });
        
        this.syncDragControls(); 
        this.historyStack.push({ action: 'add', atoms: clonedAtoms, bonds: clonedBonds });
        
        if (window.app && window.app.chemistryEngine) window.app.chemistryEngine.analyzeStructure();
        
        const director = window.app && window.app.reactionDirector ? window.app.reactionDirector : null;
        if (director && window.app.uiManager && window.app.uiManager.currentLevel === 2 && director.interactiveReactionState === 'awaiting_marquee_copy') {
            director.interactiveReactionState = 'awaiting_na_drag';
            if (window.app.uiManager) window.app.uiManager.showMagicNotice("复制成功", "已生成完全独立的分身。现在请拖拽钠(Na)原子进行置换反应！");
        } else {
            if (window.app && window.app.uiManager) window.app.uiManager.showMagicNotice("复制成功", "当前独立结构已克隆完毕！");
        }
    }

    copySelected() {
        if (window.app && window.app.interactionManager && window.app.interactionManager.selectedAtoms && window.app.interactionManager.selectedAtoms.length > 0) {
            this.duplicateComponent(window.app.interactionManager.selectedAtoms);
            window.app.interactionManager.clearSelection();
        }
    }
    
    deleteSelected() {
        if (window.app && window.app.interactionManager && window.app.interactionManager.selectedAtoms && window.app.interactionManager.selectedAtoms.length > 0) {
            window.app.interactionManager.deleteSelectedAtoms();
        }
    }

    updateBondTransforms() {
        this.bonds.forEach(bond => {
            if (bond.isBroken) return; 
            const A = bond.a.position;
            const B = bond.b.position;

            if (bond.lastA && bond.lastB && 
                bond.lastA.distanceToSquared(A) < 0.0001 && 
                bond.lastB.distanceToSquared(B) < 0.0001) {
                return; 
            }

            if (!bond.lastA) bond.lastA = new THREE.Vector3();
            if (!bond.lastB) bond.lastB = new THREE.Vector3();
            bond.lastA.copy(A);
            bond.lastB.copy(B);

            const dist = Math.max(0.01, A.distanceTo(B));
            this._tempDir.subVectors(B, A).normalize();
            
            if (bond.type === 'single' || bond.type === 'ionic') {
                this._tempMid.addVectors(A, B).multiplyScalar(0.5);
                bond.mesh.position.copy(this._tempMid);
                bond.mesh.quaternion.setFromUnitVectors(this._tempUp, this._tempDir);
                bond.mesh.scale.y = dist * (bond.type === 'ionic' ? 1 : 0.8);
            } 
            else if (bond.type === 'segmented') {
                const halfLen = Math.max(0.05, (dist / 2) - 0.05); 
                bond.halfA.position.copy(A); bond.halfA.quaternion.setFromUnitVectors(this._tempUp, this._tempDir); bond.halfA.scale.set(1, halfLen, 1);
                this._tempDirB.copy(this._tempDir).negate();
                bond.halfB.position.copy(B); bond.halfB.quaternion.setFromUnitVectors(this._tempUp, this._tempDirB); bond.halfB.scale.set(1, halfLen, 1);
            } 
            else if (bond.type === 'double') {
                this._tempMid.addVectors(A, B).multiplyScalar(0.5);
                bond.mesh.position.copy(this._tempMid); bond.mesh.quaternion.setFromUnitVectors(this._tempUp, this._tempDir);
                this._tempRight.crossVectors(this._tempDir, this._tempZ).normalize().multiplyScalar(0.25);
                bond.mesh1.position.copy(this._tempRight); bond.mesh1.scale.set(1, dist * 0.7, 1);
                bond.mesh2.position.copy(this._tempRight).negate(); bond.mesh2.scale.set(1, dist * 0.7, 1);
            }
        });
    }

    removeBond(bond) {
        if (!bond) return;
        if (bond.a) bond.a.userData.bonds = Math.max(0, bond.a.userData.bonds - 1);
        if (bond.b) bond.b.userData.bonds = Math.max(0, bond.b.userData.bonds - 1);
        
        if (bond.type === 'segmented') { 
            if (bond.halfA) this.scene.remove(bond.halfA); 
            if (bond.halfB) this.scene.remove(bond.halfB); 
        } else if (bond.mesh) { 
            this.scene.remove(bond.mesh); 
        }
        
        this.bonds = this.bonds.filter(b => b !== bond);
        
        if (window.app && window.app.chemistryEngine) {
            window.app.chemistryEngine.rebuildGraph();
            window.app.chemistryEngine.analyzeStructure();
        }
    }

    removeAtoms(atomsArray, skipHistory = false) {
        if (!atomsArray || atomsArray.length === 0) return;
        const historyRecord = { action: 'delete', atoms: [], bonds: [], brokenHalves: [] };

        atomsArray.forEach(atom => {
            if (!this.atoms.includes(atom)) return;
            
            const bondsToRemove = this.bonds.filter(b => b.a === atom || b.b === atom);
            bondsToRemove.forEach(bond => {
                if (!historyRecord.bonds.includes(bond)) {
                    historyRecord.bonds.push(bond);
                    if (bond.type === 'segmented') { this.scene.remove(bond.halfA); this.scene.remove(bond.halfB); } 
                    else if (bond.mesh) { this.scene.remove(bond.mesh); }
                    
                    if (bond.a) bond.a.userData.bonds = Math.max(0, bond.a.userData.bonds - 1);
                    if (bond.b) bond.b.userData.bonds = Math.max(0, bond.b.userData.bonds - 1);
                }
            });
            this.bonds = this.bonds.filter(b => !historyRecord.bonds.includes(b));
            
            if (this.brokenHalves) {
                this.brokenHalves = this.brokenHalves.filter(hb => {
                    if (hb.atom === atom) {
                        historyRecord.brokenHalves.push({ atom: hb.atom, mesh: hb.mesh, dir: hb.dir ? hb.dir.clone() : new THREE.Vector3(0,1,0) });
                        if (hb.mesh) {
                            if (hb.mesh.parent) hb.mesh.parent.remove(hb.mesh);
                            else this.scene.remove(hb.mesh);
                        }
                        return false;
                    }
                    return true;
                });
            }

            historyRecord.atoms.push(atom);
            if (typeof gsap !== 'undefined' && !skipHistory) {
                gsap.to(atom.scale, { x: 0, y: 0, z: 0, duration: 0.2, onComplete: () => { this.scene.remove(atom); }});
            } else { this.scene.remove(atom); }
            const index = this.atoms.indexOf(atom); if (index > -1) this.atoms.splice(index, 1);
        });

        this.syncDragControls(); 
        if (!skipHistory && historyRecord.atoms.length > 0) this.historyStack.push(historyRecord);
        if (window.app && window.app.chemistryEngine) {
            window.app.chemistryEngine.rebuildGraph(); window.app.chemistryEngine.analyzeStructure();
        }
    }

    removeAtom(atom, skipHistory = false) { this.removeAtoms([atom], skipHistory); }

    undoLast() {
        if (this.historyStack.length === 0) {
            if (window.app && window.app.uiManager) window.app.uiManager.showMagicNotice("撤销完毕", "场景已经退回最开始的状态啦！");
            return;
        }
        const lastRecord = this.historyStack.pop();
        
        if (lastRecord.action === 'add') {
            this.removeAtoms(lastRecord.atoms, true);
        } 
        else if (lastRecord.action === 'delete') {
            lastRecord.atoms.forEach(atom => {
                this.scene.add(atom); this.atoms.push(atom);
                if (typeof gsap !== 'undefined') { atom.scale.set(0, 0, 0); gsap.to(atom.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: "back.out(1.5)" }); }
            });
            lastRecord.bonds.forEach(bond => {
                if (bond.type === 'segmented') { this.scene.add(bond.halfA); this.scene.add(bond.halfB); } 
                else if (bond.mesh) { this.scene.add(bond.mesh); bond.mesh.visible = true; }
                bond.isBroken = false; 
                this.bonds.push(bond); 
                if (bond.a) bond.a.userData.bonds++; 
                if (bond.b) bond.b.userData.bonds++;
                bond.lastA = null; bond.lastB = null; 
            });
            if (lastRecord.brokenHalves) {
                lastRecord.brokenHalves.forEach(hb => {
                    this.scene.add(hb.mesh);
                    this.brokenHalves.push(hb);
                });
            }
            this.syncDragControls();
        } 
        else if (lastRecord.action === 'add_bond') {
            if (lastRecord.bonds) lastRecord.bonds.forEach(bond => this.removeBond(bond));
            if (lastRecord.restoredHalves) {
                lastRecord.restoredHalves.forEach(hb => {
                    this.scene.add(hb.mesh);
                    this.brokenHalves.push(hb);
                });
            }
        }
    }

    clearAll() {
        const atomsToRemove = [...this.atoms]; 
        this.removeAtoms(atomsToRemove, false); 
        
        if (window.app && window.app.chemistryEngine && typeof window.app.chemistryEngine.resetReactionState === 'function') {
            window.app.chemistryEngine.resetReactionState();
        }
        if (window.app && window.app.reactionDirector && typeof window.app.reactionDirector.resetReactionState === 'function') {
            window.app.reactionDirector.resetReactionState();
        }
    }
    
    autoBuildEthane() {
        this.clearAll();
        const newAtoms = [];
        const c1 = this.createAtom('C', new THREE.Vector3(-1.5, 0, 0), true, true); newAtoms.push(c1);
        const c2 = this.createAtom('C', new THREE.Vector3(1.5, 0, 0), true, true); newAtoms.push(c2);
        const h1 = this.createAtom('H', new THREE.Vector3(-1.5, 2.5, 0), true, true); newAtoms.push(h1);
        const h2 = this.createAtom('H', new THREE.Vector3(-1.5, -2.5, 0), true, true); newAtoms.push(h2);
        const h3 = this.createAtom('H', new THREE.Vector3(-4.0, 0, 0), true, true); newAtoms.push(h3);
        const h4 = this.createAtom('H', new THREE.Vector3(1.5, 2.5, 0), true, true); newAtoms.push(h4);
        const h5 = this.createAtom('H', new THREE.Vector3(1.5, -2.5, 0), true, true); newAtoms.push(h5);
        const h6 = this.createAtom('H', new THREE.Vector3(4.0, 0, 0), true, true); newAtoms.push(h6);
        const bonds = [[c1, c2], [c1, h1], [c1, h2], [c1, h3], [c2, h4], [c2, h5], [c2, h6]];
        bonds.forEach(pair => { this.createBondVisual(pair[0], pair[1]); pair[0].userData.bonds++; pair[1].userData.bonds++; });
        
        this.historyStack.push({ action: 'add', atoms: newAtoms, bonds: [] });
    }

    autoBuildEthanol() {
        this.clearAll();
        const newAtoms = [];
        const c1 = this.createAtom('C', new THREE.Vector3(-2, 0, 0), true, true); newAtoms.push(c1);
        const c2 = this.createAtom('C', new THREE.Vector3(1.2, 0, 0), true, true); newAtoms.push(c2);
        const o1 = this.createAtom('O', new THREE.Vector3(4, -1, 0), true, true); newAtoms.push(o1);
        const h1 = this.createAtom('H', new THREE.Vector3(-2, 2.5, 0), true, true); newAtoms.push(h1);
        const h2 = this.createAtom('H', new THREE.Vector3(-2, -2.5, 0), true, true); newAtoms.push(h2);
        const h3 = this.createAtom('H', new THREE.Vector3(-4.5, 0, 0), true, true); newAtoms.push(h3);
        const h4 = this.createAtom('H', new THREE.Vector3(1.2, 2.5, 0), true, true); newAtoms.push(h4);
        const h5 = this.createAtom('H', new THREE.Vector3(1.2, -2.5, 0), true, true); newAtoms.push(h5);
        const h6 = this.createAtom('H', new THREE.Vector3(5.5, 1, 0), true, true); newAtoms.push(h6);
        
        const singleBonds = [[c1, c2], [c2, o1], [c1, h1], [c1, h2], [c1, h3], [c2, h4], [c2, h5]];
        singleBonds.forEach(pair => {
            this.createBondVisual(pair[0], pair[1]); pair[0].userData.bonds++; pair[1].userData.bonds++;
            if (window.app && window.app.chemistryEngine) window.app.chemistryEngine.updateGraph(pair[0], pair[1]);
        });
        this.createBondVisual(o1, h6); o1.userData.bonds++; h6.userData.bonds++;
        if (window.app && window.app.chemistryEngine) { window.app.chemistryEngine.updateGraph(o1, h6); window.app.chemistryEngine.analyzeStructure(); }
        
        this.historyStack.push({ action: 'add', atoms: newAtoms, bonds: [] });
    }

    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        const width = this.container.clientWidth; const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;
        this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height);
    }
    
    animate() {
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        if (this.physicsEngine) {
            this.physicsAccumulator += delta;
            let steps = 0;
            while (this.physicsAccumulator >= this.PHYSICS_STEP && steps < 3) {
                if (typeof this.physicsEngine.applyPhysics === 'function') {
                    this.physicsEngine.applyPhysics();
                }
                this.physicsAccumulator -= this.PHYSICS_STEP;
                steps++;
            }
        }

        this.updateBondTransforms();

        if (this.brokenHalves) {
            this.brokenHalves.forEach(hb => {
                if (hb.mesh && hb.atom) {
                    hb.mesh.position.copy(hb.atom.position);
                    if (hb.dir) hb.mesh.quaternion.setFromUnitVectors(this._tempUp, hb.dir);
                }
            });
        }

        const camQuat = this.camera.quaternion; 
        this.atoms.forEach((atom, index) => {
            if(atom.userData.bonds === 0 && !atom.userData.isDragging) atom.position.y += Math.sin(time * 2 + index) * 0.002;
            atom.quaternion.copy(camQuat); 
        });

        this.renderer.render(this.scene, this.camera);
    }
}