/** 反应动画导演 (ReactionDirector.js) 
 * 🌟 深度防呆版：所有C, H, O元素在任意反应和点击阶段强制不修改原生材质色
 * 🌟 体验优化版：将C,H,O点击变色发光的视觉反馈，改成了更加灵动的放大回弹特效
 * 🌟 水分子成键终极守护：完善多状态下拖拽/点击并存成键的鲁棒性判定
 * 🌟 死锁修复版：完美修复催化氧化模块中“Cu按钮”和“重置交互步骤”失效无法触发的问题
 * 🌟 局部清理版：在生成新化学键时，恢复“只精准隐藏当前参与成键原子的半键”的逻辑
 * 🌟 催化脱落完善版：氧化铜断裂后，铜元素向右上方飘走，氧元素同步向右下角飘落分离
 * 🌟 自由断键版：催化氧化时，α碳上的两个C-H键皆可作为目标，任选其一断裂后自动锁定
 * 🌟 瞬间无痕版：彻底解决成水时半键残留需点击才消失的问题，只要成键瞬间无延迟隐藏
 */
class ReactionDirector {
    constructor(engine) {
        this.engine = engine;
        this.sm = engine.sceneManager;
        this.um = engine.uiManager;
        this.tp = engine.topology; 

        this.isReactionPlaying = false; 
        
        this._interactiveReactionState = 'idle'; 
        this.completedReactions = [];     
        this.currentReactionType = null;  
        this.loadProgress();              

        this.activeReactionSite = null; 
        
        this.cinematicTimeout = null; 
        this.brokenOxidationBonds = 0;
        
        this.isAnimating = false; 
        
        this.snapConfig = {
            naExchange: 2.5,
            h2Assembly: 3.5, 
            cuIntervene: 2.5,
            waterAssembly: 3.5
        };
        
        this._tempDir1 = new THREE.Vector3();
        this._tempDir2 = new THREE.Vector3();
        this._tempUp = new THREE.Vector3(0, 1, 0);

        this._handleCanvasPointerDown = this.handleCanvasPointerDown.bind(this);
    }

    get interactiveReactionState() {
        return this._interactiveReactionState;
    }

    set interactiveReactionState(val) {
        this._interactiveReactionState = val;
        this.saveProgress();
    }

    saveProgress() {
        try {
            const progressData = {
                state: this._interactiveReactionState,
                reactionType: this.currentReactionType,
                completedReactions: Array.from(this.completedReactions)
            };
            localStorage.setItem('ReactionDirector_Progress', JSON.stringify(progressData));
        } catch(e) { }
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('ReactionDirector_Progress');
            if (saved) {
                const data = JSON.parse(saved);
                this._interactiveReactionState = data.state || 'idle';
                this.currentReactionType = data.reactionType || null;
                this.completedReactions = data.completedReactions || [];
            }
        } catch(e) {}
    }

    resumeProgress() {
        if (this.completedReactions.length > 0) {
            console.log("✅ 存档已读取，已完成的反应:", this.completedReactions);
            if (this.um) this.um.showMagicNotice("存档已读取", "您之前完成的实验进度已被系统记录！");
        }

        if (this.currentReactionType && this._interactiveReactionState !== 'idle' && this._interactiveReactionState !== 'completed') {
            setTimeout(() => {
                if (this.currentReactionType === 'sodium') {
                    this.startStandardSodiumFlow();
                } else if (this.currentReactionType === 'oxidation') {
                    this.startStandardOxidationFlow();
                }
            }, 500); 
        }
    }

    clearProgress() {
        try {
            localStorage.removeItem('ReactionDirector_Progress');
            this.completedReactions = [];
            this.currentReactionType = null;
            this.interactiveReactionState = 'idle';
        } catch(e) {}
    }

    forceReleaseObjectFromDrag(objArray) {
        if (this.sm && this.sm.dragControls) {
            this.sm.dragControls.enabled = false;
            if(objArray && this.sm.dragControls.objects) {
                this.sm.dragControls.objects = this.sm.dragControls.objects.filter(o => !objArray.includes(o));
            }
            try {
                const canvas = this.sm.renderer.domElement;
                canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
            } catch(e) {}
            setTimeout(() => {
                if (this.sm && this.sm.dragControls) this.sm.dragControls.enabled = true;
            }, 50);
        }
    }

    getHydroxylSite() {
        const bondOH = this.sm.bonds.find(b => !b.isBroken && 
            ((b.a.userData.type === 'O' && b.b.userData.type === 'H') || 
             (b.b.userData.type === 'O' && b.a.userData.type === 'H'))
        );
        if (!bondOH) return null;
        
        const atomO = bondOH.a.userData.type === 'O' ? bondOH.a : bondOH.b;
        const atomH = bondOH.a.userData.type === 'H' ? bondOH.a : bondOH.b;
        
        const bondCO = this.sm.bonds.find(b => !b.isBroken && 
            ((b.a === atomO && b.b.userData.type === 'C') || 
             (b.b === atomO && b.a.userData.type === 'C'))
        );
        let allBondCHs = [];
        let atomC = null;
        if (bondCO) {
            atomC = bondCO.a === atomO ? bondCO.b : bondCO.a;
            allBondCHs = this.sm.bonds.filter(b => !b.isBroken && 
                ((b.a === atomC && b.b.userData.type === 'H') || 
                 (b.b === atomC && b.a.userData.type === 'H'))
            );
        }
        return { atomO, atomH, atomC, bondOH, allBondCHs };
    }

    getOxidationSite() {
        const site = this.getHydroxylSite();
        if (!site || site.allBondCHs.length === 0) return null;

        const bondCH = site.allBondCHs[0];
        const atomH_C = bondCH.a === site.atomC ? bondCH.b : bondCH.a;

        return { 
            atomO: site.atomO, 
            atomH_O: site.atomH, 
            atomC: site.atomC, 
            atomH_C: atomH_C, 
            bondOH: site.bondOH, 
            bondCH: bondCH, 
            bondCO: this.sm.bonds.find(b => !b.isBroken && ((b.a === site.atomO && b.b === site.atomC) || (b.b === site.atomO && b.a === site.atomC))), 
            allBondCHs: site.allBondCHs 
        };
    }

    breakBondIntoHalves(bond) {
        bond.isBroken = true; 
        this.sm.brokenHalves = this.sm.brokenHalves || [];
        
        const dirA = new THREE.Vector3().subVectors(bond.b.position, bond.a.position).normalize();
        const dirB = dirA.clone().negate();

        let meshA, meshB;
        if (bond.type === 'segmented') {
            meshA = bond.halfA;
            meshB = bond.halfB;
        } else {
            if (bond.mesh) bond.mesh.visible = false;
            const geo = new THREE.CylinderGeometry(0.12, 0.12, 1, 8);
            geo.translate(0, 0.5, 0); 
            const colorHex = (bond.mesh && bond.mesh.material) ? bond.mesh.material.color.getHex() : 0x88ccff;
            const mat = new THREE.MeshStandardMaterial({ color: colorHex, transparent: true, opacity: 0.8, emissive: 0x224488 });
            meshA = new THREE.Mesh(geo, mat);
            meshB = new THREE.Mesh(geo, mat);
            
            const parentGroup = bond.a.parent || this.sm.scene;
            parentGroup.add(meshA);
            parentGroup.add(meshB);
            
            const dist = Math.max(0.1, bond.a.position.distanceTo(bond.b.position));
            meshA.scale.set(1, dist/2, 1);
            meshB.scale.set(1, dist/2, 1);
        }

        const trackA = { mesh: meshA, atom: bond.a, dir: dirA };
        const trackB = { mesh: meshB, atom: bond.b, dir: dirB };
        this.sm.brokenHalves.push(trackA);
        this.sm.brokenHalves.push(trackB);

        bond.a.userData.bonds--;
        bond.b.userData.bonds--;
        
        return { trackA, trackB };
    }

    undoLastAction() {
        if (this.interactiveReactionState !== 'idle' && this.interactiveReactionState !== 'completed') {
            this.um.showMagicNotice("撤销", "已撤回操作，恢复初始状态。");
            this.retryInteractiveReaction();
        } else if (this.interactiveReactionState === 'idle') {
            this.sm.undoLast();
        } else {
            this.um.showMagicNotice("提示", "反应已结束，无法单步撤回，请点击【重置交互步骤】。");
        }
    }

    resetReactionState() {
        this.isReactionPlaying = false;
        this.interactiveReactionState = 'idle';
        this.isAnimating = false; 
        this.brokenOxidationBonds = 0; 
        if (this.cinematicTimeout) clearTimeout(this.cinematicTimeout);
        
        const btnMarquee = document.getElementById('btn-marquee-tool');
        if (btnMarquee && typeof gsap !== 'undefined') {
            gsap.killTweensOf(btnMarquee);
            btnMarquee.style.boxShadow = 'none';
        }

        if (this.atomNa) { if(this.atomNa.parent) this.atomNa.parent.remove(this.atomNa); this.atomNa = null; }
        if (this.atomH2_copy) { 
            if(this.atomH2_copy.parent) this.atomH2_copy.parent.remove(this.atomH2_copy); 
            if(this.sm.atoms) this.sm.atoms = this.sm.atoms.filter(a => a !== this.atomH2_copy);
            if(this.sm.dragControls && this.sm.dragControls.objects) {
                this.sm.dragControls.objects = this.sm.dragControls.objects.filter(o => o !== this.atomH2_copy);
            }
            this.atomH2_copy = null; 
        }
        if (this.assembledH2Bond && this.assembledH2Bond.mesh) { if(this.assembledH2Bond.mesh.parent) this.assembledH2Bond.mesh.parent.remove(this.assembledH2Bond.mesh); this.assembledH2Bond = null; }

        if (this.meshCu) { if(this.meshCu.parent) this.meshCu.parent.remove(this.meshCu); this.meshCu = null; }
        if (this.meshO_cat) { if(this.meshO_cat.parent) this.meshO_cat.parent.remove(this.meshO_cat); this.meshO_cat = null; }
        if (this.meshBondCuO) { if(this.meshBondCuO.parent) this.meshBondCuO.parent.remove(this.meshBondCuO); this.meshBondCuO = null; }
        
        this.assembledWaterBonds = [];
        
        if (this.bondPulse && typeof this.bondPulse.kill === 'function') this.bondPulse.kill(); 
        if (this.atomPulse && typeof this.atomPulse.kill === 'function') this.atomPulse.kill();
        if (typeof gsap !== 'undefined' && this.sm.camera) gsap.killTweensOf(this.sm.camera.position);
        const eqDiv = document.getElementById('equation-minigame-overlay'); 
        if (eqDiv) eqDiv.remove();

        if (this.sm && this.sm.renderer && this.sm.renderer.domElement) {
            this.sm.renderer.domElement.removeEventListener('pointerdown', this._handleCanvasPointerDown, { capture: true });
        }
    }

    createMagicalSodiumAtom() {
        const material = this.sm.createAtomMaterial('Na');
        material.emissive.setHex(0xffaa00); material.emissiveIntensity = 0.5;
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.3, 32, 32), material);
        mesh.userData = { type: 'Na', bonds: 0, maxBonds: 1, id: 'Na_Reaction_Atom', isDragging: false };
        return mesh;
    }

    createMagicalCopperAtom() {
        const material = this.sm.createAtomMaterial('Cu').clone();
        material.emissive.setHex(0xff5500); material.emissiveIntensity = 0.5;
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 32), material);
        mesh.userData = { type: 'Cu', bonds: 0, maxBonds: 2, id: 'Cu_Reaction_Atom', isDragging: false };
        return mesh;
    }

    startStandardSodiumFlow() {
        this.resetReactionState();
        this.currentReactionType = 'sodium'; 
        this.sm.autoBuildEthanol(); 
        this.isReactionPlaying = true;
        
        this.activeReactionSite = this.getHydroxylSite();
        if (!this.activeReactionSite) {
            this.isReactionPlaying = false;
            return;
        }

        if (this.um) {
            this.um.lastReactionType = 'sodium';
            this.um.unlockMain3DView('ethanol');
        }
        
        this.startInteractiveSodiumReaction();
    }

    async playSodiumReaction() {
        this.startStandardSodiumFlow();
    }

    playOxidationReaction() {
        this.startStandardOxidationFlow();
    }

    startStandardOxidationFlow() {
        this.resetReactionState();
        this.currentReactionType = 'oxidation'; 
        this.sm.autoBuildEthanol(); 
        this.isReactionPlaying = true;
        
        this.activeReactionSite = this.getOxidationSite();
        if (!this.activeReactionSite) {
            this.isReactionPlaying = false;
            return;
        }

        if (this.um) {
            this.um.lastReactionType = 'oxidation';
            this.um.unlockMain3DView('ethanol');
        }
        
        this.sm.renderer.domElement.addEventListener('pointerdown', this._handleCanvasPointerDown, { capture: true });

        this.startInteractiveOxidationReaction();
    }

    startInteractiveSodiumReaction() {
        this.isReactionPlaying = false; 
        const btnRetry = document.getElementById('btn-retry-interaction');
        if (btnRetry) btnRetry.classList.remove('hidden');

        const { atomO, atomH, bondOH, allBondCHs } = this.activeReactionSite;
        const hydroxylMidPoint = new THREE.Vector3().addVectors(atomO.position, atomH.position).multiplyScalar(0.5);
        this.atomNa = this.createMagicalSodiumAtom();
        
        const naPosX = hydroxylMidPoint.x + 5; const naPosY = hydroxylMidPoint.y + 4;
        this.atomNa.position.set(naPosX, naPosY, 0);
        
        const parentGroup = atomO.parent || this.sm.scene;
        parentGroup.add(this.atomNa); 
        this.sm.atoms.push(this.atomNa); 
        if (this.sm.dragControls && this.sm.dragControls.objects) {
            this.sm.dragControls.objects.push(this.atomNa);
        }

        const geoNa = new THREE.CylinderGeometry(0.12, 0.12, 1, 8);
        geoNa.translate(0, 0.5, 0); 
        const matNa = new THREE.MeshStandardMaterial({ color: 0xffff00, transparent: true, opacity: 0.9, emissive: 0x888800 });
        const halfNa = new THREE.Mesh(geoNa, matNa);
        halfNa.raycast = function() {}; 
        parentGroup.add(halfNa);
        
        this.atomNaHalf = { mesh: halfNa, atom: this.atomNa, dir: new THREE.Vector3(0,1,0) };
        this.sm.brokenHalves.push(this.atomNaHalf);
        halfNa.scale.set(1, 0, 1); 

        const camTargetX = (hydroxylMidPoint.x + naPosX) / 2; const camTargetY = (hydroxylMidPoint.y + naPosY) / 2;
        
        if (typeof gsap !== 'undefined') {
            gsap.to(this.sm.camera.position, { x: camTargetX, y: camTargetY, z: 22, duration: 1.5, ease: "power2.inOut" });
        }
        
        this.um.showMagicNotice("🗡️ 第一步：切断", "置换反应发生！请点击切断乙醇分子末端的 O-H 键！");

        const targets = [bondOH, ...allBondCHs];
        if (typeof gsap !== 'undefined') {
            const meshesToPulse = targets.map(b => b.type === 'segmented' ? b.halfA.material.emissive : b.mesh.material.emissive);
            this.bondPulse = gsap.to(meshesToPulse, { r: 1, g: 0, b: 0, duration: 0.5, yoyo: true, repeat: -1 });
        }
        this.interactiveReactionState = 'awaiting_bond_break';
    }

    startInteractiveOxidationReaction() {
        this.isReactionPlaying = false; 
        const btnRetry = document.getElementById('btn-retry-interaction');
        if (btnRetry) btnRetry.classList.remove('hidden');

        const { atomO, atomC } = this.activeReactionSite;
        const hydroxylMidPoint = new THREE.Vector3().addVectors(atomO.position, atomC.position).multiplyScalar(0.5);
        
        this.meshCu = this.createMagicalCopperAtom();
        this.meshCu.userData.originalColor = this.meshCu.material.color.getHex();
        this.meshCu.material.color.setHex(0x4a4a4a); 
        this.meshCu.material.emissive.setHex(0x1a1a1a); 

        const cuPosX = hydroxylMidPoint.x + 6; 
        const cuPosY = hydroxylMidPoint.y + 4;
        this.meshCu.position.set(cuPosX, cuPosY, 0);
        
        const parentGroup = atomO.parent || this.sm.scene;
        parentGroup.add(this.meshCu); 
        this.sm.atoms.push(this.meshCu); 
        if (this.sm.dragControls && this.sm.dragControls.objects) {
            this.sm.dragControls.objects.push(this.meshCu);
        }

        const geoO = new THREE.SphereGeometry(1.0, 32, 32);
        const matO = this.sm.createAtomMaterial('O');
        this.meshO_cat = new THREE.Mesh(geoO, matO);
        this.meshO_cat.position.set(1.5, 0, 0);
        this.meshCu.add(this.meshO_cat); 

        const bondGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 8);
        const bondMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.7, emissive: 0x224488 });
        this.meshBondCuO = new THREE.Mesh(bondGeo, bondMat);
        
        this.meshCu.add(this.meshBondCuO);
        this.meshBondCuO.position.set(0.75, 0, 0);
        this.meshBondCuO.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), new THREE.Vector3(1,0,0));

        const camTargetX = (hydroxylMidPoint.x + cuPosX) / 2; 
        const camTargetY = (hydroxylMidPoint.y + cuPosY) / 2;
        
        if (typeof gsap !== 'undefined') {
            gsap.to(this.sm.camera.position, { x: camTargetX, y: camTargetY, z: 25, duration: 1.5, ease: "power2.inOut" });
            this.atomPulse = gsap.to(this.meshCu.material.emissive, { r: 0.3, g: 0.3, b: 0.3, duration: 0.6, yoyo: true, repeat: -1 });
        }
        
        this.um.showMagicNotice("🔥 催化氧化", "请拖拽暗灰色的氧化铜(CuO)到乙醇分子的氧(O)原子附近进行催化！");
        this.interactiveReactionState = 'awaiting_cu_drag';
    }

    handleCanvasPointerDown(e) {
        if (this.interactiveReactionState !== 'awaiting_double_bond_form' && 
            this.interactiveReactionState !== 'awaiting_water_assembly' &&
            this.interactiveReactionState !== 'awaiting_oxidation_bond_break') return;
        
        const rect = this.sm.renderer.domElement.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (clientX === undefined) {
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
            } else if (e.changedTouches && e.changedTouches.length > 0) {
                clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY;
            }
        }
        if (clientX === undefined) return;

        const mouse = new THREE.Vector2();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.sm.camera);
        const intersects = raycaster.intersectObjects(this.sm.atoms);
        
        if (intersects.length > 0) {
            const clickedAtom = intersects[0].object;
            const site = this.activeReactionSite;
            if (!site) return;

            if (this.interactiveReactionState === 'awaiting_oxidation_bond_break') {
                if (clickedAtom === this.meshCu || clickedAtom === this.meshO_cat) {
                    if (site.bondCuO && !site.bondCuO.isBroken) {
                        this.handleOxidationBondClick(site.bondCuO);
                        return;
                    }
                }
            }
            
            if (this.interactiveReactionState === 'awaiting_double_bond_form') {
                if (clickedAtom === site.atomC) {
                    site.clickedC = true;
                    if (typeof gsap !== 'undefined') gsap.to(clickedAtom.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.15, yoyo: true, repeat: 1 });
                }
                if (clickedAtom === site.atomO) {
                    site.clickedO = true;
                    if (typeof gsap !== 'undefined') gsap.to(clickedAtom.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.15, yoyo: true, repeat: 1 });
                }
                if (site.clickedC && site.clickedO) {
                    this.formDoubleBond();
                }
            }
            else if (this.interactiveReactionState === 'awaiting_water_assembly') {
                let changed = false;
                if (clickedAtom === this.meshO_cat && !site.clickedWaterO) {
                    site.clickedWaterO = true; changed = true;
                    if (typeof gsap !== 'undefined') gsap.to(clickedAtom.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.15, yoyo: true, repeat: 1 });
                }
                else if (clickedAtom === site.atomH_O && !site.clickedWaterH1) {
                    site.clickedWaterH1 = true; changed = true;
                    if (typeof gsap !== 'undefined') gsap.to(clickedAtom.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.15, yoyo: true, repeat: 1 });
                }
                else if (clickedAtom === site.atomH_C && !site.clickedWaterH2) {
                    site.clickedWaterH2 = true; changed = true;
                    if (typeof gsap !== 'undefined') gsap.to(clickedAtom.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.15, yoyo: true, repeat: 1 });
                }

                if (changed && site.clickedWaterO && site.clickedWaterH1 && site.clickedWaterH2) {
                    this.autoAssembleWater();
                }
            }
        }
    }

    formDoubleBond() {
        if (this.atomPulse && typeof this.atomPulse.kill === 'function') this.atomPulse.kill();
        
        const site = this.activeReactionSite;
        if (!site.bondCO.isDoubleBondConverted) {
            site.bondCO.isDoubleBondConverted = true;
            
            if (this.sm.removeBond) {
                this.sm.removeBond(site.bondCO);
            } else {
                if (site.bondCO.mesh && site.bondCO.mesh.parent) site.bondCO.mesh.parent.remove(site.bondCO.mesh);
                else this.sm.scene.remove(site.bondCO.mesh);
                this.sm.bonds = this.sm.bonds.filter(b => b !== site.bondCO);
            }

            const db = this.sm.createDoubleBondVisual(site.atomC, site.atomO, 0xff00cc);
            site.atomC.userData.bonds++; site.atomO.userData.bonds++;
            if (this.tp) this.tp.updateGraph(site.atomC, site.atomO);

            if (this.sm.brokenHalves) {
                this.sm.brokenHalves.forEach(hb => {
                    if ((hb.atom === site.atomC || hb.atom === site.atomO) && hb.mesh) {
                        hb.mesh.visible = false;
                    }
                });
            }
        }

        if (this.sm.interactionManager && this.sm.interactionManager.clearSelection) {
            this.sm.interactionManager.clearSelection();
        }

        site.clickedWaterO = false;
        site.clickedWaterH1 = false;
        site.clickedWaterH2 = false;

        this.interactiveReactionState = 'awaiting_water_assembly';
        this.um.showMagicNotice("💧 组装水分子", "C=O双键已形成（乙醛）。请依次点击游离的【氧原子(O)】和两个【氢原子(H)】（或直接进行拖拽组装），将它们生成为水！");
    }

    autoAssembleWater() {
        if (this.assembledWaterBonds && this.assembledWaterBonds.length >= 2) return;
        
        if (this.assembledWaterBonds && this.assembledWaterBonds.length > 0) {
            this.assembledWaterBonds.forEach(b => {
                if(b.mesh && b.mesh.parent) b.mesh.parent.remove(b.mesh);
                else this.sm.scene.remove(b.mesh);
            });
        }
        this.assembledWaterBonds = [];
        
        const site = this.activeReactionSite;
        this.isAnimating = true;
        this.forceReleaseObjectFromDrag([this.meshO_cat, site.atomH_O, site.atomH_C]);
        
        // 🌟 只要发生自动吸附，立刻无延迟清除与之相关的残留半键
        const hideHalf = (atom) => {
            if (this.sm.brokenHalves) {
                this.sm.brokenHalves.forEach(hb => {
                    if (hb.atom === atom && hb.mesh) {
                        hb.mesh.visible = false;
                    }
                });
            }
        };
        hideHalf(site.atomH_O);
        hideHalf(site.atomH_C);
        hideHalf(this.meshO_cat);
        
        this.interactiveReactionState = 'completed'; 
        
        if (typeof gsap !== 'undefined') {
            gsap.to(site.atomH_O.position, {
                x: this.meshO_cat.position.x - 0.7, y: this.meshO_cat.position.y - 0.7, z: 0.6, duration: 0.5
            });
            gsap.to(site.atomH_C.position, {
                x: this.meshO_cat.position.x + 0.7, y: this.meshO_cat.position.y - 0.7, z: -0.6, duration: 0.5,
                onComplete: () => {
                    this.assembledWaterBonds = [
                        this.sm.createBondVisual(site.atomH_O, this.meshO_cat, 0xaaaaaa),
                        this.sm.createBondVisual(site.atomH_C, this.meshO_cat, 0xaaaaaa)
                    ];
                    site.atomH_O.userData.bonds = (site.atomH_O.userData.bonds || 0) + 1; 
                    site.atomH_C.userData.bonds = (site.atomH_C.userData.bonds || 0) + 1; 
                    this.meshO_cat.userData.bonds = (this.meshO_cat.userData.bonds || 0) + 2;
                    this.isAnimating = false;
                    this.finalizeOxidationReaction();
                }
            });
        } else {
            site.atomH_O.position.set(this.meshO_cat.position.x - 0.7, this.meshO_cat.position.y - 0.7, 0.6);
            site.atomH_C.position.set(this.meshO_cat.position.x + 0.7, this.meshO_cat.position.y - 0.7, -0.6);
            this.assembledWaterBonds = [
                this.sm.createBondVisual(site.atomH_O, this.meshO_cat, 0xaaaaaa),
                this.sm.createBondVisual(site.atomH_C, this.meshO_cat, 0xaaaaaa)
            ];
            this.isAnimating = false;
            this.finalizeOxidationReaction();
        }
    }

    handleSodiumBondClick(clickedBondObj) {
        if (clickedBondObj !== this.activeReactionSite.bondOH) {
            if (this.activeReactionSite.allBondCHs.includes(clickedBondObj)) {
                this.um.showMagicNotice("❌ 错误", "钠与乙醇的反应中，断裂的不是碳氢键！");
            }
            if (typeof gsap !== 'undefined') {
                const m = clickedBondObj.type === 'segmented' ? clickedBondObj.halfA : clickedBondObj.mesh;
                gsap.killTweensOf(m.material.emissive); 
                gsap.to(m.material.emissive, { r: 1, g: 0, b: 0, duration: 0.05, yoyo: true, repeat: 5 });
            }
            return; 
        }

        this.interactiveReactionState = 'awaiting_na_drag';
        if (this.bondPulse && typeof this.bondPulse.kill === 'function') this.bondPulse.kill(); 

        this.activeReactionSite.allBondCHs.forEach(b => {
            const m = b.type === 'segmented' ? b.halfA : b.mesh;
            m.material.emissive.setHex(0x224488);
        });

        const { atomO, atomH, bondOH } = this.activeReactionSite;
        this.breakBondIntoHalves(bondOH);
        
        if (this.tp && this.tp.graph) {
            try {
                const arrO = this.tp.graph.get(atomO);
                if (arrO) arrO.splice(arrO.indexOf(atomH), 1);
                const arrH = this.tp.graph.get(atomH);
                if (arrH) arrH.splice(arrH.indexOf(atomO), 1);
            } catch(e) {}
        }

        if (typeof gsap !== 'undefined') {
            gsap.to(atomH.position, { x: atomO.position.x + 4, y: atomO.position.y + 4, duration: 0.6, ease: "power2.out" });
        } else {
            atomH.position.set(atomO.position.x + 4, atomO.position.y + 4, 0);
        }

        this.um.showMagicNotice("🗡️ 第二步：置换", "O-H键已断裂！请将发光的钠原子(Na)随意拖动来引发置换。");
        if (typeof gsap !== 'undefined') {
            this.atomPulse = gsap.to(this.atomNa.material.emissive, { r: 0.8, g: 0.8, b: 0.2, duration: 0.6, yoyo: true, repeat: -1 });
        }
    }

    handleOxidationBondClick(clickedBondObj) {
        const site = this.activeReactionSite;
        const isBondCH = site.allBondCHs.includes(clickedBondObj);

        if (clickedBondObj !== site.bondOH && !isBondCH && clickedBondObj !== site.bondCuO) {
            this.um.showMagicNotice("❌ 错误", "请点击红色的发光化学键！");
            return;
        }

        if (clickedBondObj.isBroken) return;

        if (isBondCH && site.hasBrokenCH) {
            return; 
        }

        this.breakBondIntoHalves(clickedBondObj);

        if (isBondCH) {
            site.hasBrokenCH = true;
            site.bondCH = clickedBondObj;
            site.atomH_C = clickedBondObj.a === site.atomC ? clickedBondObj.b : clickedBondObj.a;

            site.allBondCHs.forEach(b => {
                if (b !== clickedBondObj) {
                    const m = b.type === 'segmented' ? b.halfA : b.mesh;
                    if (typeof gsap !== 'undefined') {
                        gsap.killTweensOf(m.material.emissive);
                        m.material.emissive.setHex(0x224488);
                    }
                }
            });
        }
        
        if (clickedBondObj === site.bondCuO) {
            const targetColor = new THREE.Color(this.meshCu.userData.originalColor || 0xb87333); 
            if (typeof gsap !== 'undefined') {
                gsap.to(this.meshCu.material.color, { r: targetColor.r, g: targetColor.g, b: targetColor.b, duration: 1.0 });
                gsap.to(this.meshCu.material.emissive, { r: 0.8, g: 0.3, b: 0, duration: 1.0 }); 
                gsap.to(this.meshCu.position, { x: this.meshCu.position.x + 2.5, y: this.meshCu.position.y + 2.5, duration: 0.8, ease: "power2.out" });
                gsap.to(this.meshO_cat.position, { x: this.meshO_cat.position.x + 1.5, y: this.meshO_cat.position.y - 1.5, duration: 0.8, ease: "power2.out" });
            } else {
                this.meshCu.material.color.copy(targetColor);
                this.meshCu.material.emissive.setHex(0xcc5500);
                this.meshCu.position.x += 2.5;
                this.meshCu.position.y += 2.5;
                this.meshO_cat.position.x += 1.5;
                this.meshO_cat.position.y -= 1.5;
            }

            if (this.sm.brokenHalves) {
                this.sm.brokenHalves.forEach(hb => {
                    if (hb.atom === this.meshCu && hb.mesh) {
                        hb.mesh.visible = false;
                    }
                });
            }
        }
        
        if (this.tp && this.tp.graph) {
            try {
                if(clickedBondObj.a !== this.meshCu && clickedBondObj.b !== this.meshCu) {
                    const arrA = this.tp.graph.get(clickedBondObj.a);
                    if (arrA) arrA.splice(arrA.indexOf(clickedBondObj.b), 1);
                    const arrB = this.tp.graph.get(clickedBondObj.b);
                    if (arrB) arrB.splice(arrB.indexOf(clickedBondObj.a), 1);
                }
            } catch(e) {}
        }

        const m = clickedBondObj.type === 'segmented' ? clickedBondObj.halfA : clickedBondObj.mesh;
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf(m.material.emissive);
            m.material.emissive.setHex(0x224488);
        }

        this.brokenOxidationBonds = (this.brokenOxidationBonds || 0) + 1;

        if (this.brokenOxidationBonds >= 3) {
            if (this.bondPulse && typeof this.bondPulse.kill === 'function') this.bondPulse.kill();
            
            if (typeof gsap !== 'undefined') {
                gsap.to(site.atomH_O.position, { x: this.meshO_cat.position.x - 2, y: this.meshO_cat.position.y + 2, duration: 0.8 });
                gsap.to(site.atomH_C.position, { x: this.meshO_cat.position.x + 2, y: this.meshO_cat.position.y + 2, duration: 0.8 });
            }

            this.interactiveReactionState = 'awaiting_double_bond_form';
            site.clickedC = false;
            site.clickedO = false;

            this.um.showMagicNotice("🔨 形成双键", "断键完成！请依次点击乙醇上的【碳原子(C)】和【氧原子(O)】，使它们连接形成碳氧双键！");
        } else {
            this.um.showMagicNotice("继续", `已切断 ${this.brokenOxidationBonds}/3 根键，请继续！`);
        }
    }

    executeSodiumVisuals(atomO, atomH) {
        if (this.atomPulse) this.atomPulse.kill();
        this.atomNa.material.emissive.setHex(0x000000);

        try {
            if (this.atomNaHalf) this.atomNaHalf.mesh.visible = false;
            const trackO = this.sm.brokenHalves.find(hb => hb.atom === atomO && hb.mesh.material.color.getHex() !== 0xffff00);
            if (trackO) trackO.mesh.visible = false;

            if (this.sm.createIonicBondVisual) this.sm.createIonicBondVisual(atomO, this.atomNa);
            this.atomNa.userData.bonds++; atomO.userData.bonds++;
            
            if (this.tp && this.tp.updateGraph) {
                try { this.tp.updateGraph(this.atomNa, atomO); } catch(e) {}
            }

            if (typeof gsap !== 'undefined') {
                gsap.to(this.atomNa.scale, { x: 0.7, y: 0.7, z: 0.7, duration: 0.8 });
                if(atomH.material) { atomH.material.transparent = false; atomH.material.opacity = 1.0; }
                gsap.to(atomH.position, { x: atomO.position.x + 6, y: atomO.position.y, z: 0, duration: 1.5, ease: "power2.inOut" });
            }
        } catch (e) { console.error(e); }

        this.interactiveReactionState = 'awaiting_marquee_copy';
        setTimeout(() => this.showMarqueePrompt(), 1500);
    }

    showMarqueePrompt() {
        this.um.showMagicNotice("🔍 物质守恒定律", "氢原子无法单独存在！请点击菜单栏的【⬚】框选工具，选中当前所有物质后执行【复制】操作，生成另一组反应物。");
        
        const btnMarquee = document.getElementById('btn-marquee-tool');
        if (btnMarquee && typeof gsap !== 'undefined') {
            gsap.to(btnMarquee, { boxShadow: "0 0 20px #cc00ff", duration: 0.8, yoyo: true, repeat: -1 });
        }
    }

    executeDuplication() {
        this.forceReleaseObjectFromDrag(); 
        
        const btnMarquee = document.getElementById('btn-marquee-tool');
        if (btnMarquee && typeof gsap !== 'undefined') {
            gsap.killTweensOf(btnMarquee);
            btnMarquee.style.boxShadow = 'none';
        }

        const uniqueCopyToken = 'cloned_' + Date.now();
        const atomMap = new Map();
        const newAtoms = [];
        const currentAtoms = [...this.sm.atoms]; 
        
        const origH = this.activeReactionSite.atomH;

        currentAtoms.forEach(atom => {
            if (!atom.visible || !atom.parent) return;
            
            const mat = atom.material.clone();
            const geo = atom.geometry.clone();
            const newAtom = new THREE.Mesh(geo, mat);
            
            newAtom.position.copy(atom.position);
            newAtom.position.y -= 4.0; 
            
            newAtom.userData = { ...atom.userData };
            newAtom.userData.id = atom.userData.id + '_' + uniqueCopyToken;
            newAtom.userData.isDragging = false;
            
            atom.parent.add(newAtom);
            newAtoms.push(newAtom);
            atomMap.set(atom, newAtom);
            
            if (this.tp && this.tp.graph) this.tp.graph.set(newAtom, []);
            
            if (atom === origH) {
                this.atomH2_copy = newAtom;
            }
        });

        const currentBonds = [...this.sm.bonds];
        currentBonds.forEach(bond => {
            if (bond.isBroken || !bond.mesh || !bond.mesh.visible || !bond.mesh.parent) return;
            const newA = atomMap.get(bond.a);
            const newB = atomMap.get(bond.b);
            if (newA && newB) {
                const newMesh = bond.mesh.clone();
                newMesh.position.y -= 4.0;
                bond.mesh.parent.add(newMesh); 
                
                const newBond = { mesh: newMesh, a: newA, b: newB, type: bond.type };
                this.sm.bonds.push(newBond);
                
                if (this.tp && this.tp.graph) {
                    this.tp.graph.get(newA).push(newB);
                    this.tp.graph.get(newB).push(newA);
                }
            }
        });

        if (this.sm.brokenHalves) {
            const newHalves = [];
            this.sm.brokenHalves.forEach(hb => {
                if (hb.mesh && hb.mesh.visible && atomMap.has(hb.atom)) {
                    const clonedAtom = atomMap.get(hb.atom);
                    const clonedMesh = hb.mesh.clone();
                    clonedMesh.position.y -= 4.0;
                    if (hb.mesh.parent) hb.mesh.parent.add(clonedMesh);
                    else this.sm.scene.add(clonedMesh);
                    newHalves.push({ mesh: clonedMesh, atom: clonedAtom, dir: hb.dir.clone() });
                }
            });
            this.sm.brokenHalves.push(...newHalves);
        }

        setTimeout(() => {
            this.sm.atoms.push(...newAtoms);
            if (this.sm.dragControls && this.sm.dragControls.objects) {
                this.sm.dragControls.objects.push(...newAtoms);
                this.sm.dragControls.enabled = true;
            }
            
            this.interactiveReactionState = 'awaiting_h2_assembly';
            this.um.showMagicNotice("✨ 终极组合", "框选复制完毕！请拖拽发光的游离态氢原子，与另一个结合生成氢气(H2)！");
        }, 500);
    }

    checkInteractiveSnap(draggedAtom, targetAtom) {
        if (this.isAnimating) return false; 

        if (this.interactiveReactionState === 'awaiting_na_drag') {
            const { atomO, atomH } = this.activeReactionSite;
            
            if (draggedAtom === this.atomNa && (targetAtom === atomO || draggedAtom.position.distanceTo(atomO.position) < this.snapConfig.naExchange)) {
                this.isAnimating = true; 
                this.forceReleaseObjectFromDrag([this.atomNa]); 
                this.interactiveReactionState = 'completed';
                
                const trackO = this.sm.brokenHalves.find(hb => hb.atom === atomO && hb.mesh.material.color.getHex() !== 0xffff00);
                let offsetDir = new THREE.Vector3().subVectors(this.atomNa.position, atomO.position);
                if (offsetDir.lengthSq() < 0.1) offsetDir.set(1, 1, 0); else offsetDir.normalize();
                const safePos = atomO.position.clone().add(offsetDir.multiplyScalar(2.2));
                
                if (typeof gsap !== 'undefined') {
                    this.atomNaHalf.mesh.scale.set(1, 0, 1);
                    gsap.to(this.atomNaHalf.mesh.scale, { y: 0.8, duration: 0.4 }); 
                    gsap.to(this.atomNa.position, { 
                        x: safePos.x, y: safePos.y, z: safePos.z, 
                        duration: 0.8, ease: "power2.out", 
                        onUpdate: () => {
                            this._tempDir1.subVectors(atomO.position, this.atomNa.position).normalize();
                            if (this._tempDir1.lengthSq() > 0.001) this.atomNaHalf.dir.lerp(this._tempDir1, 0.3).normalize(); 
                            if (trackO) {
                                this._tempDir2.subVectors(this.atomNa.position, atomO.position).normalize();
                                if (this._tempDir2.lengthSq() > 0.001) trackO.dir.lerp(this._tempDir2, 0.3).normalize(); 
                            }
                        },
                        onComplete: () => {
                            this.executeSodiumVisuals(atomO, atomH);
                            this.isAnimating = false; 
                        }
                    });
                } else {
                    this.atomNa.position.copy(safePos);
                    this.executeSodiumVisuals(atomO, atomH);
                    this.isAnimating = false;
                }
                return true; 
            }
        }
        
        if (this.interactiveReactionState === 'awaiting_h2_assembly') {
            const h1 = this.activeReactionSite.atomH;
            const h2 = this.atomH2_copy;
            
            if (draggedAtom === h1 || draggedAtom === h2) {
                let actualTarget = targetAtom;
                const fixedAtom = (draggedAtom === h1) ? h2 : h1;

                if (actualTarget === fixedAtom || draggedAtom.position.distanceTo(fixedAtom.position) < this.snapConfig.h2Assembly) {
                    this.isAnimating = true; 
                    this.forceReleaseObjectFromDrag([draggedAtom]); 

                    let offsetDir = new THREE.Vector3().subVectors(draggedAtom.position, fixedAtom.position);
                    if (offsetDir.lengthSq() < 0.001) offsetDir.set(1, 0, 0); else offsetDir.normalize();
                    
                    const safePos = fixedAtom.position.clone().add(offsetDir.multiplyScalar(0.7)); 
                    
                    if (typeof gsap !== 'undefined') {
                        gsap.to(draggedAtom.position, { x: safePos.x, y: safePos.y, z: safePos.z, duration: 0.3, onComplete: () => this.isAnimating = false });
                    } else {
                        draggedAtom.position.copy(safePos);
                        this.isAnimating = false;
                    }

                    const hideHalf = (atom) => {
                        if (this.sm.brokenHalves) {
                            this.sm.brokenHalves.forEach(hb => {
                                if (hb.atom === atom && hb.mesh) hb.mesh.visible = false;
                            });
                        }
                        if(atom.userData.halfBond) atom.userData.halfBond.visible = false;
                    };
                    hideHalf(draggedAtom);
                    hideHalf(fixedAtom);

                    const newBond = this.sm.createBondVisual(draggedAtom, fixedAtom, 0xaaaaaa);
                    this.assembledH2Bond = newBond; 
                    
                    draggedAtom.userData.bonds = (draggedAtom.userData.bonds || 0) + 1;
                    fixedAtom.userData.bonds = (fixedAtom.userData.bonds || 0) + 1;

                    this.interactiveReactionState = 'completed';
                    this.forceReleaseObjectFromDrag([h1, h2]); 
                    this.finalizeInteractiveReaction('sodium', draggedAtom);
                    
                    return true;
                }
            }
        }

        if (this.interactiveReactionState === 'awaiting_cu_drag') {
            const site = this.activeReactionSite;
            if (draggedAtom === this.meshCu && (targetAtom === site.atomO || draggedAtom.position.distanceTo(site.atomO.position) < this.snapConfig.cuIntervene)) {
                this.isAnimating = true;
                this.forceReleaseObjectFromDrag([this.meshCu]); 
                this.interactiveReactionState = 'awaiting_oxidation_bond_break';
                
                if (this.atomPulse && typeof this.atomPulse.kill === 'function') this.atomPulse.kill();
                this.meshCu.material.emissive.setHex(0x000000);

                let offsetDir = new THREE.Vector3().subVectors(this.meshCu.position, site.atomO.position);
                if (offsetDir.lengthSq() < 0.1) offsetDir.set(-1, 1, 0); else offsetDir.normalize();
                const safePos = site.atomO.position.clone().add(offsetDir.multiplyScalar(2.5));
                
                if (typeof gsap !== 'undefined') {
                    gsap.to(this.meshCu.position, { x: safePos.x, y: safePos.y, z: safePos.z, duration: 0.3, ease: "power2.out", onComplete: () => this.isAnimating = false });
                } else {
                    this.meshCu.position.copy(safePos);
                    this.isAnimating = false;
                }

                let worldPosO = new THREE.Vector3();
                this.meshO_cat.getWorldPosition(worldPosO);
                this.meshCu.remove(this.meshO_cat);
                this.sm.scene.add(this.meshO_cat);
                this.meshO_cat.position.copy(worldPosO);
                
                this.meshO_cat.scale.set(0.65, 0.65, 0.65); 
                this.meshO_cat.userData = { type: 'O', bonds: 1, maxBonds: 2, isDragging: false };
                this.sm.atoms.push(this.meshO_cat);
                if(this.sm.dragControls && this.sm.dragControls.objects) this.sm.dragControls.objects.push(this.meshO_cat);
                
                this.meshBondCuO.visible = false;
                
                site.bondCuO = this.sm.createBondVisual(this.meshCu, this.meshO_cat, 0xaaaaaa);
                site.bondCuO_broken = false;

                this.um.showMagicNotice("🗡️ 精准断键", "氧化铜介入成功！请寻找并依次点击切断 O-H键、C-H键 和 隐藏在氧化铜内部的连接！");
                const targets = [site.bondOH, ...site.allBondCHs, site.bondCuO];
                if (typeof gsap !== 'undefined') {
                    const meshesToPulse = targets.map(b => b.type === 'segmented' ? b.halfA.material.emissive : b.mesh.material.emissive);
                    this.bondPulse = gsap.to(meshesToPulse, { r: 1, g: 0, b: 0, duration: 0.5, yoyo: true, repeat: -1 });
                }
                return true;
            }
        }

        if (this.interactiveReactionState === 'awaiting_water_assembly') {
            const site = this.activeReactionSite;
            const isO = (a) => a === this.meshO_cat;
            const isH = (a) => a === site.atomH_O || a === site.atomH_C;
            
            if (isO(draggedAtom) || isH(draggedAtom)) {
                let actualTarget = targetAtom;
                if (!actualTarget) {
                    const others = [this.meshO_cat, site.atomH_O, site.atomH_C].filter(a => a !== draggedAtom);
                    let minDist = this.snapConfig.waterAssembly;
                    for (let other of others) {
                        const dist = draggedAtom.position.distanceTo(other.position);
                        if (dist < minDist) {
                            // 🌟 核心修复1：强行阻断 H 与 H 的吸附匹配，确保被捕捉的永远是正确的 O-H 组合
                            if ((isO(draggedAtom) && isH(other)) || (isH(draggedAtom) && isO(other))) {
                                let alreadyBonded = false;
                                if (this.assembledWaterBonds) {
                                    alreadyBonded = this.assembledWaterBonds.some(b => 
                                        (b.a === draggedAtom && b.b === other) || 
                                        (b.b === draggedAtom && b.a === other)
                                    );
                                }
                                if (!alreadyBonded) {
                                    minDist = dist;
                                    actualTarget = other;
                                }
                            }
                        }
                    }
                }

                if (actualTarget && ((isO(draggedAtom) && isH(actualTarget)) || (isH(draggedAtom) && isO(actualTarget)))) {
                    if (!this.assembledWaterBonds) this.assembledWaterBonds = [];
                    
                    const alreadyBonded = this.assembledWaterBonds.some(b => 
                        (b.a === draggedAtom && b.b === actualTarget) || 
                        (b.b === draggedAtom && b.a === actualTarget)
                    );
                    
                    if (!alreadyBonded) {
                        this.isAnimating = true;
                        this.forceReleaseObjectFromDrag([draggedAtom]); 

                        const atomO = isO(draggedAtom) ? draggedAtom : actualTarget;
                        const atomH = isH(draggedAtom) ? draggedAtom : actualTarget;

                        let offsetDir = new THREE.Vector3().subVectors(atomH.position, atomO.position);
                        if (offsetDir.lengthSq() < 0.001) offsetDir.set(1,0,0); else offsetDir.normalize();
                        
                        const safePos = atomO.position.clone().add(offsetDir.multiplyScalar(0.7)); 
                        const isFirstBond = this.assembledWaterBonds.length === 0;
                        safePos.z = atomO.position.z + (isFirstBond ? 0.3 : -0.3);
                        
                        // 🌟 核心修复2：成键前强制无延迟、瞬间抹除相关的残留半键
                        const hideHalf = (atom) => {
                            if (this.sm.brokenHalves) {
                                this.sm.brokenHalves.forEach(hb => {
                                    if (hb.atom === atom && hb.mesh) {
                                        hb.mesh.visible = false;
                                    }
                                });
                            }
                        };
                        hideHalf(atomO);
                        hideHalf(atomH);
                        
                        if (typeof gsap !== 'undefined') {
                            gsap.to(atomH.position, { x: safePos.x, y: safePos.y, z: safePos.z, duration: 0.3, onComplete: () => this.isAnimating = false });
                        } else {
                            atomH.position.copy(safePos);
                            this.isAnimating = false;
                        }
                        
                        const newBond = this.sm.createBondVisual(atomO, atomH, 0xaaaaaa);
                        this.assembledWaterBonds.push(newBond);
                        
                        atomO.userData.bonds = (atomO.userData.bonds || 0) + 1;
                        atomH.userData.bonds = (atomH.userData.bonds || 0) + 1;
                        
                        if (this.assembledWaterBonds.length === 2) {
                            this.interactiveReactionState = 'completed';
                            this.forceReleaseObjectFromDrag([this.meshO_cat, site.atomH_O, site.atomH_C]);
                            this.finalizeOxidationReaction();
                        } else {
                            if (this.sm.dragControls) {
                                this.sm.dragControls.enabled = true;
                            }
                        }
                        return true;
                    }
                }
            }
        }
        return false; 
    }

    finalizeOxidationReaction() {
        if (this.atomPulse && typeof this.atomPulse.kill === 'function') this.atomPulse.kill();
        
        const site = this.activeReactionSite;

        if (typeof gsap !== 'undefined') {
            const syncWater = () => {
                this.assembledWaterBonds.forEach(obj => {
                    const posA = obj.a.position; const posB = obj.b.position;
                    const dist = posA.distanceTo(posB);
                    const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
                    const dir = new THREE.Vector3().subVectors(posB, posA).normalize();
                    if(obj.mesh) {
                        obj.mesh.position.copy(mid);
                        obj.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                        obj.mesh.scale.y = dist; 
                    }
                });
            };
            
            const targetOX = site.atomC.position.x + 5.5; 
            const targetOY = site.atomC.position.y - 4.5; 
            
            gsap.to(this.meshO_cat.position, { x: targetOX, y: targetOY, z: 0, duration: 1.5, ease: "power1.out", onUpdate: syncWater });
            gsap.to(site.atomH_O.position, { x: targetOX - 0.7, y: targetOY - 0.7, z: 0.6, duration: 1.5, ease: "power1.out" });
            gsap.to(site.atomH_C.position, { x: targetOX + 0.7, y: targetOY - 0.7, z: -0.6, duration: 1.5, ease: "power1.out" });
        }

        this.um.showMagicNotice("✅ 实验成功", "水分子组装完成！产物已相互分离。");
        setTimeout(() => this.finalizeInteractiveReaction('oxidation', site.atomO), 1500);
    }

    handleBondClick(clickedBondObj) {
        if (this.isAnimating) return; 

        if (this.interactiveReactionState === 'awaiting_bond_break') {
            this.handleSodiumBondClick(clickedBondObj);
        } else if (this.interactiveReactionState === 'awaiting_oxidation_bond_break') {
            this.handleOxidationBondClick(clickedBondObj);
        }
    }

    finalizeInteractiveReaction(reactionType, focusAtom = null) {
        this.isReactionPlaying = false; 
        
        if (!this.completedReactions.includes(reactionType)) {
            this.completedReactions.push(reactionType);
            this.saveProgress();
        }

        try {
            if (typeof gsap !== 'undefined' && this.sm.camera) {
                let camX = focusAtom ? focusAtom.position.x + 2.5 : 0;
                let camY = focusAtom ? focusAtom.position.y + 0.8 : 0;
                gsap.to(this.sm.camera.position, { z: 32, x: camX, y: camY, duration: 2, ease: "power1.inOut" });
            }
        } catch(e) {}

        const ui = this.um || (window.app && window.app.uiManager); 
        if (ui && typeof ui.queueEquationMinigame === 'function') {
            setTimeout(() => { ui.queueEquationMinigame(reactionType); }, 1500);
        }
    }

    retryInteractiveReaction() {
        const eqDiv = document.getElementById('equation-minigame-overlay'); if (eqDiv) eqDiv.remove();
        const aiPanel = document.getElementById('ai-trial-panel'); if (aiPanel) aiPanel.classList.add('hidden');

        if (this.currentReactionType === 'sodium' || this.interactiveReactionState.includes('na') || this.interactiveReactionState.includes('h2') || this.interactiveReactionState.includes('copy') || this.interactiveReactionState.includes('marquee') || this.atomNa) {
            this.startStandardSodiumFlow();
        } else if (this.currentReactionType === 'oxidation' || this.interactiveReactionState.includes('cu') || this.interactiveReactionState.includes('oxidation') || this.interactiveReactionState.includes('water') || this.interactiveReactionState.includes('double') || this.meshCu) {
            this.startStandardOxidationFlow(); 
        } else {
            this.resetReactionState();
            this.sm.autoBuildEthanol();
        }
    }
}