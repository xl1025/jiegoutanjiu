/** 互动 UI 管理器 (UIManager.js) 
 * 🌟 专家完善版：深度打磨综合评测模块，新增大考前的“成果殿堂”3D全息沉淀，以及基于数据的S/A/B/C动态评级和高定证书！
 * 🌟 修复版：完美解决催化氧化模块由于结构断键导致的“眼睛按钮”被错误置灰禁用的问题！
 * 🌟 闭环体验版：修复了“开始考核”按钮被遮挡不可见的问题，并增加了“返回主页”按钮，完善学习闭环体验。
 * 🌟 终极评测版：内置20道高质量核心题库，随机抽取5题进行综合大考，并根据四大关卡完成度生成精准雷达图与总分评级！
 * 🌟 沉浸式无边框引导版：彻底删除所有右侧提示弹窗面板，通过解析场景智能驱动全局对应【按钮与原子】的发光特效引导操作！
 * 🌟 动态指南版：帮助说明弹窗根据当前所在模块动态显示对应内容；当完成所有测验后，才展示全阶段的所有内容。
 * 🌟 时序阻塞版：进入每个模块前先强制显示操作提示，关闭提示后才进入模块内容；炼金成果弹窗增加关闭按钮。
 * 🌟 模块化指南版：帮助弹窗中各模块严格分为【核心任务】和【按钮说明】两大视觉区块，并按数字顺序排列。
 * 🌟 宽屏小字距版：大幅增加综合测试弹窗宽度，并将题目、选项与解析的字体精确缩小至原有的三分之二，提升阅读舒适度。
 */
class UIManager {
    constructor() {
        this.userStats = { 
            foundIsomer: false, watchedNa: false, watchedCu: false, 
            eqSodiumPassed: false, eqOxidationPassed: false, finalQuizScore: 0,
            quizScore: 0, startTime: Date.now(), wrongQuestions: [], linearStructuresPassed: false,
            finalCompleted: false 
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
        
        this.finalQuizState = { questions: [], currentIndex: 0, correctCount: 0 };
        this.initQuestionBank();

        this.saveTimeout = null;

        this.injectStyles(); 
        this.loadProgress(); 
        this.bindEvents();
        
        setTimeout(() => {
            this.switchModule(this.currentLevel); 
            if (this.currentLevel > 1) {
                this.showMagicNotice("进度已恢复", "系统已自动为您恢复到上一次的实验进度！");
            }
        }, 500);
    }

    initQuestionBank() {
        this.questionBank = [
            { question: "乙醇和二甲醚互为同分异构体，它们的分子式都是？", options: ["CH₄O", "C₂H₆O", "C₂H₄O", "C₃H₈O"], correctIdx: 1, explanation: "乙醇和二甲醚的分子式均为C₂H₆O，但因氧原子的连接位置不同（结构不同）导致性质截然不同。" },
            { question: "乙醇与金属钠反应时，断裂的化学键是？", options: ["C-C键", "C-H键", "C-O键", "O-H键"], correctIdx: 3, explanation: "乙醇与钠反应生成乙醇钠和氢气，实质是钠取代了羟基(-OH)中O-H键上的氢原子。" },
            { question: "催化氧化实验中，光亮的铜丝变黑是因为生成了？", options: ["C", "CuO", "Cu₂O", "Cu(OH)₂"], correctIdx: 1, explanation: "铜丝在空气中受热被氧气氧化，生成了黑色的氧化铜(CuO)。" },
            { question: "乙醇催化氧化的最终含碳产物是？", options: ["乙烯", "乙酸", "乙醛", "二氧化碳"], correctIdx: 2, explanation: "乙醇在铜作催化剂和加热的条件下，被氧化生成乙醛(CH₃CHO)和水。" },
            { question: "下列哪种物质能与金属钠反应产生氢气？", options: ["乙烷", "乙醇", "苯", "四氯化碳"], correctIdx: 1, explanation: "乙醇分子中含有活泼的羟基(-OH)，可以与金属钠发生置换反应产生氢气。" },
            { question: "决定乙醇主要化学性质的官能团是？", options: ["甲基", "乙基", "羟基", "醛基"], correctIdx: 2, explanation: "羟基(-OH)是乙醇的官能团，决定了乙醇能与钠反应以及发生催化氧化等性质。" },
            { question: "在乙醇催化氧化反应中，铜起到的作用是？", options: ["氧化剂", "还原剂", "催化剂", "脱水剂"], correctIdx: 2, explanation: "铜先被氧化为CuO，CuO再与乙醇反应生成乙醛和Cu，铜在反应前后质量和化学性质不变，作催化剂。" },
            { question: "对比水和乙醇与金属钠的反应，哪个更剧烈？", options: ["乙醇", "水", "一样剧烈", "无法比较"], correctIdx: 1, explanation: "水分子中的O-H键比乙醇中的O-H键极性更强，氢原子更容易脱离，因此水与钠的反应更剧烈。" },
            { question: "乙醇催化氧化生成乙醛的反应条件是？", options: ["常温常压", "点燃", "Cu或Ag作催化剂并加热", "浓硫酸加热"], correctIdx: 2, explanation: "乙醇催化氧化需要铜(Cu)或银(Ag)作催化剂，并在加热(△)条件下进行。" },
            { question: "将烧热变黑的铜丝插入乙醇溶液中，铜丝的颜色变化是？", options: ["保持黑色", "黑变红", "变黄", "变蓝"], correctIdx: 1, explanation: "黑色的CuO将乙醇氧化为乙醛，自身被还原为单质铜，因此颜色由黑变红。" },
            { question: "乙醇和二甲醚物理和化学性质不同的根本原因是？", options: ["分子量不同", "组成元素不同", "分子结构不同", "原子数量不同"], correctIdx: 2, explanation: "两者分子式相同，但原子连接的顺序和方式（分子结构）不同，导致了性质的巨大差异。" },
            { question: "一个完整的乙醇(CH₃CH₂OH)分子中含有几个碳氢键(C-H)？", options: ["4个", "5个", "6个", "7个"], correctIdx: 1, explanation: "乙醇分子中有1个甲基(-CH₃)含3个C-H键，1个亚甲基(-CH₂-)含2个C-H键，共5个C-H键。" },
            { question: "置换反应中，2分子乙醇与2分子钠反应能生成几分子氢气？", options: ["1分子", "2分子", "3分子", "4分子"], correctIdx: 0, explanation: "2CH₃CH₂OH + 2Na → 2CH₃CH₂ONa + H₂↑，每两个羟基氢原子结合生成一个氢气分子。" },
            { question: "乙醛的官能团是？", options: ["羟基", "羧基", "醛基", "羰基"], correctIdx: 2, explanation: "乙醛(CH₃CHO)的特征官能团是醛基(-CHO)。" },
            { question: "水分子(H₂O)与乙醇分子(C₂H₅OH)中，都含有的化学键是？", options: ["C-C键", "C-H键", "O-H键", "C=O键"], correctIdx: 2, explanation: "水分子(H-O-H)和乙醇分子(C₂H₅-O-H)中均含有极性的O-H共价键。" },
            { question: "下列关于乙醇物理性质的描述，错误的是？", options: ["无色透明液体", "有特殊香味", "不溶于水", "易挥发"], correctIdx: 2, explanation: "乙醇能与水以任意比例互溶，而非不溶于水。" },
            { question: "在催化氧化反应中，每个乙醇分子脱去了几个氢原子？", options: ["1个", "2个", "3个", "4个"], correctIdx: 1, explanation: "乙醇(CH₃CH₂OH)脱去羟基上的1个H和连着羟基的碳原子上的1个H，共脱去2个H生成乙醛。" },
            { question: "乙醇发生催化氧化时，断裂的化学键是？", options: ["仅O-H键", "仅C-H键", "O-H键和C-H键", "C-C键"], correctIdx: 2, explanation: "催化氧化时，断裂了羟基上的O-H键以及与羟基相连的α碳上的一个C-H键。" },
            { question: "乙醇钠(CH₃CH₂ONa)中含有的化学键类型是？", options: ["仅离子键", "仅共价键", "离子键和共价键", "氢键"], correctIdx: 2, explanation: "钠离子与乙氧基之间是离子键，乙氧基内部的C-C, C-H, C-O之间是共价键。" },
            { question: "关于乙醇的分子结构，以下说法正确的是？", options: ["所有原子都在同一平面", "含有非极性键C-C", "只有极性键", "氧原子不参与成键"], correctIdx: 1, explanation: "乙醇分子空间呈立体构型，含有极性键(C-O, O-H, C-H)和非极性键(C-C)。" }
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
                background: rgba(0,0,0,0.6); color: #00ffcc; font-weight: bold; font-size: 0.9em; 
                cursor: pointer; vertical-align: middle; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
                padding: 0 10px; margin: 0 5px; transition: all 0.2s;
            }
            .eq-slot[data-filled] { border: 2px solid #00ffcc; background: rgba(0,255,204,0.1); }
            .magic-overlay-bg {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(10,10,15,0.95); 
                z-index: 9999999; display: flex; align-items: center; justify-content: center; 
                backdrop-filter: blur(8px); pointer-events: auto; transition: background 0.5s, backdrop-filter 0.5s;
            }
            .showcase-item { transition: transform 0.3s; }
            .showcase-item:hover { transform: translateY(-10px) scale(1.05); }
            .quiz-opt-btn:hover { border-color: #00ffcc !important; transform: translateX(10px); }

            /* 🌟 宽屏测试版：强制大幅增大所有随堂测试和综合测验弹窗的宽度 */
            #ai-trial-panel > div, .challenge-modal {
                max-width: 1400px !important;
                width: 96% !important;
                padding: 40px 50px !important;
            }
            
            /* 🌟 操作说明弹窗样式 */
            .help-content-box {
                background: rgba(20,20,30,0.98); border: 3px solid var(--rpg-mana, #00ffcc); 
                border-radius: 15px; padding: 40px 50px; width: 85%; max-width: 1000px; 
                max-height: 85vh; overflow-y: auto; box-shadow: 0 0 50px rgba(0,255,204,0.4);
                color: #fff; text-align: left; position: relative;
            }
            .help-module-title {
                color: var(--rpg-gold, #ffaa00); font-size: 2.2em; margin-top: 30px; margin-bottom: 15px; 
                border-bottom: 2px solid #444; padding-bottom: 10px; font-weight: bold; text-shadow: 1px 1px 3px #000;
            }
            .help-step {
                font-size: 1.6em; line-height: 1.8; margin-bottom: 12px; color: #eee;
            }
        `;
        document.head.appendChild(style);
    }

    showMagicNotice(title, desc) {
        const text = (title + " " + desc).toLowerCase();
        let targetBtns = [];

        if (text.includes('na') || text.includes('取代') || text.includes('钠')) {
            targetBtns.push(document.getElementById('btn-reaction-na'));
        }
        if (text.includes('cu') || text.includes('氧化') || text.includes('铜')) {
            targetBtns.push(document.getElementById('btn-reaction-cu'));
        }
        if (text.includes('🎯') || text.includes('配平') || text.includes('挑战') || text.includes('鉴定')) {
            targetBtns.push(document.getElementById('btn-toggle-challenge'));
        }
        if (text.includes('👁️') || text.includes('视图') || text.includes('结构视图') || text.includes('异构体') || text.includes('新结构')) {
            targetBtns.push(document.getElementById('btn-toggle-main-3d'));
        }
        if (text.includes('考核') || text.includes('评测')) {
            targetBtns.push(document.getElementById('btn-start-final-quiz'));
            targetBtns.push(document.getElementById('btn-finish'));
        }
        if (text.includes('🖐️') || text.includes('手')) {
            targetBtns.push(document.getElementById('btn-select-hand'));
        }
        if (text.includes('画笔') || text.includes('c、h、o')) {
            targetBtns.push(document.getElementById('btn-add-c'));
            targetBtns.push(document.getElementById('btn-add-h'));
            targetBtns.push(document.getElementById('btn-add-o'));
        }
        if (text.includes('⬚') || text.includes('复制') || text.includes('守恒')) {
            targetBtns.push(document.getElementById('btn-marquee-tool'));
        }
        
        if (text.includes('下一关') || text.includes('阶段完成') || text.includes('后续实验') || text.includes('下一阶段')) {
            if (this.currentLevel === 1) targetBtns.push(document.getElementById('nav-btn-mod2'));
            if (this.currentLevel === 2) targetBtns.push(document.getElementById('nav-btn-mod3'));
            if (this.currentLevel === 3) targetBtns.push(document.getElementById('nav-btn-mod4'));
        }

        targetBtns.forEach(btn => {
            if (btn && typeof gsap !== 'undefined') {
                gsap.killTweensOf(btn);
                btn.style.boxShadow = "none";
                btn.style.transform = "scale(1)";
                
                let glowColor = "#00ffcc";
                if (text.includes('警告') || text.includes('错误') || text.includes('❌')) glowColor = "#ff4444";
                else if (text.includes('成功') || text.includes('完成') || text.includes('✅')) glowColor = "#ffaa00";

                gsap.fromTo(btn, 
                    { boxShadow: `0 0 0px ${glowColor}`, scale: 1 }, 
                    { boxShadow: `0 0 25px ${glowColor}`, scale: 1.15, duration: 0.6, yoyo: true, repeat: 7, ease: "power1.inOut" }
                );
            }
        });
    }

    showHelpInstructions(onCloseCallback = null) {
        let overlay = document.getElementById('help-instructions-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'help-instructions-overlay';
        overlay.className = 'magic-overlay-bg';

        const mod1HTML = `
            <div class="help-module-title">🧩 模块一：结构探秘</div>
            <div class="help-step" style="background: rgba(0,255,204,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid #00ffcc; margin-bottom: 15px;">
                <span style="color:#00ffcc; font-weight:bold; font-size: 1.2em;">🎯 核心任务</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. 拼装出“乙醇”与“二甲醚”两种分子结构。</div>
                <div style="margin-left: 10px;">2. 完成看图鉴定挑战及随堂测试题。</div>
            </div>
            <div class="help-step" style="background: rgba(255,170,0,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid #ffaa00; margin-bottom: 20px;">
                <span style="color:#ffaa00; font-weight:bold; font-size: 1.2em;">🕹️ 按钮说明</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. <span style="color:#ffaa00;">【C、H、O 按钮】</span> 点击后在空白处生成对应的原子，拖拽原子靠近自动吸附。</div>
                <div style="margin-left: 10px;">2. <span style="color:#ffaa00;">【🖐️ 手形工具】</span> 未选中画笔时拖拽空白处可平移视角；拖拽框选分子可进行复制或删除。</div>
                <div style="margin-left: 10px;">3. <span style="color:#ffaa00;">【🎯 靶子按钮】</span> 拼装出两种结构后出现，点击进入挑战测试。</div>
            </div>
        `;

        const mod2HTML = `
            <div class="help-module-title">💥 模块二：置换反应</div>
            <div class="help-step" style="background: rgba(0,255,204,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid #00ffcc; margin-bottom: 15px;">
                <span style="color:#00ffcc; font-weight:bold; font-size: 1.2em;">🎯 核心任务</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. 模拟乙醇与钠的反应，生成乙醇钠和氢气。</div>
                <div style="margin-left: 10px;">2. 完成方程式配平及随堂测试题。</div>
            </div>
            <div class="help-step" style="background: rgba(255,170,0,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid #ffaa00; margin-bottom: 20px;">
                <span style="color:#ffaa00; font-weight:bold; font-size: 1.2em;">🕹️ 按钮说明</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. <span style="color:#ffaa00;">【Na 按钮】</span> 点击底部按钮投入金属钠原子。</div>
                <div style="margin-left: 10px;">2. <span style="color:#ffaa00;">【切断化学键】</span> 点击乙醇分子上发红光的 O-H 键将其切断，再将 Na 拖至 O 附近置换。</div>
                <div style="margin-left: 10px;">3. <span style="color:#ffaa00;">【⬚ 框选工具】</span> 选中所有物质复制后，将两个游离的 H 拖拽结合成氢气(H₂)。</div>
            </div>
        `;

        const mod3HTML = `
            <div class="help-module-title">🔥 模块三：催化氧化</div>
            <div class="help-step" style="background: rgba(0,255,204,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid #00ffcc; margin-bottom: 15px;">
                <span style="color:#00ffcc; font-weight:bold; font-size: 1.2em;">🎯 核心任务</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. 模拟乙醇的催化氧化反应，生成乙醛和水。</div>
                <div style="margin-left: 10px;">2. 完成方程式填写及随堂测试题。</div>
            </div>
            <div class="help-step" style="background: rgba(255,170,0,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid #ffaa00; margin-bottom: 20px;">
                <span style="color:#ffaa00; font-weight:bold; font-size: 1.2em;">🕹️ 按钮说明</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. <span style="color:#ffaa00;">【Cu 按钮】</span> 点击底部按钮加入氧化铜(CuO)催化剂，将其拖至 O 原子附近。</div>
                <div style="margin-left: 10px;">2. <span style="color:#ffaa00;">【断键与成键】</span> 依次点击切断 O-H 键、α碳上的 C-H 键及 Cu-O 键；点击 C 和 O 原子生成双键。</div>
                <div style="margin-left: 10px;">3. <span style="color:#ffaa00;">【组装水分子】</span> 点击或拖拽游离的两个 H 和一个 O 组装生成水(H₂O)。</div>
            </div>
        `;

        const mod4HTML = `
            <div class="help-module-title">🏆 模块四：综合评测</div>
            <div class="help-step" style="background: rgba(0,255,204,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid #00ffcc; margin-bottom: 15px;">
                <span style="color:#00ffcc; font-weight:bold; font-size: 1.2em;">🎯 核心任务</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. 回顾全息殿堂中的实验产物。</div>
                <div style="margin-left: 10px;">2. 完成 5 道随机抽取的综合大考测试题，获取成就证书。</div>
            </div>
            <div class="help-step" style="background: rgba(255,170,0,0.15); padding: 15px 20px; border-radius: 8px; border-left: 5px solid #ffaa00; margin-bottom: 20px;">
                <span style="color:#ffaa00; font-weight:bold; font-size: 1.2em;">🕹️ 按钮说明</span><br>
                <div style="margin-top: 8px; margin-left: 10px;">1. <span style="color:#ffaa00;">【📝 开始考核】</span> 点击殿堂下方发光按钮进入答题环节。</div>
                <div style="margin-left: 10px;">2. <span style="color:#ffaa00;">【查看错题 / 证书】</span> 考核结束后查看雷达图，查漏补缺或保存成果。</div>
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
        
        overlay.innerHTML = `
            <div class="help-content-box magic-scroll">
                <button id="btn-close-help" class="magic-btn close-btn" style="position: absolute; top: 20px; right: 20px; width: 50px; height: 50px; font-size: 1.8em; padding: 0; z-index: 10;">❌</button>
                <h2 style="color: var(--rpg-mana, #00ffcc); font-size: 3.5em; text-align: center; margin-bottom: 20px; text-shadow: 0 0 15px rgba(0,255,204,0.5);">📜 ${this.userStats.finalCompleted ? '全阶段操作指南' : '本阶段操作指南'}</h2>
                
                ${helpContentHTML}
                
                <div style="text-align: center; margin-top: 40px;">
                    <button id="btn-close-help-bottom" class="magic-btn" style="font-size: 2em; padding: 15px 50px; border-color: #fff; color: #fff;">我明白了</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const closeHandler = () => {
            overlay.remove();
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
            } catch(e) { console.error("保存进度失败", e); }
        }, 800);
    }
    
    captureIsolatedImage(targetType) {
        if (!window.app || !window.app.sceneManager) return '';
        const sm = window.app.sceneManager;
        const atoms = sm.atoms;
        const bonds = sm.bonds;
        
        const visited = new Set();
        const components = [];
        
        for (let atom of atoms) {
            if (visited.has(atom)) continue;
            const comp = { atoms: [], bonds: [], cCount: 0, hCount: 0, oCount: 0 };
            const queue = [atom];
            visited.add(atom);
            
            while (queue.length > 0) {
                const curr = queue.shift();
                comp.atoms.push(curr);
                if (curr.userData.type === 'C') comp.cCount++;
                if (curr.userData.type === 'H') comp.hCount++;
                if (curr.userData.type === 'O') comp.oCount++;
                
                bonds.forEach(b => {
                    let neighbor = null;
                    if (b.a === curr) neighbor = b.b;
                    else if (b.b === curr) neighbor = b.a;
                    
                    if (neighbor) {
                        if (!comp.bonds.includes(b)) comp.bonds.push(b);
                        if (!visited.has(neighbor)) {
                            visited.add(neighbor);
                            queue.push(neighbor);
                        }
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
            sm.renderer.render(sm.scene, sm.camera);
            return sm.renderer.domElement.toDataURL('image/jpeg', 0.8);
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
            if (this.showcaseRenderers) {
                this.showcaseRenderers.forEach(r => r.dispose());
                this.showcaseRenderers = null;
            }
        }

        if ((moduleId === 2 || moduleId === 3) && !this.userStats.linearStructuresPassed) {
            this.showMagicNotice("关卡已锁定", "必须先在【结构探秘】中完成看图鉴定挑战，才能解锁后续实验！");
            return;
        }

        if (window.app && window.app.interactionManager) {
            window.app.interactionManager.selectElementToAdd(null);
        }

        this.currentLevel = moduleId;
        this.quizUnlocked = false; 
        this.pendingChallengeType = null; 
        
        if (window.app && window.app.sceneManager) {
            window.app.sceneManager.clearAll();
        }
        if (window.app && window.app.reactionDirector) {
            window.app.reactionDirector.resetReactionState();
        }
        
        const leftPanel = document.getElementById('left-vision-panel');
        if (leftPanel) leftPanel.classList.add('hidden');
        
        document.getElementById('ai-trial-panel')?.classList.add('hidden');
        document.getElementById('evaluation-panel')?.classList.add('hidden');
        document.getElementById('dual-isomer-popup')?.classList.add('hidden');
        document.getElementById('linear-structure-challenge-overlay')?.classList.add('hidden');
        document.getElementById('pre-sodium-overlay')?.remove();
        document.getElementById('equation-minigame-overlay')?.remove();
        
        const canvas = document.getElementById('canvas-container');
        if (canvas) canvas.classList.remove('canvas-shrunk');

        const actionBar = document.getElementById('action-bar');
        if (actionBar) {
            actionBar.classList.remove('action-bar-hidden');
            actionBar.classList.remove('hidden');
            actionBar.style.display = 'flex';
        }
        
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
                    btnToggleChallenge.classList.remove('hidden');
                    this.pendingChallengeType = 'linear';
                } else {
                    btnToggleChallenge.classList.add('hidden');
                }
            }
            
            this.showHelpInstructions(() => {
                this.showMagicNotice("结构探究", "点击上方手图标(🖐️)后即可在空白处拖拽框选分子。");
            });
            
        } else if (moduleId === 2) {
            if(elementSkills) elementSkills.classList.add('hidden');
            if(skillDivider) skillDivider.classList.add('hidden');
            if(reactionSkills) reactionSkills.classList.remove('hidden');

            if(btnNa) btnNa.classList.add('hidden'); 
            if(btnCu) btnCu.classList.add('hidden');
            if(btnFinish) btnFinish.classList.add('hidden');
            
            if (btnToggleChallenge) {
                btnToggleChallenge.classList.add('hidden');
                if(typeof gsap !== 'undefined') gsap.killTweensOf(btnToggleChallenge);
                btnToggleChallenge.style.transform = 'scale(1)';
                btnToggleChallenge.style.boxShadow = 'none';
            }

            this.showHelpInstructions(() => {
                this.showPreSodiumEquations(() => {
                    this.showMagicNotice("实验解锁", "请点击底部的【Na】按钮，投入金属钠，开启取代反应！");
                    if (window.app && window.app.sceneManager) {
                        window.app.sceneManager.autoBuildEthanol();
                    }
                    this.unlockMain3DView('ethanol'); 
                });
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
                btnToggleChallenge.style.transform = 'scale(1)';
                btnToggleChallenge.style.boxShadow = 'none';
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
            
            this.showHelpInstructions(() => {
                this.showMagicNotice("魔法考核", "知识的沉淀时刻！你的实验成果已在殿堂展出，请回顾后开始最终考核。");
                this.showFinalShowcase();
            });
        }
        
        this.updateLevelUI();
        this.saveProgress();
    }

    showFinalShowcase() {
        let gallery = document.getElementById('final-gallery-overlay');
        if (gallery) gallery.remove();

        gallery = document.createElement('div');
        gallery.id = 'final-gallery-overlay';
        gallery.className = 'magic-overlay-bg';
        gallery.style.backgroundColor = 'rgba(15, 15, 20, 0.9)';
        gallery.style.zIndex = '9999'; 
        
        gallery.innerHTML = `
            <button id="btn-close-final-showcase" class="magic-btn close-btn" style="position: absolute; top: 20px; right: 20px; width: 50px; height: 50px; font-size: 1.8em; padding: 0; z-index: 100000;">❌</button>
            <div style="text-align: center; width: 100%; animation: popDown 0.5s ease-out; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <h2 style="color: var(--rpg-gold); font-size: 3.5em; margin-bottom: 40px; text-shadow: 0 0 20px rgba(255, 215, 0, 0.6); letter-spacing: 5px;">🏛️ 炼金成果殿堂</h2>
                <div style="display: flex; justify-content: center; gap: 50px; flex-wrap: wrap; margin-bottom: 20px;">
                    <div class="showcase-item" style="background: rgba(0,0,0,0.6); border: 3px solid #00ffcc; border-radius: 15px; padding: 25px; box-shadow: 0 0 30px rgba(0,255,204,0.3);">
                        <h3 style="color: #00ffcc; font-size: 1.8em; margin-bottom: 15px; text-shadow: 0 0 10px #00ffcc;">基础分子 (乙醇)</h3>
                        <div id="showcase-ethanol" style="width: 260px; height: 260px;"></div>
                    </div>
                    <div class="showcase-item" style="background: rgba(0,0,0,0.6); border: 3px solid #ffaa00; border-radius: 15px; padding: 25px; box-shadow: 0 0 30px rgba(255,170,0,0.3);">
                        <h3 style="color: #ffaa00; font-size: 1.8em; margin-bottom: 15px; text-shadow: 0 0 10px #ffaa00;">置换产物 (乙醇钠)</h3>
                        <div id="showcase-na" style="width: 260px; height: 260px;"></div>
                    </div>
                    <div class="showcase-item" style="background: rgba(0,0,0,0.6); border: 3px solid #ff4444; border-radius: 15px; padding: 25px; box-shadow: 0 0 30px rgba(255,68,68,0.3);">
                        <h3 style="color: #ff4444; font-size: 1.8em; margin-bottom: 15px; text-shadow: 0 0 10px #ff4444;">氧化产物 (乙醛)</h3>
                        <div id="showcase-cu" style="width: 260px; height: 260px;"></div>
                    </div>
                </div>
                <p style="color: #ddd; font-size: 1.5em; margin-top: 30px; margin-bottom: 30px; text-shadow: 1px 1px 3px #000;">闭上眼睛回忆它们断键与重组的瞬间。<br>准备好后，点击下方发光的【开始考核】按钮。</p>
                <button id="btn-start-final-quiz" class="magic-btn" style="font-size: 1.8em; padding: 15px 60px; border-color: var(--rpg-gold); color: var(--rpg-gold); text-shadow: 0 0 10px rgba(255,215,0,0.5);">📝 开始最终考核</button>
            </div>
        `;
        document.body.appendChild(gallery);

        const closeShowcaseBtn = document.getElementById('btn-close-final-showcase');
        if (closeShowcaseBtn) {
            closeShowcaseBtn.addEventListener('click', () => {
                gallery.remove();
                if (this.showcaseRenderers) {
                    this.showcaseRenderers.forEach(r => r.dispose());
                    this.showcaseRenderers = null;
                }
            });
        }

        if (this.showcaseRenderers) {
            this.showcaseRenderers.forEach(r => r.dispose());
        }
        
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

    // 🌟 缩放调整宽屏字体版的随机5题考卷 (2/3大小)
    startFinalQuiz() {
        let shuffled = [...this.questionBank].sort(() => 0.5 - Math.random());
        this.finalQuizState = {
            questions: shuffled.slice(0, 5),
            currentIndex: 0,
            correctCount: 0
        };
        this.userStats.wrongQuestions = []; 

        const panel = document.getElementById('ai-trial-panel');
        if (panel) {
            panel.classList.remove('hidden');
            document.getElementById('btn-close-ai')?.classList.add('hidden'); 
            this.renderFinalQuizQuestion();
        }
    }

    renderFinalQuizQuestion() {
        const q = this.finalQuizState.questions[this.finalQuizState.currentIndex];
        const container = document.getElementById('ai-content');
        
        let html = `
            <div style="text-align: left; padding: 20px; animation: fadeIn 0.4s;">
                <h3 style="color: var(--rpg-mana); font-size: 1.2em; margin-bottom: 15px;">最终考核 (${this.finalQuizState.currentIndex + 1}/5)</h3>
                <div style="font-size: 0.95em; color: #fff; margin-bottom: 20px; line-height: 1.5; background: rgba(0,0,0,0.4); padding: 15px 20px; border-radius: 10px; border-left: 4px solid var(--rpg-mana);">${q.question}</div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
        `;
        
        q.options.forEach((opt, idx) => {
            html += `<button class="magic-btn quiz-opt-btn" data-idx="${idx}" style="text-align: left; padding: 12px 20px; font-size: 0.8em; border-color: #666; color: #ddd; background: rgba(0,0,0,0.6); transition: all 0.2s;">${String.fromCharCode(65+idx)}. ${opt}</button>`;
        });

        html += `</div></div>`;
        container.innerHTML = html;

        const btns = container.querySelectorAll('.quiz-opt-btn');
        btns.forEach(btn => {
            btn.onmouseenter = () => { btn.style.borderColor = '#00ffcc'; btn.style.transform = 'translateX(10px)'; };
            btn.onmouseleave = () => { btn.style.borderColor = '#666'; btn.style.transform = 'translateX(0)'; };
            btn.onclick = () => {
                const selectedIdx = parseInt(btn.getAttribute('data-idx'));
                this.handleFinalQuizAnswer(selectedIdx, q);
            };
        });
    }

    handleFinalQuizAnswer(selectedIdx, q) {
        const isCorrect = (selectedIdx === q.correctIdx);
        const container = document.getElementById('ai-content');
        
        if (isCorrect) {
            this.finalQuizState.correctCount++;
        } else {
            this.userStats.wrongQuestions.push({
                module: 4, 
                explanation: `<strong>题目：</strong>${q.question}<br><span style="color:#00ffcc;">正确答案：${q.options[q.correctIdx]}</span><br><span style="color:#aaa;">解析：${q.explanation}</span>`
            });
        }

        const resultColor = isCorrect ? "var(--rpg-mana)" : "var(--rpg-danger)";
        const resultTitle = isCorrect ? "回答正确！" : "回答错误...";
        
        container.innerHTML = `
            <div style="text-align: left; padding: 20px; animation: popDown 0.4s;">
                <h3 style="color:${resultColor}; font-size: 1.3em; margin-bottom: 15px;">${resultTitle}</h3>
                <div style="font-size: 0.95em; line-height: 1.6; padding: 20px; background: rgba(0,0,0,0.6); border-radius: 15px; border: 3px solid ${resultColor}; color: #fff;">
                    ${isCorrect ? `<span style="color:#00ffcc; font-weight:bold;">太棒了！</span><br>` : `<span style="color:#ff4444; text-decoration:line-through;">你选择了：${q.options[selectedIdx]}</span><br><span style="color:#00ffcc; font-weight:bold;">正确答案：${q.options[q.correctIdx]}</span><br><br>`}
                    ${q.explanation}
                </div>
                <div style="margin-top: 30px; text-align: center;">
                    <button id="btn-next-quiz" class="magic-btn" style="font-size: 1.1em; padding: 12px 50px; border-color: var(--rpg-gold); color: var(--rpg-gold); box-shadow: 0 0 20px rgba(255,215,0,0.3);">${this.finalQuizState.currentIndex < 4 ? '下一题' : '查看最终成绩'}</button>
                </div>
            </div>
        `;

        document.getElementById('btn-next-quiz').onclick = () => {
            this.finalQuizState.currentIndex++;
            if (this.finalQuizState.currentIndex < 5) {
                this.renderFinalQuizQuestion();
            } else {
                document.getElementById('ai-trial-panel').classList.add('hidden');
                this.userStats.finalQuizScore = this.finalQuizState.correctCount * 20; 
                this.userStats.finalCompleted = true; 
                this.saveProgress();
                this.showEvaluation();
            }
        };
    }

    showPreSodiumEquations(onCompleteCallback) {
        let overlay = document.getElementById('pre-sodium-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pre-sodium-overlay';
            overlay.className = 'magic-overlay-bg'; 
            
            overlay.innerHTML = `
                <div id="pre-sodium-content" style="background: rgba(20, 20, 30, 0.95); border: 2px solid var(--rpg-mana); border-radius: 12px; padding: 25px 35px; width: 85%; max-width: 750px; max-height: 90vh; overflow-y: auto; text-align: center; box-shadow: 0 0 40px rgba(0, 255, 204, 0.3); transition: opacity 0.5s, transform 0.5s; position: relative;">
                    <button id="btn-close-pre-eq" class="magic-btn close-btn" style="position: absolute; top: 15px; right: 15px; width: 45px; height: 45px; font-size: 1.5em; z-index: 1000000; padding: 0;">❌</button>

                    <h2 style="color: var(--rpg-mana); font-size: 2.2em; margin-bottom: 20px; margin-top: 5px;">知识迁移：填写对比方程式</h2>
                    
                    <div style="margin-bottom: 20px; text-align: left; font-size: 1.4em; color: #fff; background: rgba(0,0,0,0.5); padding: 15px 25px; border-radius: 8px; border-left: 5px solid #ffaa00; position: relative;">
                        <span style="font-weight: bold;">1. 乙烷与钠：</span>
                        <button id="btn-demo-ethane" class="magic-btn" style="position: absolute; right: 15px; top: 10px; width: 45px; height: 45px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 1.4em; border-color: #00ffcc; color: #00ffcc; background: #111;" title="打开 3D 微观演示视图">👁️</button>
                        
                        <div style="margin-top: 15px; font-size: 1.8em; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; justify-content: center;">
                            <span style="font-family: monospace; color: #00ffcc; font-weight: bold; text-shadow: 1px 1px 3px #000;">CH₃CH₃ + Na → </span>
                            <select id="eq-ethane-ans" style="background: #222; color: #fff; font-size: 0.7em; padding: 8px 12px; border: 2px solid #ffaa00; border-radius: 6px; outline: none; transition: all 0.3s; cursor: pointer;">
                                <option value="none">-- 请选择产物 --</option>
                                <option value="wrong1">CH₃CH₂Na + H₂↑</option>
                                <option value="wrong2">Na₂C₂H₆</option>
                                <option value="correct">不反应</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-bottom: 25px; text-align: left; font-size: 1.4em; color: #fff; background: rgba(0,0,0,0.5); padding: 15px 25px; border-radius: 8px; border-left: 5px solid #00ffcc; position: relative;">
                        <span style="font-weight: bold;">2. 水与钠：</span>
                        <button id="btn-demo-water" class="magic-btn" style="position: absolute; right: 15px; top: 10px; width: 45px; height: 45px; border-radius: 50%; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 1.4em; border-color: #00ffcc; color: #00ffcc; background: #111;" title="打开 3D 微观演示视图">👁️</button>
                        
                        <div style="margin-top: 15px; font-size: 1.8em; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; justify-content: center;">
                            <span style="font-family: monospace; color: #00ffcc; font-weight: bold; text-shadow: 1px 1px 3px #000;">2H₂O + 2Na → </span>
                            <select id="eq-water-ans" style="background: #222; color: #fff; font-size: 0.7em; padding: 8px 12px; border: 2px solid #00ffcc; border-radius: 6px; outline: none; transition: all 0.3s; cursor: pointer;">
                                <option value="none">-- 请选择产物 --</option>
                                <option value="correct">2NaOH + H₂↑</option>
                                <option value="wrong1">Na₂O + H₂↑</option>
                                <option value="wrong2">NaOH + O₂↑</option>
                            </select>
                        </div>
                    </div>

                    <p id="pre-eq-feedback" style="color: #ff4444; font-size: 1.4em; height: 25px; margin-bottom: 15px; font-weight: bold; text-shadow: 1px 1px 2px #000;"></p>
                    <button id="btn-submit-pre-eq" class="magic-btn" style="font-size: 1.8em; padding: 12px 40px; border-color: var(--rpg-gold); color: var(--rpg-gold);">提交并解锁实验</button>
                </div>
            `;
            document.body.appendChild(overlay);

            let closePreviewBtn = document.createElement('button');
            closePreviewBtn.id = 'btn-close-preview';
            closePreviewBtn.innerHTML = '👁️ 退出视图';
            closePreviewBtn.className = 'magic-btn';
            closePreviewBtn.style.cssText = 'position: fixed; top: 30px; right: 30px; z-index: 10000000; display: none; font-size: 1.5em; padding: 12px 25px; border-color: #ffaa00; color: #ffaa00; background: rgba(0,0,0,0.8); cursor: pointer; border-radius: 8px; box-shadow: 0 0 20px rgba(255, 170, 0, 0.4);';
            document.body.appendChild(closePreviewBtn);

            let replayPreviewBtn = document.createElement('button');
            replayPreviewBtn.id = 'btn-replay-preview';
            replayPreviewBtn.innerHTML = '🔄 重新播放';
            replayPreviewBtn.className = 'magic-btn';
            replayPreviewBtn.style.cssText = 'position: fixed; top: 30px; right: 190px; z-index: 10000000; display: none; font-size: 1.5em; padding: 12px 25px; border-color: #00ffcc; color: #00ffcc; background: rgba(0,0,0,0.8); cursor: pointer; border-radius: 8px; box-shadow: 0 0 20px rgba(0, 255, 204, 0.4);';
            document.body.appendChild(replayPreviewBtn);
            
            let currentPreviewType = null;

            document.getElementById('btn-close-pre-eq').addEventListener('click', () => {
                overlay.remove();
                if (closePreviewBtn) closePreviewBtn.remove();
                if (replayPreviewBtn) replayPreviewBtn.remove();
            });

            const closePreview = () => {
                const content = document.getElementById('pre-sodium-content');
                closePreviewBtn.style.display = 'none';
                replayPreviewBtn.style.display = 'none';
                
                overlay.style.backgroundColor = 'rgba(10,10,15,0.95)';
                content.style.opacity = '1';
                content.style.transform = 'scale(1)';
                content.style.pointerEvents = 'auto';

                if (this.previewRenderer) {
                    this.previewRenderer.dispose();
                    this.previewRenderer = null;
                }
                const holoContainer = document.getElementById('holo-preview-container');
                if (holoContainer) {
                    holoContainer.style.display = 'none';
                }
            };

            closePreviewBtn.addEventListener('click', closePreview);

            const playCurrentPreview = () => {
                if (this.previewRenderer) {
                    this.previewRenderer.dispose();
                }
                this.previewRenderer = new MiniModelRenderer('holo-preview-container', currentPreviewType);

                setTimeout(() => {
                    if (currentPreviewType === 'ethane' && this.previewRenderer) {
                        this.previewRenderer.animateEthaneAndSodium();
                    } else if (currentPreviewType === 'water' && this.previewRenderer) {
                        this.previewRenderer.animateWaterAndSodium();
                    }
                }, 300);
            };

            replayPreviewBtn.addEventListener('click', playCurrentPreview);

            const openPreview = (type) => {
                currentPreviewType = type;
                const content = document.getElementById('pre-sodium-content');
                
                overlay.style.backgroundColor = 'rgba(10,10,15,0.85)';
                content.style.opacity = '0';
                content.style.transform = 'scale(0.8)';
                content.style.pointerEvents = 'none';
                
                closePreviewBtn.style.display = 'block';
                replayPreviewBtn.style.display = 'block';

                let holoContainer = document.getElementById('holo-preview-container');
                if (!holoContainer) {
                    holoContainer = document.createElement('div');
                    holoContainer.id = 'holo-preview-container';
                    holoContainer.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; height: 600px; z-index: 999999; border-radius: 50%; box-shadow: 0 0 50px rgba(0, 255, 204, 0.4); background: radial-gradient(circle, rgba(0,255,204,0.15) 0%, rgba(0,0,0,0) 70%); display: none;';
                    overlay.appendChild(holoContainer);
                }
                holoContainer.style.display = 'block';

                playCurrentPreview();
            };

            document.getElementById('btn-demo-ethane').addEventListener('click', () => openPreview('ethane'));
            document.getElementById('btn-demo-water').addEventListener('click', () => openPreview('water'));

            document.getElementById('btn-submit-pre-eq').addEventListener('click', () => {
                const sel1 = document.getElementById('eq-ethane-ans');
                const sel2 = document.getElementById('eq-water-ans');
                const ans1 = sel1.value;
                const ans2 = sel2.value;
                const feedback = document.getElementById('pre-eq-feedback');

                sel1.style.boxShadow = 'none';
                sel2.style.boxShadow = 'none';

                if (ans1 === 'none' || ans2 === 'none') {
                    feedback.style.color = '#ffaa00';
                    feedback.innerText = "⚠️ 请先选择所有答案！";
                    return;
                }

                let isAns1Correct = (ans1 === 'correct');
                let isAns2Correct = (ans2 === 'correct');

                if (isAns1Correct && isAns2Correct) {
                    feedback.style.color = '#00ffcc';
                    feedback.innerText = "✅ 完全正确！乙醇中的 O-H 键也会像水一样断裂。";
                    
                    const btnNa = document.getElementById('btn-reaction-na');
                    if(btnNa) btnNa.classList.remove('hidden');

                    if (onCompleteCallback) onCompleteCallback();
                    setTimeout(() => {
                        overlay.remove();
                        if (closePreviewBtn) closePreviewBtn.remove();
                        if (replayPreviewBtn) replayPreviewBtn.remove();
                    }, 2000); 
                } else if (!isAns1Correct && !isAns2Correct) {
                    feedback.style.color = '#ff4444';
                    feedback.innerText = "❌ 两道题都错了哦，请点击【👁️】重新观察微观动画！";
                } else if (!isAns1Correct) {
                    feedback.style.color = '#ff4444';
                    feedback.innerText = "❌ 第 1 题（乙烷）选错啦，请点击旁边的【👁️】重新观察！";
                } else if (!isAns2Correct) {
                    feedback.style.color = '#ff4444';
                    feedback.innerText = "❌ 第 2 题（水）选错啦，请点击旁边的【👁️】重新观察！";
                }
            });
        }
    }

    queueEquationMinigame(type) {
        this.pendingChallengeType = type;
        const btnToggleChallenge = document.getElementById('btn-toggle-challenge');
        if (btnToggleChallenge) {
            btnToggleChallenge.classList.remove('hidden');
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(btnToggleChallenge);
                gsap.fromTo(btnToggleChallenge, 
                    { scale: 1, boxShadow: "0 0 0px #00ffcc" }, 
                    { scale: 1.2, boxShadow: "0 0 20px #00ffcc", duration: 0.6, yoyo: true, repeat: -1 }
                );
            }
            this.showMagicNotice("阶段完成", "实验现象很清晰！请点击左侧发光的 🎯 靶子按钮，完成随堂配平测试。");
        }
    }

    showEquationMinigame(type) {
        let overlay = document.getElementById('equation-minigame-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'equation-minigame-overlay';
        overlay.className = 'challenge-overlay magic-overlay-bg';
        
        let contentHTML = '';

        if (type === 'sodium') {
            contentHTML = `
                <button id="btn-close-final-eq-popup" class="magic-btn close-btn" style="position: absolute; top: 20px; right: 20px; width: 60px; height: 60px; font-size: 2.2em; z-index: 1000000;">❌</button>
                <h2 style="color: var(--rpg-mana); font-size: 3em; margin-bottom: 15px; margin-top: 10px;">✅ 置换反应方程式测试</h2>
                <p style="color: #fff; font-size: 1.6em; margin-bottom: 25px;">请拖拽正确的系数和产物，完成方程式的配平：</p>
                
                <div id="eq-drag-pool" style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-bottom: 25px; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; border: 1px solid #444;">
                    <div class="eq-drag" draggable="true" data-val="2">2</div>
                    <div class="eq-drag" draggable="true" data-val="3">3</div>
                    <div class="eq-drag" draggable="true" data-val="CH3CH2ONa">CH₃CH₂ONa</div>
                    <div class="eq-drag" draggable="true" data-val="H2">H₂↑</div>
                    <div class="eq-drag" draggable="true" data-val="H2O">H₂O</div>
                </div>

                <div style="font-size: 2.4em; margin-bottom: 30px; background: rgba(0,0,0,0.5); padding: 25px 15px; border-radius: 12px; border: 3px solid #00ffcc; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 5px; font-family: monospace; color: #fff;">
                    <div class="eq-slot" data-expected="2"></div> CH₃CH₂OH + 
                    <div class="eq-slot" data-expected="2"></div> Na → 
                    <div class="eq-slot" data-expected="2"></div> <div class="eq-slot" data-expected="CH3CH2ONa" style="min-width: 150px;"></div> + 
                    <div class="eq-slot" data-expected="H2" style="min-width: 80px;"></div>
                </div>

                <p id="final-eq-feedback" style="color: #ff4444; font-size: 1.8em; height: 30px; margin-bottom: 20px; font-weight: bold;"></p>
                <button id="btn-submit-final-eq" class="magic-btn" style="font-size: 2em; padding: 15px 50px; border-color: var(--rpg-gold); color: var(--rpg-gold);">提交验证</button>
            `;
        } else if (type === 'oxidation') {
            contentHTML = `
                <button id="btn-close-final-eq-popup" class="magic-btn close-btn" style="position: absolute; top: 20px; right: 20px; width: 60px; height: 60px; font-size: 2.2em; z-index: 1000000;">❌</button>
                <h2 style="color: var(--rpg-mana); font-size: 3em; margin-bottom: 15px; margin-top: 10px;">✅ 催化氧化方程式测试</h2>
                <p style="color: #fff; font-size: 1.6em; margin-bottom: 25px;">请拖拽正确的化学计量数、产物与反应条件，完成方程式书写：</p>
                
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

                <p id="final-eq-feedback" style="color: #ff4444; font-size: 1.8em; height: 30px; margin-bottom: 20px; font-weight: bold;"></p>
                <button id="btn-submit-final-eq" class="magic-btn" style="font-size: 2em; padding: 15px 50px; border-color: var(--rpg-gold); color: var(--rpg-gold);">提交验证</button>
            `;
        }

        overlay.innerHTML = `
            <div class="challenge-modal" style="text-align: center; max-width: 1000px; padding: 30px 40px; max-height: 90vh; overflow-y: auto; background: rgba(20,20,30,0.95); border: 2px solid #00ffcc; border-radius: 12px; box-shadow: 0 0 30px rgba(0,255,204,0.3); animation: popDown 0.4s ease-out; position: relative;">
                ${contentHTML}
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-close-final-eq-popup').addEventListener('click', () => {
            overlay.remove();
        });

        this.initEquationDragDrop();

        document.getElementById('btn-submit-final-eq').addEventListener('click', () => {
            const slots = document.querySelectorAll('.eq-slot');
            const feedback = document.getElementById('final-eq-feedback');
            
            let allFilled = true;
            let allCorrect = true;

            slots.forEach(slot => {
                const expected = slot.getAttribute('data-expected');
                const filled = slot.getAttribute('data-filled');
                
                if (!filled) {
                    allFilled = false;
                    slot.style.borderColor = '#ffaa00';
                } else if (expected !== filled) {
                    allCorrect = false;
                    slot.style.borderColor = '#ff4444';
                    slot.style.boxShadow = '0 0 10px rgba(255,0,0,0.5)';
                } else {
                    slot.style.borderColor = '#00ffcc';
                    slot.style.boxShadow = '0 0 10px rgba(0,255,204,0.5)';
                }
            });

            if (!allFilled) {
                feedback.style.color = '#ffaa00';
                feedback.innerText = '⚠️ 请先填满所有方程式空位！';
                return;
            }

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

    initEquationDragDrop() {
        const dragItems = document.querySelectorAll('.eq-drag');
        const dropZones = document.querySelectorAll('.eq-slot');

        dragItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedVal = item.getAttribute('data-val');
                this.activeDragElement = item;
                setTimeout(() => item.style.opacity = '0.5', 0);
            });
            item.addEventListener('dragend', () => {
                if (this.activeDragElement) this.activeDragElement.style.opacity = '1';
                this.draggedVal = null;
                this.activeDragElement = null;
            });
            item.addEventListener('pointerdown', () => {
                dragItems.forEach(i => i.style.borderColor = '#aaa');
                item.style.borderColor = '#00ffcc';
                this.selectedLinearVal = item.getAttribute('data-val');
                this.selectedLinearText = item.innerHTML;
            });
        });

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.style.borderColor = '#00ffcc';
            });
            zone.addEventListener('dragleave', () => {
                if(!zone.getAttribute('data-filled')) zone.style.borderColor = '#888';
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                if (this.draggedVal && this.activeDragElement) {
                    zone.setAttribute('data-filled', this.draggedVal);
                    zone.innerHTML = this.activeDragElement.innerHTML;
                    zone.style.borderColor = '#00ffcc';
                }
            });
            zone.addEventListener('pointerdown', () => {
                if (this.selectedLinearVal) {
                    zone.setAttribute('data-filled', this.selectedLinearVal);
                    zone.innerHTML = this.selectedLinearText;
                    zone.style.borderColor = '#00ffcc';
                    dragItems.forEach(i => i.style.borderColor = '#aaa');
                    this.selectedLinearVal = null; 
                } else if (zone.getAttribute('data-filled')) {
                    zone.removeAttribute('data-filled');
                    zone.innerHTML = '';
                    zone.style.borderColor = '#888';
                    zone.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.5)';
                }
            });
        });
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
        if (indicatorContainer) {
            indicatorContainer.innerHTML = `<div class="level-indicator">${levelText}</div>`;
        }
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
                startX = e.clientX - state.x;
                startY = e.clientY - state.y;
            });

            box.addEventListener('pointermove', (e) => {
                if (!isDragging) return;
                state.x = e.clientX - startX;
                state.y = e.clientY - startY;
                updateTransform();
            });

            const stopDrag = () => { isDragging = false; };
            box.addEventListener('pointerup', stopDrag);
            box.addEventListener('pointerleave', stopDrag);
            
            box.addEventListener('dblclick', () => {
                state = { scale: 1, x: 0, y: 0 };
                updateTransform();
            });

            function updateTransform() {
                img.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
            }
        });
    }

    initLinearStructureDragDrop() {
        const dragItems = document.querySelectorAll('.linear-drag');
        const dropZones = document.querySelectorAll('.linear-slot');
        
        if (dragItems.length > 0 && dragItems[0].parentElement) {
            const dragContainer = dragItems[0].parentElement;
            
            Array.from(dragContainer.children).forEach(child => {
                if (child.tagName === 'SPAN' || child.classList.contains('drag-title')) {
                    child.remove();
                }
            });

            dragContainer.style.position = 'absolute';
            dragContainer.style.right = '20px';
            dragContainer.style.top = '50%';
            dragContainer.style.transform = 'translateY(-50%)';
            dragContainer.style.display = 'flex';
            dragContainer.style.flexDirection = 'column'; 
            dragContainer.style.gap = '10px'; 
            dragContainer.style.padding = '12px 10px'; 
            dragContainer.style.background = 'rgba(20, 20, 30, 0.95)';
            dragContainer.style.border = '2px solid var(--rpg-mana, #00ffcc)';
            dragContainer.style.borderRadius = '12px';
            dragContainer.style.boxShadow = '0 0 20px rgba(0, 255, 204, 0.3)';
            dragContainer.style.zIndex = '999';
            dragContainer.style.alignItems = 'center';
            dragContainer.style.minWidth = 'auto'; 
            dragContainer.style.marginBottom = '0'; 

            dragItems.forEach(item => {
                item.style.padding = '10px 15px';
                item.style.fontSize = '1.6em';
            });

            const scrollContent = document.querySelector('.challenge-scroll-content');
            if (scrollContent) {
                scrollContent.style.paddingRight = '120px';
            }
        }

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
                this.draggedVal = null;
                this.activeDragElement = null;
            });
            
            item.addEventListener('pointerdown', (e) => {
                dragItems.forEach(i => i.style.borderColor = '#aaa');
                item.style.borderColor = '#00ffcc';
                this.selectedLinearVal = item.getAttribute('data-val');
                this.selectedLinearText = item.innerHTML;
            });
        });

        dropZones.forEach(zone => {
            if (zone.dataset.bound) return;
            zone.dataset.bound = 'true';

            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.style.borderColor = '#00ffcc';
                zone.style.background = 'rgba(0,255,204,0.2)';
            });
            zone.addEventListener('dragleave', () => {
                zone.style.borderColor = '#666';
                zone.style.background = 'rgba(0,0,0,0.6)';
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.style.borderColor = '#666';
                zone.style.background = 'rgba(0,0,0,0.6)';
                if (this.draggedVal && this.activeDragElement) {
                    zone.setAttribute('data-filled', this.draggedVal);
                    zone.innerHTML = this.activeDragElement.innerHTML;
                }
            });
            
            zone.addEventListener('pointerdown', (e) => {
                if (this.selectedLinearVal) {
                    zone.setAttribute('data-filled', this.selectedLinearVal);
                    zone.innerHTML = this.selectedLinearText;
                    dragItems.forEach(i => i.style.borderColor = '#aaa');
                    this.selectedLinearVal = null; 
                } else if (zone.getAttribute('data-filled')) {
                    zone.removeAttribute('data-filled');
                    zone.innerHTML = '';
                    zone.style.borderColor = '#666';
                }
            });
        });
    }

    checkLinearStructures() {
        const slots = document.querySelectorAll('.linear-slot');
        let allSlotsCorrect = true;
        let isSlotsFilled = true;

        slots.forEach(slot => {
            const expected = slot.getAttribute('data-expected');
            const filled = slot.getAttribute('data-filled');
            if (!filled) {
                isSlotsFilled = false;
                slot.style.borderColor = '#ffaa00';
            } else if (expected !== filled) {
                allSlotsCorrect = false;
                slot.style.borderColor = '#ff4444';
            } else {
                slot.style.borderColor = '#00ffcc';
            }
        });

        const diffInput = document.getElementById('input-difference');
        let diffFilled = false;
        let diffTextError = false;
        
        if (diffInput) {
            const val = diffInput.value.trim();
            const hasOxygen = val.includes('氧') || val.includes('O') || val.includes('o');
            const hasConnection = val.includes('连') || val.includes('接') || val.includes('键') || val.includes('位置') || val.includes('元素') || val.includes('中间') || val.includes('两端') || val.includes('不一致') || val.includes('不同') || val.includes('区别');
            
            if (val.length >= 2 && hasOxygen && hasConnection) {
                diffFilled = true;
                diffInput.style.borderColor = '#00ffcc';
            } else if (val.length >= 2) {
                diffTextError = true;
                diffInput.style.borderColor = '#ff4444';
            } else {
                diffInput.style.borderColor = '#ffaa00';
            }
        }

        const feedback = document.getElementById('structure-feedback');

        if (!isSlotsFilled || (diffInput && diffInput.value.trim().length < 2)) {
            feedback.style.color = '#ffaa00';
            feedback.innerText = '⚠️ 请确保填满所有结构空槽，并完成底部的简答题！';
            return;
        }
        
        if (diffTextError) {
            feedback.style.color = '#ff4444';
            feedback.innerText = '❌ 简答题偏题啦。提示：请观察【氧元素(O)】与其他元素【连接的位置/方式】是否一致？';
            return;
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
            
            if (window.app && window.app.interactionManager) {
                window.app.interactionManager.selectElementToAdd(null);
            }

            setTimeout(() => {
                document.getElementById('linear-structure-challenge-overlay')?.classList.add('hidden');
                document.getElementById('canvas-container')?.classList.remove('canvas-shrunk');
                document.getElementById('btn-toggle-challenge')?.classList.add('hidden');
                
                this.switchModule(2); 
            }, 2000);
        } else {
            feedback.style.color = '#ff4444';
            feedback.innerText = '❌ 部分槽位拼装有误，请核对红色边框内容。';
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
                gsap.killTweensOf(target);
                target.style.boxShadow = 'none';
                target.style.transform = 'scale(1)';
            }

            const app = window.app;
            if (!app) return;

            if (id === 'btn-add-c') app.interactionManager?.selectElementToAdd('C');
            if (id === 'btn-add-h') app.interactionManager?.selectElementToAdd('H');
            if (id === 'btn-add-o') app.interactionManager?.selectElementToAdd('O');
            if (id === 'btn-select-hand') app.interactionManager?.selectElementToAdd('hand');
            
            if (id === 'btn-undo') {
                if (app.sceneManager) {
                    app.sceneManager.undoLast();
                }
            }

            if (id === 'btn-clear') app.sceneManager?.clearAll();

            if (id === 'btn-marquee-copy') {
                if (app.sceneManager && typeof app.sceneManager.copySelected === 'function') {
                    app.sceneManager.copySelected();
                }
            }
            if (id === 'btn-marquee-delete') {
                if (app.sceneManager && typeof app.sceneManager.deleteSelected === 'function') {
                    app.sceneManager.deleteSelected();
                }
            }
            
            if (id === 'btn-auto-build') app.sceneManager?.autoBuildEthanol();

            const director = app.reactionDirector || app.chemistryEngine?.director || app.chemistryEngine;
            
            if (id === 'btn-reaction-na') {
                this.userStats.watchedNa = true;
                this.saveProgress(); 
                if(director && typeof director.playSodiumReaction === 'function') {
                    director.playSodiumReaction();
                }
            }
            if (id === 'btn-reaction-cu') {
                this.userStats.watchedCu = true;
                this.saveProgress(); 
                if(director && typeof director.playOxidationReaction === 'function') {
                    director.playOxidationReaction();
                }
            }
            if (id === 'btn-retry-interaction') {
                if (app.chemistryEngine && typeof app.chemistryEngine.retryInteractiveReaction === 'function') {
                    app.chemistryEngine.retryInteractiveReaction();
                } else if(director && typeof director.retryInteractiveReaction === 'function') {
                    director.retryInteractiveReaction();
                }
            }

            if (id === 'btn-slide-elements') {
                document.getElementById('action-bar')?.classList.toggle('action-bar-hidden');
                if (document.getElementById('action-bar')?.classList.contains('action-bar-hidden')) {
                    app.interactionManager?.selectElementToAdd(null);
                }
            }
            if (id === 'btn-toggle-main-3d') {
                if (target.onclick) return; 
            }
            
            if (id === 'btn-reset-progress') {
                if (confirm("🚨 警告：这将会清除你所有的通关记录、测试分数并从头开始！\n你确定要重置吗？")) {
                    localStorage.removeItem('chem_lab_progress');
                    location.reload();
                }
            }
            
            if (id === 'btn-toggle-challenge') {
                if (this.currentLevel === 1) {
                    document.getElementById('img-ethane').src = this.snapshots['ethane'] || '';
                    document.getElementById('img-isomerA').src = this.snapshots[this.builtOrder[0]] || '';
                    document.getElementById('img-isomerB').src = this.snapshots[this.builtOrder[1]] || '';

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
                    if (this.pendingChallengeType === 'preSodium') {
                        this.showPreSodiumEquations(() => {
                            this.pendingChallengeType = null;
                            document.getElementById('btn-reaction-na').classList.remove('hidden');
                            this.showMagicNotice("实验解锁", "请点击底部的【Na】按钮，投入金属钠，开启取代反应！");
                            target.classList.add('hidden');
                        });
                    } else if (this.pendingChallengeType === 'sodium') {
                        this.showEquationMinigame('sodium');
                        this.pendingChallengeType = null;
                        target.classList.add('hidden');
                    }
                } 
                else if (this.currentLevel === 3) {
                    if (this.pendingChallengeType === 'oxidation') {
                        this.showEquationMinigame('oxidation');
                        this.pendingChallengeType = null;
                        target.classList.add('hidden');
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
                if (gallery) {
                    gallery.style.opacity = '0';
                    setTimeout(() => gallery.style.display = 'none', 500);
                }
                
                if (id === 'btn-start-final-quiz' || id === 'btn-finish') {
                    this.startFinalQuiz();
                } else if (app.aiAssistant) {
                    this.showAITrial();
                    app.aiAssistant.generateQuiz(this.userStats, this.currentLevel);
                }
            }
            
            if (id === 'btn-close-ai') document.getElementById('ai-trial-panel')?.classList.add('hidden');
            
            if (id === 'btn-close-eval') {
                document.getElementById('evaluation-panel')?.classList.add('hidden');
                document.querySelector('.system-menu')?.classList.remove('hidden');
                document.querySelector('.action-bar')?.classList.remove('hidden');
            }
            if (id === 'btn-wrong-questions') this.showWrongQuestions();
            if (id === 'btn-download-eval') this.downloadEvaluation();

            if (id === 'btn-return-home') {
                document.getElementById('evaluation-panel')?.classList.add('hidden');
                
                const gallery = document.getElementById('final-gallery-overlay');
                if (gallery) gallery.remove();

                const aiPanel = document.getElementById('ai-trial-panel');
                if (aiPanel) aiPanel.classList.add('hidden');

                this.switchModule(1);
                
                if (app.sceneManager) {
                    app.sceneManager.clearAll();
                }

                const navBtns = document.querySelectorAll('.nav-btn');
                navBtns.forEach((btn, index) => {
                    if (index > 0) btn.classList.add('locked');
                    btn.classList.remove('active');
                });
                if (navBtns[0]) navBtns[0].classList.add('active');
            }
            
            if (id === 'btn-close-dual-popup') {
                document.getElementById('dual-isomer-popup')?.classList.add('hidden');
                document.getElementById('canvas-container')?.classList.remove('canvas-shrunk');
                const actionBar = document.querySelector('.action-bar');
                if (actionBar) actionBar.style.display = 'flex';
                if (this.dualRenderers) {
                    this.dualRenderers.forEach(r => { if(r && r.dispose) r.dispose(); });
                    this.dualRenderers = null;
                }
                setTimeout(() => window.dispatchEvent(new Event('resize')), 600);
            }
        });

        const firstNavBtn = document.querySelector('.nav-btn');
        if (firstNavBtn && !document.getElementById('btn-help-guide')) {
            const btnHelp = document.createElement('button');
            btnHelp.id = 'btn-help-guide';
            btnHelp.className = firstNavBtn.className.replace('active', '').trim(); 
            btnHelp.innerHTML = '❓ 帮助';
            btnHelp.title = '查看详细操作指南';
            btnHelp.style.color = '#ffaa00';
            btnHelp.style.borderColor = '#ffaa00';
            btnHelp.style.marginRight = '10px';
            btnHelp.style.textShadow = '0 0 5px rgba(255, 170, 0, 0.5)';
            firstNavBtn.parentNode.insertBefore(btnHelp, firstNavBtn);
            
            btnHelp.addEventListener('click', () => {
                this.showHelpInstructions();
            });
        }

        const systemMenu = document.getElementById('system-menu');
        if (systemMenu && !document.getElementById('btn-undo')) {
            const createBtn = (id, icon, color, title) => {
                const btn = document.createElement('button');
                btn.id = id; btn.className = 'magic-btn'; btn.innerHTML = icon;
                btn.style.borderColor = color; btn.style.color = color;
                if(title) btn.title = title;
                return btn;
            };

            systemMenu.appendChild(createBtn('btn-toggle-main-3d', '👁️', 'var(--rpg-mana)', '打开/关闭 3D 参考视图'));
            systemMenu.appendChild(createBtn('btn-undo', '↩️', '#ffaa00', '撤销上一步操作'));
            systemMenu.appendChild(createBtn('btn-clear', '🧹', '#ff4444', '清空重置场景'));
            
            const btnChallenge = createBtn('btn-toggle-challenge', '🎯', '#00ffcc', '开启挑战');
            btnChallenge.classList.add('hidden');
            systemMenu.appendChild(btnChallenge);

            const btnRetry = createBtn('btn-retry-interaction', '🧪', '#ff8800', '重置交互步骤');
            btnRetry.classList.add('hidden');
            systemMenu.appendChild(btnRetry);

            const btnQuiz = createBtn('btn-trigger-quiz', '👩‍💼', '#00ffcc', 'AI 随堂检测');
            btnQuiz.classList.add('hidden');
            systemMenu.appendChild(btnQuiz);
            
            const btnReset = createBtn('btn-reset-progress', '🗑️', '#ff4444', '清空本地存档并重头开始');
            systemMenu.appendChild(btnReset);
        }
    }

    showAutoBuildBtn() {
        let systemMenu = document.getElementById('system-menu');
        if (systemMenu && !document.getElementById('btn-auto-build')) {
            const btnAutoBuild = document.createElement('button');
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
            
            btnToggle.onclick = () => {
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
            btnHighlight.onclick = () => {
                if (window.app && window.app.sceneManager) {
                    window.app.sceneManager.toggleHighlightFunctionalGroup(this.currentMoleculeType);
                    btnHighlight.innerText = window.app.sceneManager.isHighlighted ? "取消高亮" : "✨";
                }
            };
        }
        if (btnReplay && !btnReplay.onclick) btnReplay.onclick = () => this.replayCinematicMicroAnimation();
    }

    playCinematicMicroAnimation(reactionType) {
        if (reactionType) this.lastReactionType = reactionType;
        else reactionType = this.lastReactionType;
        
        this.unlockMain3DView('ethanol');
        const leftPanel = document.getElementById('left-vision-panel');
        if (leftPanel && leftPanel.classList.contains('hidden')) {
            leftPanel.classList.remove('hidden');
        }

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
        previewContainer.innerHTML = '<p class="loading-text" style="font-size: 1.5em;">加载模型中...</p>';
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

    showAITrial() {
        const panel = document.getElementById('ai-trial-panel');
        if (panel) {
            panel.classList.remove('hidden');
            document.getElementById('ai-content').innerHTML = `<p style="font-size: 1.8em; color: var(--rpg-mana);">正在生成随堂测试题...</p>`;
            document.getElementById('btn-close-ai')?.classList.remove('hidden');
        }
    }

    showEvaluation() {
        ['.action-bar', '.system-menu', '#left-vision-panel', '#ai-trial-panel'].forEach(selector => {
            const el = document.querySelector(selector);
            if(el) el.classList.add('hidden');
        });
        const panel = document.getElementById('evaluation-panel');
        if(!panel) return;
        panel.classList.remove('hidden');

        const score1 = 20 + (this.userStats.foundIsomer ? 40 : 0) + (this.userStats.linearStructuresPassed ? 40 : 0);
        const score2 = 20 + (this.userStats.watchedNa ? 40 : 0) + (this.userStats.eqSodiumPassed ? 40 : 0);
        const score3 = 20 + (this.userStats.watchedCu ? 40 : 0) + (this.userStats.eqOxidationPassed ? 40 : 0);
        const score4 = this.userStats.finalQuizScore !== undefined ? this.userStats.finalQuizScore : 0; 

        const totalScore = score1 + score2 + score3 + score4; 
        let rank = 'C';
        let rankColor = '#aaaaaa';
        if (totalScore >= 360) { rank = 'S'; rankColor = '#ffaa00'; }
        else if (totalScore >= 300) { rank = 'A'; rankColor = '#00ffcc'; }
        else if (totalScore >= 240) { rank = 'B'; rankColor = '#4488ff'; }

        this.currentRank = { letter: rank, color: rankColor };

        let rankDiv = document.getElementById('expert-rank-display');
        if (!rankDiv) {
            rankDiv = document.createElement('div');
            rankDiv.id = 'expert-rank-display';
            rankDiv.style.cssText = `position: absolute; top: 40px; left: 50px; text-align: center; background: rgba(0,0,0,0.6); padding: 20px 30px; border-radius: 20px; border: 2px solid ${rankColor}; box-shadow: 0 0 30px ${rankColor}; transform: rotate(-10deg); animation: popDown 0.8s ease-out;`;
            panel.appendChild(rankDiv);
        }
        rankDiv.innerHTML = `
            <div style="font-size: 1.5em; color: #fff; margin-bottom: 5px;">综合评分: <span style="color:var(--rpg-mana); font-weight:bold;">${totalScore}</span> / 400</div>
            <div style="font-size: 1.5em; color: #fff; margin-bottom: 5px; margin-top: 15px;">最终评级</div>
            <div style="font-size: 6em; font-weight: bold; font-style: italic; font-family: 'Courier New', monospace; color: ${rankColor}; text-shadow: 0 0 20px ${rankColor}; line-height: 1;">${rank}</div>
        `;
        
        this.renderRadarChart([score1, score2, score3, score4], ['结构认知', '置换反应', '氧化反应', '综合大考']);
        document.getElementById('eval-feedback').innerHTML = `经过严密的综合分析，您的化学探索总分为 <strong style="color:var(--rpg-mana); font-size:1.2em;">${totalScore}</strong> 分！`;
        
        if (!document.getElementById('btn-wrong-questions')) {
            const btnWQ = document.createElement('button');
            btnWQ.id = 'btn-wrong-questions';
            btnWQ.className = 'magic-btn';
            btnWQ.innerText = '查看大考错题与解析';
            btnWQ.style.cssText = 'margin-top: 15px; margin-left: 20px; font-size: 1.5em; padding: 12px 30px; border-color: #ff4444; color: #ff4444; box-shadow: 0 0 20px rgba(255, 68, 68, 0.4);';
            const downloadBtn = document.getElementById('btn-download-eval');
            if(downloadBtn && downloadBtn.parentNode) {
                downloadBtn.parentNode.appendChild(btnWQ);
            }
        }

        if (!document.getElementById('btn-return-home')) {
            const btnHome = document.createElement('button');
            btnHome.id = 'btn-return-home';
            btnHome.className = 'magic-btn';
            btnHome.innerText = '🏠 重新开始探索';
            btnHome.style.cssText = 'margin-top: 15px; margin-left: 20px; font-size: 1.5em; padding: 12px 30px; border-color: #00ffcc; color: #00ffcc; box-shadow: 0 0 20px rgba(0, 255, 204, 0.4);';
            const downloadBtn = document.getElementById('btn-download-eval');
            if(downloadBtn && downloadBtn.parentNode) {
                downloadBtn.parentNode.appendChild(btnHome);
            }
        }
    }

    showWrongQuestions() {
        const existingPanel = document.getElementById('wrong-question-panel');
        if (existingPanel) existingPanel.remove();
        const panel = document.createElement('div');
        panel.id = 'wrong-question-panel';
        panel.className = 'magic-scroll';
        panel.style.cssText = 'position: absolute; top: 10%; left: 10%; width: 80%; height: 80%; z-index: 9999999; background: rgba(20,20,30,0.98); border: 3px solid #ff4444; border-radius: 15px; padding: 40px; overflow-y: auto; box-shadow: 0 0 40px rgba(0,0,0,0.9);';
        
        let content = `<h2 style="color: #ff4444; text-align: center; margin-bottom: 30px; font-size: 2.2em; text-shadow: 2px 2px 5px #000;">错题档案本</h2>`;
        if (!this.userStats.wrongQuestions || this.userStats.wrongQuestions.length === 0) {
            content += `<div style="text-align: center; padding: 40px; background: rgba(0,255,204,0.1); border-radius: 20px;"><h3 style="color: #00ffcc; font-size: 2em;">完美无瑕！</h3><p style="color: #fff; font-size: 1.5em; margin-top: 20px;">大考全对，无错题记录。</p></div>`;
        } else {
            this.userStats.wrongQuestions.forEach((wq, index) => {
                let modText = ["", "探究阶段", "取代实验", "氧化实验", "最终大考"][wq.module] || "考核点";
                content += `
                    <div style="background: rgba(0,0,0,0.6); padding: 25px; border: 2px solid #ff4444; border-radius: 12px; margin-bottom: 25px; text-align: left;">
                        <div style="color: #ffaa00; font-weight: bold; margin-bottom: 10px; font-size: 1.6em;">记录 #${index + 1} &nbsp;<span style="color:#aaa; font-size:0.8em; font-weight:normal;">(${modText})</span></div>
                        <div style="color: #fff; line-height: 1.5; font-size: 1.4em;">${wq.explanation}</div>
                    </div>
                `;
            });
        }
        content += `<div style="text-align: center; margin-top: 30px;"><button class="magic-btn" onclick="document.getElementById('wrong-question-panel').remove()" style="font-size: 1.8em; padding: 12px 50px; border-color: #fff; color: #fff;">关闭档案</button></div>`;
        panel.innerHTML = content;
        document.getElementById('evaluation-panel').appendChild(panel);
    }

    renderRadarChart(dataArray, labels = ['探索性', '观察力', '理论值', '敏捷度']) {
        const ctxEl = document.getElementById('radarChart');
        if(!ctxEl || typeof Chart === 'undefined') return;
        const ctx = ctxEl.getContext('2d');
        if(window.magicRadarChart) window.magicRadarChart.destroy();
        Chart.defaults.color = '#fff'; Chart.defaults.font.family = "'Courier New', monospace"; Chart.defaults.font.size = 18;
        window.magicRadarChart = new Chart(ctx, {
            type: 'radar',
            data: { labels: labels, datasets: [{ data: dataArray, backgroundColor: 'rgba(255, 215, 0, 0.4)', borderColor: '#ffd700', borderWidth: 3, pointBackgroundColor: '#fff', pointBorderColor: '#ffd700', pointRadius: 5 }] },
            options: { scales: { r: { angleLines: { color: 'rgba(255,255,255,0.4)' }, grid: { color: 'rgba(255,255,255,0.2)' }, pointLabels: { color: '#00ffcc', font: { size: 20, weight: 'bold' } }, ticks: { display: false, min: 0, max: 100 } } }, plugins: { legend: { display: false } } }
        });
    }

    downloadEvaluation() {
        const canvas = document.getElementById('radarChart');
        if (!canvas) { this.showMagicNotice("失败", "图表未找到"); return; }
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 800; tempCanvas.height = 1000;
        const ctx = tempCanvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 1000);
        grad.addColorStop(0, '#3a2e24'); grad.addColorStop(1, '#1a1510');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 1000);
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 10; ctx.strokeRect(20, 20, 760, 960);
        ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 4; ctx.strokeRect(32, 32, 736, 936);
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 48px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10;
        ctx.fillText('成就证书', 400, 100);
        ctx.shadowBlur = 0;
        
        if (this.currentRank) {
            ctx.textAlign = 'center';
            ctx.fillStyle = this.currentRank.color;
            ctx.font = 'bold 90px "Arial"';
            ctx.fillText(this.currentRank.letter, 650, 150); 
            ctx.font = 'bold 22px "Microsoft YaHei"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('综合评级', 650, 70);
            ctx.textAlign = 'center'; 
        }

        ctx.beginPath(); ctx.arc(400, 480, 280, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
        ctx.drawImage(canvas, 100, 180, 600, 600);
        ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 30px "Microsoft YaHei"'; ctx.fillText('干得漂亮！', 400, 840);
        ctx.fillStyle = '#ffffff'; ctx.font = '24px "Microsoft YaHei"'; ctx.fillText('已入档', 400, 890);
        ctx.fillStyle = '#aaaaaa'; ctx.font = '18px "Microsoft YaHei"'; ctx.fillText(`时间: ${new Date().toLocaleString()}`, 400, 950);
        const link = document.createElement('a'); link.download = `证书_${new Date().getTime()}.png`;
        link.href = tempCanvas.toDataURL('image/png'); link.click();
        this.showMagicNotice("下载成功", "高定证书已保存到本地！");
    }
    
    hideMain3DView() {
        const leftPanel = document.getElementById('left-vision-panel');
        const btnToggle = document.getElementById('btn-toggle-main-3d');
        const actionBar = document.querySelector('.action-bar');
        
        if (leftPanel && !leftPanel.classList.contains('hidden')) {
            leftPanel.classList.add('hidden');
            if (btnToggle) {
                btnToggle.innerHTML = '👁️';
                btnToggle.title = '打开参考视图';
            }
            if (actionBar) {
                actionBar.classList.remove('action-bar-hidden'); 
            }
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 500);
        }
    }

    updateStructureState(hasEthanol, hasDimethylEther, hasEthane, ethaneComponent) {
        if (!this.builtOrder) this.builtOrder = [];
        
        if (hasEthanol && !this.builtOrder.includes('ethanol')) this.builtOrder.push('ethanol');
        if (hasDimethylEther && !this.builtOrder.includes('dimethyl_ether')) this.builtOrder.push('dimethyl_ether');

        if (hasEthane && !this.snapshots['ethane']) this.snapshots['ethane'] = this.captureIsolatedImage('ethane');
        if (hasEthanol && !this.snapshots['ethanol']) this.snapshots['ethanol'] = this.captureIsolatedImage('ethanol');
        if (hasDimethylEther && !this.snapshots['dimethyl_ether']) this.snapshots['dimethyl_ether'] = this.captureIsolatedImage('dimethyl_ether');

        if (hasEthane) this.ethaneComponentRef = ethaneComponent;
        else this.ethaneComponentRef = null;

        const btnToggle = document.getElementById('btn-toggle-main-3d');
        
        if (this.currentLevel === 2 || this.currentLevel === 3 || this.currentLevel === 4) {
            if (btnToggle) {
                btnToggle.style.cursor = 'pointer';
                btnToggle.style.borderColor = 'var(--rpg-mana)'; 
                btnToggle.style.color = 'var(--rpg-mana)';
            }
            return;
        }

        const hasBuiltBothHistory = this.builtOrder.includes('ethanol') && this.builtOrder.includes('dimethyl_ether');

        if (hasBuiltBothHistory && this.currentLevel === 1) {
            if (!this.userStats.foundIsomer) {
                this.userStats.foundIsomer = true;
                this.saveProgress(); 
                this.showMagicNotice("成功解锁！", "你发现了异构体！左侧菜单已开启「🎯」挑战。");
            }
            
            const btnToggleChallenge = document.getElementById('btn-toggle-challenge');
            if (btnToggleChallenge && this.currentLevel === 1) {
                btnToggleChallenge.classList.remove('hidden');
                this.pendingChallengeType = 'linear';
            }
        }

        if (!hasEthanol && !hasDimethylEther && !hasEthane) {
            if (typeof this.hideMain3DView === 'function') {
                this.hideMain3DView();
            }
            if (btnToggle) {
                btnToggle.innerHTML = '👁️';
                btnToggle.title = '无可用视图';
                btnToggle.onclick = null;
                btnToggle.style.borderColor = '#666';
                btnToggle.style.color = '#666';
                btnToggle.style.cursor = 'not-allowed';
            }
            return; 
        }

        if (btnToggle) {
            btnToggle.style.cursor = 'pointer';
        }

        if (hasBuiltBothHistory && this.currentLevel === 1) {
            if (btnToggle) {
                btnToggle.innerHTML = '👀'; 
                btnToggle.title = '对比 3D 异构体结构';
                btnToggle.style.borderColor = '#ffaa00';
                btnToggle.style.color = '#ffaa00';
                btnToggle.onclick = () => this.showDualIsomerPopup();
            }
        } 
        else {
            if (hasDimethylEther) {
                if (!this.userStats.foundIsomer) {
                    this.userStats.foundIsomer = true;
                    this.saveProgress(); 
                    this.showMagicNotice("提示", "出现新结构！"); 
                }
                if (btnToggle) {
                    btnToggle.innerHTML = '👁️'; 
                    btnToggle.onclick = null;
                    btnToggle.style.borderColor = 'var(--rpg-mana)'; 
                    btnToggle.style.color = 'var(--rpg-mana)';
                }
                this.unlockMain3DView('dimethyl_ether');
            }
            else if (hasEthanol) {
                if (btnToggle) {
                    btnToggle.innerHTML = '👁️'; 
                    btnToggle.onclick = null;
                    btnToggle.style.borderColor = 'var(--rpg-mana)'; 
                    btnToggle.style.color = 'var(--rpg-mana)';
                }
                
                if (this.currentLevel === 1) {
                    this.unlockMain3DView('ethanol');
                    if (!this.userStats.foundIsomer) {
                        if (typeof this.showAutoBuildBtn === 'function') this.showAutoBuildBtn();
                        this.showMagicNotice("拼装成功！", "可以打开结构视图查看。尝试把氧(O)原子放到中间试试？"); 
                    }
                }
            }
            else if (hasEthane) {
                if (btnToggle) {
                    btnToggle.innerHTML = '👁️'; 
                    btnToggle.onclick = null; 
                    btnToggle.style.borderColor = 'var(--rpg-mana)'; 
                    btnToggle.style.color = 'var(--rpg-mana)';
                }
                
                if (this.currentLevel === 1) {
                    this.unlockMain3DView('ethane'); 
                }
            }
        }
    }

    showDualIsomerPopup() {
        let popup = document.getElementById('dual-isomer-popup');
        let canvas = document.getElementById('canvas-container');
        if (!popup || !canvas) return;
        
        const boxEth = document.getElementById('model-box-ethanol');
        const boxEther = document.getElementById('model-box-ether');
        const labelEth = document.getElementById('label-ethanol');
        const labelEther = document.getElementById('label-ether');

        if (this.builtOrder && this.builtOrder.length > 0) {
            if (this.builtOrder[0] === 'dimethyl_ether') {
                if (boxEther) boxEther.style.order = 1; 
                if (boxEth) boxEth.style.order = 2;   
                if (labelEther) labelEther.innerText = " (结构 B)";
                if (labelEth) labelEth.innerText = "(结构 A)";
            } else {
                if (boxEth) boxEth.style.order = 1;   
                if (boxEther) boxEther.style.order = 2; 
                if (labelEth) labelEth.innerText = " (结构 A)";
                if (labelEther) labelEther.innerText = "(结构 B)";
            }
        }
        
        canvas.classList.add('canvas-shrunk');
        
        const leftPanel = document.getElementById('left-vision-panel');
        if (leftPanel && !leftPanel.classList.contains('hidden')) {
            leftPanel.classList.add('hidden');
        }

        const actionBar = document.querySelector('.action-bar');
        if (actionBar) actionBar.style.display = 'none';

        popup.classList.remove('hidden');

        if (this.dualRenderers) {
            this.dualRenderers.forEach(r => { if(r && r.dispose) r.dispose(); });
        }

        setTimeout(() => {
            this.dualRenderers = [
                new MiniModelRenderer('dual-3d-ethanol', 'ethanol'),
                new MiniModelRenderer('dual-3d-ether', 'dimethyl_ether')
            ];
            window.dispatchEvent(new Event('resize'));
        }, 100);

        const closeBtn = document.getElementById('btn-close-dual-popup');
        if (closeBtn) {
            closeBtn.onclick = () => {
                popup.classList.add('hidden');
                
                canvas.classList.remove('canvas-shrunk');
                if (actionBar) actionBar.style.display = 'flex';
                
                if (this.dualRenderers) {
                    this.dualRenderers.forEach(r => r.dispose());
                    this.dualRenderers = null;
                }
                setTimeout(() => window.dispatchEvent(new Event('resize')), 600);
            };
        }
    }
}