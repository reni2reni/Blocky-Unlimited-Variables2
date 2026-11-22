/* global BF2042Portal, _Blockly */
(function () {
    const plugin = BF2042Portal.Plugins.getPlugin("variable-manager");

    plugin.initializeWorkspace = function () {
        console.log("Variable Manager initializeWorkspace");
    };

    // 変数の種類（ダミーデータ）
    const variableTypes = [
        { id: "number", name: "数値 (Number)", variables: ["Score", "Health", "Timer"] },
        { id: "boolean", name: "真偽値 (Boolean)", variables: ["IsGameOver", "IsActive"] },
        { id: "vector", name: "ベクター (Vector)", variables: ["SpawnPosition", "TargetPos"] },
        { id: "player", name: "プレイヤー (Player)", variables: ["CurrentPlayer", "TargetPlayer"] }
    ];

    let currentSelectedType = variableTypes[0].id;

    // UIパネルを生成して表示する関数
    function showVariableManagerPanel() {
        // 既存のパネルがあれば削除
        const existingOverlay = document.getElementById("var-manager-overlay");
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // オーバーレイ（背景）
        const overlay = document.createElement("div");
        overlay.id = "var-manager-overlay";
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5); z-index: 99999;
            display: flex; justify-content: center; align-items: center;
            font-family: Arial, sans-serif;
        `;

        // メインウィンドウ
        const windowDiv = document.createElement("div");
        windowDiv.style.cssText = `
            width: 700px; height: 450px; background: #1e1e1e; color: #fff;
            border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.7);
            display: flex; flex-direction: column; overflow: hidden;
        `;

        // ヘッダー
        const header = document.createElement("div");
        header.style.cssText = `
            height: 40px; background: #2d2d2d; display: flex;
            align-items: center; justify-content: space-between; padding: 0 15px;
            font-weight: bold; border-bottom: 1px solid #3c3c3c;
        `;
        header.innerText = "変数マネージャー (Variable Manager)";

        // 閉じるボタン
        const closeButton = document.createElement("button");
        closeButton.innerText = "×";
        closeButton.style.cssText = `
            background: transparent; border: none; color: #fff; font-size: 20px;
            cursor: pointer; padding: 0 5px;
        `;
        closeButton.onclick = () => overlay.remove();
        header.appendChild(closeButton);
        windowDiv.appendChild(header);

        // コンテンツエリア（左右分割）
        const content = document.createElement("div");
        content.style.cssText = `display: flex; flex: 1; height: calc(100% - 40px);`;

        // 左側：変数の種類のリスト
        const leftPane = document.createElement("div");
        leftPane.style.cssText = `
            width: 240px; background: #252526; border-right: 1px solid #3c3c3c;
            overflow-y: auto; padding: 10px 0;
        `;

        // 右側：変数のリストと作成欄
        const rightPane = document.createElement("div");
        rightPane.style.cssText = `flex: 1; background: #1e1e1e; display: flex; flex-direction: column; padding: 15px;`;

        // リストを描画する関数
        function renderUI() {
            // 左側描画
            leftPane.innerHTML = "";
            variableTypes.forEach(type => {
                const item = document.createElement("div");
                item.innerText = type.name;
                item.style.cssText = `
                    padding: 10px 15px; cursor: pointer; font-size: 14px;
                    background: ${currentSelectedType === type.id ? "#37373d" : "transparent"};
                `;
                item.onclick = () => {
                    currentSelectedType = type.id;
                    renderUI();
                };
                leftPane.appendChild(item);
            });

            // 右側描画
            rightPane.innerHTML = "";
            const selectedTypeObj = variableTypes.find(t => t.id === currentSelectedType);

            // 上部：新規変数名入力欄と追加ボタン
            const inputContainer = document.createElement("div");
            inputContainer.style.cssText = `display: flex; margin-bottom: 15px; gap: 10px;`;

            const inputField = document.createElement("input");
            inputField.type = "text";
            inputField.placeholder = "新しい変数名を入力...";
            inputField.style.cssText = `
                flex: 1; padding: 8px; background: #333; border: 1px solid #555;
                color: #fff; border-radius: 4px; outline: none;
            `;

            const addButton = document.createElement("button");
            addButton.innerText = "追加";
            addButton.style.cssText = `
                padding: 8px 15px; background: #0e639c; color: #fff; border: none;
                border-radius: 4px; cursor: pointer; font-weight: bold;
            `;
            addButton.onclick = () => {
                const valName = inputField.value.trim();
                if (valName && selectedTypeObj) {
                    selectedTypeObj.variables.push(valName);
                    inputField.value = "";
                    renderUI();
                }
            };

            inputContainer.appendChild(inputField);
            inputContainer.appendChild(addButton);
            rightPane.appendChild(inputContainer);

            // 変数リスト表示エリア
            const varListContainer = document.createElement("div");
            varListContainer.style.cssText = `flex: 1; overflow-y: auto; border: 1px solid #3c3c3c; border-radius: 4px; background: #252526;`;

            if (selectedTypeObj && selectedTypeObj.variables.length > 0) {
                selectedTypeObj.variables.forEach((variable, index) => {
                    const varItem = document.createElement("div");
                    varItem.innerText = variable;
                    varItem.style.cssText = `
                        padding: 10px; border-bottom: 1px solid #333; font-size: 14px;
                        display: flex; justify-content: space-between; align-items: center;
                    `;
                    
                    // 削除ボタン（おまけ機能）
                    const delBtn = document.createElement("button");
                    delBtn.innerText = "削除";
                    delBtn.style.cssText = `background: #a1260d; color: #fff; border: none; padding: 3px 8px; border-radius: 3px; cursor: pointer;`;
                    delBtn.onclick = () => {
                        selectedTypeObj.variables.splice(index, 1);
                        renderUI();
                    };

                    varItem.appendChild(delBtn);
                    varListContainer.appendChild(varItem);
                });
            } else {
                const emptyMsg = document.createElement("div");
                emptyMsg.innerText = "変数がありません";
                emptyMsg.style.cssText = `padding: 15px; color: #888; text-align: center;`;
                varListContainer.appendChild(emptyMsg);
            }

            rightPane.appendChild(varListContainer);
        }

        renderUI();

        content.appendChild(leftPane);
        content.appendChild(rightPane);
        windowDiv.appendChild(content);
        overlay.appendChild(windowDiv);
        document.body.appendChild(overlay);
    }

    // コンテキストメニュー（右クリック項目）の定義
    const variableManagerMenuItem = {
        id: "variableManagerMenu",
        displayText: "Variable Manager",
        scopeType: _Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
        weight: 100,
        preconditionFn: () => "enabled",
        callback: function () {
            showVariableManagerPanel();
        },
    };

    // メニューの作成と登録
    const workspaceMenu = plugin.createMenu(
        "variableManagerWorkspace",
        "Variable Manager",
        _Blockly.ContextMenuRegistry.ScopeType.WORKSPACE
    );
    workspaceMenu.options = [
        "items.variableManagerMenu"
    ];

    plugin.registerMenu(workspaceMenu);
    plugin.registerItem(variableManagerMenuItem);

    _Blockly.ContextMenuRegistry.registry.register(workspaceMenu);
})();
