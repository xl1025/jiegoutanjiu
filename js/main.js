/** 核心入口 (main.js) */
window.app = {}; 
window.onload = () => {     
    // 1. 基础UI与场景初始化
    app.sceneManager = new SceneManager('canvas-container');     
    app.uiManager = new UIManager();     
    
    // 2. 物理与交互引擎
    app.physicsEngine = new PhysicsEngine(app.sceneManager);     
    app.sceneManager.physicsEngine = app.physicsEngine;           
    app.interactionManager = new InteractionManager(app.sceneManager);      
    
    // 3. 化学核心逻辑与导演     
    app.chemistryEngine = new ChemistryEngine(app.sceneManager, app.uiManager);          
    if (app.chemistryEngine.director) {
        app.reactionDirector = app.chemistryEngine.director;
    } else if (typeof ReactionDirector !== 'undefined') {
        app.reactionDirector = new ReactionDirector(app.chemistryEngine);
    }

    app.aiAssistant = new AIAssistant(app.uiManager);      
    
    // ⚠️ 核心修复：彻底移除了 setInterval(checkAndFormBonds), 
    // 这个原本每秒运行2次的后台死循环会导致严重的性能卡顿并阻断动画，现已安全切除。
};