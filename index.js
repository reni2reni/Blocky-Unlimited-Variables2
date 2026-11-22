/* global BF2042Portal, _Blockly */
(function () {
    const plugin = BF2042Portal.Plugins.getPlugin("variable-manager");

    plugin.initializeWorkspace = function () {
        console.log("Variable Manager initialized successfully");
    };

    // デフォルトカテゴリ
    const DEFAULT_CATEGORIES = [
        "Global", "AreaTrigger", "CapturePoint", "EmplacementSpawner", "HQ", "InteractPoint", 
        "LootSpawner", "MCOM", "Player", "RingOfFire", "ScreenEffect", "Sector", "SFX", 
        "SpatialObject", "Spawner", "SpawnPoint", "Team", "Vehicle", "VehicleSpawner", "VFX", "VO", "WaypointPath", "WorldIcon"
    ];

    const STORAGE_KEY_CATS = "bf-portal-extvars-cat-order";
    const STORAGE_KEY_DEF_ORDER = "bf-portal-extvars-def-order";

    function loadCategoryOrder() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_CATS);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const ordered = parsed.filter(c => DEFAULT_CATEGORIES.includes(c));
                    DEFAULT_CATEGORIES.forEach(c => {
                        if (!ordered.includes(c)) ordered.push(c);
                    });
                    return ordered;
                }
            }
        } catch (e) {}
        return [...DEFAULT_CATEGORIES];
    }

    function saveCategoryOrder(order) {
        try { localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(order)); } catch (e) {}
    }

    function loadDefOrderMap() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_DEF_ORDER);
            if (saved) return JSON.parse(saved);
        } catch(e) {}
        return {};
    }

    function saveDefOrderMap(map) {
        try { localStorage.setItem(STORAGE_KEY_DEF_ORDER, JSON.stringify(map)); } catch(e) {}
    }

    let CATEGORIES = loadCategoryOrder();

    // ---------- Blockly Workspace & Variable Helpers ----------
    function getMainWorkspaceSafe() {
        try {
            if (typeof _Blockly !== "undefined" && _Blockly.getMainWorkspace) return _Blockly.getMainWorkspace();
            if (typeof Blockly !== "undefined" && Blockly.getMainWorkspace) return Blockly.getMainWorkspace();
            if (typeof BF2042Portal !== "undefined" && BF2042Portal.getMainWorkspace) return BF2042Portal.getMainWorkspace();
        } catch (e) {}
        return null;
    }

    function workspaceGetVariableMap(ws) {
        try {
            if (!ws) return null;
            if (ws.getVariableMap) return ws.getVariableMap();
            if (ws.variableMap) return ws.variableMap;
        } catch (e) {}
        return null;
    }

    function workspaceGetVariables(ws) {
        try {
            const map = workspaceGetVariableMap(ws);
            if (!map) return [];
            if (map.getVariables) return map.getVariables();
            if (map.getAllVariables) return map.getAllVariables();
            if (Array.isArray(map.variables)) return map.variables;
        } catch (e) {}
        return [];
    }

    function getVarId(v) { try { return v?.id ?? (v.getId ? v.getId() : null); } catch (e) { return null; } }
    function getVarName(v) { try { return v?.name ?? (v.getName ? v.getName() : null); } catch(e) { return null; } }
    function getVarType(v) { try { return v?.type ?? (v.getType ? v.getType() : "Global"); } catch(e) { return "Global"; } }

    function createWorkspaceVariable(ws, name, type, id) {
        try {
            const map = workspaceGetVariableMap(ws);
            if (map?.createVariable) return map.createVariable(name, type || "", id);
            if (ws?.createVariable) return ws.createVariable(name, type || "", id);
        } catch(e) {}
        return null;
    }

    function deleteWorkspaceVariable(ws, idOrName) {
        try {
            const map = workspaceGetVariableMap(ws);
            if (!map) return false;
            if (map.deleteVariableById) { map.deleteVariableById(idOrName); return true; }
            if (map.deleteVariable) { map.deleteVariable(idOrName); return true; }
        } catch(e) {}
        return false;
    }

    function renameWorkspaceVariable(ws, varObj, newName) {
        try {
            const map = workspaceGetVariableMap(ws);
            if (!map) return false;
            let found = null;
            const id = getVarId(varObj);
            if (id && map.getVariableById) found = map.getVariableById(id);
            if (found) { found.name = newName; return true; }
            if (varObj?.name !== undefined) { varObj.name = newName; return true; }
        } catch(e) {}
        return false;
    }

    function updateBlocksForVariableRename(oldName, newName, ws) {
        if (!ws) return;
        const allBlocks = ws.getAllBlocks(false);
        allBlocks.forEach(block => {
            if (!block) return;
            const varField = block.getField && block.getField("VAR");
            if (!varField) return;
            try {
                const val = varField.getValue?.();
                const varObj = ws.getVariableById?.(val);
                if (varObj && varObj.name === newName) {
                    varField.setValue(val);
                    block.render?.();
                }
            } catch (e) {}
        });
    }

    function createID(length = 20) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    function getLiveRegistry() {
        const ws = getMainWorkspaceSafe();
        const live = {};
        for (const c of CATEGORIES) live[c] = [];
        try {
            const vars = workspaceGetVariables(ws);
            for (const v of vars) {
                const id = getVarId(v);
                const name = getVarName(v);
                const type = getVarType(v) || "Global";
                const cat = (typeof type === "string") ? type : "Global";
                if (!live[cat]) live[cat] = [];
                live[cat].push({ id, name, type, _raw: v });
            }
        } catch(e){}
        return live;
    }

    function countVariableUsage(ws, varDef) {
        if (!ws || !varDef) return 0;
        const allBlocks = ws.getAllBlocks ? ws.getAllBlocks() : [];
        const targetId = getVarId(varDef);
        let count = 0;
        for (const block of allBlocks) {
            if (!block) continue;
            const varField = block.getField && block.getField("VAR");
            if (!varField) continue;
            try {
                if (varField.getValue?.() === targetId) count++;
            } catch (e) {}
        }
        return count;
    }

    // ---------- CSS Styles ----------
    (function injectStyle() {
        const style = document.createElement("style");
        style.textContent = `
            .ev-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:Arial,sans-serif;}
            .ev-modal{width:900px;height:600px;background:#1e1e1e;border-radius:8px;padding:16px;display:flex;flex-direction:column;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.8);}
            .ev-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #333;padding-bottom:8px;}
            .ev-title{font-size:18px;font-weight:bold;}
            .ev-content{display:flex;gap:12px;flex:1;overflow:hidden;}
            .ev-cats{width:220px;background:#111;border-radius:6px;padding:8px;overflow-y:auto;border:1px solid #333;}
            .ev-cat{padding:8px 10px;border-radius:4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#222;margin-bottom:4px;font-size:13px;}
            .ev-cat:hover{background:#333;}
            .ev-cat.selected{background:#0e639c;font-weight:bold;}
            .ev-list{flex:1;background:#111;border-radius:6px;padding:12px;overflow-y:auto;display:flex;flex-direction:column;border:1px solid #333;}
            .ev-row{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#222;border-radius:4px;margin-bottom:6px;font-size:13px;}
            .ev-btn{padding:5px 10px;border-radius:4px;border:none;color:#fff;cursor:pointer;font-size:12px;}
            .ev-add{background:#0e639c;}
            .ev-edit{background:#444;}
            .ev-del{background:#a1260d;}
            .ev-close{background:#555;}
            .ev-muted{color:#888;font-size:12px;}
        `;
        document.head.appendChild(style);
    })();

    // ---------- Modal Panel ----------
    function showVariableManagerPanel() {
        const ws = getMainWorkspaceSafe();
        const live = getLiveRegistry();

        const overlay = document.createElement("div");
        overlay.className = "ev-overlay";

        const modal = document.createElement("div");
        modal.className = "ev-modal";
        overlay.appendChild(modal);

        // Header
        const header = document.createElement("div");
        header.className = "ev-header";
        const title = document.createElement("div");
        title.className = "ev-title";
        title.innerText = "変数マネージャー (Variable Manager)";
        header.appendChild(title);

        const closeBtn = document.createElement("button");
        closeBtn.className = "ev-btn ev-close";
        closeBtn.innerText = "✕ 閉じる";
        closeBtn.onclick = () => overlay.remove();
        header.appendChild(closeBtn);
        modal.appendChild(header);

        // Content
        const content = document.createElement("div");
        content.className = "ev-content";
        modal.appendChild(content);

        const leftPane = document.createElement("div");
        leftPane.className = "ev-cats";
        const rightPane = document.createElement("div");
        rightPane.className = "ev-list";

        content.appendChild(leftPane);
        content.appendChild(rightPane);

        let currentCategory = CATEGORIES[0] || "Global";
        const defOrderMap = loadDefOrderMap();

        function renderModal() {
            // 左側カテゴリ描画
            leftPane.innerHTML = "";
            const currentLive = getLiveRegistry();

            CATEGORIES.forEach(cat => {
                const item = document.createElement("div");
                item.className = `ev-cat ${cat === currentCategory ? "selected" : ""}`;
                const count = (currentLive[cat] || []).length;
                item.innerHTML = `<span>${cat}</span><span class="ev-muted">${count}</span>`;
                item.onclick = () => {
                    currentCategory = cat;
                    renderModal();
                };
                leftPane.appendChild(item);
            });

            // 右側リスト＆作成フォーム描画
            rightPane.innerHTML = "";
            const varsInCat = currentLive[currentCategory] || [];

            const formDiv = document.createElement("div");
            formDiv.style.cssText = "display:flex; gap:8px; margin-bottom:12px;";

            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = `[${currentCategory}] 新規変数名...`;
            input.style.cssText = "flex:1; padding:6px 10px; background:#222; border:1px solid #444; color:#fff; border-radius:4px; outline:none;";

            const addBtn = document.createElement("button");
            addBtn.className = "ev-btn ev-add";
            addBtn.innerText = "追加";

            const handleAdd = () => {
                const valName = input.value.trim();
                if (valName) {
                    const newId = createID();
                    createWorkspaceVariable(ws, valName, currentCategory, newId);
                    if (!defOrderMap[currentCategory]) defOrderMap[currentCategory] = [];
                    defOrderMap[currentCategory].push(newId);
                    saveDefOrderMap(defOrderMap);
                    input.value = "";
                    renderModal();
                }
            };

            addBtn.onclick = handleAdd;
            input.onkeydown = (e) => { if (e.key === "Enter") handleAdd(); };

            formDiv.appendChild(input);
            formDiv.appendChild(addBtn);
            rightPane.appendChild(formDiv);

            const listContainer = document.createElement("div");
            listContainer.style.cssText = "flex:1; overflow-y:auto;";

            if (varsInCat.length === 0) {
                const empty = document.createElement("div");
                empty.className = "ev-muted";
                empty.style.padding = "20px";
                empty.style.textAlign = "center";
                empty.innerText = "このカテゴリに変数はありません";
                listContainer.appendChild(empty);
            } else {
                varsInCat.forEach(v => {
                    const row = document.createElement("div");
                    row.className = "ev-row";

                    const infoDiv = document.createElement("div");
                    const usageCount = countVariableUsage(ws, v);
                    infoDiv.innerHTML = `<div style="font-weight:bold;">${v.name}</div><div class="ev-muted">使用回数: ${usageCount}</div>`;

                    const btnGroup = document.createElement("div");
                    btnGroup.style.display = "flex";
                    btnGroup.style.gap = "6px";

                    const editBtn = document.createElement("button");
                    editBtn.className = "ev-btn ev-edit";
                    editBtn.innerText = "名前変更";
                    editBtn.onclick = () => {
                        const newName = prompt("新しい変数名を入力してください:", v.name);
                        if (newName && newName.trim() !== "") {
                            const oldName = v.name;
                            renameWorkspaceVariable(ws, v._raw, newName.trim());
                            updateBlocksForVariableRename(oldName, newName.trim(), ws);
                            renderModal();
                        }
                    };

                    const delBtn = document.createElement("button");
                    delBtn.className = "ev-btn ev-del";
                    delBtn.innerText = "削除";
                    delBtn.onclick = () => {
                        if (confirm(`変数 "${v.name}" を削除しますか？`)) {
                            deleteWorkspaceVariable(ws, v.id) || deleteWorkspaceVariable(ws, v.name);
                            renderModal();
                        }
                    };

                    btnGroup.appendChild(editBtn);
                    btnGroup.appendChild(delBtn);

                    row.appendChild(infoDiv);
                    row.appendChild(btnGroup);
                    listContainer.appendChild(row);
                });
            }

            rightPane.appendChild(listContainer);
        }

        renderModal();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        document.body.appendChild(overlay);
    }

    // ---------- 親メニューに直接項目を表示するための正しいプラグイン登録 ----------
    const variableManagerItem = {
        id: "variableManagerItem",
        displayText: "Variable Manager",
        scopeType: _Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
        weight: 100,
        preconditionFn: () => "enabled",
        callback: function () {
            showVariableManagerPanel();
        },
    };

    // メニューコンテナを作らず、プラグインシステム経由で直接トップレベルメニューアイテムとして登録
    plugin.registerItem(variableManagerItem);

    try {
        _Blockly.ContextMenuRegistry.registry.register(variableManagerItem);
    } catch (e) {
        console.warn("Failed to register variableManagerItem directly:", e);
    }
})();
