/** 拖拽与交互管理器 (InteractionManager.js) 
 * 🌟 修复版：恢复双击元素删除功能（完美兼容多端触屏判定）
 * 🌟 修复版：恢复背景拖动平移功能
 * 🌟 防呆升级版：仅在结构探究模块禁止氢原子(H)与氢原子(H)之间相连
 * 🌟 框选高亮版：完善框选功能，被框选中的所有结构都会以高亮样式呈现，并能完美恢复
 * 🌟 绝对清理版：任何交互产生的成键动作，皆瞬间清除其残留的断键半键痕迹
 */
class InteractionManager {     
    constructor(sceneManager) {         
        this.sm = sceneManager;         
        this.SNAP_DISTANCE = 2.4;                   
        this.raycaster = new THREE.Raycaster();         
        this.mouse = new THREE.Vector2();                  
        
        this.selectedElementType = null; 
        this.planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

        this.sm.renderer.domElement.style.touchAction = 'none';

        this.selectedAtoms = [];
        
        this.selectionBox = document.createElement('div');
        this.selectionBox.style.cssText = 'position: absolute; border: 2px dashed #00ffcc; background: rgba(0, 255, 204, 0.15); pointer-events: none; display: none; z-index: 9999; box-shadow: 0 0 15px rgba(0,255,204,0.3);';
        document.body.appendChild(this.selectionBox);

        this.mobileDeleteBtn = document.createElement('button');
        this.mobileDeleteBtn.innerHTML = '📑 复制选中 &nbsp;|&nbsp; 🗑️ 删除选中';
        this.mobileDeleteBtn.style.cssText = 'position: absolute; bottom: 15%; left: 50%; transform: translateX(-50%); padding: 15px 40px; font-size: 2em; background: rgba(30,30,40,0.95); color: white; border: 3px solid #00ffcc; border-radius: 40px; z-index: 10000; display: none; box-shadow: 0 10px 30px rgba(0,255,204,0.5); cursor: pointer; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); font-weight: bold; pointer-events: auto; white-space: nowrap;';
        document.body.appendChild(this.mobileDeleteBtn);

        this.mobileDeleteBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            
            const rect = this.mobileDeleteBtn.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            
            if (clickX < rect.width / 2) {
                if (this.selectedAtoms.length > 0) {
                    this.sm.duplicateComponent(this.selectedAtoms);
                    this.clearSelection();
                }
            } else {
                this.deleteSelectedAtoms();
            }
        });

        this.initDragControls();      
        this.initDispelMagic();     
        this.initCanvasClickSpawning(); 
        this.initZoomControl();
        this.initBackgroundActions();
        this.initKeyboardControls();
        this.injectHandButton();
    }     
    
    injectHandButton() {
        const tryInject = () => {
            const btnClear = document.getElementById('btn-clear');
            if (btnClear && !document.getElementById('btn-select-hand')) {
                const handBtn = document.createElement('button');
                handBtn.id = 'btn-select-hand';
                handBtn.className = 'magic-btn';
                handBtn.title = '移动 / 框选工具 (Hand)';
                handBtn.innerHTML = '🖐️';
                handBtn.style.borderColor = '#00ffcc';
                handBtn.style.color = '#00ffcc';
                
                btnClear.insertAdjacentElement('afterend', handBtn);
            } else if (!btnClear) {
                setTimeout(tryInject, 500);
            }
        };
        tryInject();
    }

    initDragControls() {         
        this.dragControls = new THREE.DragControls(this.sm.atoms, this.sm.camera, this.sm.renderer.domElement);                  
        
        this.dragControls.addEventListener('dragstart', (event) => {             
            event.object.userData.isDragging = true;             
            if (typeof gsap !== 'undefined') gsap.to(event.object.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.2 });         
        });                  
        
        this.dragControls.addEventListener('drag', (event) => {             
            event.object.position.z = 0;              
            if (this.sm.physicsEngine) this.sm.physicsEngine.updateConnectedBonds(event.object);         
        });                  
        
        this.dragControls.addEventListener('dragend', (event) => {             
            event.object.userData.isDragging = false;             
            if (typeof gsap !== 'undefined') gsap.to(event.object.scale, { x: 1, y: 1, z: 1, duration: 0.2 });             
            this.handleSnapAndBond(event.object);         
        });         

        this.sm.renderer.domElement.addEventListener('pointerdown', (event) => {             
            const director = window.app && window.app.reactionDirector ? window.app.reactionDirector : null;
            if (director) {                 
                const state = director.interactiveReactionState;                 
                if (state === 'awaiting_bond_break' || state === 'awaiting_oxidation_bond_break') {                     
                    const rect = this.sm.renderer.domElement.getBoundingClientRect();                     
                    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;                     
                    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;                                          
                    this.raycaster.setFromCamera(this.mouse, this.sm.camera);                     
                    
                    const clickableMeshes = [];
                    this.sm.bonds.forEach(b => {
                        if (b.isBroken) return;
                        if (b.type === 'segmented') {
                            if (b.halfA) clickableMeshes.push(b.halfA);
                            if (b.halfB) clickableMeshes.push(b.halfB);
                        } else if (b.mesh) {
                            clickableMeshes.push(b.mesh);
                            if (b.mesh.children) clickableMeshes.push(...b.mesh.children);
                        }
                    });

                    const intersects = this.raycaster.intersectObjects(clickableMeshes, true);                                          
                    
                    if (intersects.length > 0) {                         
                        let clickedMesh = intersects[0].object;                         
                        let bondObj = this.sm.bonds.find(b => 
                            b.mesh === clickedMesh || 
                            b.halfA === clickedMesh || 
                            b.halfB === clickedMesh || 
                            (b.mesh && b.mesh.children && b.mesh.children.includes(clickedMesh))
                        );                                                  
                        
                        if (bondObj) {                             
                            if (state === 'awaiting_bond_break') {                                 
                                director.handleBondClick(bondObj);                              
                            } else {                                 
                                director.handleOxidationBondClick(bondObj);                              
                            }                         
                        }                     
                    }                 
                }             
            }         
        });     
    }     
    
    handleSnapAndBond(draggedAtom) { 
        const director = window.app && window.app.reactionDirector ? window.app.reactionDirector : null;
        
        if (director) {             
            const state = director.interactiveReactionState;             
            if (state === 'awaiting_bond_break' || state === 'awaiting_oxidation_bond_break') return;              
            
            if (state === 'awaiting_na_drag') {                 
                if (draggedAtom.userData.type === 'Na') {                  
                    let closestO = null;
                    let minDist = this.SNAP_DISTANCE * 2.0;
                    this.sm.atoms.forEach(atom => {
                        if (atom.userData.type === 'O') {
                            const dist = draggedAtom.position.distanceTo(atom.position);
                            if (dist < minDist) { minDist = dist; closestO = atom; }
                        }
                    });
                    if (closestO) {
                        if (director.activeReactionSite) director.activeReactionSite.atomO = closestO;
                        else director.activeReactionSite = { atomO: closestO };
                        director.checkInteractiveSnap(draggedAtom, closestO);
                    }                 
                    return; 
                }             
            }                          
            
            if (state === 'awaiting_cu_drag') {                 
                if (draggedAtom.userData.type === 'Cu') {                  
                    let closestO = null;
                    let minDist = this.SNAP_DISTANCE * 2.0;
                    this.sm.atoms.forEach(atom => {
                        if (atom.userData.type === 'O') {
                            const dist = draggedAtom.position.distanceTo(atom.position);
                            if (dist < minDist) { minDist = dist; closestO = atom; }
                        }
                    });
                    if (closestO) {
                        if (director.activeReactionSite) director.activeReactionSite.atomO = closestO;
                        else director.activeReactionSite = { atomO: closestO };
                        director.checkInteractiveSnap(draggedAtom, closestO);
                    }                 
                    return;  
                }            
            }             
            
            if (state === 'awaiting_double_bond') {                 
                if (draggedAtom.userData.type === 'C' || draggedAtom.userData.type === 'O') {                 
                    if (director.activeReactionSite) {                     
                        const { atomO, atomC } = director.activeReactionSite;                     
                        if (draggedAtom === atomO || draggedAtom === atomC) {                         
                            const target = (draggedAtom === atomO) ? atomC : atomO;                         
                            if (draggedAtom.position.distanceTo(target.position) < this.SNAP_DISTANCE * 2.0) {                             
                                director.checkInteractiveSnap(draggedAtom, target);                         
                            } else {                             
                                if (window.app.uiManager) window.app.uiManager.showMagicNotice("错误", "请将原子连接回正确位置。");                         
                            }                     
                        }                 
                    }                 
                    return;    
                }         
            } 
            
            if (state === 'awaiting_water_assembly') {
                const site = director.activeReactionSite;
                if (site && (draggedAtom === director.meshO_cat || draggedAtom === site.atomH_O || draggedAtom === site.atomH_C)) {
                    if (director.checkInteractiveSnap(draggedAtom, null)) return;
                }
            }
            if (state === 'awaiting_h2_assembly') {
                const h1 = director.activeReactionSite ? director.activeReactionSite.atomH : null;
                const h2 = director.atomH2_copy;
                if (draggedAtom === h1 || draggedAtom === h2) {
                    if (director.checkInteractiveSnap(draggedAtom, null)) return;
                }
            }
        }         
        
        let closestBond = null;         
        let minBondDist = 1.0;          
        for (let bond of this.sm.bonds) {             
            if (bond.a === draggedAtom || bond.b === draggedAtom) continue;             
            const A = bond.a.position, B = bond.b.position, P = draggedAtom.position;             
            const AB = new THREE.Vector3().subVectors(B, A), AP = new THREE.Vector3().subVectors(P, A);             
            const abLenSq = AB.lengthSq();             
            if (abLenSq === 0) continue;             
            let t = AP.dot(AB) / abLenSq;             
            if (t > 0.2 && t < 0.8) {                  
                const closestPoint = new THREE.Vector3().copy(A).add(AB.clone().multiplyScalar(t));                 
                const dist = P.distanceTo(closestPoint);                 
                if (dist < minBondDist) { minBondDist = dist; closestBond = bond; }             
            }         
        }         
        
        if (closestBond && (draggedAtom.userData.maxBonds - draggedAtom.userData.bonds >= 2)) {             
            if (window.app && window.app.chemistryEngine) window.app.chemistryEngine.insertAtomIntoBond(draggedAtom, closestBond);             
            return;          
        }         
        
        let closestAtom = null;         
        let minScore = Infinity;          
        for (let targetAtom of this.sm.atoms) {             
            if (targetAtom === draggedAtom) continue;             
            const distance = draggedAtom.position.distanceTo(targetAtom.position);             
            const surfaceDist = distance - (draggedAtom.geometry.parameters.radius || 0.6) - (targetAtom.geometry.parameters.radius || 0.6);                          
            if (distance < this.SNAP_DISTANCE) {                 
                if (draggedAtom.userData.bonds < draggedAtom.userData.maxBonds && targetAtom.userData.bonds < targetAtom.userData.maxBonds) {                     
                    if (!this.sm.checkIfAlreadyBonded(draggedAtom, targetAtom)) {                         
                        const typeA = draggedAtom.userData.type, typeB = targetAtom.userData.type;                         
                        
                        const ui = window.app && window.app.uiManager;
                        const isLevel1 = ui ? ui.currentLevel === 1 : false;
                        if (typeA === 'H' && typeB === 'H' && isLevel1) {
                            continue; 
                        }

                        let score = surfaceDist;                          
                        if (typeA === 'H' && typeB === 'H') score -= 1000;                          
                        if ((typeA === 'C' && typeB === 'C') || (typeA === 'C' && typeB === 'O') || (typeA === 'O' && typeB === 'C')) score -= 10;                         
                        if ((typeA === 'H' && (typeB === 'C' || typeB === 'O')) || (typeB === 'H' && (typeA === 'C' || typeA === 'O'))) score -= 25;                          
                        if (typeA === 'Na' || typeB === 'Na' || typeA === 'Cu' || typeB === 'Cu') score -= 1000;                          
                        if (score < minScore) { minScore = score; closestAtom = targetAtom; }                     
                    }                 
                }             
            }         
        }         
        
        if (closestAtom && minScore <= 50) {             
            const bond = this.sm.createBondVisual(draggedAtom, closestAtom);             
            draggedAtom.userData.bonds++;             
            closestAtom.userData.bonds++;             
            
            // 🌟 核心防呆兜底：只要通过物理判定生成了任何新化学键，立刻全局瞬间清除相关的多余半键残留！
            if (this.sm.brokenHalves) {
                this.sm.brokenHalves.forEach(hb => {
                    if ((hb.atom === draggedAtom || hb.atom === closestAtom) && hb.mesh) {
                        hb.mesh.visible = false;
                    }
                });
            }

            let removedHalves = [];
            
            if (draggedAtom.userData.type === 'H' && closestAtom.userData.type === 'H') {
                if (typeof this.sm.removeAndReturnHalfBond === 'function') {
                    const h1 = this.sm.removeAndReturnHalfBond(draggedAtom);
                    const h2 = this.sm.removeAndReturnHalfBond(closestAtom);
                    if (h1) removedHalves.push(h1);
                    if (h2) removedHalves.push(h2);
                }
                
                if (window.app && window.app.uiManager) {
                    window.app.uiManager.showMagicNotice("氢气生成", "两个氢原子结合，已抹除断键痕迹，生成完整的氢气分子(H₂)！");
                    
                    if (window.app.uiManager.currentLevel === 2) {
                        window.app.uiManager.queueEquationMinigame('sodium');
                    } else if (window.app.uiManager.currentLevel === 3) {
                        window.app.uiManager.queueEquationMinigame('oxidation');
                    }
                }
                
                if (director) director.interactiveReactionState = 'completed';
            }

            if (this.sm.historyStack) {
                this.sm.historyStack.push({ action: 'add_bond', bonds: [bond], restoredHalves: removedHalves });
            }

            if(window.app && window.app.chemistryEngine) {                 
                window.app.chemistryEngine.updateGraph(draggedAtom, closestAtom);                 
                window.app.chemistryEngine.analyzeStructure();             
            }         
        }     
    }     
    
    initDispelMagic() {         
        this.lastTapTime = 0;
        this.lastTapObject = null;

        this.sm.renderer.domElement.addEventListener('pointerdown', (event) => {             
            const director = window.app && window.app.reactionDirector ? window.app.reactionDirector : null;
            if (director && director.interactiveReactionState !== 'idle') return;             
            
            const currentTime = Date.now();
            const rect = this.sm.renderer.domElement.getBoundingClientRect();             
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;             
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;             
            this.raycaster.setFromCamera(this.mouse, this.sm.camera);                          
            
            const intersects = this.raycaster.intersectObjects(this.sm.atoms);             
            
            if (intersects.length > 0) {
                const clickedObj = intersects[0].object;
                const tapGap = currentTime - this.lastTapTime;
                
                if (tapGap < 350 && this.lastTapObject === clickedObj) {
                    this.sm.removeAtom(clickedObj);
                    this.clearSelection();
                    this.lastTapTime = 0;
                    this.lastTapObject = null;
                    return; 
                }
                
                this.lastTapTime = currentTime;
                this.lastTapObject = clickedObj;
            } else {
                this.lastTapTime = 0;
                this.lastTapObject = null;
            }
        });     
    }

    selectElementToAdd(type) {
        if (this.selectedElementType === type) {
            this.selectedElementType = null; 
        } else {
            this.selectedElementType = type;
        }
        
        ['btn-add-c', 'btn-add-h', 'btn-add-o', 'btn-select-hand'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
                btn.style.borderColor = id === 'btn-select-hand' ? '#00ffcc' : 'var(--rpg-gold)';
            }
        });
        
        if (this.selectedElementType) {
            const activeId = this.selectedElementType === 'hand' ? 'btn-select-hand' : `btn-add-${this.selectedElementType.toLowerCase()}`;
            const activeBtn = document.getElementById(activeId);
            if (activeBtn) {
                activeBtn.style.boxShadow = '0 0 20px #00ffcc';
                activeBtn.style.transform = 'scale(1.1)';
                activeBtn.style.borderColor = '#00ffcc';
            }
            if (window.app && window.app.uiManager) {
                if (this.selectedElementType === 'hand') {
                    window.app.uiManager.showMagicNotice("手/框选工具已激活", "在空白处按住拖拽即可框选分子；也可以正常拖动模型、缩放和转动视角。");
                } else {
                    window.app.uiManager.showMagicNotice("画笔已就绪", `点击屏幕任意空白处生成 ${this.selectedElementType} 原子。(右键取消)`);
                }
            }
        }
    }

    initCanvasClickSpawning() {
        let startPos = {x: 0, y: 0};
        let isMoved = false;

        this.sm.renderer.domElement.addEventListener('pointerdown', (e) => {
            startPos = {x: e.clientX, y: e.clientY};
            isMoved = false;
        });

        this.sm.renderer.domElement.addEventListener('pointermove', (e) => {
            if (Math.abs(e.clientX - startPos.x) > 3 || Math.abs(e.clientY - startPos.y) > 3) isMoved = true;
        });

        this.sm.renderer.domElement.addEventListener('pointerup', (e) => {
            if (isMoved || e.button !== 0) return; 
            if (!this.selectedElementType || this.selectedElementType === 'hand') return; 
            
            const rect = this.sm.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.sm.camera);
            
            const intersects = this.raycaster.intersectObjects(this.sm.atoms);
            if (intersects.length > 0) return; 

            const targetPos = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.planeZ0, targetPos);
            
            if (targetPos) this.sm.createAtom(this.selectedElementType, targetPos);
        });

        this.sm.renderer.domElement.addEventListener('contextmenu', (e) => {
            if (this.selectedElementType) {
                e.preventDefault();
                this.selectElementToAdd(null);
            }
        });
    }

    initZoomControl() {
        this.sm.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault(); 
            let targetZ = this.sm.camera.position.z + e.deltaY * 0.02;
            targetZ = Math.max(8, Math.min(70, targetZ));
            if (typeof gsap !== 'undefined') gsap.to(this.sm.camera.position, { z: targetZ, duration: 0.4, ease: "power2.out" });
            else this.sm.camera.position.z = targetZ;
        }, { passive: false });
    }

    initBackgroundActions() {
        let isPanning = false;
        let isSelecting = false;
        let startX = 0, startY = 0;

        this.sm.renderer.domElement.addEventListener('pointerdown', (e) => {
            if (e.target !== this.sm.renderer.domElement) return;

            const rect = this.sm.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.sm.camera);
            const intersects = this.raycaster.intersectObjects(this.sm.atoms);

            if (intersects.length > 0) {
                if (this.selectedAtoms.length > 0) this.clearSelection();
                return;
            }

            startX = e.clientX;
            startY = e.clientY;

            if (this.selectedElementType === 'hand') {
                isSelecting = true;
                this.selectionBox.style.display = 'block';
                this.selectionBox.style.left = startX + 'px';
                this.selectionBox.style.top = startY + 'px';
                this.selectionBox.style.width = '0px';
                this.selectionBox.style.height = '0px';
                this.clearSelection(); 
            } else if (!this.selectedElementType) {
                isPanning = true;
                this.sm.renderer.domElement.style.cursor = 'grabbing';
            }
        });

        this.sm.renderer.domElement.addEventListener('pointermove', (e) => {
            if (isPanning) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                const factor = (this.sm.camera.position.z || 30) * 0.0015;
                
                this.sm.camera.position.x -= deltaX * factor;
                this.sm.camera.position.y += deltaY * factor; 
                
                startX = e.clientX;
                startY = e.clientY;
            } else if (isSelecting) {
                const currentX = e.clientX;
                const currentY = e.clientY;
                const left = Math.min(startX, currentX);
                const top = Math.min(startY, currentY);
                const width = Math.abs(currentX - startX);
                const height = Math.abs(currentY - startY);
                
                this.selectionBox.style.left = left + 'px';
                this.selectionBox.style.top = top + 'px';
                this.selectionBox.style.width = width + 'px';
                this.selectionBox.style.height = height + 'px';
            }
        });

        const stopAction = (e) => {
            if (isPanning) {
                isPanning = false;
                this.sm.renderer.domElement.style.cursor = 'default';
            }
            if (isSelecting) {
                isSelecting = false;
                this.selectionBox.style.display = 'none';

                const rect = this.sm.renderer.domElement.getBoundingClientRect();
                const boxLeft = Math.min(startX, e.clientX);
                const boxRight = Math.max(startX, e.clientX);
                const boxTop = Math.min(startY, e.clientY);
                const boxBottom = Math.max(startY, e.clientY);

                if (boxRight - boxLeft < 5 && boxBottom - boxTop < 5) {
                    this.clearSelection();
                    return;
                }

                this.sm.atoms.forEach(atom => {
                    const vector = atom.position.clone();
                    vector.project(this.sm.camera);
                    const screenX = (vector.x + 1) / 2 * rect.width + rect.left;
                    const screenY = -(vector.y - 1) / 2 * rect.height + rect.top;

                    if (screenX >= boxLeft && screenX <= boxRight && screenY >= boxTop && screenY <= boxBottom) {
                        this.selectedAtoms.push(atom);
                        if (atom.material) {
                            if (!atom.userData.hasClonedMaterial) {
                                atom.material = atom.material.clone();
                                atom.userData.hasClonedMaterial = true;
                            }
                            atom.userData.originalEmissive = atom.material.emissive.getHex();
                            atom.material.emissive.setHex(0x00ffcc); 
                        }
                    }
                });

                if (this.selectedAtoms.length > 0) {
                    this.mobileDeleteBtn.style.display = 'block';
                }
            }
        };

        this.sm.renderer.domElement.addEventListener('pointerup', stopAction);
        this.sm.renderer.domElement.addEventListener('pointerleave', stopAction);
    }

    clearSelection() {
        this.selectedAtoms.forEach(atom => {
            if (atom && atom.material && atom.userData.originalEmissive !== undefined) {
                atom.material.emissive.setHex(atom.userData.originalEmissive);
            }
        });
        this.selectedAtoms = [];
        this.mobileDeleteBtn.style.display = 'none';
    }

    deleteSelectedAtoms() {
        if (this.selectedAtoms.length > 0) {
            if (this.sm.removeAtoms) this.sm.removeAtoms(this.selectedAtoms); 
            else this.selectedAtoms.forEach(atom => this.sm.removeAtom(atom));
            
            this.clearSelection();
            if (window.app && window.app.uiManager) {
                window.app.uiManager.showMagicNotice("清除成功", "已删除选中结构。");
            }
        }
    }

    initKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                this.deleteSelectedAtoms();
            }
        });
    }
}