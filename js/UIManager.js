/** 互动 UI 管理器 (UIManager.js) 
 * 🌟 线上部署绝对防弹版：
 * 1. 【弹窗彻底修复】将所有动态弹窗彻底剥离 `.challenge-modal` 和 `.magic-scroll` 类的依赖，采用 100% 纯内联 `!important` 的 Flex 居中布局，绝对防止线上环境弹窗偏离屏幕或不显示！
 * 2. 【同行强制锁定】成果殿堂引入 `justify-content: flex-start` 和 `overflow-x: auto`，哪怕在极窄屏幕下也绝对同行显示，左右滑动浏览，杜绝掉落换行！
 * 3. 完美继承保留所有功能：官能团智能选取、雷达图修复、下载证书、防页面刷新重载等所有核心功能无一删减！
 */

const UI_THEME = {
    primary: '#00ffcc',
    warning: '#ffaa00',
    danger: '#ff4444',
    bgDark: 'rgba(20, 20, 30, 0.98)',
    borderNormal: '#888',
    textMain: '#ffffff'
};

class UIManager {
    constructor() {
        this.userStats = { 
            foundIsomer: false, watchedNa: false, watchedCu: false, 
            eqSodiumPassed: false, eqOxidationPassed: false, finalQuizScore: 0,
            quizScore: 0, startTime: Date.now(), wrongQuestions: [], linearStructuresPassed: false,
            finalCompleted: false, notifiedEthane: false
        };
        this.currentRenderedType = null;
        this.currentMoleculeType = null;
        this.miniRendererInstance = null;
        this.previewRenderer = null; 
        this.currentLevel = 1;
        this.lastReactionType = null;
        this.quizUnlocked = false; 
        this.dualRenderers = null; 
        this.builtOrder = []; 
        this.snapshots = {}; 
        
        this.selectedLinearVal = null;
        this.selectedLinearText = null;
        this.draggedVal = null;
        this.activeDragElement = null;
        
        this.ethaneComponentRef = null; 
        this.pendingChallengeType = null; 
        this.currentRank = null; 
        this._lastUndoTime = 0; 
        
        this.finalQuizState = { questions: [], currentIndex: 0, correctCount: 0 };
        this.initQuestionBank();

        this.saveTimeout = null;

        this.baseOverlayClass = this.getBaseOverlayClass();

        this.injectStyles(); 
        this.loadProgress(); 
        this.initPanelStructures(); 
        this.bindEvents();

        this.initObserver();
        
        setTimeout(() => {
            this.switchModule(this.currentLevel); 
            if (this.currentLevel > 1) {
                this.showMagicNotice("进度已恢复", "系统已自动为您恢复到上一次的实验进度！");
            }
        }, 500);
    }

    initObserver() {
        if (this.observer) return;
        this.observer = new MutationObserver((mutations) => {
            const copyBtn = document.getElementById('btn-marquee-copy');
            if (copyBtn && copyBtn.parentElement && !document.getElementById('btn-marquee-func')) {
                this.injectFunctionalGroupButton(copyBtn);
            }
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    injectFunctionalGroupButton(copyBtn) {
        const funcBtn = document.createElement('button');
        funcBtn.type = 'button'; 
        funcBtn.id = 'btn-marquee-func';
        funcBtn.className = copyBtn.className;
        if (!funcBtn.className.includes('magic-btn')) funcBtn.classList.add('magic-btn');
        
        funcBtn.innerHTML = '✨ 选出官能团';
        funcBtn.title = '智能识别并选中框内的核心官能团';
        
        funcBtn.style.padding = copyBtn.style.padding || '8px 15px';
        funcBtn.style.fontSize = copyBtn.style.fontSize || '1.2em';
        funcBtn.style.margin = '0 5px';
        funcBtn.style.background = 'rgba(255, 170, 0, 0.15)'; 
        funcBtn.style.borderRadius = copyBtn.style.borderRadius || '8px';
        funcBtn.style.cursor = 'pointer';
        funcBtn.style.border = `2px solid ${UI_THEME.warning}`;
        funcBtn.style.color = UI_THEME.warning;
        funcBtn.style.textShadow = '0 0 8px rgba(255,170,0,0.5)';
        funcBtn.style.transition = 'all 0.2s';
        
        funcBtn.onmouseenter = () => { funcBtn.style.transform = 'scale(1.05)'; funcBtn.style.boxShadow = '0 0 15px rgba(255,170,0,0.4)'; };
        funcBtn.onmouseleave = () => { funcBtn.style.transform = 'scale(1)'; funcBtn.style.boxShadow = 'none'; };

        const self = this;
        funcBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation(); 
            
            const app = window.app;
            if (!app || !app.sceneManager) return;
            
            const sm = app.sceneManager;
            const im = app.interactionManager;
            
            let targetAtoms = [];
            if (sm.atoms) {
                const oxygens = sm.atoms.filter(a => a.userData && a.userData.type === 'O');
                oxygens.forEach(o => {
                    if (!targetAtoms.includes(o)) targetAtoms.push(o);
                    if (sm.bonds) {
                        sm.bonds.forEach(b => {
                            if (b.a === o && b.b.userData && b.b.userData.type === 'H') {
                                if (!targetAtoms.includes(b.b)) targetAtoms.push(b.b);
                            }
                            if (b.b === o && b.a.userData && b.a.userData.type === 'H') {
                                if (!targetAtoms.includes(b.a)) targetAtoms.push(b.a);
                            }
                        });
                    }
                });
            }

            if (targetAtoms.length === 0) {
                if (self.showMagicNotice) self.showMagicNotice("提示", "当前模型中未检测到含氧官能团！");
                return;
            }

            if (im) im.selectedAtoms = [...targetAtoms];
            if (sm) sm.selectedAtoms = [...targetAtoms];

            if (sm.atoms) {
                sm.atoms.forEach(a => {
                    if (a.material && a.material.emissive) {
                        if (targetAtoms.includes(a)) {
                            a.material.emissive.setHex(0x555555); 
                        } else {
                            a.material.emissive.setHex(0x000000); 
                        }
                    }
                });
            }

            if (im && typeof im.updateSelectionBox === 'function') im.updateSelectionBox();
            if (im && typeof im.updateMarqueeMenuPosition === 'function') im.updateMarqueeMenuPosition();
            
            if (self.showMagicNotice) self.showMagicNotice("✨ 官能团已选定", "含氧核心结构已智能选中！现在可直接点击【复制】或【删除】。");
        });

        copyBtn.parentElement.insertBefore(funcBtn, copyBtn.nextSibling);
    }

    getBaseOverlayClass() {
        const el = document.getElementById('linear-structure-challenge-overlay');
        if (el) {
            return el.className.replace(/\bhidden\b/g, '').trim();
        }
        return 'challenge-overlay magic-overlay-bg'; 
    }

    initPanelStructures() {
        const aiPanel = document.getElementById('ai-trial-panel');
        if (aiPanel) {
            aiPanel.className = this.baseOverlayClass + ' hidden';
            if (aiPanel.firstElementChild) {
                aiPanel.firstElementChild.classList.add('challenge-modal');
                aiPanel.firstElementChild.style.cssText = 'width: 100%; height: 100%; overflow-y: auto; position: relative; box-sizing: border-box;';
            }
        }
        
        const evalPanel = document.getElementById('evaluation-panel');
        if (evalPanel) {
            evalPanel.className = this.baseOverlayClass + ' hidden';
            if (!evalPanel.querySelector('.challenge-modal')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'challenge-modal';
                wrapper.style.cssText = 'width: 100%; height: 100%; overflow-y: auto; position: relative; box-sizing: border-box; text-align: center;';
                while (evalPanel.firstChild) {
                    wrapper.appendChild(evalPanel.firstChild);
                }
                evalPanel.appendChild(wrapper);
            }
        }
    }

    initQuestionBank() {
        this.questionBank = [
            { question: "乙醇和二甲醚互为同分异构体，它们的分子式都是？", options: ["CH₄O", "C₂H₆O", "C₂H₄O", "C₃H₈O"], correctIdx: 1, explanation: "乙醇和二甲醚的分子式均为C₂H₆O，但因氧原子的连接位置不同导致性质截然不同。" },
            { question: "乙醇与金属钠反应时，断裂的化学键是？", options: ["C-C键", "C-H键", "C-O键", "O-H键"], correctIdx: 3, explanation: "乙醇与钠反应生成乙醇钠和氢气，实质是钠取代了羟基(-OH)中O-H键上的氢原子。" },
            { question: "催化氧化实验中，光亮的铜丝变黑是因为生成了？", options: ["C", "CuO", "Cu₂O", "Cu(OH)₂"], correctIdx: 1, explanation: "铜丝在空气中受热被氧气氧化，生成了黑色的氧化铜(CuO)。" },
            { question: "乙醇催化氧化的最终含碳产物是？", options: ["乙烯", "乙酸", "乙醛", "二氧化碳"], correctIdx: 2, explanation: "乙醇在铜作催化剂和加热的条件下，被氧化生成乙醛(CH₃CHO)和水。" },
            { question: "下列哪种物质能与金属钠反应产生氢气？", options: ["乙烷", "乙醇", "苯", "四氯化碳"], correctIdx: 1, explanation: "乙醇分子中含有活泼的羟基(-OH)，可以与金属钠发生置换反应产生氢气。" },
            { question: "决定乙醇主要化学性质的官能团是？", options: ["甲基", "乙基", "羟基", "醛基"], correctIdx: 2, explanation: "羟基(-OH)是乙醇的官能团，决定了乙醇能与钠反应以及发生催化氧化等性质。" },
            { question: "在乙醇催化氧化反应中，铜起到的作用是？", options: ["氧化剂", "还原剂", "催化剂", "脱水剂"], correctIdx: 2, explanation: "铜先被氧化为CuO，CuO再与乙醇反应生成乙醛和Cu，作催化剂。" },
            { question: "对比水和乙醇与金属钠的反应，哪个更剧烈？", options: ["乙醇", "水", "一样剧烈", "无法比较"], correctIdx: 1, explanation: "水分子中的O-H键极性更强，氢原子更容易脱离，因此水与钠的反应更剧烈。" },
            { question: "乙醇催化氧化生成乙醛的反应条件是？", options: ["常温常压", "点燃", "Cu或Ag作催化剂并加热", "浓硫酸加热"], correctIdx: 2, explanation: "乙醇催化氧化需要铜或银作催化剂，并在加热条件下进行。" },
            { question: "将烧热变黑的铜丝插入乙醇溶液中，铜丝的颜色变化是？", options: ["保持黑色", "黑变红", "变黄", "变蓝"], correctIdx: 1, explanation: "黑色的CuO将乙醇氧化为乙醛，自身被还原为单质铜，颜色由黑变红。" },
            { question: "乙醇和二甲醚物理和化学性质不同的根本原因是？", options: ["分子量不同", "组成元素不同", "分子结构不同", "原子数量不同"], correctIdx: 2, explanation: "两者分子结构（原子连接顺序和方式）不同，导致了性质差异。" },
            { question: "一个完整的乙醇(CH₃CH₂OH)分子中含有几个碳氢键(C-H)？", options: ["4个", "5个", "6个", "7个"], correctIdx: 1, explanation: "乙醇分子中有1个甲基含3个C-H键，1个亚甲基含2个C-H键，共5个C-H键。" },
            { question: "置换反应中，2分子乙醇与2分子钠反应能生成几分子氢气？", options: ["1分子", "2分子", "3分子", "4个分子"], correctIdx: 0, explanation: "2CH₃CH₂OH + 2Na → 2CH₃CH₂ONa + H₂↑，每两个羟基氢原子生成一个氢气分子。" },
            { question: "乙醛的官能团是？", options: ["羟基", "羧基", "醛基", "羰基"], correctIdx: 2, explanation: "乙醛(CH₃CHO)的特征官能团是醛基(-CHO)。" },
            { question: "水分子(H₂O)与乙醇分子(C₂H₅OH)中，都含有的化学键是？", options: ["C-C键", "C-H键", "O-H键", "C=O键"], correctIdx: 2, explanation: "两者均含有极性的O-H共价键。" },
            { question: "下列关于乙醇物理性质的描述，错误的是？", options: ["无色透明液体", "有特殊香味", "不溶于水", "易挥发"], correctIdx: 2, explanation: "乙醇能与水以任意比例互溶。" },
            { question: "在催化氧化反应中，每个乙醇分子脱去几个氢原子？", options: ["1个", "2个", "3个", "4个"], correctIdx: 1, explanation: "乙醇脱去羟基上的1个H和连着羟基的碳原子上的1个H，共脱去2个H。" },
            { question: "乙醇发生催化氧化时，断裂的化学键是？", options: ["仅O-H键", "仅C-H键", "O-H键和C-H键", "C-C键"], correctIdx: 2, explanation: "断裂了羟基上的O-H键以及与羟基相连的α碳上的一个C-H键。" },
            { question: "乙醇钠(CH₃CH₂ONa)中含有的化学键类型是？", options: ["仅离子键", "仅共价键", "离子键和共价键", "氢键"], correctIdx: 2, explanation: "钠离子与乙氧基之间是离子键，乙氧基内部是共价键。" },
            { question: "关于乙醇的分子结构，以下说法正确的是？", options: ["所有原子都在同一平面", "含有非极性键C-C", "只有极性键", "氧原子不参与成键"], correctIdx: 1, explanation: "乙醇分子空间呈立体构型，含有极性键和非极性键(C-C)。" }
        ];
    }

    injectStyles() {
        if (document.getElementById('chem-ui-styles')) return;
        const style = document.createElement('style');
        style.id = 'chem-ui-styles';
        style.innerHTML = `
            .eq-drag {
                padding: 8px 15px; font-size: 1.3em; background: linear-gradient(135deg, #2a2a35, #1a1a24); 
                border: 2px solid #aaa; border-radius: 8px; color: #fff; font-weight: bold; cursor: pointer; 
                box-shadow: 0 4px 10px rgba(0,0,0,0.5); user-select: none; transition: all 0.2s;
            }
            .eq-drag:active { transform: scale(0.95); }
            .eq-slot {
                display: inline-flex; justify-content: center; align-items: center;
                min-width: 40px; height: 45px; border: 2px dashed #888; border-radius: 8px; 
                background: rgba(0,0,0,0.6); color: ${UI_THEME.primary}; font-weight: bold; font-size: 0.9em; 
                cursor: pointer; vertical-align: middle; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
                padding: 0 10px; margin: 0 5px; transition: all 0.2s;
            }
            .eq-slot[data-filled] { border: 2px solid ${UI_THEME.primary}; background: rgba(0,255,204,0.1); }
            
            .showcase-item { transition: transform 0.3s; }
            .showcase-item:hover { transform: translateY(-10px) scale(1.05); }
            
            .help-module-title {
                color: ${UI_THEME.warning}; font-size: 2.2em; margin-top: 30px; margin-bottom: 15px; 
                border-bottom: 2px solid #444; padding-bottom: 10px; font-weight: bold; text-shadow: 1px 1px 3px #000;
            }
            .help-step { font-size: 1.6em; line-height: 1.8; margin-bottom: 12px; color: #eee; }
        `;
        document.head.appendChild(style);
    }

    showMagicNotice(title, desc) {
        const text = (title + " " + desc).toLowerCase();
        let targetBtns = [];

        if (text.includes('na') || text.includes('取代') || text.includes('钠')) targetBtns.push(document.getElementById('btn-reaction-na'));
        if (text.includes('cu') || text.includes('氧化') || text.includes('铜')) targetBtns.push(document.getElementById('btn-reaction-cu'));
        if (text.includes('🎯') || text.includes('配平') || text.includes('挑战') || text.includes('鉴定')) targetBtns.push(document.getElementById('btn-toggle-challenge'));
        if (text.includes('👁️') || text.includes('视图') || text.includes('异构体') || text.includes('新结构')) targetBtns.push(document.getElementById('btn-toggle-main-3d'));
        if (text.includes('考核') || text.includes('评测')) { targetBtns.push(document.getElementById('btn-start-final-quiz')); targetBtns.push(document.getElementById('btn-finish')); }
        if (text.includes('🖐️') || text.includes('手')) targetBtns.push(document.getElementById('btn-select-hand'));
        if (text.includes('画笔') || text.includes('c、h、o')) { targetBtns.push(document.getElementById('btn-add-c')); targetBtns.push(document.getElementById('btn-add-h')); targetBtns.push(document.getElementById('btn-add-o')); }
        if (text.includes('⬚') || text.includes('复制') || text.includes('守恒')) targetBtns.push(document.getElementById('btn-marquee-tool'));
        
        if (text.includes('下一关') || text.includes('阶段完成') || text.includes('后续实验') || text.includes('下一阶段')) {
            if (this.currentLevel === 1) targetBtns.push(document.getElementById('nav-btn-mod2'));
            if (this.currentLevel === 2) targetBtns.push(document.getElementById('nav-btn-mod3'));
            if (this.currentLevel === 3) targetBtns.push(document.getElementById('nav-btn-mod4'));
        }

        targetBtns.forEach(btn => {
            if (btn && typeof gsap !== 'undefined') {
                gsap.killTweensOf(btn); btn.style.boxShadow = "none"; btn.style.transform = "scale(1)";
                let glowColor = (text.includes('警告') || text.includes('错误') || text.includes('❌')) ? UI_THEME.danger : ((text.includes('成功') || text.includes('完成') || text.includes('✅')) ? UI_THEME.warning : UI_THEME.primary);
                gsap.fromTo(btn, { boxShadow: `0 0 0px ${glowColor}`, scale: 1 }, { boxShadow: `0 0 25px ${glowColor}`, scale: 1.15, duration: 0.6, yoyo: true, repeat: 7, ease: "power1.inOut" });
            }
        });
    }

    showHelpInstructions(onCloseCallback = null) {
        let overlay = document.getElementById('help-instructions-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'help-instructions-overlay';
        overlay.className = this.baseOverlayClass;
        
        overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; justify-content: center !important; align-items: center !important; z-index: 99999999 !important; pointer-events: auto !important; margin: 0 !important; padding: 0 !important;';

        const mod1HTML = `
            <div class="help-module-title">🧩 模块一：结构探秘</div>
            <div class="help-step" style="background: rgba(0,255,204,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid ${UI_THEME.primary}; margin-bottom: 15px;">
                <span style="color:${UI_THEME.primary}; font-weight:bold; font-size: 1.2em;">🎯 核心任务</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. 拼装出“乙醇”与“二甲醚”两种分子结构。</div>
                <div style="margin-left: 10px;">2. 完成看图鉴定挑战。</div>
            </div>
            <div class="help-step" style="background: rgba(255,170,0,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid ${UI_THEME.warning}; margin-bottom: 20px;">
                <span style="color:${UI_THEME.warning}; font-weight:bold; font-size: 1.2em;">🕹️ 按钮说明</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. <span style="color:${UI_THEME.warning};">【C、H、O 按钮】</span> 点击后在空白处生成对应的原子。</div>
                <div style="margin-left: 10px;">2. <span style="color:${UI_THEME.warning};">【🖐️ 手形工具】</span> 拖拽空白处平移视角；拖拽框选分子可复制、删除或选出官能团。</div>
                <div style="margin-left: 10px;">3. <span style="color:${UI_THEME.warning};">【🎯 靶子按钮】</span> 拼装出两种结构后出现，点击进入挑战测试。</div>
            </div>
        `;

        const mod2HTML = `
            <div class="help-module-title">💥 模块二：置换反应</div>
            <div class="help-step" style="background: rgba(0,255,204,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid ${UI_THEME.primary}; margin-bottom: 15px;">
                <span style="color:${UI_THEME.primary}; font-weight:bold; font-size: 1.2em;">🎯 核心任务</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. 模拟乙醇与钠的反应，生成乙醇钠和氢气。</div>
                <div style="margin-left: 10px;">2. 完成方程式配平。</div>
            </div>
            <div class="help-step" style="background: rgba(255,170,0,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid ${UI_THEME.warning}; margin-bottom: 20px;">
                <span style="color:${UI_THEME.warning}; font-weight:bold; font-size: 1.2em;">🕹️ 按钮说明</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. <span style="color:${UI_THEME.warning};">【Na 按钮】</span> 点击投入金属钠原子。</div>
                <div style="margin-left: 10px;">2. <span style="color:${UI_THEME.warning};">【切断化学键】</span> 点击切断发红光的 O-H 键，再将 Na 拖至 O 附近置换。</div>
                <div style="margin-left: 10px;">3. <span style="color:${UI_THEME.warning};">【⬚ 框选工具】</span> 选中所有物质复制后，将极游离的 H 结合成氢气。</div>
            </div>
        `;

        const mod3HTML = `
            <div class="help-module-title">🔥 模块三：催化氧化</div>
            <div class="help-step" style="background: rgba(0,255,204,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid ${UI_THEME.primary}; margin-bottom: 15px;">
                <span style="color:${UI_THEME.primary}; font-weight:bold; font-size: 1.2em;">🎯 核心任务</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. 模拟乙醇的催化氧化反应，生成乙醛和水。</div>
                <div style="margin-left: 10px;">2. 完成方程式填写。</div>
            </div>
            <div class="help-step" style="background: rgba(255,170,0,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid ${UI_THEME.warning}; margin-bottom: 20px;">
                <span style="color:${UI_THEME.warning}; font-weight:bold; font-size: 1.2em;">🕹️ 按钮说明</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. <span style="color:${UI_THEME.warning};">【Cu 按钮】</span> 点击加入氧化铜催化剂，将其拖至 O 原子附近。</div>
                <div style="margin-left: 10px;">2. <span style="color:${UI_THEME.warning};">【断键与成键】</span> 切断 O-H 键、α碳上的 C-H 键及 Cu-O 键；点击 C 和 O 生成双键。</div>
                <div style="margin-left: 10px;">3. <span style="color:${UI_THEME.warning};">【组装水分子】</span> 拖拽游离的两个 H 和一个 O 组装生成水。</div>
            </div>
        `;

        const mod4HTML = `
            <div class="help-module-title">🏆 模块四：综合评测</div>
            <div class="help-step" style="background: rgba(0,255,204,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid ${UI_THEME.primary}; margin-bottom: 15px;">
                <span style="color:${UI_THEME.primary}; font-weight:bold; font-size: 1.2em;">🎯 核心任务</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. 回顾全息殿堂中的实验产物。</div>
                <div style="margin-left: 10px;">2. 完成 5 道随机大考测试题，获取高定证书。</div>
            </div>
            <div class="help-step" style="background: rgba(255,170,0,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid ${UI_THEME.warning}; margin-bottom: 20px;">
                <span style="color:${UI_THEME.warning}; font-weight:bold; font-size: 1.2em;">🕹️ 按钮说明</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. <span style="color:${UI_THEME.warning};">【📝 开始考核】</span> 点击殿堂下方按钮进入答题。</div>
                <div style="margin-left: 10px;">2. <span style="color:${UI_THEME.warning};">【查看错题 / 证书】</span> 考核结束后查看雷达图或保存成果。</div>
            </div>
        `;

        let helpContentHTML = "";
        
        if (this.userStats.finalCompleted) {
            helpContentHTML = mod1HTML + mod2HTML + mod3HTML + mod4HTML;
        } else {
            if (this.currentLevel === 1) helpContentHTML = mod1HTML;
            else if (this.currentLevel === 2) helpContentHTML = mod2HTML;
            else if (this.currentLevel === 3) helpContentHTML = mod3HTML;
            else if (this.currentLevel === 4) helpContentHTML = mod4HTML;
        }
        
        // 彻底清除依赖，直接内联
        overlay.innerHTML = `
            <div style="width: 90vw !important; max-width: 1200px !important; max-height: 90vh !important; overflow-y: auto !important; position: relative !important; transform: none !important; margin: 0 !important; padding: 40px 50px !important; box-sizing: border-box !important; background: ${UI_THEME.bgDark} !important; border: 3px solid #00ffcc !important; border-radius: 20px !important; box-shadow: 0 15px 60px rgba(0,255,204,0.3) !important; color: #fff;">
                <button type="button" id="btn-close-help" class="magic-btn close-btn" style="position: absolute !important; top: 20px !important; right: 20px !important; width: 50px !important; height: 50px !important; font-size: 1.8em !important; padding: 0 !important; z-index: 100000 !important; cursor: pointer !important;">❌</button>
                <h2 style="color: ${UI_THEME.primary}; font-size: 3.5em; text-align: center; margin-bottom: 20px; text-shadow: 0 0 15px rgba(0,255,204,0.5); font-family: 'Heiti', sans-serif;">📜 ${this.userStats.finalCompleted ? '全阶段操作指南' : '本阶段操作指南'}</h2>
                ${helpContentHTML}
                <div style="text-align: center; margin-top: 40px;">
                    <button type="button" id="btn-close-help-bottom" class="magic-btn" style="font-size: 2em; padding: 15px 50px; border-color: #fff; color: #fff; font-family: 'Heiti', sans-serif; cursor: pointer;">我明白了</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('canvas-container')?.classList.add('canvas-shrunk');

        const closeHandler = (e) => { 
            if(e){ e.preventDefault(); e.stopPropagation(); }
            overlay.remove(); 
            if (this.currentLevel !== 4) document.getElementById('canvas-container')?.classList.remove('canvas-shrunk');
            if (onCloseCallback) onCloseCallback(); 
        };
        document.getElementById('btn-close-help').addEventListener('click', closeHandler);
        document.getElementById('btn-close-help-bottom').addEventListener('click', closeHandler);
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('chem_lab_progress');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.userStats) this.userStats = { ...this.userStats, ...parsed.userStats };
                if (parsed.currentLevel) this.currentLevel = parsed.currentLevel;
                if (parsed.builtOrder) this.builtOrder = parsed.builtOrder; 
            }
        } catch(e) { console.error("加载进度失败", e); }
    }

    saveProgress() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            try {
                const data = { userStats: this.userStats, currentLevel: this.currentLevel, builtOrder: this.builtOrder };
                localStorage.setItem('chem_lab_progress', JSON.stringify(data));
            } catch(e) { }
        }, 800);
    }
    
    captureIsolatedImage(targetType) {
        if (!window.app || !window.app.sceneManager) return '';
        const sm = window.app.sceneManager;
        const atoms = sm.atoms; const bonds = sm.bonds;
        
        const visited = new Set();
        const components = [];
        
        for (let atom of atoms) {
            if (visited.has(atom)) continue;
            const comp = { atoms: [], bonds: [], cCount: 0, hCount: 0, oCount: 0 };
            const queue = [atom]; visited.add(atom);
            
            while (queue.length > 0) {
                const curr = queue.shift();
                comp.atoms.push(curr);
                if (curr.userData.type === 'C') comp.cCount++;
                if (curr.userData.type === 'H') comp.hCount++;
                if (curr.userData.type === 'O') comp.oCount++;
                
                bonds.forEach(b => {
                    let neighbor = null;
                    if (b.a === curr) neighbor = b.b; else if (b.b === curr) neighbor = b.a;
                    
                    if (neighbor) {
                        if (!comp.bonds.includes(b)) comp.bonds.push(b);
                        if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
                    }
                });
            }
            components.push(comp);
        }
        
        let targetComp = null;
        for (let comp of components) {
            if (targetType === 'ethane' && comp.cCount === 2 && comp.hCount === 6 && comp.oCount === 0) {
                targetComp = comp; break;
            }
            if (targetType === 'ethanol' && comp.cCount === 2 && comp.hCount === 6 && comp.oCount === 1) {
                let hasCOH = false;
                comp.bonds.forEach(b => {
                    if ((b.a.userData.type === 'O' && b.b.userData.type === 'H') || (b.b.userData.type === 'O' && b.a.userData.type === 'H')) hasCOH = true;
                });
                if (hasCOH) { targetComp = comp; break; }
            }
            if (targetType === 'dimethyl_ether' && comp.cCount === 2 && comp.hCount === 6 && comp.oCount === 1) {
                let cConnectedToO = 0;
                comp.bonds.forEach(b => {
                    if ((b.a.userData.type === 'O' && b.b.userData.type === 'C') || (b.b.userData.type === 'O' && b.a.userData.type === 'C')) cConnectedToO++;
                });
                if (cConnectedToO === 2) { targetComp = comp; break; }
            }
        }
        
        if (!targetComp) {
            sm.renderer.render(sm.scene, sm.camera); return sm.renderer.domElement.toDataURL('image/jpeg', 0.8);
        }
        
        const originalVisibility = new Map();
        sm.atoms.forEach(a => { originalVisibility.set(a, a.visible); a.visible = targetComp.atoms.includes(a); });
        sm.bonds.forEach(b => { originalVisibility.set(b.mesh, b.mesh.visible); b.mesh.visible = targetComp.bonds.includes(b); });
        
        sm.renderer.render(sm.scene, sm.camera);
        const dataUrl = sm.renderer.domElement.toDataURL('image/jpeg', 0.9);
        
        sm.atoms.forEach(a => { a.visible = originalVisibility.get(a); });
        sm.bonds.forEach(b => { b.mesh.visible = originalVisibility.get(b.mesh); });
        sm.renderer.render(sm.scene, sm.camera);
        
        return dataUrl;
    }

    switchModule(moduleId) {
        const existingGallery = document.getElementById('final-gallery-overlay');
        if (existingGallery) {
            existingGallery.remove();
            if (this.showcaseRenderers) { this.showcaseRenderers.forEach(r => r.dispose()); this.showcaseRenderers = null; }
        }

        if ((moduleId === 2 || moduleId === 3) && !this.userStats.linearStructuresPassed) {
            this.showMagicNotice("关卡已锁定", "必须先在【结构探秘】中完成看图鉴定挑战，才能解锁后续实验！");
            return;
        }

        if (window.app && window.app.interactionManager) window.app.interactionManager.selectElementToAdd(null);

        this.currentLevel = moduleId;
        this.quizUnlocked = false; 
        this.pendingChallengeType = null; 
        
        if (window.app && window.app.sceneManager) window.app.sceneManager.clearAll();
        if (window.app && window.app.reactionDirector) window.app.reactionDirector.resetReactionState();
        
        const leftPanel = document.getElementById('left-vision-panel');
        if (leftPanel) leftPanel.classList.add('hidden');
        
        document.getElementById('ai-trial-panel')?.classList.add('hidden');
        document.getElementById('evaluation-panel')?.classList.add('hidden');
        document.getElementById('dual-isomer-popup')?.classList.add('hidden');
        document.getElementById('linear-structure-challenge-overlay')?.classList.add('hidden');
        document.getElementById('equation-minigame-overlay')?.remove();
        document.getElementById('final-quiz-dynamic-overlay')?.remove();
        document.getElementById('eval-dynamic-overlay')?.remove();
        document.getElementById('wrong-question-overlay')?.remove();
        
        const canvas = document.getElementById('canvas-container');
        if (canvas && moduleId !== 4) canvas.classList.remove('canvas-shrunk');

        const actionBar = document.getElementById('action-bar');
        if (actionBar) { actionBar.classList.remove('action-bar-hidden'); actionBar.classList.remove('hidden'); actionBar.style.display = 'flex'; }
        
        const sysMenu = document.querySelector('.system-menu');
        if(sysMenu) sysMenu.classList.remove('hidden');
        
        const btnNa = document.getElementById('btn-reaction-na');
        const btnCu = document.getElementById('btn-reaction-cu');
        const btnFinish = document.getElementById('btn-finish');
        const elementSkills = document.getElementById('element-skills-container');
        const skillDivider = document.getElementById('skill-divider');
        const reactionSkills = document.getElementById('reaction-skills-container');
        const btnToggleChallenge = document.getElementById('btn-toggle-challenge');

        if (moduleId === 1) {
            if(elementSkills) elementSkills.classList.remove('hidden');
            if(skillDivider) skillDivider.classList.remove('hidden');
            if(reactionSkills) reactionSkills.classList.add('hidden');
            if(btnNa) btnNa.classList.add('hidden');
            if(btnCu) btnCu.classList.add('hidden');
            if(btnFinish) btnFinish.classList.add('hidden');
            
            if (btnToggleChallenge) {
                if (this.builtOrder && this.builtOrder.includes('ethanol') && this.builtOrder.includes('dimethyl_ether')) {
                    btnToggleChallenge.classList.remove('hidden'); this.pendingChallengeType = 'linear';
                } else { btnToggleChallenge.classList.add('hidden'); }
            }
            
            this.showHelpInstructions(() => {
                this.showMagicNotice("结构探究", "点击上方手图标(🖐️)后即可在空白处拖拽框选分子。");
            });
            
        } else if (moduleId === 2) {
            if(elementSkills) elementSkills.classList.add('hidden');
            if(skillDivider) skillDivider.classList.add('hidden');
            if(reactionSkills) reactionSkills.classList.remove('hidden');
            if(btnNa) btnNa.classList.remove('hidden'); 
            if(btnCu) btnCu.classList.add('hidden');
            if(btnFinish) btnFinish.classList.add('hidden');
            
            if (btnToggleChallenge) {
                btnToggleChallenge.classList.add('hidden');
                if(typeof gsap !== 'undefined') gsap.killTweensOf(btnToggleChallenge);
                btnToggleChallenge.style.transform = 'scale(1)'; btnToggleChallenge.style.boxShadow = 'none';
            }

            this.showHelpInstructions(() => {
                this.showMagicNotice("实验解锁", "请点击底部的【Na】按钮，投入金属钠，开启取代反应！");
                if (window.app && window.app.sceneManager) window.app.sceneManager.autoBuildEthanol();
                this.unlockMain3DView('ethanol'); 
            });

        } else if (moduleId === 3) {
            if(elementSkills) elementSkills.classList.add('hidden');
            if(skillDivider) skillDivider.classList.add('hidden');
            if(reactionSkills) reactionSkills.classList.remove('hidden');
            if(btnNa) btnNa.classList.add('hidden');
            if(btnCu) btnCu.classList.remove('hidden');
            if(btnFinish) btnFinish.classList.add('hidden');
            
            if (btnToggleChallenge) {
                btnToggleChallenge.classList.add('hidden');
                if(typeof gsap !== 'undefined') gsap.killTweensOf(btnToggleChallenge);
                btnToggleChallenge.style.transform = 'scale(1)'; btnToggleChallenge.style.boxShadow = 'none';
            }
            
            this.showHelpInstructions(() => {
                if(window.app && window.app.sceneManager) window.app.sceneManager.autoBuildEthanol();
                this.showMagicNotice("氧化反应", "请点击底部的【Cu】按钮，加入铜催化剂开启探究。");
                this.unlockMain3DView('ethanol'); 
            });
            
        } else if (moduleId === 4) {
            if(elementSkills) elementSkills.classList.add('hidden');
            if(skillDivider) skillDivider.classList.add('hidden');
            if(reactionSkills) reactionSkills.classList.remove('hidden');
            if(btnNa) btnNa.classList.add('hidden');
            if(btnCu) btnCu.classList.add('hidden');
            if(btnFinish) btnFinish.classList.remove('hidden');
            
            if (btnToggleChallenge) btnToggleChallenge.classList.add('hidden');
            
            if (canvas) canvas.classList.add('canvas-shrunk');

            this.showHelpInstructions(() => {
                this.showMagicNotice("魔法考核", "知识的沉淀时刻！你的实验成果已在殿堂展出，请回顾后开始最终考核。");
                this.showFinalShowcase();
            });
        }
        
        this.updateLevelUI(); this.saveProgress();
    }

    showFinalShowcase() {
        let gallery = document.getElementById('final-gallery-overlay');
        if (gallery) gallery.remove();

        gallery = document.createElement('div');
        gallery.id = 'final-gallery-overlay'; 
        gallery.className = this.baseOverlayClass; 
        
        // 🌟 强效隔离：固定顶层铺满，防止外部挤压
        gallery.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; justify-content: center !important; align-items: center !important; z-index: 99999999 !important; pointer-events: auto !important; margin: 0 !important; padding: 0 !important;';
        
        // 🌟 内部隔离：彻底使用 inline 防御
        gallery.innerHTML = `
            <div style="width: 90vw !important; max-width: 1300px !important; max-height: 90vh !important; overflow-y: auto !important; position: relative !important; transform: none !important; margin: 0 !important; padding: 40px !important; box-sizing: border-box !important; background: rgba(20,20,30,0.98) !important; border: 3px solid #00ffcc !important; border-radius: 20px !important; box-shadow: 0 15px 60px rgba(0,255,204,0.3) !important;">
                <button type="button" id="btn-close-final-showcase" class="magic-btn close-btn" style="position: absolute !important; top: 20px !important; right: 20px !important; width: 50px !important; height: 50px !important; font-size: 1.8em !important; padding: 0 !important; z-index: 100000 !important; cursor: pointer !important;">❌</button>
                
                <div style="text-align: center !important; width: 100% !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: flex-start !important; min-height: min-content !important;">
                    <h2 style="color: var(--rpg-gold); font-size: 3.5em; margin-bottom: 40px; text-shadow: 0 0 20px rgba(255, 215, 0, 0.6); letter-spacing: 5px; font-family: 'Heiti', sans-serif; margin-top: 0;">🏛️ 炼金成果殿堂</h2>
                    
                    <div style="display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; justify-content: flex-start !important; gap: 20px !important; width: 100% !important; margin-bottom: 40px !important; overflow-x: auto !important; padding-bottom: 15px !important;">
                        
                        <div class="showcase-item" style="flex: 0 0 auto !important; width: 280px !important; background: rgba(0,0,0,0.6) !important; border: 3px solid ${UI_THEME.primary} !important; border-radius: 15px !important; padding: 20px !important; box-shadow: 0 0 30px rgba(0,255,204,0.3) !important;">
                            <h3 style="color: ${UI_THEME.primary} !important; font-size: 1.6em !important; margin-top: 0 !important; margin-bottom: 15px !important; text-shadow: 0 0 10px ${UI_THEME.primary} !important; font-family: 'Heiti', sans-serif !important; white-space: nowrap !important;">基础分子(乙醇)</h3>
                            <div id="showcase-ethanol" style="width: 100% !important; height: 240px !important; margin: 0 auto !important;"></div>
                        </div>
                        
                        <div class="showcase-item" style="flex: 0 0 auto !important; width: 280px !important; background: rgba(0,0,0,0.6) !important; border: 3px solid ${UI_THEME.warning} !important; border-radius: 15px !important; padding: 20px !important; box-shadow: 0 0 30px rgba(255,170,0,0.3) !important;">
                            <h3 style="color: ${UI_THEME.warning} !important; font-size: 1.6em !important; margin-top: 0 !important; margin-bottom: 15px !important; text-shadow: 0 0 10px ${UI_THEME.warning} !important; font-family: 'Heiti', sans-serif !important; white-space: nowrap !important;">置换产物(乙醇钠)</h3>
                            <div id="showcase-na" style="width: 100% !important; height: 240px !important; margin: 0 auto !important;"></div>
                        </div>
                        
                        <div class="showcase-item" style="flex: 0 0 auto !important; width: 280px !important; background: rgba(0,0,0,0.6) !important; border: 3px solid ${UI_THEME.danger} !important; border-radius: 15px !important; padding: 20px !important; box-shadow: 0 0 30px rgba(255,68,68,0.3) !important;">
                            <h3 style="color: ${UI_THEME.danger} !important; font-size: 1.6em !important; margin-top: 0 !important; margin-bottom: 15px !important; text-shadow: 0 0 10px ${UI_THEME.danger} !important; font-family: 'Heiti', sans-serif !important; white-space: nowrap !important;">氧化产物(乙醛)</h3>
                            <div id="showcase-cu" style="width: 100% !important; height: 240px !important; margin: 0 auto !important;"></div>
                        </div>

                    </div>
                    
                    <p style="color: #ddd; font-size: 1.5em; margin-top: 10px; margin-bottom: 30px; text-shadow: 1px 1px 3px #000; font-family: 'Songti', serif;">闭上眼睛回忆它们断键与重组的瞬间。<br>准备好后，点击下方发光的【开始考核】按钮。</p>
                    <button type="button" id="btn-start-final-quiz" class="magic-btn" style="font-size: 1.8em; padding: 15px 60px; border-color: var(--rpg-gold); color: var(--rpg-gold); text-shadow: 0 0 10px rgba(255,215,0,0.5); margin-bottom: 20px; font-family: 'Heiti', sans-serif; cursor: pointer;">📝 开始最终考核</button>
                </div>
            </div>
        `;
        document.body.appendChild(gallery);
        
        document.getElementById('canvas-container')?.classList.add('canvas-shrunk');

        const closeShowcaseBtn = document.getElementById('btn-close-final-showcase');
        if (closeShowcaseBtn) {
            closeShowcaseBtn.addEventListener('click', (e) => {
                if(e) e.preventDefault();
                gallery.remove();
                if (this.showcaseRenderers) { this.showcaseRenderers.forEach(r => r.dispose()); this.showcaseRenderers = null; }
            });
        }

        if (this.showcaseRenderers) this.showcaseRenderers.forEach(r => r.dispose());
        
        setTimeout(() => {
            this.showcaseRenderers = [
                new MiniModelRenderer('showcase-ethanol', 'ethanol'),
                new MiniModelRenderer('showcase-na', 'sodium_ethoxide'),
                new MiniModelRenderer('showcase-cu', 'acetaldehyde')
            ];
            const btnStartQuiz = document.getElementById('btn-start-final-quiz');
            if (btnStartQuiz && typeof gsap !== 'undefined') {
                gsap.to(btnStartQuiz, { scale: 1.08, boxShadow: "0 0 30px #ffaa00", duration: 0.8, yoyo: true, repeat: -1 });
            }
        }, 100);
    }

    startFinalQuiz() {
        let shuffled = [...this.questionBank].sort(() => 0.5 - Math.random());
        this.finalQuizState = { questions: shuffled.slice(0, 5), currentIndex: 0, correctCount: 0 };
        this.userStats.wrongQuestions = []; 

        let overlay = document.getElementById('final-quiz-dynamic-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'final-quiz-dynamic-overlay';
        overlay.className = this.baseOverlayClass; 
        
        overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; justify-content: center !important; align-items: center !important; z-index: 99999999 !important; pointer-events: auto !important; margin: 0 !important; padding: 0 !important;';
        
        overlay.innerHTML = `
            <div style="width: 90vw !important; max-width: 1200px !important; max-height: 90vh !important; overflow-y: auto !important; position: relative !important; transform: none !important; margin: 0 !important; padding: 40px !important; box-sizing: border-box !important; background: ${UI_THEME.bgDark} !important; border: 3px solid #00ffcc !important; border-radius: 20px !important; box-shadow: 0 15px 60px rgba(0,255,204,0.3) !important;">
                <div id="dynamic-quiz-content" style="width: 100% !important; min-height: 100% !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; padding: 20px 0 !important; box-sizing: border-box !important;"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('canvas-container')?.classList.add('canvas-shrunk');

        this.renderFinalQuizQuestion();
    }

    renderFinalQuizQuestion() {
        const q = this.finalQuizState.questions[this.finalQuizState.currentIndex];
        const container = document.getElementById('dynamic-quiz-content'); 
        if (!container) return;
        
        let html = `
            <div style="display: flex !important; flex-direction: column !important; align-items: center !important; text-align: left !important; padding: 20px 30px !important; box-sizing: border-box !important; width: 100% !important; max-width: 100% !important;">
                
                <h3 style="display: block !important; width: 100% !important; color: ${UI_THEME.primary} !important; font-size: 3.5em !important; font-family: 'Heiti', 'SimHei', sans-serif !important; margin-bottom: 30px !important; text-shadow: 0 0 12px rgba(0,255,204,0.6) !important; text-align: center !important; flex-shrink: 0 !important; margin-top:0 !important;">
                    最终考核 (${this.finalQuizState.currentIndex + 1}/5)
                </h3>
                
                <div style="background: rgba(20, 25, 35, 0.95) !important; border: 2px solid ${UI_THEME.primary} !important; border-radius: 16px !important; padding: 40px 50px !important; box-shadow: 0 0 30px rgba(0,255,204,0.2) !important; width: 100% !important; max-width: 1200px !important; box-sizing: border-box !important;">
                    <div style="font-size: 2.8em !important; font-family: 'Songti', 'SimSun', serif !important; color: #fff !important; margin-bottom: 40px !important; line-height: 1.8 !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: normal !important;">
                        ${q.question}
                    </div>
                    <div style="display: flex !important; flex-direction: column !important; gap: 20px !important; width: 100% !important;">
        `;
        
        q.options.forEach((opt, idx) => {
            html += `<button type="button" class="magic-btn quiz-opt-btn" data-idx="${idx}" style="display: block !important; text-align: left !important; padding: 25px 40px !important; font-size: 2.5em !important; font-family: 'Heiti', 'SimHei', sans-serif !important; border: 2px solid #555 !important; border-radius: 12px !important; color: #ddd !important; background: rgba(0,0,0,0.6) !important; transition: all 0.2s !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; line-height: 1.6 !important; width: 100% !important; box-sizing: border-box !important; cursor: pointer !important;">${String.fromCharCode(65+idx)}. ${opt}</button>`;
        });

        html += `
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;

        const btns = container.querySelectorAll('.quiz-opt-btn');
        btns.forEach(btn => {
            btn.onmouseenter = () => { btn.style.borderColor = UI_THEME.primary; btn.style.background = 'rgba(0,255,204,0.15)'; btn.style.transform = 'translateX(10px)'; btn.style.boxShadow = '0 0 15px rgba(0,255,204,0.4)'; };
            btn.onmouseleave = () => { btn.style.borderColor = '#555'; btn.style.background = 'rgba(0,0,0,0.6)'; btn.style.transform = 'translateX(0)'; btn.style.boxShadow = 'none'; };
            btn.onclick = (e) => {
                if(e) e.preventDefault(); 
                const selectedIdx = parseInt(btn.getAttribute('data-idx'));
                this.handleFinalQuizAnswer(selectedIdx, q);
            };
        });
    }

    handleFinalQuizAnswer(selectedIdx, q) {
        const isCorrect = (selectedIdx === q.correctIdx);
        const container = document.getElementById('dynamic-quiz-content'); 
        if (!container) return;
        
        if (isCorrect) {
            this.finalQuizState.correctCount++;
        } else {
            this.userStats.wrongQuestions.push({
                module: 4, 
                explanation: `<strong>题目：</strong>${q.question}<br><span style="color:${UI_THEME.primary};">正确答案：${q.options[q.correctIdx]}</span><br><span style="color:#aaa;">解析：${q.explanation}</span>`
            });
        }

        const resultColor = isCorrect ? UI_THEME.primary : UI_THEME.danger;
        const resultTitle = isCorrect ? "回答正确！" : "回答错误...";
        
        container.innerHTML = `
            <div style="display: flex !important; flex-direction: column !important; align-items: center !important; text-align: left !important; padding: 20px 30px !important; box-sizing: border-box !important; width: 100% !important; max-width: 100% !important;">
                
                <h3 style="display: block !important; width: 100% !important; color:${resultColor} !important; font-size: 3.5em !important; font-family: 'Heiti', 'SimHei', sans-serif !important; margin-bottom: 30px !important; text-shadow: 0 0 15px ${resultColor} !important; text-align: center !important; flex-shrink: 0 !important; margin-top: 0 !important;">
                    ${resultTitle}
                </h3>
                
                <div style="background: rgba(20, 25, 35, 0.95) !important; border: 2px solid ${resultColor} !important; border-radius: 16px !important; padding: 40px 50px !important; box-shadow: 0 0 30px rgba(${isCorrect ? '0,255,204' : '255,68,68'}, 0.25) !important; width: 100% !important; max-width: 1200px !important; box-sizing: border-box !important;">
                    
                    <div style="font-size: 2.8em !important; font-family: 'Songti', 'SimSun', serif !important; line-height: 1.8 !important; color: #fff !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: normal !important;">
                        ${isCorrect ? `<span style="color:${UI_THEME.primary} !important; font-weight:bold !important; font-family: 'Heiti', sans-serif !important;">太棒了！</span><br><br>` : `<span style="color:${UI_THEME.danger} !important; text-decoration:line-through !important;">你选择了：${q.options[selectedIdx]}</span><br><span style="color:${UI_THEME.primary} !important; font-weight:bold !important; font-family: 'Heiti', sans-serif !important;">正确答案：${q.options[q.correctIdx]}</span><br><br>`}
                        ${q.explanation}
                    </div>
                    
                </div>
                
                <div style="display: block !important; width: 100% !important; margin-top: 50px !important; text-align: center !important;">
                    <button type="button" id="btn-next-quiz" class="magic-btn" style="display: inline-block !important; font-size: 3em !important; font-family: 'Heiti', 'SimHei', sans-serif !important; padding: 20px 80px !important; border-color: var(--rpg-gold, #ffaa00) !important; color: var(--rpg-gold, #ffaa00) !important; box-shadow: 0 0 25px rgba(255,215,0,0.4) !important; cursor: pointer !important;">${this.finalQuizState.currentIndex < 4 ? '下一题' : '查看最终成绩'}</button>
                </div>
            </div>
        `;

        document.getElementById('btn-next-quiz').onclick = (e) => {
            if(e) { e.preventDefault(); e.stopPropagation(); } 
            this.finalQuizState.currentIndex++;
            if (this.finalQuizState.currentIndex < 5) {
                this.renderFinalQuizQuestion();
            } else {
                const overlay = document.getElementById('final-quiz-dynamic-overlay');
                if (overlay) overlay.remove(); 

                this.userStats.finalQuizScore = this.finalQuizState.correctCount * 20; 
                this.userStats.finalCompleted = true; 
                this.saveProgress();
                this.showEvaluation();
            }
        };
    }

    queueEquationMinigame(type) {
        this.pendingChallengeType = type;
        const btnToggleChallenge = document.getElementById('btn-toggle-challenge');
        if (btnToggleChallenge) {
            btnToggleChallenge.classList.remove('hidden');
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(btnToggleChallenge);
                gsap.fromTo(btnToggleChallenge, { scale: 1, boxShadow: "0 0 0px #00ffcc" }, { scale: 1.2, boxShadow: "0 0 20px #00ffcc", duration: 0.6, yoyo: true, repeat: -1 });
            }
            this.showMagicNotice("阶段完成", "实验现象很清晰！请点击左侧发光的 🎯 靶子按钮，完成随堂配平测试。");
        }
    }

    showEquationMinigame(type) {
        let overlay = document.getElementById('equation-minigame-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'equation-minigame-overlay';
        overlay.className = this.baseOverlayClass;
        overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; justify-content: center !important; align-items: center !important; z-index: 99999999 !important; pointer-events: auto !important; margin: 0 !important; padding: 0 !important;';
        
        let contentHTML = '';

        if (type === 'sodium') {
            contentHTML = `
                <button type="button" id="btn-close-final-eq-popup" class="magic-btn close-btn" style="position: absolute !important; top: 20px !important; right: 20px !important; width: 60px !important; height: 60px !important; font-size: 2.2em !important; z-index: 1000000 !important; cursor:pointer !important; padding: 0 !important;">❌</button>
                <h2 style="color: var(--rpg-mana); font-size: 3em; margin-bottom: 15px; margin-top: 10px; font-family: 'Heiti', sans-serif;">✅ 置换反应方程式测试</h2>
                <p style="color: #fff; font-size: 1.6em; margin-bottom: 25px; font-family: 'Songti', serif;">请拖拽正确的系数和产物，完成方程式的配平：</p>
                
                <div id="eq-drag-pool" style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-bottom: 25px; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; border: 1px solid #444;">
                    <div class="eq-drag" draggable="true" data-val="2">2</div>
                    <div class="eq-drag" draggable="true" data-val="3">3</div>
                    <div class="eq-drag" draggable="true" data-val="CH3CH2ONa">CH₃CH₂ONa</div>
                    <div class="eq-drag" draggable="true" data-val="H2">H₂↑</div>
                    <div class="eq-drag" draggable="true" data-val="H2O">HO</div>
                </div>

                <div style="font-size: 2.4em; margin-bottom: 30px; background: rgba(0,0,0,0.5); padding: 25px 15px; border-radius: 12px; border: 3px solid #00ffcc; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 5px; font-family: monospace; color: #fff;">
                    <div class="eq-slot" data-expected="2"></div> CH₃CH₂OH + 
                    <div class="eq-slot" data-expected="2"></div> Na → 
                    <div class="eq-slot" data-expected="2"></div> <div class="eq-slot" data-expected="CH3CH2ONa" style="min-width: 150px;"></div> + 
                    <div class="eq-slot" data-expected="H2" style="min-width: 80px;"></div>
                </div>

                <p id="final-eq-feedback" style="color: #ff4444; font-size: 1.8em; height: 30px; margin-bottom: 20px; font-weight: bold; font-family: 'Heiti', sans-serif;"></p>
                <button type="button" id="btn-submit-final-eq" class="magic-btn" style="font-size: 2em; padding: 15px 50px; border-color: var(--rpg-gold); color: var(--rpg-gold); font-family: 'Heiti', sans-serif;">提交验证</button>
            `;
        } else if (type === 'oxidation') {
            contentHTML = `
                <button type="button" id="btn-close-final-eq-popup" class="magic-btn close-btn" style="position: absolute !important; top: 20px !important; right: 20px !important; width: 60px !important; height: 60px !important; font-size: 2.2em !important; z-index: 1000000 !important; cursor:pointer !important; padding: 0 !important;">❌</button>
                <h2 style="color: var(--rpg-mana); font-size: 3em; margin-bottom: 15px; margin-top: 10px; font-family: 'Heiti', sans-serif;">✅ 催化氧化方程式测试</h2>
                <p style="color: #fff; font-size: 1.6em; margin-bottom: 25px; font-family: 'Songti', serif;">请拖拽正确的化学计量数、产物与反应条件，完成方程式书写：</p>
                
                <div id="eq-drag-pool" style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-bottom: 25px; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; border: 1px solid #444;">
                    <div class="eq-drag" draggable="true" data-val="2">2</div>
                    <div class="eq-drag" draggable="true" data-val="O2">O₂</div>
                    <div class="eq-drag" draggable="true" data-val="Cu">Cu</div>
                    <div class="eq-drag" draggable="true" data-val="△">△</div>
                    <div class="eq-drag" draggable="true" data-val="CH3CHO">CH₃CHO</div>
                    <div class="eq-drag" draggable="true" data-val="H2O">H₂O</div>
                </div>

                <div style="font-size: 2.4em; margin-bottom: 30px; background: rgba(0,0,0,0.5); padding: 25px 15px; border-radius: 12px; border: 3px solid #00ffcc; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 5px; font-family: monospace; color: #fff;">
                    <div class="eq-slot" data-expected="2" style="min-width: 40px;"></div> CH₃CH₂OH + <div class="eq-slot" data-expected="O2" style="min-width: 60px;"></div>
                    
                    <div style="display:inline-flex; flex-direction:column; align-items:center; vertical-align:middle; margin: 0 10px;">
                        <div class="eq-slot" data-expected="Cu" style="height:35px; min-width:50px; font-size:0.7em; margin-bottom:2px; border-color:#ffaa00;"></div>
                        <span style="color:#ffaa00; margin-top:-5px; margin-bottom:-5px;">――→</span>
                        <div class="eq-slot" data-expected="△" style="height:35px; min-width:50px; font-size:0.7em; margin-top:2px; border-color:#ffaa00;"></div>
                    </div>

                    <div class="eq-slot" data-expected="2" style="min-width: 40px;"></div> <div class="eq-slot" data-expected="CH3CHO" style="min-width: 130px;"></div> + 
                    <div class="eq-slot" data-expected="2" style="min-width: 40px;"></div> <div class="eq-slot" data-expected="H2O" style="min-width: 70px;"></div>
                </div>

                <p id="final-eq-feedback" style="color: #ff4444; font-size: 1.8em; height: 30px; margin-bottom: 20px; font-weight: bold; font-family: 'Heiti', sans-serif;"></p>
                <button type="button" id="btn-submit-final-eq" class="magic-btn" style="font-size: 2em; padding: 15px 50px; border-color: var(--rpg-gold); color: var(--rpg-gold); font-family: 'Heiti', sans-serif;">提交验证</button>
            `;
        }

        overlay.innerHTML = `
            <div style="width: 90vw !important; max-width: 1200px !important; max-height: 90vh !important; overflow-y: auto !important; position: relative !important; transform: none !important; margin: 0 !important; padding: 30px 40px !important; box-sizing: border-box !important; background: rgba(20,20,30,0.95) !important; border: 3px solid #00ffcc !important; border-radius: 20px !important; box-shadow: 0 15px 60px rgba(0,255,204,0.3) !important; text-align: center !important;">
                ${contentHTML}
            </div>
        `;

        document.body.appendChild(overlay);
        document.getElementById('canvas-container')?.classList.add('canvas-shrunk');

        document.getElementById('btn-close-final-eq-popup').addEventListener('click', (e) => { 
            if(e) e.preventDefault();
            overlay.remove(); 
            document.getElementById('canvas-container')?.classList.remove('canvas-shrunk');
        });
        
        this.initEquationDragDrop();

        document.getElementById('btn-submit-final-eq').addEventListener('click', (e) => {
            if(e) e.preventDefault();
            const slots = document.querySelectorAll('.eq-slot');
            const feedback = document.getElementById('final-eq-feedback');
            
            let allFilled = true; let allCorrect = true;

            slots.forEach(slot => {
                const expected = slot.getAttribute('data-expected');
                const filled = slot.getAttribute('data-filled');
                
                if (!filled) { allFilled = false; slot.style.borderColor = '#ffaa00'; } 
                else if (expected !== filled) { allCorrect = false; slot.style.borderColor = '#ff4444'; slot.style.boxShadow = '0 0 10px rgba(255,0,0,0.5)'; } 
                else { slot.style.borderColor = '#00ffcc'; slot.style.boxShadow = '0 0 10px rgba(0,255,204,0.5)'; }
            });

            if (!allFilled) { feedback.style.color = '#ffaa00'; feedback.innerText = '⚠️ 请先填满所有方程式空位！'; return; }

            if (allCorrect) {
                feedback.style.color = '#00ffcc';
                if (type === 'oxidation') {
                    feedback.innerText = '✅ 配平完全正确！实验现象：光亮铜丝变黑，伸进乙醇后又变红，并产生刺激性气味。';
                    this.userStats.eqOxidationPassed = true; 
                } else {
                    feedback.innerText = '✅ 恭喜你，化学方程式配平与拼写完全正确！';
                    this.userStats.eqSodiumPassed = true; 
                }
                this.saveProgress();
                
                setTimeout(() => {
                    overlay.remove();
                    document.getElementById('canvas-container')?.classList.remove('canvas-shrunk');
                    if (type === 'sodium') {
                        this.showMagicNotice("阶段完成", "知识已掌握！你可以点击上方【催化氧化】进入下一关。");
                        const navBtn3 = document.querySelectorAll('.nav-btn')[2];
                        if (navBtn3) { navBtn3.classList.remove('locked'); }
                    } else {
                        this.showMagicNotice("阶段完成", "实验大获成功！可以点击上方进入【综合评测】了。");
                        const navBtn4 = document.querySelectorAll('.nav-btn')[3];
                        if (navBtn4) { navBtn4.classList.remove('locked'); }
                    }
                }, 2500);
            } else {
                feedback.style.color = '#ff4444';
                feedback.innerText = '❌ 红色框内的元素不正确，请重新拖拽检查！(注意反应条件或化学计量数)';
            }
        });
    }

    bindCommonDragDrop(dragSelector, dropSelector) {
        const dragItems = document.querySelectorAll(dragSelector);
        const dropZones = document.querySelectorAll(dropSelector);

        dragItems.forEach(item => {
            if (item.dataset.bound) return;
            item.dataset.bound = 'true';
            
            item.addEventListener('dragstart', (e) => {
                this.draggedVal = item.getAttribute('data-val');
                this.activeDragElement = item;
                setTimeout(() => item.style.opacity = '0.5', 0);
            });
            item.addEventListener('dragend', () => {
                if (this.activeDragElement) this.activeDragElement.style.opacity = '1';
                this.draggedVal = null; this.activeDragElement = null;
            });
            item.addEventListener('pointerdown', () => {
                dragItems.forEach(i => i.style.borderColor = '#aaa');
                item.style.borderColor = UI_THEME.primary;
                this.selectedLinearVal = item.getAttribute('data-val');
                this.selectedLinearText = item.innerHTML;
            });
        });

        dropZones.forEach(zone => {
            if (zone.dataset.bound) return;
            zone.dataset.bound = 'true';

            zone.addEventListener('dragover', (e) => { 
                e.preventDefault(); 
                zone.style.borderColor = UI_THEME.primary; 
                zone.style.background = 'rgba(0,255,204,0.2)';
            });
            zone.addEventListener('dragleave', () => { 
                if(!zone.getAttribute('data-filled')) {
                    zone.style.borderColor = UI_THEME.borderNormal; 
                    zone.style.background = 'rgba(0,0,0,0.6)';
                }
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.style.background = 'rgba(0,0,0,0.6)';
                if (this.draggedVal && this.activeDragElement) {
                    zone.setAttribute('data-filled', this.draggedVal);
                    zone.innerHTML = this.activeDragElement.innerHTML;
                    zone.style.borderColor = UI_THEME.primary;
                } else if (!zone.getAttribute('data-filled')) {
                    zone.style.borderColor = UI_THEME.borderNormal;
                }
            });
            zone.addEventListener('pointerdown', () => {
                if (this.selectedLinearVal) {
                    zone.setAttribute('data-filled', this.selectedLinearVal);
                    zone.innerHTML = this.selectedLinearText;
                    zone.style.borderColor = UI_THEME.primary;
                    dragItems.forEach(i => i.style.borderColor = '#aaa');
                    this.selectedLinearVal = null; 
                } else if (zone.getAttribute('data-filled')) {
                    zone.removeAttribute('data-filled'); 
                    zone.innerHTML = '';
                    zone.style.borderColor = UI_THEME.borderNormal; 
                    zone.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.5)';
                }
            });
        });
    }

    initEquationDragDrop() {
        this.bindCommonDragDrop('.eq-drag', '.eq-slot');
    }

    initLinearStructureDragDrop() {
        const dragItems = document.querySelectorAll('.linear-drag');
        if (dragItems.length > 0 && dragItems[0].parentElement) {
            const dragContainer = dragItems[0].parentElement;
            
            Array.from(dragContainer.children).forEach(child => {
                if (child.tagName === 'SPAN' || child.classList.contains('drag-title')) child.remove();
            });

            dragContainer.style.position = 'absolute'; dragContainer.style.right = '20px';
            dragContainer.style.top = '50%'; dragContainer.style.transform = 'translateY(-50%)';
            dragContainer.style.display = 'flex'; dragContainer.style.flexDirection = 'column'; 
            dragContainer.style.gap = '10px'; dragContainer.style.padding = '12px 10px'; 
            dragContainer.style.background = UI_THEME.bgDark; dragContainer.style.border = `2px solid ${UI_THEME.primary}`;
            dragContainer.style.borderRadius = '12px'; dragContainer.style.boxShadow = '0 0 20px rgba(0, 255, 204, 0.3)';
            dragContainer.style.zIndex = '999'; dragContainer.style.alignItems = 'center';
            dragContainer.style.minWidth = 'auto'; dragContainer.style.marginBottom = '0'; 

            dragItems.forEach(item => { item.style.padding = '10px 15px'; item.style.fontSize = '1.6em'; });

            const scrollContent = document.querySelector('.challenge-scroll-content');
            if (scrollContent) scrollContent.style.paddingRight = '120px';
        }
        this.bindCommonDragDrop('.linear-drag', '.linear-slot');
    }
    
    updateLevelUI() {
        let levelText = '';
        switch(this.currentLevel) {
            case 1: levelText = "★ 当前: 结构探秘"; break;
            case 2: levelText = "★ 当前: 置换反应"; break;
            case 3: levelText = "★ 当前: 催化氧化"; break;
            case 4: levelText = "★ 当前: 综合评测"; break;
        }
        let indicatorContainer = document.getElementById('level-indicator-container');
        if (indicatorContainer) indicatorContainer.innerHTML = `<div class="level-indicator">${levelText}</div>`;
    }
    
    initImageZoomPan() {
        const boxes = document.querySelectorAll('.challenge-snapshot-box');
        boxes.forEach(box => {
            if (box.dataset.zoomBound) return;
            box.dataset.zoomBound = 'true';

            const img = box.querySelector('img');
            if (!img) return;

            let state = { scale: 1, x: 0, y: 0 };
            let isDragging = false;
            let startX, startY;

            box.addEventListener('wheel', (e) => {
                e.preventDefault(); 
                const zoomIntensity = 0.15;
                const delta = e.deltaY < 0 ? 1 : -1;
                state.scale += delta * zoomIntensity;
                state.scale = Math.min(Math.max(1, state.scale), 6);
                if (state.scale === 1) { state.x = 0; state.y = 0; }
                updateTransform();
            });

            box.addEventListener('pointerdown', (e) => {
                isDragging = true;
                startX = e.clientX - state.x; startY = e.clientY - state.y;
            });

            box.addEventListener('pointermove', (e) => {
                if (!isDragging) return;
                state.x = e.clientX - startX; state.y = e.clientY - startY;
                updateTransform();
            });

            const stopDrag = () => { isDragging = false; };
            box.addEventListener('pointerup', stopDrag);
            box.addEventListener('pointerleave', stopDrag);
            
            box.addEventListener('dblclick', () => { state = { scale: 1, x: 0, y: 0 }; updateTransform(); });

            function updateTransform() { img.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`; }
        });
    }

    checkLinearStructures() {
        const slots = document.querySelectorAll('.linear-slot');
        let allSlotsCorrect = true; let isSlotsFilled = true;

        slots.forEach(slot => {
            const expected = slot.getAttribute('data-expected');
            const filled = slot.getAttribute('data-filled');
            if (!filled) { isSlotsFilled = false; slot.style.borderColor = '#ffaa00'; } 
            else if (expected !== filled) { allSlotsCorrect = false; slot.style.borderColor = '#ff4444'; } 
            else { slot.style.borderColor = '#00ffcc'; }
        });

        const diffInput = document.getElementById('input-difference');
        let diffFilled = false; let diffTextError = false;
        
        if (diffInput) {
            const val = diffInput.value.trim();
            const hasOxygen = val.includes('氧') || val.includes('O') || val.includes('o');
            const hasConnection = val.includes('连') || val.includes('接') || val.includes('键') || val.includes('位置') || val.includes('元素') || val.includes('中间') || val.includes('两端') || val.includes('不一致') || val.includes('不同') || val.includes('区别');
            
            if (val.length >= 2 && hasOxygen && hasConnection) { diffFilled = true; diffInput.style.borderColor = '#00ffcc'; } 
            else if (val.length >= 2) { diffTextError = true; diffInput.style.borderColor = '#ff4444'; } 
            else { diffInput.style.borderColor = '#ffaa00'; }
        }

        const feedback = document.getElementById('structure-feedback');

        if (!isSlotsFilled || (diffInput && diffInput.value.trim().length < 2)) {
            feedback.style.color = '#ffaa00'; feedback.innerText = '⚠️ 请确保填满所有结构空槽，并完成底部的简答题！'; return;
        }
        
        if (diffTextError) {
            feedback.style.color = '#ff4444'; feedback.innerText = '❌ 简答题偏题啦。提示：请观察【氧元素(O)】与其他元素【连接的位置/方式】是否一致？'; return;
        }

        if (allSlotsCorrect && diffFilled && !diffTextError) {
            this.userStats.linearStructuresPassed = true;
            this.saveProgress(); 
            feedback.style.color = '#00ffcc';
            feedback.innerText = '✅ 鉴定与思考完全正确！即将自动为您开启后续实验...';
            
            const navBtn2 = document.getElementById('nav-btn-mod2');
            if (navBtn2) { navBtn2.classList.remove('locked'); navBtn2.innerHTML = '💥 置换反应'; }
            
            const navBtn3 = document.getElementById('nav-btn-mod3');
            if (navBtn3) { navBtn3.classList.remove('locked'); navBtn3.innerHTML = '🔥 催化氧化'; }
            
            this.showMagicNotice("闯关成功", "完美通过！系统正在引导进入下一阶段实验。");
            
            if (window.app && window.app.interactionManager) window.app.interactionManager.selectElementToAdd(null);

            setTimeout(() => {
                document.getElementById('linear-structure-challenge-overlay')?.classList.add('hidden');
                document.getElementById('canvas-container')?.classList.remove('canvas-shrunk');
                document.getElementById('btn-toggle-challenge')?.classList.add('hidden');
                this.switchModule(2); 
            }, 2000);
        } else {
            feedback.style.color = '#ff4444'; feedback.innerText = '❌ 部分槽位拼装有误，请核对红色边框内容。';
        }
    }

    bindEvents() {
        if (this._eventsBound) return;
        this._eventsBound = true;

        document.addEventListener('click', (e) => {
            let target = e.target;
            while (target && target !== document.body) {
                if (target.id && target.id.startsWith('btn-')) break;
                if (target.tagName === 'BUTTON') break;
                if (target.classList && (target.classList.contains('magic-btn') || target.classList.contains('slide-handle-fixed'))) break;
                if (target.classList && target.classList.contains('nav-btn')) break; 
                target = target.parentElement;
            }
            if (!target || target === document.body) return;
            const id = target.id;

            if (typeof gsap !== 'undefined' && (target.tagName === 'BUTTON' || target.classList.contains('nav-btn') || target.classList.contains('magic-btn'))) {
                gsap.killTweensOf(target); target.style.boxShadow = 'none'; target.style.transform = 'scale(1)';
            }

            const app = window.app; if (!app) return;

            if (id.startsWith('btn-') || target.classList.contains('nav-btn')) {
                e.stopPropagation();
            }

            if (id === 'btn-add-c') app.interactionManager?.selectElementToAdd('C');
            if (id === 'btn-add-h') app.interactionManager?.selectElementToAdd('H');
            if (id === 'btn-add-o') app.interactionManager?.selectElementToAdd('O');
            if (id === 'btn-select-hand') app.interactionManager?.selectElementToAdd('hand');
            
            if (id === 'btn-undo') {
                if (this._lastUndoTime && Date.now() - this._lastUndoTime < 300) return; 
                this._lastUndoTime = Date.now();

                if (this.currentLevel === 1) {
                    if (app.sceneManager && typeof app.sceneManager.undoLast === 'function') {
                        app.sceneManager.undoLast();
                    }
                } else {
                    this.showMagicNotice("提示", "反应阶段不可撤销固定原子的结构！若需重新实验请点击【🧪 重置交互】");
                }
            }
            
            if (id === 'btn-clear') {
                if (this.currentLevel === 1) {
                    if (app.sceneManager && typeof app.sceneManager.clearAll === 'function') {
                        app.sceneManager.clearAll();
                    }
                } else {
                    this.showMagicNotice("提示", "反应阶段不可清空场景！若需重新实验请点击【🧪 重置交互】");
                }
            }

            if (id === 'btn-marquee-copy') { if (app.sceneManager && typeof app.sceneManager.copySelected === 'function') app.sceneManager.copySelected(); }
            if (id === 'btn-marquee-delete') { if (app.sceneManager && typeof app.sceneManager.deleteSelected === 'function') app.sceneManager.deleteSelected(); }
            
            if (id === 'btn-auto-build') app.sceneManager?.autoBuildEthanol();

            const director = app.reactionDirector || app.chemistryEngine?.director || app.chemistryEngine;
            
            if (id === 'btn-reaction-na') {
                this.userStats.watchedNa = true; this.saveProgress(); 
                if(director && typeof director.playSodiumReaction === 'function') director.playSodiumReaction();
            }
            if (id === 'btn-reaction-cu') {
                this.userStats.watchedCu = true; this.saveProgress(); 
                if(director && typeof director.playOxidationReaction === 'function') director.playOxidationReaction();
            }
            if (id === 'btn-retry-interaction') {
                if (app.chemistryEngine && typeof app.chemistryEngine.retryInteractiveReaction === 'function') app.chemistryEngine.retryInteractiveReaction();
                else if(director && typeof director.retryInteractiveReaction === 'function') director.retryInteractiveReaction();
            }

            if (id === 'btn-slide-elements') {
                document.getElementById('action-bar')?.classList.toggle('action-bar-hidden');
                if (document.getElementById('action-bar')?.classList.contains('action-bar-hidden')) app.interactionManager?.selectElementToAdd(null);
            }
            if (id === 'btn-toggle-main-3d') { if (target.onclick) return; }
            
            if (id === 'btn-reset-progress') {
                if (confirm("🚨 警告：这将会清除你所有的通关记录、测试分数并从头开始！\n你确定要重置吗？")) {
                    localStorage.removeItem('chem_lab_progress'); location.reload();
                }
            }
            
            if (id === 'btn-toggle-challenge') {
                if (this.currentLevel === 1) {
                    const elEthane = document.getElementById('img-ethane');
                    if (elEthane) elEthane.src = this.snapshots['ethane'] || '';
                    
                    const elIsomerA = document.getElementById('img-isomerA');
                    if (elIsomerA) elIsomerA.src = this.snapshots[this.builtOrder[0]] || '';
                    
                    const elIsomerB = document.getElementById('img-isomerB');
                    if (elIsomerB) elIsomerB.src = this.snapshots[this.builtOrder[1]] || '';

                    const expectedA = this.builtOrder[0] || 'ethanol';
                    const expectedB = this.builtOrder[1] || 'dimethyl_ether';
                    
                    const slotA = document.getElementById('slots-isomerA');
                    if(slotA) slotA.innerHTML = expectedA === 'ethanol' ? '<div class="linear-slot" data-expected="CH3"></div><span class="struct-dash">-</span><div class="linear-slot" data-expected="CH2"></div><span class="struct-dash">-</span><div class="linear-slot" data-expected="OH"></div>' : '<div class="linear-slot" data-expected="CH3"></div><span class="struct-dash">-</span><div class="linear-slot" data-expected="O"></div><span class="struct-dash">-</span><div class="linear-slot" data-expected="CH3"></div>';
                    
                    const slotB = document.getElementById('slots-isomerB');
                    if(slotB) slotB.innerHTML = expectedB === 'ethanol' ? '<div class="linear-slot" data-expected="CH3"></div><span class="struct-dash">-</span><div class="linear-slot" data-expected="CH2"></div><span class="struct-dash">-</span><div class="linear-slot" data-expected="OH"></div>' : '<div class="linear-slot" data-expected="CH3"></div><span class="struct-dash">-</span><div class="linear-slot" data-expected="O"></div><span class="struct-dash">-</span><div class="linear-slot" data-expected="CH3"></div>';

                    this.initLinearStructureDragDrop();
                    this.initImageZoomPan();

                    document.getElementById('linear-structure-challenge-overlay')?.classList.remove('hidden');
                    document.getElementById('canvas-container')?.classList.add('canvas-shrunk');
                } 
                else if (this.currentLevel === 2) {
                    if (this.pendingChallengeType === 'sodium') {
                        this.showEquationMinigame('sodium'); this.pendingChallengeType = null; target.classList.add('hidden');
                    }
                } 
                else if (this.currentLevel === 3) {
                    if (this.pendingChallengeType === 'oxidation') {
                        this.showEquationMinigame('oxidation'); this.pendingChallengeType = null; target.classList.add('hidden');
                    }
                }
            }
            
            if (id === 'btn-close-challenge') {
                document.getElementById('linear-structure-challenge-overlay')?.classList.add('hidden');
                document.getElementById('canvas-container')?.classList.remove('canvas-shrunk');
            }
            if (id === 'btn-submit-structures') this.checkLinearStructures();
            
            if (id === 'btn-trigger-quiz' || id === 'btn-finish' || id === 'btn-start-final-quiz') {
                const gallery = document.getElementById('final-gallery-overlay');
                if (gallery) { gallery.remove(); } 
                
                if (id === 'btn-start-final-quiz' || id === 'btn-finish') {
                    this.startFinalQuiz(); 
                } else if (app.aiAssistant) {
                    this.showAITrial(); app.aiAssistant.generateQuiz(this.userStats, this.currentLevel);
                }
            }
            
            if (id === 'btn-close-ai') {
                document.getElementById('ai-trial-panel')?.classList.add('hidden');
            }
            
            if (id === 'btn-close-eval') {
                document.getElementById('evaluation-panel')?.classList.add('hidden');
                document.querySelector('.system-menu')?.classList.remove('hidden');
                document.querySelector('.action-bar')?.classList.remove('hidden');
            }
            
            if (id === 'btn-close-dual-popup') {
                document.getElementById('dual-isomer-popup')?.classList.add('hidden');
                document.getElementById('canvas-container')?.classList.remove('canvas-shrunk');
                const actionBar = document.querySelector('.action-bar');
                if (actionBar) actionBar.style.display = 'flex';
                if (this.dualRenderers) { this.dualRenderers.forEach(r => { if(r && r.dispose) r.dispose(); }); this.dualRenderers = null; }
                setTimeout(() => window.dispatchEvent(new Event('resize')), 600);
            }
        });

        const firstNavBtn = document.querySelector('.nav-btn');
        if (firstNavBtn && !document.getElementById('btn-help-guide')) {
            const btnHelp = document.createElement('button');
            btnHelp.type = 'button';
            btnHelp.id = 'btn-help-guide';
            btnHelp.className = firstNavBtn.className.replace('active', '').trim(); 
            btnHelp.innerHTML = '❓ 帮助'; btnHelp.title = '查看详细操作指南';
            btnHelp.style.color = UI_THEME.warning; btnHelp.style.borderColor = UI_THEME.warning;
            btnHelp.style.marginRight = '10px'; btnHelp.style.textShadow = '0 0 5px rgba(255, 170, 0, 0.5)';
            
            btnHelp.addEventListener('pointerdown', e => e.stopPropagation());
            btnHelp.addEventListener('mousedown', e => e.stopPropagation());

            firstNavBtn.parentNode.insertBefore(btnHelp, firstNavBtn);
            btnHelp.addEventListener('click', (e) => { if(e)e.preventDefault(); this.showHelpInstructions(); });
        }

        const systemMenu = document.getElementById('system-menu');
        if (systemMenu && !document.getElementById('btn-undo')) {
            const createBtn = (id, icon, color, title) => {
                const btn = document.createElement('button');
                btn.type = 'button'; 
                btn.id = id; btn.className = 'magic-btn'; btn.innerHTML = icon;
                btn.style.borderColor = color; btn.style.color = color;
                if(title) btn.title = title;

                btn.addEventListener('pointerdown', e => e.stopPropagation());
                btn.addEventListener('mousedown', e => e.stopPropagation());

                return btn;
            };

            systemMenu.appendChild(createBtn('btn-toggle-main-3d', '👁️', UI_THEME.primary, '打开/关闭 3D 参考视图'));
            systemMenu.appendChild(createBtn('btn-undo', '↩️', UI_THEME.warning, '撤销上一步操作'));
            systemMenu.appendChild(createBtn('btn-clear', '🧹', UI_THEME.danger, '清空重置场景'));
            
            const btnChallenge = createBtn('btn-toggle-challenge', '🎯', UI_THEME.primary, '开启挑战');
            btnChallenge.classList.add('hidden'); systemMenu.appendChild(btnChallenge);

            const btnRetry = createBtn('btn-retry-interaction', '🧪', '#ff8800', '重置交互步骤');
            btnRetry.classList.add('hidden'); systemMenu.appendChild(btnRetry);

            const btnQuiz = createBtn('btn-trigger-quiz', '👩‍💼', UI_THEME.primary, 'AI 随堂检测');
            btnQuiz.classList.add('hidden'); systemMenu.appendChild(btnQuiz);
            
            const btnReset = createBtn('btn-reset-progress', '🗑️', UI_THEME.danger, '清空本地存档并重头开始');
            systemMenu.appendChild(btnReset);
        }
    }

    showAutoBuildBtn() {
        let systemMenu = document.getElementById('system-menu');
        if (systemMenu && !document.getElementById('btn-auto-build')) {
            const btnAutoBuild = document.createElement('button');
            btnAutoBuild.type = 'button';
            btnAutoBuild.id = 'btn-auto-build'; btnAutoBuild.className = 'magic-btn';
            btnAutoBuild.innerHTML = '🪄'; btnAutoBuild.title = '快捷搭建模型';
            btnAutoBuild.style.borderColor = 'var(--rpg-mana)'; btnAutoBuild.style.color = 'var(--rpg-mana)';
            systemMenu.appendChild(btnAutoBuild);
            if (typeof gsap !== 'undefined') gsap.fromTo(btnAutoBuild, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" });
        }
    }

    unlockMain3DView(moleculeType) {
        const leftPanel = document.getElementById('left-vision-panel');
        const miniVisionControls = document.getElementById('mini-vision-controls');
        const btnToggle = document.getElementById('btn-toggle-main-3d');
        const btnHighlight = document.getElementById('btn-highlight-group');
        const btnReplay = document.getElementById('btn-replay-animation');
        const titleEl = document.getElementById('mini-vision-title');
        const actionBar = document.getElementById('action-bar');
        
        this.currentMoleculeType = moleculeType;
        if (btnToggle) {
            const getVisionText = (type) => {
                switch(type) {
                    case 'dimethyl_ether': return "参考视图";
                    case 'sodium_ethoxide': return "产物结构视图";
                    case 'acetaldehyde': return "产物结构视图";
                    case 'ethanol': return "当前主视图";
                    case 'ethane': return "结构视图"; 
                    default: return "3D视图";
                }
            };
            const targetText = getVisionText(moleculeType);
            if (!leftPanel.classList.contains('hidden')) {
                btnToggle.innerHTML = `👁️`; btnToggle.title = `关闭 ${targetText}`;
                if(miniVisionControls) miniVisionControls.classList.remove('hidden'); 
                if(btnHighlight) btnHighlight.classList.remove('hidden');
                if(titleEl) titleEl.innerText = targetText;
                if(actionBar) actionBar.classList.add('action-bar-hidden');

                if (!this.miniRendererInstance || this.currentRenderedType !== this.currentMoleculeType) {
                    this.renderMiniModel(moleculeType);
                }
            } else {
                btnToggle.innerHTML = `👁️`; btnToggle.title = `打开 ${targetText}`;
            }
            
            btnToggle.onclick = (e) => {
                if(e) e.preventDefault();
                const isHidden = leftPanel.classList.contains('hidden');
                const nextText = getVisionText(this.currentMoleculeType);
                if (isHidden) {
                    leftPanel.classList.remove('hidden'); btnToggle.title = `关闭 ${nextText}`;
                    if(miniVisionControls) miniVisionControls.classList.remove('hidden'); 
                    if(btnHighlight) btnHighlight.classList.remove('hidden');
                    if(titleEl) titleEl.innerText = nextText;
                    if(actionBar) actionBar.classList.add('action-bar-hidden');

                    if (this.currentLevel === 2 || this.currentLevel === 3) {
                         this.playCinematicMicroAnimation(this.currentLevel === 2 ? 'sodium' : 'oxidation');
                    } else {
                         if (!this.miniRendererInstance || this.currentRenderedType !== this.currentMoleculeType) {
                             this.renderMiniModel(this.currentMoleculeType);
                         }
                    }
                    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 500);
                } else {
                    leftPanel.classList.add('hidden'); btnToggle.title = `打开 ${nextText}`;
                    if(actionBar) actionBar.classList.remove('action-bar-hidden');
                    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 500);
                }
            };

            if (typeof gsap !== 'undefined') {
                gsap.fromTo(btnToggle, { boxShadow: "0 0 0px #ffaa00" }, { boxShadow: "0 0 20px #ffaa00", duration: 0.8, yoyo: true, repeat: 3 });
            }
        }
        if (btnHighlight) {
            btnHighlight.onclick = (e) => {
                if(e) e.preventDefault();
                if (window.app && window.app.sceneManager) {
                    window.app.sceneManager.toggleHighlightFunctionalGroup(this.currentMoleculeType);
                    btnHighlight.innerText = window.app.sceneManager.isHighlighted ? "取消高亮" : "✨";
                }
            };
        }
        if (btnReplay && !btnReplay.onclick) btnReplay.onclick = (e) => { if(e) e.preventDefault(); this.replayCinematicMicroAnimation(); };
    }

    playCinematicMicroAnimation(reactionType) {
        if (reactionType) this.lastReactionType = reactionType; else reactionType = this.lastReactionType;
        
        this.unlockMain3DView('ethanol');
        const leftPanel = document.getElementById('left-vision-panel');
        if (leftPanel && leftPanel.classList.contains('hidden')) leftPanel.classList.remove('hidden');

        const actionBar = document.getElementById('action-bar');
        if (actionBar) actionBar.classList.add('action-bar-hidden'); 

        const btnReplay = document.getElementById('btn-replay-animation');
        const btnHighlight = document.getElementById('btn-highlight-group');
        if (btnReplay) btnReplay.classList.remove('hidden');
        if (btnHighlight) btnHighlight.classList.add('hidden');
        
        this.renderMiniModel('ethanol');
        
        setTimeout(() => {
            if (this.miniRendererInstance && !this.miniRendererInstance.isDisposed) {
                if (reactionType === 'sodium' || this.currentLevel === 2) {
                    this.miniRendererInstance.animateTransitionToSodiumEthoxide();
                    this.currentRenderedType = 'sodium_ethoxide';
                    document.getElementById('mini-vision-title').innerText = "产物结构";
                } else if (reactionType === 'oxidation' || this.currentLevel === 3) {
                    this.miniRendererInstance.animateTransitionToAcetaldehyde();
                    this.currentRenderedType = 'acetaldehyde';
                    document.getElementById('mini-vision-title').innerText = "产物结构";
                }
            }
        }, 800);
    }

    replayCinematicMicroAnimation() {
        this.renderMiniModel('ethanol');
        document.getElementById('mini-vision-title').innerText = "反应前准备";
        
        const actionBar = document.getElementById('action-bar');
        if (actionBar) actionBar.classList.add('action-bar-hidden'); 

        setTimeout(() => {
            if (this.miniRendererInstance && !this.miniRendererInstance.isDisposed) {
                if (this.lastReactionType === 'sodium' || this.currentLevel === 2) {
                    this.miniRendererInstance.animateTransitionToSodiumEthoxide();
                    this.currentRenderedType = 'sodium_ethoxide';
                    document.getElementById('mini-vision-title').innerText = "产物结构";
                } else if (this.lastReactionType === 'oxidation' || this.currentLevel === 3) {
                    this.miniRendererInstance.animateTransitionToAcetaldehyde();
                    this.currentRenderedType = 'acetaldehyde';
                    document.getElementById('mini-vision-title').innerText = "产物结构";
                }
            }
        }, 1200);
    }

    renderMiniModel(moleculeType) {
        const previewContainer = document.getElementById('main-3d-preview');
        if(!previewContainer) return;

        if ((moleculeType === 'sodium_ethoxide' || moleculeType === 'acetaldehyde') && this.currentRenderedType === 'ethanol' && this.miniRendererInstance && !this.miniRendererInstance.isDisposed) {
            if (moleculeType === 'sodium_ethoxide') this.miniRendererInstance.animateTransitionToSodiumEthoxide();
            else this.miniRendererInstance.animateTransitionToAcetaldehyde();
            this.currentRenderedType = moleculeType;
            return;
        }
        if (this.miniRendererInstance && typeof this.miniRendererInstance.dispose === 'function') {
            this.miniRendererInstance.dispose(); this.miniRendererInstance = null;
        }
        previewContainer.innerHTML = '<p class="loading-text" style="font-size: 1.5em; font-family: \'Heiti\', sans-serif;">加载模型中...</p>';
        setTimeout(() => {
            this.miniRendererInstance = new MiniModelRenderer('main-3d-preview', moleculeType);
            this.currentRenderedType = moleculeType;
        }, 100);
    }

    forceOpenMain3DView(moleculeType) {
        this.unlockMain3DView(moleculeType);
        const leftPanel = document.getElementById('left-vision-panel');
        if (leftPanel && leftPanel.classList.contains('hidden')) {
            document.getElementById('btn-toggle-main-3d')?.click();
        } else {
            const actionBar = document.getElementById('action-bar');
            if (actionBar) actionBar.classList.add('action-bar-hidden');
        }
    }

    // 🌟 GitHub 环境终极防御区：为错题本单独创建绝对安全的顶级覆盖层
    showWrongQuestions() {
        const existingOverlay = document.getElementById('wrong-question-overlay');
        if (existingOverlay) existingOverlay.remove();
        
        const overlay = document.createElement('div');
        overlay.id = 'wrong-question-overlay';
        overlay.className = this.baseOverlayClass; 
        
        // 彻底接管外部 CSS 的 fixed 样式
        overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0,0,0,0.85) !important; display: flex !important; justify-content: center !important; align-items: center !important; z-index: 99999999 !important; animation: none !important; transition: none !important; opacity: 1 !important; pointer-events: auto !important; margin: 0 !important; padding: 0 !important;';

        const panel = document.createElement('div');
        panel.id = 'wrong-question-panel';
        
        // 脱离原有类的束缚
        panel.style.cssText = 'width: 90vw !important; max-width: 1200px !important; max-height: 90vh !important; overflow-y: auto !important; position: relative !important; transform: none !important; margin: 0 !important; padding: 40px !important; box-sizing: border-box !important; background: rgba(20,20,30,0.98) !important; border: 3px solid #ff4444 !important; border-radius: 20px !important; box-shadow: 0 15px 60px rgba(255,68,68,0.3) !important; color: #fff; animation: none !important; transition: none !important;';
        
        let content = `<h2 style="color: #ff4444; text-align: center; margin-bottom: 40px; font-size: 3.5em; font-family: 'Heiti', 'SimHei', sans-serif; text-shadow: 2px 2px 5px #000; margin-top: 0;">错题档案本</h2>`;
        
        if (!this.userStats.wrongQuestions || this.userStats.wrongQuestions.length === 0) {
            content += `<div style="text-align: center; padding: 50px; background: rgba(0,255,204,0.1); border-radius: 20px;"><h3 style="color: #00ffcc; font-size: 3em; font-family: 'Heiti', sans-serif;">完美无瑕！</h3><p style="color: #fff; font-size: 2em; margin-top: 30px; font-family: 'Songti', 'SimSun', serif;">大考全对，无错题记录。</p></div>`;
        } else {
            this.userStats.wrongQuestions.forEach((wq, index) => {
                let modText = ["", "探究阶段", "取代实验", "氧化实验", "最终大考"][wq.module] || "考核点";
                content += `
                    <div style="background: rgba(0,0,0,0.6); padding: 40px; border: 2px solid #ff4444; border-radius: 12px; margin-bottom: 30px; text-align: left;">
                        <div style="color: #ffaa00; font-weight: bold; margin-bottom: 20px; font-size: 2.5em; font-family: 'Heiti', sans-serif;">记录 #${index + 1} &nbsp;<span style="color:#aaa; font-size:0.8em; font-weight:normal;">(${modText})</span></div>
                        <div style="color: #fff; line-height: 1.8; font-size: 3em; font-family: 'Songti', 'SimSun', serif; word-break: break-word; white-space: normal;">${wq.explanation}</div>
                    </div>
                `;
            });
        }
        
        content += `
            <div style="text-align: center; margin-top: 50px; display: flex; justify-content: center; gap: 40px; flex-wrap: wrap;">
                <button type="button" id="btn-download-wq-txt" class="magic-btn" style="font-size: 2.5em; font-family: 'Heiti', sans-serif; padding: 15px 50px; border-color: #00ffcc; color: #00ffcc; box-shadow: 0 0 20px rgba(0,255,204,0.3); cursor: pointer;">⬇️ 下载错题复习(TXT)</button>
                <button type="button" id="btn-close-wq-panel" class="magic-btn" style="font-size: 2.5em; font-family: 'Heiti', sans-serif; padding: 15px 50px; border-color: #fff; color: #fff; cursor: pointer;">❌ 关闭档案</button>
            </div>
        `;
        
        panel.innerHTML = content;
        overlay.appendChild(panel);
        document.body.appendChild(overlay); 

        setTimeout(() => {
            const btnDownloadTxt = document.getElementById('btn-download-wq-txt');
            if (btnDownloadTxt) btnDownloadTxt.onclick = (e) => { if(e) e.preventDefault(); this.downloadWrongQuestionsText(); };
            const btnClosePanel = document.getElementById('btn-close-wq-panel');
            if (btnClosePanel) btnClosePanel.onclick = (e) => { if(e) e.preventDefault(); overlay.remove(); };
        }, 100);
    }
}
