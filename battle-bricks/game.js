const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const goldDisplay = document.getElementById('gold-count');

canvas.width = 800;
canvas.height = 400;

// 儲存與讀取功能
function saveGame() {
    const saveData = {
        wesley: state.wesley,
        energy: state.energy,
        currentChapter: state.currentChapter,
        unlocked: state.unlocked,
        levels: state.levels,
        systemLevels: state.systemLevels
    };
    localStorage.setItem('wesley67_save', JSON.stringify(saveData));
}

function updateGlobalUI() {
    const goldDisplay = document.getElementById('gold-count');
    const wesleyDisplay = document.getElementById('wesley-count');
    const energyDisplay = document.getElementById('energy-count');
    const chapterDisplay = document.getElementById('chapter-count');

    if (goldDisplay) goldDisplay.innerText = Math.floor(state.gold);
    if (wesleyDisplay) wesleyDisplay.innerText = state.wesley;
    if (energyDisplay) energyDisplay.innerText = state.energy;
    if (chapterDisplay) chapterDisplay.innerText = state.currentChapter;
}

function loadGame() {
    const saved = localStorage.getItem('wesley67_save');
    if (saved) {
        const data = JSON.parse(saved);
        state.wesley = data.wesley || 0;
        state.energy = data.energy || 0;
        state.currentChapter = data.currentChapter || 1;
        state.unlocked = data.unlocked || { fast: false, archer: false, tank: false };
        state.levels = data.levels || { basic: 1, fast: 1, archer: 1, tank: 1 };
        state.systemLevels = data.systemLevels || { goldProd: 1, towerHP: 1 };
        
        // 強制修正超過 5 等的單位
        ['basic', 'fast', 'archer', 'tank'].forEach(type => {
            if (state.levels[type] > 5) state.levels[type] = 5;
        });
        
        if (state.systemLevels.goldProd > 5) state.systemLevels.goldProd = 5;
        if (state.systemLevels.towerHP > 5) state.systemLevels.towerHP = 5;

        const fastBtn = document.getElementById('spawn-fast');
        const archerBtn = document.getElementById('spawn-archer');
        const tankBtn = document.getElementById('spawn-tank');
        if (fastBtn) fastBtn.disabled = !state.unlocked.fast;
        if (archerBtn) archerBtn.disabled = !state.unlocked.archer;
        if (tankBtn) tankBtn.disabled = !state.unlocked.tank;
    }
    updateGlobalUI();
    saveGame();
}

// 遊戲狀態
let state = {
    gold: 20,
    wesley: 0,
    energy: 0,
    currentChapter: 1,
    maxChapters: 3,
    isPaused: true,
    isPreparing: true,
    unlocked: { fast: false, archer: false, tank: false },
    levels: {
        basic: 1,
        fast: 1,
        archer: 1,
        tank: 1
    },
    systemLevels: {
        goldProd: 1,
        towerHP: 1
    },
    lastTime: 0,
    playerTower: { hp: 100, maxHp: 100, x: 20, y: 200, side: 'player' },
    enemyTower: { hp: 100, maxHp: 100, x: 730, y: 200, side: 'enemy' },
    playerUnits: [],
    enemyUnits: [],
    projectiles: [],
    spawnTimer: 0
};

// 初始化讀取
// loadGame(); // 移至 DOMContentLoaded 中執行

class Unit {
    constructor(x, y, side, type) {
        this.x = x;
        this.y = y;
        this.side = side;
        this.type = type;
        
        let level = side === 'player' ? state.levels[type] : 1;
        let levelBonus = (level - 1) * 0.1; // 每級增加 10% 能力 (原本 20%)

        // 屬性設定
        if (type === 'fast') {
            this.hp = 15 * (1 + levelBonus); 
            this.maxHp = this.hp; 
            this.speed = side === 'player' ? 3 : -3; 
            this.atk = 1.5 * (1 + levelBonus); 
            if (side === 'enemy') this.atk *= 0.9; 
            this.size = 20;
            this.atkRange = 10;
        } else if (type === 'archer') {
            this.hp = 12 * (1 + levelBonus); 
            this.maxHp = this.hp; 
            this.speed = side === 'player' ? 1.2 : -1.2; 
            this.atk = 3 * (1 + levelBonus); 
            if (side === 'enemy') this.atk *= 0.9; 
            this.size = 25;
            this.atkRange = 200; // 遠程攻擊範圍
        } else if (type === 'tank') {
            this.hp = 60 * (1 + levelBonus); 
            this.maxHp = this.hp; 
            this.speed = side === 'player' ? 0.8 : -0.8; 
            this.atk = 4 * (1 + levelBonus); 
            if (side === 'enemy') this.atk *= 0.9; 
            this.size = 45;
            this.atkRange = 10;
        } else {
            this.hp = 20 * (1 + levelBonus); 
            this.maxHp = this.hp; 
            this.speed = side === 'player' ? 1.5 : -1.5; 
            this.atk = 2 * (1 + levelBonus); 
            if (side === 'enemy') this.atk *= 0.9; 
            this.size = 30;
            this.atkRange = 10;
        }
        
        this.cooldown = 0;
    }

    update() {
        if (this.cooldown > 0) this.cooldown--;

        // 尋找目標
        let opponents = this.side === 'player' ? state.enemyUnits : state.playerUnits;
        let enemyTower = this.side === 'player' ? state.enemyTower : state.playerTower;
        
        let nearestEnemy = null;
        let minDist = Infinity;

        opponents.forEach(enemy => {
            let d = Math.abs(this.x - enemy.x);
            if (d < minDist) {
                minDist = d;
                nearestEnemy = enemy;
            }
        });

        // 判斷是否在攻擊範圍
        let distToTower = Math.abs(this.x - enemyTower.x);
        
        if (nearestEnemy && minDist < (this.size + this.atkRange)) {
            if (this.cooldown <= 0) {
                if (this.type === 'archer') {
                    // 遠程發射子彈
                    state.projectiles.push(new Projectile(this.x, this.y - this.size/2, nearestEnemy, this.atk, this.side));
                } else {
                    nearestEnemy.hp -= this.atk;
                }
                this.cooldown = 80;
                playEffectSound(440, 0.05);
            }
        } else if (distToTower < (this.size + this.atkRange + 30)) {
            if (this.cooldown <= 0) {
                if (this.type === 'archer') {
                    state.projectiles.push(new Projectile(this.x, this.y - this.size/2, enemyTower, this.atk, this.side));
                } else {
                    enemyTower.hp -= this.atk;
                }
                this.cooldown = 80;
                playEffectSound(220, 0.1);
            }
        } else {
            // 移動
            this.x += this.speed;
        }
    }

    draw() {
        // 根據類型與陣營設定顏色
        let mainColor, decoColor;
        if (this.side === 'player') {
            if (this.type === 'fast') { mainColor = '#00fbff'; decoColor = '#ffffff'; }
            else if (this.type === 'archer') { mainColor = '#2ecc71'; decoColor = '#ffffff'; }
            else if (this.type === 'tank') { mainColor = '#1a2a6c'; decoColor = '#7f8c8d'; }
            else { mainColor = '#4a90e2'; decoColor = '#ffffff'; }
        } else {
            if (this.type === 'fast') { mainColor = '#ff9a00'; decoColor = '#ffffff'; }
            else if (this.type === 'archer') { mainColor = '#f1c40f'; decoColor = '#ffffff'; }
            else if (this.type === 'tank') { mainColor = '#4b0000'; decoColor = '#7f8c8d'; }
            else { mainColor = '#e24a4a'; decoColor = '#ffffff'; }
        }
        
        // 繪製主體
        ctx.fillStyle = mainColor;
        ctx.fillRect(this.x, this.y - this.size, this.size, this.size);

        // --- 特殊裝飾 ---
        if (this.type === 'fast') {
            ctx.fillStyle = mainColor;
            ctx.globalAlpha = 0.4;
            let tailOffset = this.side === 'player' ? -15 : 15;
            ctx.fillRect(this.x + tailOffset, this.y - this.size + 5, this.size, this.size - 10);
            ctx.globalAlpha = 1.0;
        } else if (this.type === 'archer') {
            // 弓箭手：帽子或蝴蝶結裝飾
            ctx.fillStyle = decoColor;
            ctx.fillRect(this.x + this.size/4, this.y - this.size - 4, this.size/2, 4);
        } else if (this.type === 'tank') {
            ctx.strokeStyle = decoColor;
            ctx.lineWidth = 4;
            ctx.strokeRect(this.x + 2, this.y - this.size + 2, this.size - 4, this.size - 4);
            ctx.fillStyle = decoColor;
            ctx.fillRect(this.x + 5, this.y - this.size + 5, 4, 4);
            ctx.fillRect(this.x + this.size - 9, this.y - this.size + 5, 4, 4);
        }

        // 共通裝飾：小眼睛
        ctx.fillStyle = 'white';
        let eyeSize = this.size / 6;
        let eyeY = this.y - this.size + (this.size / 4);
        let eyeOffset = this.side === 'player' ? this.size * 0.6 : this.size * 0.1;
        ctx.fillRect(this.x + eyeOffset, eyeY, eyeSize, eyeSize);
        ctx.fillRect(this.x + eyeOffset + (this.size * 0.2), eyeY, eyeSize, eyeSize);

        // 顯示名稱
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        let typeName = this.type === 'fast' ? '快速' : (this.type === 'archer' ? '弓箭' : (this.type === 'tank' ? '重裝' : '方塊'));
        ctx.fillText(typeName, this.x + this.size / 2, this.y - this.size - 18);

        // 血條
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - this.size - 10, this.size, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - this.size - 10, this.size * (this.hp / this.maxHp), 5);
    }
}

class Projectile {
    constructor(x, y, target, damage, side) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.side = side;
        this.speed = 4;
        this.alive = true;
    }

    update() {
        let dx = this.target.x + 15 - this.x;
        let dy = (this.target.y ? this.target.y + 50 : this.target.y - 15) - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 10) {
            this.target.hp -= this.damage;
            this.alive = false;
        } else {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }

        // 邊界檢查
        if (this.x < 0 || this.x > 800) this.alive = false;
    }

    draw() {
        ctx.fillStyle = this.side === 'player' ? '#2ecc71' : '#f1c40f';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}
}

// 簡單音效 (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playEffectSound(freq, duration) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(g);
    g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.1, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function spawnUnit(side, type = 'basic') {
    let cost = type === 'fast' ? 25 : (type === 'tank' ? 50 : 10);
    if (side === 'player') {
        if (state.gold >= cost) {
            state.gold -= cost;
            state.playerUnits.push(new Unit(60, 300, 'player', type));
        }
    } else {
        state.enemyUnits.push(new Unit(710, 300, 'enemy', type));
    }
}

// 商店與強化系統邏輯
const openShop = () => {
    document.getElementById('shop-screen').style.display = 'block';
};

const unitData = {
    basic: { name: '方塊兵', baseHp: 20, baseAtk: 2, baseSpd: 1.5 },
    fast: { name: '快速兵', baseHp: 15, baseAtk: 1.5, baseSpd: 3 },
    archer: { name: '弓箭兵', baseHp: 12, baseAtk: 3, baseSpd: 1.2 },
    tank: { name: '重裝兵', baseHp: 60, baseAtk: 4, baseSpd: 0.8 }
};

function updateUpgradeUI() {
    const charList = document.getElementById('upgrade-list-chars');
    const systemList = document.getElementById('upgrade-list-system');
    if (!charList || !systemList) return;

    // 角色強化清單
    charList.innerHTML = '';
    ['basic', 'fast', 'archer', 'archer', 'tank'].forEach(type => {
        if (type !== 'basic' && !state.unlocked[type]) return;
        
        const lv = state.levels[type];
        const data = unitData[type];
        const bonus = (lv - 1) * 0.1;
        const isMaxLevel = lv >= 5;
        
        const item = document.createElement('div');
        item.className = 'upgrade-item';
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <strong>${data.name} (Lv.${lv}${isMaxLevel ? ' MAX' : ''})</strong>
                ${isMaxLevel ? '' : `<button onclick="upgradeUnit('${type}')" class="spawn-btn" style="padding:2px 10px;">強化</button>`}
            </div>
            <div class="upgrade-stats">
                生命: ${Math.floor(data.baseHp * (1+bonus))} | 攻擊: ${(data.baseAtk * (1+bonus)).toFixed(1)}
            </div>
        `;
        charList.appendChild(item);
    });

    // 系統強化清單
    systemList.innerHTML = '';
    const sysData = [
        { id: 'goldProd', name: '金幣產量', desc: (lv) => `每秒金幣: ${(3 + (lv-1)*0.5).toFixed(1)}` },
        { id: 'towerHP', name: '防禦塔血量', desc: (lv) => `最大血量: ${100 + (lv-1)*10}` }
    ];
    sysData.forEach(sys => {
        const lv = state.systemLevels[sys.id];
        const isMax = lv >= 5;
        const item = document.createElement('div');
        item.className = 'upgrade-item';
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <strong>${sys.name} (Lv.${lv}${isMax ? ' MAX' : ''})</strong>
                ${isMax ? '' : `<button onclick="upgradeSystem('${sys.id}')" class="spawn-btn" style="padding:2px 10px;">強化</button>`}
            </div>
            <div class="upgrade-stats">${sys.desc(lv)}</div>
        `;
        systemList.appendChild(item);
    });
}

window.upgradeUnit = (type) => {
    if (state.levels[type] >= 5) return;
    if (state.wesley >= 100) {
        state.wesley -= 100;
        state.levels[type]++;
        updateUpgradeUI();
        updateGlobalUI();
        saveGame();
    } else { alert("WESLEY 幣不足！"); }
};

window.upgradeSystem = (id) => {
    if (state.systemLevels[id] >= 5) return;
    if (state.wesley >= 100) {
        state.wesley -= 100;
        state.systemLevels[id]++;
        updateUpgradeUI();
        updateGlobalUI();
        saveGame();
    } else { alert("WESLEY 幣不足！"); }
};

const openUpgrades = () => {
    updateUpgradeUI();
    document.getElementById('upgrade-screen').style.display = 'block';
};

// 初始化
window.addEventListener('DOMContentLoaded', () => {
    loadGame();
    
    // 頁籤切換
    const tabChars = document.getElementById('tab-chars');
    const tabSystem = document.getElementById('tab-system');
    const listChars = document.getElementById('upgrade-list-chars');
    const listSystem = document.getElementById('upgrade-list-system');

    if (tabChars && tabSystem) {
        tabChars.addEventListener('click', () => {
            listChars.style.display = 'block';
            listSystem.style.display = 'none';
            tabChars.style.color = '#4a90e2';
            tabSystem.style.color = '#aaa';
        });
        tabSystem.addEventListener('click', () => {
            listChars.style.display = 'none';
            listSystem.style.display = 'block';
            tabChars.style.color = '#aaa';
            tabSystem.style.color = '#4a90e2';
        });
    }

    // 綁定按鈕事件
    const spawnBasic = document.getElementById('spawn-basic');
    if (spawnBasic) spawnBasic.addEventListener('click', () => spawnUnit('player', 'basic'));
    
    const spawnFast = document.getElementById('spawn-fast');
    if (spawnFast) spawnFast.addEventListener('click', () => spawnUnit('player', 'fast'));
    
    const spawnTank = document.getElementById('spawn-tank');
    if (spawnTank) spawnTank.addEventListener('click', () => spawnUnit('player', 'tank'));

    const spawnArcher = document.getElementById('spawn-archer');
    if (spawnArcher) spawnArcher.addEventListener('click', () => spawnUnit('player', 'archer'));

    const openShopBtn = document.getElementById('open-shop');
    if (openShopBtn) openShopBtn.addEventListener('click', openShop);
    
    const openShopPre = document.getElementById('open-shop-pre');
    if (openShopPre) openShopPre.addEventListener('click', openShop);

    const closeShopBtn = document.getElementById('close-shop');
    if (closeShopBtn) closeShopBtn.addEventListener('click', () => {
        document.getElementById('shop-screen').style.display = 'none';
    });

    document.getElementById('unlock-fast').addEventListener('click', () => {
        if (state.wesley >= 500 && !state.unlocked.fast) {
            state.wesley -= 500;
            state.unlocked.fast = true;
            document.getElementById('spawn-fast').disabled = false;
            alert("已解鎖快速兵！");
            updateUpgradeUI();
            saveGame();
        } else {
            alert("WESLEY 幣不足或已解鎖！");
        }
    });

    document.getElementById('unlock-archer').addEventListener('click', () => {
        if (state.wesley >= 800 && !state.unlocked.archer) {
            state.wesley -= 800;
            state.unlocked.archer = true;
            document.getElementById('spawn-archer').disabled = false;
            alert("已解鎖弓箭兵！");
            updateUpgradeUI();
            saveGame();
        } else {
            alert("WESLEY 幣不足或已解鎖！");
        }
    });

    document.getElementById('unlock-tank').addEventListener('click', () => {
        if (state.wesley >= 1000 && !state.unlocked.tank) {
            state.wesley -= 1000;
            state.unlocked.tank = true;
            document.getElementById('spawn-tank').disabled = false;
            alert("已解鎖重裝兵！");
            updateUpgradeUI();
            saveGame();
        } else {
            alert("WESLEY 幣不足或已解鎖！");
        }
    });

    document.getElementById('open-upgrades-pre').addEventListener('click', openUpgrades);

    document.getElementById('close-upgrades').addEventListener('click', () => {
        document.getElementById('upgrade-screen').style.display = 'none';
    });

    document.getElementById('start-game').addEventListener('click', () => {
        state.isPaused = false;
        state.isPreparing = false;
        document.getElementById('start-screen').style.display = 'none';
    });

    document.getElementById('next-level').addEventListener('click', () => {
        if (state.currentChapter < state.maxChapters) {
            state.currentChapter++;
        } else {
            alert("已完成所有章節！回歸第一章。");
            state.currentChapter = 1;
        }
        showStartScreen();
    });

    document.getElementById('replay-level').addEventListener('click', () => {
        showStartScreen();
    });

    document.getElementById('retry-level').addEventListener('click', () => {
        document.getElementById('failure-screen').style.display = 'none';
        showStartScreen();
    });

    // 章節切換按鈕
    document.getElementById('prev-chapter').addEventListener('click', () => {
        if (state.currentChapter > 1) {
            state.currentChapter--;
            updateStartScreenInfo();
            saveGame();
        }
    });

    document.getElementById('next-chapter').addEventListener('click', () => {
        if (state.currentChapter < state.maxChapters) {
            state.currentChapter++;
            updateStartScreenInfo();
            saveGame();
        }
    });

    showStartScreen();
    requestAnimationFrame(loop);
});

function updateStartScreenInfo() {
    const info = document.getElementById('start-chapter-info');
    if (info) info.innerText = `目前章節: 第 ${state.currentChapter} 章`;
}

function showStartScreen() {
    const victory = document.getElementById('victory-screen');
    const failure = document.getElementById('failure-screen');
    const start = document.getElementById('start-screen');

    if (victory) victory.style.display = 'none';
    if (failure) failure.style.display = 'none';
    if (start) start.style.display = 'block';
    
    updateStartScreenInfo();
    
    state.isPaused = true;
    state.isPreparing = true;
    resetGame();
}

function drawTower(tower) {
    const isPlayer = tower.side === 'player';
    const mainColor = isPlayer ? '#2c3e50' : '#c0392b';
    const accentColor = isPlayer ? '#34495e' : '#e74c3c';
    
    // 繪製陰影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(tower.x + 5, tower.y + 5, 50, 100);

    // 繪製塔身
    ctx.fillStyle = mainColor;
    ctx.fillRect(tower.x, tower.y, 50, 100);

    // 繪製城牆頂部 (齒狀裝飾)
    ctx.fillStyle = accentColor;
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(tower.x + (i * 18), tower.y - 8, 10, 10);
    }
    ctx.fillRect(tower.x, tower.y, 50, 10);

    // 繪製窗戶
    ctx.fillStyle = 'rgba(241, 196, 15, 0.4)'; // 淡淡的燈光感
    ctx.fillRect(tower.x + 12, tower.y + 25, 8, 12);
    ctx.fillRect(tower.x + 30, tower.y + 25, 8, 12);
    
    // 繪製大門
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(tower.x + 15, tower.y + 70, 20, 30);

    // 如果是我方的塔，加上 "67" 金色徽章
    if (isPlayer) {
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 22px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText('67', tower.x + 25, tower.y + 60);
    }
    
    // 塔血量
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(tower.hp)}/${tower.maxHp}`, tower.x + 25, tower.y - 20);
}

function loop(timestamp) {
    if (state.isPaused) {
        requestAnimationFrame(loop);
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景地面
    ctx.strokeStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(0, 300);
    ctx.lineTo(canvas.width, 300);
    ctx.stroke();

    // 更新與繪製單位
    [...state.playerUnits, ...state.enemyUnits].forEach(unit => {
        unit.update();
        unit.draw();
    });

    // 更新與繪製子彈
    state.projectiles.forEach((proj, index) => {
        proj.update();
        proj.draw();
        if (!proj.alive) state.projectiles.splice(index, 1);
    });

    // 繪製塔 (移到單位之後繪製，確保在最上層)
    drawTower(state.playerTower);
    drawTower(state.enemyTower);

    // 更新金幣 (基礎 3/60，每級加 0.5/60)
    let goldRate = (3 + (state.systemLevels.goldProd - 1) * 0.5) / 60;
    state.gold += goldRate;
    updateGlobalUI();

    // 敵人自動生成小兵 (2.5秒 = 150 frames at 60FPS)
    state.spawnTimer++;
    if (state.spawnTimer > 150) { 
        // 敵人 AI 邏輯
        let enemyType = 'basic';
        if (state.currentChapter === 2) {
            // 第二章：30% 機率出快速兵
            if (Math.random() < 0.3) enemyType = 'fast';
        } else if (state.currentChapter === 3) {
            // 第三章：20% 機率出重裝兵，20% 快速兵
            let r = Math.random();
            if (r < 0.2) enemyType = 'tank';
            else if (r < 0.4) enemyType = 'fast';
        }
        
        spawnUnit('enemy', enemyType);
        state.spawnTimer = 0;
    }

    // 移除死亡單位
    state.playerUnits = state.playerUnits.filter(u => u.hp > 0);
    state.enemyUnits = state.enemyUnits.filter(u => u.hp > 0);

    // 判斷勝負
    if (state.enemyTower.hp <= 0) {
        state.energy++;
        state.wesley += 100;
        saveGame(); // 勝利時存檔
        state.isPaused = true;
        document.getElementById('victory-screen').style.display = 'block';
    } else if (state.playerTower.hp <= 0) {
        state.isPaused = true;
        document.getElementById('failure-screen').style.display = 'block';
    }

    requestAnimationFrame(loop);
}

function resetGame() {
    state.gold = 20;
    
    // 套用防禦塔強化 (每級增加 10 HP)
    const towerHpBonus = (state.systemLevels.towerHP - 1) * 10;
    state.playerTower.maxHp = 100 + towerHpBonus;
    state.playerTower.hp = state.playerTower.maxHp;
    
    state.enemyTower.hp = 100;
    state.playerUnits = [];
    state.enemyUnits = [];
    state.projectiles = []; // 清空子彈
    state.spawnTimer = 0;
}

