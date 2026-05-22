/**  (TopologyParser.js)  BFS  */
class TopologyParser {
    constructor(engine) {
        this.engine = engine;
        this.graph = new Map();
    }
    updateGraph(atomA, atomB) {
        if (!this.graph.has(atomA)) this.graph.set(atomA, []);
        if (!this.graph.has(atomB)) this.graph.set(atomB, []);
        if (!this.graph.get(atomA).includes(atomB)) this.graph.get(atomA).push(atomB);
        if (!this.graph.get(atomB).includes(atomA)) this.graph.get(atomB).push(atomA);
    }
    rebuildGraph() {
        this.graph.clear();
        this.engine.sceneManager.bonds.forEach(bond => {
            this.updateGraph(bond.a, bond.b);
        });
    }
    getConnectedComponents() {
        const visited = new Set();
        const components = [];
        for (let atom of this.graph.keys()) {
            if (!visited.has(atom)) {
                const comp = [];
                const queue = [atom];
                visited.add(atom);
                while (queue.length > 0) {
                    const current = queue.shift();
                    comp.push(current);
                    const neighbors = this.graph.get(current) || [];
                    for (let neighbor of neighbors) {
                        if (!visited.has(neighbor)) {
                            visited.add(neighbor);
                            queue.push(neighbor);
                        }
                    }
                }
                components.push(comp);
            }
        }
        return components;
    }
    analyzeStructure() {
        const ui = this.engine.uiManager;
        const components = this.getConnectedComponents();
        
        let hasEthanol = false;
        let hasDimethylEther = false;
        let hasEthane = false;
        let ethaneComponent = null;

        for (let comp of components) {
            let cCount = 0, hCount = 0, oCount = 0;
            for (let atom of comp) {
                if (atom.userData.type === 'C') cCount++;
                else if (atom.userData.type === 'H') hCount++;
                else if (atom.userData.type === 'O') oCount++;
            }
            if (cCount === 2 && hCount === 6 && oCount === 1) {
                for (let atom of comp) {
                    if (atom.userData.type === 'O') {
                        let connectedC = 0, connectedH = 0;
                        const neighbors = this.graph.get(atom) || [];
                        neighbors.forEach(n => {
                            if (n.userData.type === 'C') connectedC++;
                            if (n.userData.type === 'H') connectedH++;
                        });
                        if (connectedC === 1 && connectedH === 1) hasEthanol = true;
                        if (connectedC === 2) hasDimethylEther = true;
                    }
                }
            }
            if (cCount === 2 && hCount === 6 && oCount === 0) {
                hasEthane = true;
                ethaneComponent = comp;
            }
        }

        if (ui && typeof ui.updateStructureState === 'function') {
            ui.updateStructureState(hasEthanol, hasDimethylEther, hasEthane, ethaneComponent);
        }
    }
    findEthanolHydroxylGroup() {
        for (let [atomO, neighborsO] of this.graph.entries()) {
            if (atomO.userData.type === 'O') {
                let atomH = neighborsO.find(n => n.userData.type === 'H');
                let atomC = neighborsO.find(n => n.userData.type === 'C');
                if (atomH && atomC) {
                    const bondOH = this.engine.sceneManager.bonds.find(b => (b.a === atomO && b.b === atomH) || (b.a === atomH && b.b === atomO));
                    return { atomO, atomH, atomC, bondOH };
                }
            }
        }
        return null;
    }
    findOxidationSite() {
        let hydroxyl = this.findEthanolHydroxylGroup();
        if (!hydroxyl) return null;
        let alphaC = hydroxyl.atomC;
        let neighborsC = this.graph.get(alphaC);
        let atomH_C = neighborsC.find(n => n.userData.type === 'H');
        if (atomH_C) {
            const bondCH = this.engine.sceneManager.bonds.find(b => (b.a === alphaC && b.b === atomH_C) || (b.a === atomH_C && b.b === alphaC));
            return {
                atomO: hydroxyl.atomO, atomH_O: hydroxyl.atomH, bondOH: hydroxyl.bondOH,
                atomC: alphaC, atomH_C: atomH_C, bondCH: bondCH
            };
        }
        return null;
    }
}