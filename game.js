import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// 音效系統
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.connect(audioCtx.destination);
masterGain.gain.value = 0.5;

window.setGameVolume = (val) => {
    masterGain.gain.setTargetAtTime(val, audioCtx.currentTime, 0.05);
};

function playSynthSound(type, freq, duration, volume = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(g);
    g.connect(masterGain);
    g.gain.setValueAtTime(volume, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const sounds = {
    shoot: () => playSynthSound('square', 150 + Math.random() * 50, 0.1, 0.1),
    hit: () => playSynthSound('sawtooth', 100, 0.2, 0.15),
    reload: () => {
        playSynthSound('sine', 400, 0.1, 0.05);
        setTimeout(() => playSynthSound('sine', 600, 0.1, 0.05), 100);
    },
    death: () => playSynthSound('sawtooth', 50, 0.5, 0.3),
    pickup: () => playSynthSound('triangle', 880, 0.2, 0.2)
};

// 初始化場景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 0, 500);

// 獲取存檔數據 (與暱稱綁定)
const getPlayerPrefix = () => {
    return (localStorage.getItem('playerNickname') || 'guest') + '_';
};

// 遊戲狀態初始化 (提升至最上方確保全域可用)
const gameState = {
    playerHP: 250,
    maxHP: 250,
    currentSlot: 'rifle', 
    activeSlotIndex: 0,
    primaryIndex: 0,
    isZoomed: false,
    lastShotTime: 0,
    currentAmmo: {}, 
    isReloading: false,
    isFiring: false,
    wave: 1,
    kills: 0,
    xp: 0,
    level: 1,
    keys: 300,
    coins: 300,
    unlockedWeapons: ['rifle', 'pistol'],
    unlockedSkills: [],
    owned_items: [],
    equippedWeapons: ['rifle'],
    isSliding: false,
    slideTime: 0,
    lastSlideTime: 0,
    slideCooldown: 1500, 
    canJump: true,
    isMega: false,
    megaTime: 0,
    weaponKills: {},
    achievements: [],
    equippedSkills: [] // 支援多個技能
};
window.gameState = gameState;

// 延遲載入實際存檔
setTimeout(() => {
    gameState.keys = getSavedKeys();
    gameState.coins = getSavedCoins();
    gameState.kills = getSavedKills();
    gameState.xp = getSavedXP();
    gameState.level = getSavedLevel();
    gameState.unlockedWeapons = getSavedWeapons();
    gameState.unlockedSkills = getSavedSkills();
    gameState.owned_items = getSavedOwnedItems();
    gameState.weaponKills = getSavedWeaponKills();
    
    // 只有特定帳號強制給予 50 等與獎勵
    const currentNickname = localStorage.getItem('playerNickname');
    if (currentNickname === 'wesleygogo999') {
        if (!gameState.unlockedWeapons.includes('energy_rifle')) gameState.unlockedWeapons.push('energy_rifle');
        if (!gameState.unlockedSkills.includes('timestop')) gameState.unlockedSkills.push('timestop');
        gameState.level = 50;
    }
    
    saveGameProgress();
    
    console.log("Game state synchronized from storage");
}, 100);

const getSavedKeys = () => {
    const saved = localStorage.getItem(getPlayerPrefix() + 'game_keys');
    if (saved === null) return 300; // 新玩家初始給予 300 鑰匙
    const val = parseInt(saved);
    return isNaN(val) ? 300 : val;
};

const getSavedKills = () => {
    const saved = localStorage.getItem(getPlayerPrefix() + 'game_kills');
    return saved ? parseInt(saved) : 0;
};

const getSavedXP = () => {
    const saved = localStorage.getItem(getPlayerPrefix() + 'game_xp');
    return saved ? parseInt(saved) : 0;
};

const getSavedLevel = () => {
    const currentNickname = localStorage.getItem('playerNickname');
    if (currentNickname === 'wesleygogo999') return 50;
    
    const saved = localStorage.getItem(getPlayerPrefix() + 'game_level');
    return saved ? parseInt(saved) : 1;
};

const getSavedCoins = () => {
    const saved = localStorage.getItem(getPlayerPrefix() + 'game_coins');
    if (saved === null) {
        // 如果沒有 coins，嘗試從 keys 繼承，但不要反過來強制同步
        const keys = localStorage.getItem(getPlayerPrefix() + 'game_keys');
        return keys !== null ? parseInt(keys) : 300;
    }
    const val = parseInt(saved);
    return isNaN(val) ? 300 : val;
};

const getSavedOwnedItems = () => {
    try {
        const saved = localStorage.getItem(getPlayerPrefix() + 'game_owned_items');
        return saved ? JSON.parse(saved) : [];
    } catch(e) {
        return [];
    }
};

const getSavedWeaponKills = () => {
    try {
        const saved = localStorage.getItem(getPlayerPrefix() + 'game_weapon_kills');
        return saved ? JSON.parse(saved) : {};
    } catch(e) {
        return {};
    }
};

const getSavedWeapons = () => {
    try {
        const saved = localStorage.getItem(getPlayerPrefix() + 'game_unlocked_weapons');
        return saved ? JSON.parse(saved) : ['rifle', 'pistol'];
    } catch(e) {
        return ['rifle', 'pistol'];
    }
};

const getSavedSkills = () => {
    try {
        const saved = localStorage.getItem(getPlayerPrefix() + 'game_unlocked_skills');
        return saved ? JSON.parse(saved) : [];
    } catch(e) {
        return [];
    }
};

const saveGameProgress = () => {
    const prefix = getPlayerPrefix();
    const nickname = localStorage.getItem('playerNickname') || 'guest';
    
    // 存到瀏覽器本地 (備份)
    localStorage.setItem(prefix + 'game_keys', gameState.keys.toString());
    localStorage.setItem(prefix + 'game_coins', gameState.coins.toString());
    localStorage.setItem(prefix + 'game_kills', gameState.kills.toString());
    localStorage.setItem(prefix + 'game_xp', gameState.xp.toString());
    localStorage.setItem(prefix + 'game_level', gameState.level.toString());
    localStorage.setItem(prefix + 'game_unlocked_weapons', JSON.stringify(gameState.unlockedWeapons));
    localStorage.setItem(prefix + 'game_unlocked_skills', JSON.stringify(gameState.unlockedSkills));
    localStorage.setItem(prefix + 'game_owned_items', JSON.stringify(gameState.owned_items));
    localStorage.setItem(prefix + 'game_weapon_kills', JSON.stringify(gameState.weaponKills));
    
    // 存到伺服器 (核心)
    if (window.socket) {
        window.socket.emit('saveProgress', {
            nickname: nickname,
            keys: gameState.keys,
            coins: gameState.coins,
            kills: gameState.kills,
            xp: gameState.xp,
            level: gameState.level,
            unlockedWeapons: gameState.unlockedWeapons,
            unlockedSkills: gameState.unlockedSkills,
            owned_items: gameState.owned_items,
            weaponKills: gameState.weaponKills
        });
    }
};
window.saveGameProgress = saveGameProgress;

// 檢查成就
const checkAchievements = () => {
    const nickname = localStorage.getItem('playerNickname') || 'guest';
    
    const weaponCategories = {
        rifle: 'primary', sniper: 'primary', shotgun: 'primary', paintball: 'primary',
        machinegun: 'primary', rpg: 'primary', flamethrower: 'primary', glass: 'primary',
        pistol: 'secondary', knife: 'secondary', energy: 'secondary'
    };

    Object.keys(gameState.weaponKills).forEach(weaponId => {
        const killCount = gameState.weaponKills[weaponId];
        const category = weaponCategories[weaponId] || 'primary';
        const threshold = (category === 'primary') ? 100 : 50;
        const achievementId = `gold_${weaponId}`;
        
        if (killCount >= threshold && !gameState.achievements.includes(achievementId)) {
            const weaponName = weaponConfig[weaponId] ? weaponConfig[weaponId].name : weaponId;
            unlockAchievement(achievementId, `黃金雕像: ${weaponName}`, `解鎖 ${weaponName} 專屬擊殺特效 (1:1 金色雕像)`);
        }
    });

    // 累積擊殺成就
    if (gameState.kills >= 500 && !gameState.achievements.includes('slayer_500')) {
        unlockAchievement('slayer_500', '傳奇獵人', '累計擊殺 500 名敵人');
    }
    
    // 如果 UI 已經開啟，即時更新介面
    if (window.updateAchievementsUI) window.updateAchievementsUI();
};
window.checkAchievements = checkAchievements;

const unlockAchievement = (id, title, desc) => {
    if (gameState.achievements.includes(id)) return;
    
    gameState.achievements.push(id);
    const nickname = localStorage.getItem('playerNickname') || 'guest';
    
    if (socket) {
        socket.emit('unlockAchievement', { nickname, achievementId: id });
    }
    
    // 顯示通知
    showAchievementPopup(title, desc);
    
    // 存到本地備份
    localStorage.setItem(getPlayerPrefix() + 'game_achievements', JSON.stringify(gameState.achievements));
};

const spawnGoldenStatue = (position, quaternion) => {
    // 建立一個金色材質
    const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 1.0,
        roughness: 0.1,
        emissive: 0xaa8800,
        emissiveIntensity: 0.2
    });

    // 建立一個簡單的雕像 (使用原始模型結構，但全部換成金色)
    const statue = new THREE.Group();
    
    // 身體
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), goldMat);
    body.position.y = 0.7;
    statue.add(body);
    
    // 頭
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25), goldMat);
    head.position.y = 1.3;
    statue.add(head);

    // 手腳 (簡化版)
    const limbGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const lArm = new THREE.Mesh(limbGeo, goldMat);
    lArm.position.set(-0.4, 0.7, 0); statue.add(lArm);
    const rArm = new THREE.Mesh(limbGeo, goldMat);
    rArm.position.set(0.4, 0.7, 0); statue.add(rArm);
    
    statue.position.copy(position);
    statue.quaternion.copy(quaternion);
    
    scene.add(statue);
    
    // 3秒後消失
    setTimeout(() => {
        let opacity = 1.0;
        const fade = setInterval(() => {
            opacity -= 0.1;
            statue.traverse(node => {
                if (node.isMesh) {
                    node.material.transparent = true;
                    node.material.opacity = opacity;
                }
            });
            if (opacity <= 0) {
                clearInterval(fade);
                scene.remove(statue);
            }
        }, 100);
    }, 2000);
};

const showLevelUpPopup = (level) => {
    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.5);
        background: rgba(0, 40, 40, 0.95); border: 3px solid #00ffff;
        color: white; padding: 30px; border-radius: 20px; z-index: 20000;
        text-align: center; box-shadow: 0 0 50px rgba(0, 255, 255, 0.5);
        transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        opacity: 0; pointer-events: none;
    `;
    popup.innerHTML = `
        <div style="font-size: 14px; letter-spacing: 4px; color: #00ffff; margin-bottom: 10px;">LEVEL UP</div>
        <div style="font-size: 48px; font-weight: 900; text-shadow: 0 0 20px #00ffff;">LV.${level}</div>
        <div style="margin-top: 15px; font-size: 12px; opacity: 0.8;">${level === 50 ? 'LEGENDARY REWARDS UNLOCKED' : 'NEW CAPACITY UNLOCKED'}</div>
    `;
    document.body.appendChild(popup);

    setTimeout(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 100);
    
    // 50 級特殊獎勵
    if (level === 50) {
        if (!gameState.unlockedWeapons.includes('energy_rifle')) {
            gameState.unlockedWeapons.push('energy_rifle');
        }
        if (!gameState.unlockedSkills.includes('timestop')) {
            gameState.unlockedSkills.push('timestop');
        }
        setTimeout(() => alert("恭喜達成 50 級！已解鎖傳奇武器：能量步槍 & 終極技能：時間暫停！"), 500);
    }

    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transform = 'translate(-50%, -50%) scale(1.5)';
        setTimeout(() => popup.remove(), 500);
    }, 3000);

    // 升級獎勵
    gameState.keys += 100;
    saveGameProgress();
    updateUI();
};

const showAchievementPopup = (title, desc) => {
    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed; top: 20px; right: -320px; width: 280px;
        background: rgba(0, 30, 30, 0.95); border: 2px solid #ffff00;
        color: white; padding: 15px; border-radius: 12px; z-index: 10000;
        transition: right 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 0 30px rgba(255, 221, 0, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        display: flex; flex-direction: column; gap: 4px;
    `;
    popup.innerHTML = `
        <div style="color: #ffff00; font-weight: 900; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">🏆 Achievement Unlocked</div>
        <div style="font-size: 18px; font-weight: 900; background: linear-gradient(90deg, #ffff00, #ffffff, #ffaa00); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 10px rgba(255,215,0,0.3);">${title}</div>
        <div style="font-size: 12px; color: #ccc; line-height: 1.4;">${desc}</div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => { popup.style.right = '20px'; }, 100);
    setTimeout(() => {
        popup.style.right = '-300px';
        setTimeout(() => popup.remove(), 500);
    }, 5000);
    
    if (sounds.pickup) sounds.pickup();
};

// 移除原本的靜態技能初始化，改由 setEquippedSkill 控管
// if (gameState.unlockedSkills.includes('shield')) { ... }
// if (gameState.unlockedSkills.includes('shadow')) { ... }

// 武器定義
const weaponConfig = {
    rifle: { 
        name: '自動步槍', 
        slot: 0, 
        damage: 30, 
        fireRate: 100, 
        color: 0x555555, 
        size: [0.1, 0.2, 0.8], 
        pos: [0.3, -0.3, -0.6], 
        adsPos: [0, -0.15, -0.4], 
        spread: 0.02, 
        ammo: 40, 
        reloadTime: 1200,
        canZoom: true,
        type: 'rifle'
    },
    knife: {
        name: '軍用匕首',
        slot: 1,
        damage: 15,
        fireRate: 400,
        color: 0x888888,
        size: [0.05, 0.1, 0.4],
        pos: [0.4, -0.4, -0.5],
        spread: 0,
        ammo: Infinity,
        type: 'melee',
        cost: 50
    },
    sniper: {
        name: '狙擊步槍',
        slot: 2,
        damage: 150,
        fireRate: 1500,
        color: 0x223322,
        size: [0.1, 0.15, 1.2],
        pos: [0.3, -0.3, -0.8],
        adsPos: [0, -0.12, -0.6],
        spread: 0,
        ammo: 5,
        reloadTime: 2500,
        canZoom: true,
        type: 'rifle',
        cost: 200
    },
    shotgun: {
        name: '散彈槍',
        slot: 3,
        damage: 15,
        fireRate: 800,
        color: 0x333333,
        size: [0.15, 0.15, 0.7],
        pos: [0.3, -0.3, -0.5],
        spread: 0.15,
        ammo: 8,
        reloadTime: 1800,
        type: 'shotgun',
        cost: 100
    },
    pistol: {
        name: '手槍',
        slot: 4,
        damage: 20,
        fireRate: 250,
        color: 0x222222,
        size: [0.06, 0.12, 0.25],
        pos: [0.3, -0.2, -0.4],
        spread: 0.01,
        ammo: 15,
        reloadTime: 1000,
        type: 'pistol',
        cost: 30
    },
    paintball: {
        name: '漆彈槍 (BOSS同款)',
        slot: 5,
        damage: 25,
        fireRate: 80,
        color: 0xff00ff,
        size: [0.12, 0.2, 0.5],
        pos: [0.3, -0.3, -0.5],
        spread: 0.05,
        ammo: 100,
        reloadTime: 1200,
        type: 'paintball',
        cost: 150
    },
    energy_rifle: {
        name: '傳奇能量步槍',
        slot: 11,
        damage: 20,
        fireRate: 1000,
        color: 0x00ffff,
        size: [0.1, 0.2, 1.2],
        pos: [0.3, -0.3, -0.7],
        spread: 0,
        ammo: Infinity,
        reloadTime: 0,
        type: 'rifle',
        isLegendary: true,
        bounces: true
    },
    rpg: {
        name: '火箭推進榴彈 (RPG)',
        slot: 7,
        damage: 300,
        fireRate: 2000,
        color: 0x556622,
        size: [0.18, 0.18, 1.2],
        pos: [0.35, -0.2, -0.7],
        spread: 0.01,
        ammo: 1,
        reloadTime: 2500,
        type: 'rifle',
        cost: 400
    },
    flamethrower: {
        name: '地獄火噴火器',
        slot: 8,
        damage: 8,
        fireRate: 40,
        color: 0xff4500,
        size: [0.2, 0.3, 0.8],
        pos: [0.3, -0.4, -0.5],
        isBurn: true,
        spread: 0.1,
        ammo: 200,
        reloadTime: 2000,
        type: 'rifle',
        cost: 350
    },
    energy: {
        name: '誠諒手槍',
        slot: 9,
        damage: 3,
        fireRate: 10,
        color: 0x00ffff,
        size: [0.08, 0.12, 0.3],
        pos: [0.3, -0.2, -0.4],
        spread: 0,
        ammo: Infinity,
        type: 'pistol',
        cost: 150
    },
    glass: {
        name: '玻璃槍',
        slot: 10,
        damage: 1000000000,
        fireRate: 3000,
        color: 0xffffff,
        size: [0.1, 0.1, 1.5],
        pos: [0.3, -0.3, -0.8],
        spread: 0,
        ammo: 1000,
        reloadTime: 5000,
        type: 'rifle',
        cost: 10000
    }
};

const weaponSlots = [
    ['rifle', 'knife', 'sniper', 'shotgun', 'pistol', 'paintball', 'machinegun', 'rpg', 'flamethrower', 'energy', 'glass']
];

const items = []; // 存放血包與掉落物
const GRAVITY = 30.0;
const JUMP_FORCE = 12.0;
let canSpawnWave = true;

// 初始化各武器彈藥
Object.keys(weaponConfig).forEach(id => {
    gameState.currentAmmo[id] = weaponConfig[id].ammo;
});

// 連線機制
const socket = typeof io !== 'undefined' ? io() : null;
const otherPlayers = {};

if (socket) {
    socket.on('currentPlayers', (players) => {
        Object.keys(players).forEach((id) => {
            if (id !== socket.id) addOtherPlayer(players[id]);
        });
    });

    socket.on('newPlayer', (playerInfo) => {
        addOtherPlayer(playerInfo);
    });

    socket.on('playerMoved', (playerInfo) => {
        if (otherPlayers[playerInfo.id]) {
            // 更新目標位置與旋轉，由 animate 進行平滑插值
            otherPlayers[playerInfo.id].userData.targetPosition.set(playerInfo.position.x, playerInfo.position.y - 0.8, playerInfo.position.z);
            otherPlayers[playerInfo.id].userData.targetRotationY = playerInfo.rotation.y;
        }
    });

    socket.on('playerFired', (data) => {
        const start = new THREE.Vector3(data.start.x, data.start.y, data.start.z);
        const end = new THREE.Vector3(data.end.x, data.end.y, data.end.z);
        
        if (data.isBurn) {
            createFlame(start, end);
        } else {
            createTracer(start, end, data.color);
        }
    });

    socket.on('hpUpdate', (data) => {
        if (data.id === socket.id) {
            gameState.playerHP = data.hp;
            updateUI();
        } else if (otherPlayers[data.id]) {
            updateOtherPlayerHP(data.id, data.hp);
        }
    });

    socket.on('playerDeath', (data) => {
        updateLeaderboard(data.players);
        if (data.victimId === socket.id) {
            alert(data.killerId === socket.id ? "你自殺了！" : "你被玩家 " + data.killerId.substr(0,4) + " 擊敗了！");
            gameState.playerHP = 250;
            camera.position.set(0, 1.6, 0); // 復活位置
            updateUI();
        } else {
            console.log("玩家 " + data.victimId.substr(0,4) + " 死亡");
        }
    });

    socket.on('playerDisconnected', (id) => {
        if (otherPlayers[id]) {
            scene.remove(otherPlayers[id]);
            delete otherPlayers[id];
        }
    });

    socket.on('loginSuccess', (response) => {
        const data = response.data;
        if (data) {
            console.log("Login sync success:", data);
            gameState.keys = data.keys || 300;
            gameState.coins = data.coins || data.keys || 300;
            gameState.kills = data.total_kills || data.kills || 0;
            gameState.xp = data.xp || 0;
            gameState.level = data.level || 1;
            gameState.unlockedWeapons = data.unlockedWeapons || data.unlockedweapons || ['rifle', 'pistol'];
            gameState.unlockedSkills = data.unlockedSkills || data.unlockedskills || [];
            gameState.owned_items = data.owned_items || [];
            gameState.weaponKills = data.weaponKills || data.weapon_kills || {};
            
            socket.emit('getAchievements', data.nickname);
            const prefix = getPlayerPrefix();
            localStorage.setItem(prefix + 'game_keys', gameState.keys.toString());
            localStorage.setItem(prefix + 'game_coins', gameState.coins.toString());
            localStorage.setItem(prefix + 'game_kills', gameState.kills.toString());
            localStorage.setItem(prefix + 'game_xp', gameState.xp.toString());
            localStorage.setItem(prefix + 'game_level', gameState.level.toString());
            localStorage.setItem(prefix + 'game_unlocked_weapons', JSON.stringify(gameState.unlockedWeapons));
            localStorage.setItem(prefix + 'game_unlocked_skills', JSON.stringify(gameState.unlockedSkills));
            localStorage.setItem(prefix + 'game_owned_items', JSON.stringify(gameState.owned_items));
            localStorage.setItem(prefix + 'game_weapon_kills', JSON.stringify(gameState.weaponKills));
            
            updateUI();
            checkAchievements(); // 登入後立即檢查所有漏掉的成就
            if (window.updateShopUI) window.updateShopUI();
            if (window.updateLoadoutUI) window.updateLoadoutUI();
        }
    });

    socket.on('achievementsList', (list) => {
        gameState.achievements = list.map(a => a.achievement_id);
        localStorage.setItem(getPlayerPrefix() + 'game_achievements', JSON.stringify(gameState.achievements));
        if (window.updateAchievementsUI) window.updateAchievementsUI();
    });
}

function updateLeaderboard(players) {
    const list = document.getElementById('score-list');
    if (!list) return;
    list.innerHTML = '';
    Object.values(players)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .forEach(p => {
            const div = document.createElement('div');
            div.className = 'score-item';
            const name = p.id === socket.id ? '你' : p.id.substr(0, 4);
            div.innerHTML = `<span>${name}</span> <span>${p.score}</span>`;
            list.appendChild(div);
        });
}

function updateOtherPlayerHP(id, hp) {
    const group = otherPlayers[id];
    if (!group) return;
    const hpBarFill = group.getObjectByName("hpBarFill");
    if (hpBarFill) {
        const hpPercent = Math.max(0, hp / 250);
        hpBarFill.scale.x = hpPercent;
        hpBarFill.position.x = (hpPercent - 1) * 0.5;
    }
}

function addOtherPlayer(playerInfo) {
    const group = new THREE.Group();
    
    // 建立角色模型組 (包含身體、頭、手腳)
    const model = new THREE.Group();
    group.add(model);

    // 身體
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), new THREE.MeshStandardMaterial({ color: 0x0000ff }));
    body.position.y = 0.7;
    body.userData = { type: 'body', parent: group, isPlayer: true, playerId: playerInfo.id };
    model.add(body);
    
    // 頭部
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25), new THREE.MeshStandardMaterial({ color: 0xffccaa }));
    head.position.y = 1.3;
    head.userData = { type: 'head', parent: group, isPlayer: true, playerId: playerInfo.id };
    model.add(head);

    // 簡單的手 (用於動畫)
    const armGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.4, 0.7, 0);
    model.add(leftArm);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.4, 0.7, 0);
    model.add(rightArm);

    // 簡單的腳 (用於動畫)
    const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const leftLeg = new THREE.Mesh(legGeo, armMat);
    leftLeg.position.set(-0.15, 0.3, 0);
    model.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, armMat);
    rightLeg.position.set(0.15, 0.3, 0);
    model.add(rightLeg);

    // 血量條
    const hpBarBgGeo = new THREE.PlaneGeometry(1, 0.1);
    const hpBarBgMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const hpBarBg = new THREE.Mesh(hpBarBgGeo, hpBarBgMat);
    hpBarBg.position.y = 1.8;
    hpBarBg.name = "hpBarBg";
    group.add(hpBarBg);

    const hpBarFillGeo = new THREE.PlaneGeometry(1, 0.1);
    const hpBarFillMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const hpBarFill = new THREE.Mesh(hpBarFillGeo, hpBarFillMat);
    hpBarFill.position.z = 0.01;
    hpBarFill.name = "hpBarFill";
    hpBarBg.add(hpBarFill);
    
    group.position.set(playerInfo.position.x, playerInfo.position.y - 0.8, playerInfo.position.z);
    
    // 初始化玩家數據
    group.userData = {
        targetPosition: new THREE.Vector3().copy(group.position),
        targetRotationY: 0,
        walkCycle: 0,
        isMoving: false,
        leftArm: leftArm,
        rightArm: rightArm,
        leftLeg: leftLeg,
        rightLeg: rightLeg,
        model: model
    };

    scene.add(group);
    otherPlayers[playerInfo.id] = group;
}

const enemies = [];
const obstacles = [];
const mixers = [];
const raycaster = new THREE.Raycaster();
let enemyModel = null;
let enemyAnimations = [];

// 初始化攝影機
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.6;

// 渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.display = 'block'; // 避免底部空白導致中心偏移
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, renderer.domElement);
window.controls = controls;

// 光照
const light = new THREE.HemisphereLight(0xffffff, 0x444444, 2.0);
scene.add(light);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(100, 100, 50);
dirLight.castShadow = true;
scene.add(dirLight);

// 地面 (加入網格質感)
const MAP_SIZE = 120; 
const floorGeometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
floorGeometry.rotateX(-Math.PI / 2);

// 建立網格紋理 (Sci-Fi 風格)
const canvas = document.createElement('canvas');
canvas.width = 256;
canvas.height = 256;
const ctx = canvas.getContext('2d');
// 背景
ctx.fillStyle = '#1a1a1a';
ctx.fillRect(0, 0, 256, 256);
// 外框
ctx.strokeStyle = '#333333';
ctx.lineWidth = 10;
ctx.strokeRect(0, 0, 256, 256);
// 內部發光線條
ctx.strokeStyle = '#00ffff';
ctx.lineWidth = 2;
ctx.globalAlpha = 0.3;
ctx.beginPath();
ctx.moveTo(128, 0); ctx.lineTo(128, 256);
ctx.moveTo(0, 128); ctx.lineTo(256, 128);
ctx.stroke();
ctx.globalAlpha = 1.0;

const floorTexture = new THREE.CanvasTexture(canvas);
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(MAP_SIZE / 20, MAP_SIZE / 20);

const floorMaterial = new THREE.MeshStandardMaterial({ 
    map: floorTexture,
    roughness: 0.2,
    metalness: 0.8
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
scene.add(floor);

// 地圖邊界圍欄 (加入發光質感)
function createBoundaries() {
    const wallHeight = 15;
    const wallThickness = 2;
    const wallMat = new THREE.MeshStandardMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.2,
        emissive: 0x00ffff,
        emissiveIntensity: 0.5
    });
    
    // 四面牆
    const sides = [
        { pos: [0, wallHeight/2, MAP_SIZE/2], size: [MAP_SIZE, wallHeight, wallThickness] }, // 前
        { pos: [0, wallHeight/2, -MAP_SIZE/2], size: [MAP_SIZE, wallHeight, wallThickness] }, // 後
        { pos: [MAP_SIZE/2, wallHeight/2, 0], size: [wallThickness, wallHeight, MAP_SIZE] }, // 右
        { pos: [-MAP_SIZE/2, wallHeight/2, 0], size: [wallThickness, wallHeight, MAP_SIZE] }  // 左
    ];

    sides.forEach(s => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(...s.size), wallMat);
        wall.position.set(...s.pos);
        scene.add(wall);
        obstacles.push(wall); // 將邊界牆加入障礙物列表，確保能被子彈射中
    });
}
createBoundaries();

// 環境 (清空障礙物)
function createEnvironment() {
    // 移除所有障礙物與裝飾
}
createEnvironment();

function spawnHealthPack(pos) {
    const isMega = Math.random() < 0.2; // 20% 機率是綠色變大藥水
    const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const mat = new THREE.MeshStandardMaterial({ 
        color: isMega ? 0x00ff00 : 0xffffff, // 變大藥水綠色，血包白色
        emissive: isMega ? 0x00ff00 : 0xff0000, // 血包發紅光
        emissiveIntensity: 0.5
    });
    const pack = new THREE.Mesh(geo, mat);
    
    // 如果是血包，加一個紅十字視覺
    if (!isMega) {
        const crossGeo = new THREE.BoxGeometry(0.7, 0.15, 0.15);
        const crossMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const h = new THREE.Mesh(crossGeo, crossMat);
        const v = new THREE.Mesh(crossGeo, crossMat);
        v.rotation.z = Math.PI / 2;
        pack.add(h);
        pack.add(v);
    }

    pack.position.copy(pos);
    pack.position.y = 0.5;
    if (isMega) pack.scale.set(1.5, 1.5, 1.5);
    pack.userData = { type: isMega ? 'mega' : 'health' };
    scene.add(pack);
    items.push(pack);
}

function spawnWave() {
    if (!canSpawnWave) return;
    canSpawnWave = false;
    
    // 每波固定 5 個普通小兵 (原為 10)
    const normalCount = 5;
    
    // 從第 2 波開始加入特種兵，每波增加 1 個，最大 4 個 (原為 8)
    let eliteCount = 0;
    if (gameState.wave >= 2) {
        eliteCount = Math.min(4, 1 + (gameState.wave - 2));
    }

    // 第 5 波加入 BOSS
    const hasBoss = gameState.wave === 5;

    // 生成普通兵
    for (let i = 0; i < normalCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = (MAP_SIZE / 2) * 0.5 + Math.random() * 5; 
        createEnemy(Math.cos(angle) * dist, Math.sin(angle) * dist);
    }

    // 生成特種兵
    for (let i = 0; i < eliteCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = (MAP_SIZE / 2) * 0.5 + Math.random() * 5; 
        createEnemy(Math.cos(angle) * dist, Math.sin(angle) * dist, 'elite');
    }

    // 生成 BOSS
    if (hasBoss) {
        createEnemy(0, 40, 'boss');
        const bossWarning = document.createElement('div');
        bossWarning.style.position = 'absolute';
        bossWarning.style.top = '30%';
        bossWarning.style.left = '50%';
        bossWarning.style.transform = 'translate(-50%, -50%)';
        bossWarning.style.color = '#ffff00';
        bossWarning.style.fontSize = '64px';
        bossWarning.style.fontWeight = 'bold';
        bossWarning.style.textShadow = '0 0 20px red';
        bossWarning.innerText = `BOSS 出現了！`;
        document.body.appendChild(bossWarning);
        setTimeout(() => document.body.removeChild(bossWarning), 3000);
    }

    const waveText = document.createElement('div');
    waveText.style.position = 'absolute';
    waveText.style.top = '20%';
    waveText.style.left = '50%';
    waveText.style.transform = 'translate(-50%, -50%)';
    waveText.style.color = '#ff0000';
    waveText.style.fontSize = '48px';
    waveText.style.fontWeight = 'bold';
    waveText.innerText = `第 ${gameState.wave} 波開始！`;
    document.body.appendChild(waveText);
    setTimeout(() => document.body.removeChild(waveText), 2000);
}

// 武器
const weaponGroup = new THREE.Group();
camera.add(weaponGroup);

// 第一人稱手腳
const limbGroup = new THREE.Group();
camera.add(limbGroup);

const armMat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
const armGeo = new THREE.BoxGeometry(0.12, 0.12, 0.6);

// 左手
const leftArm = new THREE.Mesh(armGeo, armMat);
leftArm.position.set(-0.4, -0.4, -0.3);
leftArm.rotation.y = 0.2;
limbGroup.add(leftArm);

// 右手 (握槍手)
const rightArm = new THREE.Mesh(armGeo, armMat);
rightArm.position.set(0.4, -0.4, -0.3);
rightArm.rotation.y = -0.2;
limbGroup.add(rightArm);

// 腳 (僅在低頭或滑行時較明顯)
const legGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
const leftLeg = new THREE.Mesh(legGeo, armMat);
leftLeg.position.set(-0.25, -1.5, 0.2);
limbGroup.add(leftLeg);

const rightLeg = new THREE.Mesh(legGeo, armMat);
rightLeg.position.set(0.25, -1.5, 0.2);
limbGroup.add(rightLeg);

scene.add(camera);
let currentWeaponMesh = null;

function createRifleModel() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2c2a }); // 木質槍托/握把顏色

    // 槍身 (Main body)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.6), mat);
    group.add(body);

    // 槍管 (Barrel)
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5), mat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.5;
    group.add(barrel);

    // 槍托 (Stock)
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.3), woodMat);
    stock.position.z = 0.4;
    stock.position.y = -0.02;
    group.add(stock);

    // 握把 (Grip)
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.08), woodMat);
    grip.position.y = -0.15;
    grip.position.z = 0.15;
    grip.rotation.x = -0.2;
    group.add(grip);

    // 彈匣 (Magazine)
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.12), mat);
    mag.position.y = -0.18;
    mag.position.z = -0.15;
    mag.rotation.x = 0.1;
    group.add(mag);

    // 瞄準具 (Sight)
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.1), mat);
    sight.position.y = 0.12;
    sight.position.z = -0.2;
    group.add(sight);

    return group;
}

function switchWeapon(id) {
    if (!gameState.unlockedWeapons.includes(id)) return;
    gameState.currentSlot = id;
    const config = weaponConfig[id];
    gameState.activeSlotIndex = config.slot;
    
    if (currentWeaponMesh) weaponGroup.remove(currentWeaponMesh);
    
    // 根據 ID 建立不同的 3D 模型
    if (id === 'rifle') {
        currentWeaponMesh = createRifleModel();
    } else if (id === 'sniper') {
        // 簡單的狙擊槍模型
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x223322 });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0), mat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = -0.5;
        group.add(barrel);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.5), mat);
        group.add(body);
        currentWeaponMesh = group;
    } else if (id === 'knife') {
        const geo = new THREE.BoxGeometry(0.02, 0.08, 0.4);
        const mat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9 });
        currentWeaponMesh = new THREE.Mesh(geo, mat);
    } else if (id === 'shotgun') {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), mat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = -0.3;
        group.add(barrel);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.4), mat);
        group.add(body);
        currentWeaponMesh = group;
    } else if (id === 'pistol') {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2), mat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = -0.1;
        group.add(barrel);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.15), mat);
        group.add(body);
        currentWeaponMesh = group;
    } else if (id === 'machinegun') {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), mat);
        barrel.rotation.x = Math.PI / 2; barrel.position.z = -0.4;
        group.add(barrel);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.4), mat);
        group.add(body);
        currentWeaponMesh = group;
    } else if (id === 'rpg') {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x334422 });
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0), mat);
        tube.rotation.x = Math.PI / 2; tube.position.z = -0.3;
        group.add(tube);
        const rocket = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2), new THREE.MeshStandardMaterial({color: 0x666666}));
        rocket.rotation.x = Math.PI / 2; rocket.position.z = -0.9;
        group.add(rocket);
        currentWeaponMesh = group;
    } else if (id === 'flamethrower') {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xaa4400 });
        const tank = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.2), mat);
        group.add(tank);
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.5), mat);
        nozzle.rotation.x = Math.PI / 2; nozzle.position.z = -0.4;
        group.add(nozzle);
        currentWeaponMesh = group;
    } else if (id === 'energy_rifle') {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x004444, metalness: 0.9, roughness: 0.1 });
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2 });
        
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.8), bodyMat);
        group.add(body);
        
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6), coreMat);
        core.rotation.x = Math.PI / 2;
        core.position.z = -0.1;
        group.add(core);
        
        const ringGeo = new THREE.TorusGeometry(0.06, 0.01, 8, 16);
        for(let i=0; i<3; i++) {
            const ring = new THREE.Mesh(ringGeo, coreMat);
            ring.position.z = -0.2 - i*0.2;
            group.add(ring);
        }
        currentWeaponMesh = group;
    } else if (id === 'paintball') {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xff00ff });
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2), mat);
        tank.position.y = 0.1;
        group.add(tank);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4), mat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = -0.2;
        group.add(barrel);
        currentWeaponMesh = group;
    } else {
        const geo = new THREE.BoxGeometry(...config.size);
        const mat = new THREE.MeshStandardMaterial({ color: config.color });
        currentWeaponMesh = new THREE.Mesh(geo, mat);
    }

    currentWeaponMesh.position.set(...config.pos);
    weaponGroup.add(currentWeaponMesh);
    if (gameState.isZoomed) toggleZoom(false);
    const weaponNameText = document.getElementById('current-weapon');
    if (weaponNameText) weaponNameText.innerText = config.name;
    updateUI();
}

window.unlockWeapon = (id) => {
    const config = weaponConfig[id];
    if (!config || gameState.unlockedWeapons.includes(id)) return false;
    const price = config.cost || 0;
    if (gameState.coins >= price) {
        gameState.coins -= price;
        gameState.keys = gameState.coins; // 同步 keys
        gameState.unlockedWeapons.push(id);
        if (!gameState.owned_items.includes(id)) {
            gameState.owned_items.push(id);
        }
        saveGameProgress(); // 解鎖時存檔
        updateUI();
        sounds.pickup();
        if (window.updateShopUI) window.updateShopUI();
        return true;
    }
    return false;
};

window.getUnlockedWeapons = () => gameState.unlockedWeapons;
window.getUnlockedSkills = () => gameState.unlockedSkills;

// 敵人
function createEnemy(x, z, type = 'normal') {
    const group = new THREE.Group();
    const isElite = type === 'elite';
    const isBoss = type === 'boss';
    
    // 建立一個容器用來放置模型或佔位符，方便之後替換
    const modelContainer = new THREE.Group();
    modelContainer.name = "modelContainer";
    group.add(modelContainer);

    // 建立佔位符
    const placeholder = createPlaceholder(type);
    modelContainer.add(placeholder);

    // 如果模型已就緒，直接替換
    if (enemyModel) {
        applyModelToGroup(modelContainer, type);
    }

    const hitBoxScale = isBoss ? 5 : 1;
    const hitBoxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    // 將碰撞箱寬度從 0.8 提升至 1.0，提升命中手感
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(1.0 * hitBoxScale, 1.6 * hitBoxScale, 1.0 * hitBoxScale), hitBoxMat);
    hitBox.position.y = 0.8 * hitBoxScale;
    hitBox.userData = { type: 'body', parent: group };
    group.add(hitBox);
    
    // 建立血量條容器
    const hpBarBgGeo = new THREE.PlaneGeometry(1 * hitBoxScale, 0.1);
    const hpBarBgMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const hpBarBg = new THREE.Mesh(hpBarBgGeo, hpBarBgMat);
    hpBarBg.position.y = 2.0 * hitBoxScale; 
    hpBarBg.name = "hpBarBg";
    group.add(hpBarBg);

    const hpBarFillGeo = new THREE.PlaneGeometry(1 * hitBoxScale, 0.1);
    const hpBarFillMat = new THREE.MeshBasicMaterial({ color: isBoss ? 0xff00ff : 0x00ff00 });
    const hpBarFill = new THREE.Mesh(hpBarFillGeo, hpBarFillMat);
    hpBarFill.position.z = 0.01; 
    hpBarFill.name = "hpBarFill";
    hpBarBg.add(hpBarFill);

    group.position.set(x, 0, z);
    
    // 數值設定
    let enemyData;
    if (isBoss) {
        enemyData = {
            hp: 1000, maxHP: 1000, 
            lastAttackTime: 0, 
            attackRange: 80, 
            attackDamage: 15,
            type: 'boss',
            weaponType: 'paintball',
            ammo: 16,
            currentAmmo: 16,
            reloadTime: 2000,
            isReloading: false
        };
        group.scale.set(5, 5, 5);
    } else if (isElite) {
        enemyData = {
            hp: 200, maxHP: 200, 
            lastAttackTime: 0, 
            attackRange: 50, 
            attackDamage: 3,
            type: 'elite',
            weaponType: ['machinegun', 'flamethrower', 'rpg'][Math.floor(Math.random() * 3)],
            lastShotTime: 0
        };
    } else {
        enemyData = {
            hp: 150, maxHP: 150, 
            lastAttackTime: 0, 
            attackRange: 40, 
            attackDamage: 1,
            type: 'normal'
        };
    }
    
    group.userData = { ...enemyData, burnTicks: 0, lastBurnTime: 0 };
    
    scene.add(group);
    enemies.push(group);
}

function createPlaceholder(type) {
    const p = new THREE.Group();
    let color = 0x0000ff; // 普通敵人改為藍色
    if (type === 'elite') color = 0x00ffff; // 精英改為青藍色
    if (type === 'boss') color = 0x00008b; // BOSS 改為深藍色
    
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.4), new THREE.MeshStandardMaterial({ color: color }));
    body.position.y = 0.8;
    p.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25), new THREE.MeshStandardMaterial({ color: 0xffccaa }));
    head.position.y = 1.5;
    p.add(head);
    return p;
}

function applyModelToGroup(container, type) {
    container.clear();
    const model = enemyModel.clone();
    
    if (type === 'elite') {
        model.traverse(node => {
            if (node.isMesh) node.material.color.setHex(0x00ffff); // 精英藍
        });
    } else if (type === 'boss') {
        model.traverse(node => {
            if (node.isMesh) node.material.color.setHex(0x00008b); // 深藍
        });
    } else {
        model.traverse(node => {
            if (node.isMesh) node.material.color.setHex(0x0000ff); // 普通藍
        });
    }

    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 1.6 / (size.y || 1);
    model.scale.set(scale, scale, scale);
    model.position.y = -box.min.y * scale;
    container.add(model);

    if (enemyAnimations && enemyAnimations.length > 0) {
        const mixer = new THREE.AnimationMixer(model);
        const clip = THREE.AnimationClip.findByName(enemyAnimations, 'Walking') || 
                     THREE.AnimationClip.findByName(enemyAnimations, 'Idle') || 
                     enemyAnimations[0];
        mixer.clipAction(clip).play();
        mixers.push(mixer);
    }
}

const loader = new GLTFLoader();
// 設定 Draco 解碼器 (修正模型無法解壓縮的問題)
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
loader.setDRACOLoader(dracoLoader);

const modelUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/RobotExpressive/RobotExpressive.glb'; 

// 顯示載入中
const loadingText = document.createElement('div');
loadingText.style.position = 'absolute';
loadingText.style.top = '50%';
loadingText.style.left = '50%';
loadingText.style.color = 'white';
loadingText.style.fontSize = '20px';
loadingText.style.fontFamily = 'Arial, sans-serif';
loadingText.style.transform = 'translate(-50%, -50%)';
loadingText.style.textAlign = 'center';
loadingText.innerText = '正在部署戰鬥機器人...\n(若卡住請確認網路連線)';
document.body.appendChild(loadingText);

loader.load(modelUrl, (gltf) => {
    enemyModel = gltf.scene;
    enemyAnimations = gltf.animations;
    if (loadingText.parentNode) document.body.removeChild(loadingText);
    
    // 更新所有已存在的敵人
    enemies.forEach(enemy => {
        const container = enemy.getObjectByName("modelContainer");
        if (container) applyModelToGroup(container, enemy.userData.type);
    });

    // 如果還沒有敵人，就生成一些
    if (enemies.length === 0) {
        for (let i = 0; i < 5; i++) {
            createEnemy((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60);
        }
    }
}, (xhr) => {
    const percent = Math.round((xhr.loaded / xhr.total) * 100);
    if (!isNaN(percent)) loadingText.innerText = `模型載入中: ${percent}%`;
}, (error) => {
    console.error('模型載入失敗詳情:', error);
    loadingText.style.color = '#ff4444';
    loadingText.innerText = '模型載入失敗 (可能是 CORS 或網路問題)\n已啟動備用機甲模式';
    setTimeout(() => { if(loadingText.parentNode) document.body.removeChild(loadingText); }, 3000);
    
    if (enemies.length === 0) {
        for (let i = 0; i < 5; i++) createEnemy((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60);
    }
});

// 控制
const welcomeScreen = document.getElementById('welcome-screen');
const startBtn = document.getElementById('start-game-btn');

controls.addEventListener('lock', () => {
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    const backBtn = document.getElementById('back-to-menu-btn');
    if (backBtn) backBtn.style.display = 'none';
    const navbar = document.getElementById('game-navbar');
    if (navbar) navbar.style.display = 'none';
});

controls.addEventListener('unlock', () => {
    if (welcomeScreen) welcomeScreen.style.display = 'flex';
    const backBtn = document.getElementById('back-to-menu-btn');
    if (backBtn) backBtn.style.display = 'block';
    const navbar = document.getElementById('game-navbar');
    if (navbar) navbar.style.display = 'flex';
    if (startBtn) startBtn.innerText = '點擊繼續遊戲';
});

// 只有點擊「開始按鈕」或是在遊戲進行中點擊畫面，才鎖定滑鼠
document.addEventListener('click', (e) => {
    const isStartBtn = e.target.id === 'start-game-btn';
    
    // 如果歡迎畫面還在，且點的不是開始按鈕，則不執行鎖定
    if (welcomeScreen && welcomeScreen.style.display !== 'none' && !isStartBtn) {
        return;
    }

    controls.lock();
    if (window.gameSensitivity) {
        const baseSens = window.gameSensitivity;
        const zoomSensScale = window.zoomSensitivity || 0.5;
        controls.pointerSpeed = gameState.isZoomed ? (baseSens * zoomSensScale) : baseSens;
    }
});
scene.add(controls.getObject());

function toggleZoom(force) {
    gameState.isZoomed = force !== undefined ? force : !gameState.isZoomed;
    camera.fov = gameState.isZoomed ? 25 : 75; // 稍微調大一點 FOV 避免太暈
    camera.updateProjectionMatrix();

    // 更新靈敏度 (ADS 靈敏度)
    if (window.gameSensitivity) {
        const baseSens = window.gameSensitivity;
        const zoomSensScale = window.zoomSensitivity || 0.5;
        controls.pointerSpeed = gameState.isZoomed ? (baseSens * zoomSensScale) : baseSens;
    }

    // 更新武器位置 (開鏡 ADS)
    if (currentWeaponMesh) {
        const config = weaponConfig[gameState.currentSlot];
        const targetPos = gameState.isZoomed ? (config.adsPos || config.pos) : config.pos;
        currentWeaponMesh.position.set(...targetPos);
        
        // 開鏡時調整手部位置，避免穿模或遮擋
        if (gameState.isZoomed) limbGroup.scale.set(0.5, 0.5, 0.5);
        else limbGroup.scale.set(1, 1, 1);
        
        // 如果有準星 UI，開鏡時可以隱藏或縮小，這裡先簡單處理
        const crosshair = document.getElementById('crosshair');
        if (crosshair) crosshair.style.opacity = gameState.isZoomed ? '0.2' : '1.0';
    }
}

function attack(isRightClick = false) {
    if (!controls.isLocked || gameState.isReloading) return;
    const config = weaponConfig[gameState.currentSlot];
    
    // 檢查彈藥 (除近戰武器外)
    if (config.type !== 'melee' && gameState.currentAmmo[gameState.currentSlot] <= 0) {
        reload();
        return;
    }

    const now = performance.now();
    if (now - gameState.lastShotTime < config.fireRate) return;
    gameState.lastShotTime = now;

    // 扣除彈藥
    if (config.type !== 'melee') {
        gameState.currentAmmo[gameState.currentSlot]--;
    }

    currentWeaponMesh.position.z += 0.1;
    rightArm.position.z += 0.05;
    setTimeout(() => { 
        if (currentWeaponMesh) currentWeaponMesh.position.z -= 0.1; 
        if (rightArm) rightArm.position.z -= 0.05;
    }, 50);

    sounds.shoot();
    performRaycast(config, isRightClick);
}

function reload() {
    const config = weaponConfig[gameState.currentSlot];
    if (gameState.isReloading || gameState.currentAmmo[gameState.currentSlot] === config.ammo || config.type === 'melee') return;

    gameState.isReloading = true;
    const ammoDisplay = document.getElementById('ammo-text');
    if (ammoDisplay) ammoDisplay.innerText = "換彈中...";
    sounds.reload();

    // 換彈動作 (簡單的旋轉武器)
    if (currentWeaponMesh) {
        const originalRot = currentWeaponMesh.rotation.z;
        currentWeaponMesh.rotation.z += Math.PI / 2;
        setTimeout(() => {
            if (currentWeaponMesh) currentWeaponMesh.rotation.z = originalRot;
            gameState.currentAmmo[gameState.currentSlot] = config.ammo;
            gameState.isReloading = false;
            updateUI();
        }, config.reloadTime);
    }
}

function createTracer(start, end, color = 0xffff00) {
    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.6 });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    
    // 0.1 秒後移除彈道線
    setTimeout(() => {
        scene.remove(line);
        geometry.dispose();
        material.dispose();
    }, 100);
}

// 噴火槍專用的火焰效果
function createFlame(start, end) {
    const distance = start.distanceTo(end);
    const numParticles = 6;
    
    for (let i = 0; i < numParticles; i++) {
        const size = 0.3 + Math.random() * 0.6;
        const geo = new THREE.SphereGeometry(size, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ 
            color: Math.random() > 0.3 ? 0xff4500 : 0xffa500, 
            transparent: true, 
            opacity: 0.8 
        });
        const flame = new THREE.Mesh(geo, mat);
        
        // 隨機分布在射線路徑上，偏向近距離以呈現「噴射」感
        const t = Math.pow(Math.random(), 0.5); 
        flame.position.lerpVectors(start, end, t);
        
        // 加入隨機擾動
        flame.position.x += (Math.random() - 0.5) * 1.2;
        flame.position.y += (Math.random() - 0.5) * 1.2;
        flame.position.z += (Math.random() - 0.5) * 1.2;
        
        scene.add(flame);
        
        const startTime = performance.now();
        const duration = 300 + Math.random() * 400;
        
        const animateFlame = () => {
            const elapsed = performance.now() - startTime;
            const progress = elapsed / duration;
            if (progress < 1) {
                flame.scale.setScalar(1 + progress * 1.5); // 火焰噴出後會稍微變大
                flame.material.opacity = 0.8 * (1 - progress);
                // 向上飄一點點
                flame.position.y += 0.02;
                requestAnimationFrame(animateFlame);
            } else {
                scene.remove(flame);
                geo.dispose();
                mat.dispose();
            }
        };
        animateFlame();
    }
}

function performRaycast(config, isRightClick) {
    const spread = config.spread || 0;
    const isShotgun = config.type === 'shotgun';
    const numRays = isShotgun ? 8 : 1;
    
    // 強制更新矩陣，確保獲取正確的世界坐標
    camera.updateMatrixWorld();
    
    const camWorldPos = new THREE.Vector3();
    camera.getWorldPosition(camWorldPos);
    
    // 計算視覺軌跡起點 (優化對齊中心，減少視差)
    const tracerStart = new THREE.Vector3();
    if (currentWeaponMesh) {
        currentWeaponMesh.getWorldPosition(tracerStart);
        // 如果正在開鏡 (ADS)，讓子彈稍微從攝影機中心下方一點點發出 (lerp 0.95)，
        // 這樣就不會因為距離太近而被攝影機自己擋住導致消失。
        const lerpFactor = gameState.isZoomed ? 0.95 : 0.9;
        tracerStart.lerp(camWorldPos, lerpFactor);
    } else {
        tracerStart.copy(camWorldPos);
    }

    // 定義命中目標與爆炸位置
    const targets = [...enemies, floor, ...obstacles, ...Object.values(otherPlayers)];
    let explosionPos = null;

    // 固定彈道偏移值為 0.25
    const yOffset = 0.25;

    for (let i = 0; i < numRays; i++) {
        let currentStart = tracerStart.clone();
        let currentDir = new THREE.Vector3();
        
        if (i === 0 && !isShotgun) {
            raycaster.setFromCamera({ x: 0, y: yOffset }, camera);
            currentDir.copy(raycaster.ray.direction);
        } else {
            const camWorldDir = new THREE.Vector3();
            camera.getWorldDirection(camWorldDir);
            currentDir.copy(camWorldDir);
            
            const scatter = new THREE.Vector3(
                (Math.random() - 0.5) * spread * 2,
                (Math.random() - 0.5) * spread * 2,
                (Math.random() - 0.5) * spread * 2
            );
            currentDir.add(scatter).normalize();
        }

        let bounceCount = config.bounces ? 5 : 0;
        let segmentStart = currentStart.clone();

        for (let b = 0; b <= bounceCount; b++) {
            raycaster.set(segmentStart, currentDir);
            const intersects = raycaster.intersectObjects(targets, true);

            let tracerEnd = new THREE.Vector3();
            if (intersects.length > 0) {
                const hit = intersects[0];
                tracerEnd.copy(hit.point);
                if (i === 0 && b === 0) explosionPos = tracerEnd.clone();
                
                // --- 命中邏輯 ---
                if (!config.isBurn || hit.distance < 15) {
                    let obj = hit.object;
                    let enemyGroup = null;
                    if (obj.userData && obj.userData.parent) {
                        enemyGroup = obj.userData.parent;
                    } else {
                        let current = obj;
                        while (current.parent) {
                            if (current.parent.userData && (current.parent.userData.hp !== undefined || current.parent.userData.isPlayer)) {
                                enemyGroup = current.parent;
                                break;
                            }
                            current = current.parent;
                        }
                    }

                    if (enemyGroup && (enemyGroup.userData.isPlayer || enemyGroup.userData.hp > 0)) {
                        const dist = hit.distance;
                        let damage = config.damage * (gameState.isMega ? 3 : 1);
                        
                        if (gameState.equippedSkills.includes('berserker')) {
                            damage *= 1.5;
                        }
                        
                        const modelContainer = enemyGroup.getObjectByName("modelContainer");
                        const meshToFlash = modelContainer || enemyGroup;
                        if (meshToFlash) {
                            meshToFlash.traverse(node => {
                                if (node.isMesh) {
                                    const originalColor = node.material.color.getHex();
                                    node.material.color.setHex(config.isBurn ? 0xff4500 : 0xffffff);
                                    setTimeout(() => { if(node.material) node.material.color.setHex(originalColor); }, 100);
                                }
                            });
                        }

                        if (obj.userData.type === 'head') {
                            const multiplier = gameState.equippedSkill === 'precision' ? 3.0 : 2.5;
                            damage *= multiplier;
                        }

                        if (enemyGroup.userData.isPlayer && socket) {
                            socket.emit('playerHit', { targetId: enemyGroup.userData.playerId, damage: damage });
                        } else if (enemyGroup.userData.hp !== undefined) {
                            if (config.isBurn) enemyGroup.userData.burnTicks = 10;
                            if (config.type === 'melee') {
                                if (dist > 3) continue;
                                if (isRightClick) {
                                    const pDir = new THREE.Vector3();
                                    camera.getWorldDirection(pDir);
                                    const eDir = new THREE.Vector3(0,0,-1).applyQuaternion(enemyGroup.quaternion);
                                    if (pDir.dot(eDir) > 0.7) damage = 150;
                                }
                            } 
                            
                            enemyGroup.userData.hp -= damage;
                            
                            const hpBarFill = enemyGroup.getObjectByName("hpBarFill");
                            if (hpBarFill) {
                                const hpPercent = Math.max(0, enemyGroup.userData.hp / enemyGroup.userData.maxHP);
                                hpBarFill.scale.x = hpPercent;
                                hpBarFill.position.x = (hpPercent - 1) * 0.5;
                                if (hpPercent < 0.3) hpBarFill.material.color.setHex(0xff0000);
                                else if (hpPercent < 0.6) hpBarFill.material.color.setHex(0xffff00);
                            }

                            if (enemyGroup.userData.hp <= 0) {
                                sounds.death();
                                if (gameState.achievements.includes(`gold_${gameState.currentSlot}`)) {
                                    spawnGoldenStatue(enemyGroup.position, enemyGroup.quaternion);
                                }

                                let keyReward = gameState.equippedSkills.includes('scavenger') ? 20 : 10;
                                if (gameState.owned_items.includes('vip')) {
                                    keyReward = Math.floor(keyReward * 1.5);
                                }
                                gameState.keys += keyReward;

                                if (gameState.equippedSkills.includes('vampiric')) {
                                    gameState.playerHP = Math.min(gameState.maxHP, gameState.playerHP + 50);
                                }

                                if (gameState.level < 50) {
                                    gameState.xp += 10;
                                    const requiredXP = 200 + (gameState.level - 1) * 20;
                                    if (gameState.xp >= requiredXP) {
                                        gameState.xp -= requiredXP;
                                        gameState.level++;
                                        showLevelUpPopup(gameState.level);
                                    }
                                }

                                saveGameProgress();
                                updateUI();
                                if (Math.random() < 0.15) spawnHealthPack(enemyGroup.position);
                                scene.remove(enemyGroup);
                                const idx = enemies.indexOf(enemyGroup);
                                if (idx > -1) enemies.splice(idx, 1);
                                
                                const currentWeapon = gameState.currentSlot;
                                gameState.weaponKills[currentWeapon] = (gameState.weaponKills[currentWeapon] || 0) + 1;
                                
                                gameState.kills++;
                                checkAchievements();
                                if (enemies.length === 0) { gameState.wave++; canSpawnWave = true; }
                            }
                        }
                    }
                }

                // 顯示目前段落的彈道
                let color = config.color || 0xffff00;
                if (config.type === 'paintball') {
                    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
                    color = colors[Math.floor(Math.random() * colors.length)];
                }
                
                if (config.isBurn) {
                    createFlame(segmentStart, tracerEnd);
                } else {
                    createTracer(segmentStart, tracerEnd, color);
                }

                if (socket) {
                    socket.emit('playerFire', { 
                        start: segmentStart, 
                        end: tracerEnd, 
                        color: color,
                        isBurn: config.isBurn 
                    });
                }

                // 如果有反彈，計算下一段
                if (config.bounces && b < bounceCount && hit.face) {
                    const normal = hit.face.normal.clone();
                    // 將法向量轉換到世界空間
                    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
                    normal.applyMatrix3(normalMatrix).normalize();
                    
                    currentDir.reflect(normal).normalize();
                    segmentStart.copy(hit.point).addScaledVector(currentDir, 0.05);
                } else {
                    break;
                }
            } else {
                raycaster.ray.at(1000, tracerEnd); // 射程無限 (1000 單位)
                if (i === 0 && b === 0) explosionPos = tracerEnd.clone();
                
                let color = config.color || 0xffff00;
                if (config.isBurn) {
                    createFlame(segmentStart, tracerEnd);
                } else {
                    createTracer(segmentStart, tracerEnd, color);
                }

                if (socket) {
                    socket.emit('playerFire', { start: segmentStart, end: tracerEnd, color: color, isBurn: config.isBurn });
                }
                break;
            }
        }
    }
    
    // 爆炸範圍傷害
    if (config.isExplosive && explosionPos) {
        enemies.forEach((e, idx) => {
            const d = e.position.distanceTo(explosionPos);
            if (d < 10) {
                e.userData.hp -= 200 * (1 - d/10);
                if (e.userData.hp <= 0) {
                    sounds.death();
                    
                    // 擊殺特效：金色雕像
                    if (gameState.achievements.includes(`gold_${gameState.currentSlot}`)) {
                        spawnGoldenStatue(e.position, e.quaternion);
                    }

                    gameState.keys += 10;
                    
                    // 更新武器擊殺數
                    const currentWeapon = gameState.currentSlot;
                    gameState.weaponKills[currentWeapon] = (gameState.weaponKills[currentWeapon] || 0) + 1;
                    
                    gameState.kills++;
                    checkAchievements(); // 檢查成就
                    
                    saveGameProgress();
                    scene.remove(e);
                    enemies.splice(idx, 1);
                    if (enemies.length === 0) { gameState.wave++; canSpawnWave = true; }
                }
            }
        });
        updateUI();
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5 }));
        sphere.position.copy(explosionPos);
        scene.add(sphere);
        setTimeout(() => scene.remove(sphere), 200);
    }
}

document.addEventListener('mousedown', (e) => {
    if (e.button === 0) gameState.isFiring = true;
    if (e.button === 2) {
        const c = weaponConfig[gameState.currentSlot];
        if (c.type === 'melee') attack(true);
        else if (c.canZoom) toggleZoom();
    }
});
document.addEventListener('mouseup', (e) => {
    if (e.button === 0) gameState.isFiring = false;
});
document.addEventListener('contextmenu', e => e.preventDefault());

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const keys = {};
const velocity = new THREE.Vector3(), direction = new THREE.Vector3();

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
        case 'KeyR': reload(); break;
        case 'KeyC': 
            const now = performance.now();
            if (!gameState.isSliding && now - gameState.lastSlideTime > gameState.slideCooldown) {
                gameState.isSliding = true;
                gameState.slideTime = now;
                gameState.lastSlideTime = now;
                camera.position.y -= 0.8;
            }
            break;
        case 'Space':
            if (gameState.canJump) {
                velocity.y += JUMP_FORCE;
                gameState.canJump = false;
            }
            break;
        case 'Digit1': 
            if (gameState.equippedWeapons[0]) switchWeapon(gameState.equippedWeapons[0]); 
            break;
        case 'Digit2':
            if (gameState.equippedWeapons[1]) switchWeapon(gameState.equippedWeapons[1]);
            break;
        case 'Digit3':
            // 預留或是移除
            break;
        case 'Digit4':
            break;
        case 'Digit5':
            break;
    }
});

window.setEquippedWeapons = (list) => {
    gameState.equippedWeapons = list.slice(0, 2);
    if (gameState.equippedWeapons.length > 0) {
        switchWeapon(gameState.equippedWeapons[0]);
    }
};

window.setEquippedSkill = (skills) => {
    // 支援傳入單一字串或陣列
    if (typeof skills === 'string') {
        gameState.equippedSkills = skills ? [skills] : [];
    } else if (Array.isArray(skills)) {
        gameState.equippedSkills = skills;
    }
    
    console.log("Equipped skills:", gameState.equippedSkills);
    
    // 重設為預設值
    gameState.maxHP = 250;
    gameState.slideCooldown = 1500;
    
    // 套用所有已裝備技能的效果
    gameState.equippedSkills.forEach(skill => {
        if (skill === 'shield') {
            gameState.maxHP = 350;
            if (gameState.playerHP < 350) gameState.playerHP = 350;
        } else if (skill === 'shadow') {
            gameState.slideCooldown = 750;
        } else if (skill === 'timestop') {
            // 時間暫停技能初始化 (如果需要)
        }
    });
    
    updateUI();
};

// 滑鼠滾輪切換欄位
document.addEventListener('wheel', (e) => {
    if (!controls.isLocked) return;
    // 只有一把武器，不需切換
});
document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    switch (e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
        case 'KeyC':
            if (gameState.isSliding) {
                gameState.isSliding = false;
                camera.position.y += 0.8;
            }
            break;
    }
});

function updateUI() {
    const hpBar = document.getElementById('hp-bar');
    const hpText = document.getElementById('hp-text');
    if (hpBar && hpText) {
        hpBar.style.width = `${(gameState.playerHP / gameState.maxHP) * 100}%`;
        hpText.innerText = Math.max(0, Math.floor(gameState.playerHP));
    }

    // 更新等級與 XP UI
    const levelDisp = document.getElementById('level-display');
    const xpDisp = document.getElementById('xp-display');
    const xpBarFill = document.getElementById('xp-bar-fill');
    if (levelDisp && xpDisp && xpBarFill) {
        const requiredXP = 200 + (gameState.level - 1) * 20;
        levelDisp.innerText = `LV.${gameState.level}`;
        xpDisp.innerText = `${gameState.xp} / ${requiredXP} XP`;
        xpBarFill.style.width = `${(gameState.xp / requiredXP) * 100}%`;
    }

    // 更新波次顯示
    let waveDisplay = document.getElementById('wave-display');
    if (!waveDisplay) {
        waveDisplay = document.createElement('div');
        waveDisplay.id = 'wave-display';
        waveDisplay.style.position = 'absolute';
        waveDisplay.style.top = '10px';
        waveDisplay.style.left = '50%';
        waveDisplay.style.transform = 'translateX(-50%)';
        waveDisplay.style.color = '#ffffff';
        waveDisplay.style.fontSize = '24px';
        waveDisplay.style.fontFamily = 'Arial';
        waveDisplay.style.textShadow = '2px 2px 4px black';
        document.body.appendChild(waveDisplay);
    }
    waveDisplay.innerText = `SURVIVAL WAVE: ${gameState.wave}`;

    // 更新鑰匙顯示
    let keyDisplay = document.getElementById('key-display');
    if (!keyDisplay) {
        keyDisplay = document.createElement('div');
        keyDisplay.id = 'key-display';
        keyDisplay.style.position = 'absolute';
        keyDisplay.style.bottom = '100px';
        keyDisplay.style.left = '20px';
        keyDisplay.style.color = '#ffff00';
        keyDisplay.style.fontSize = '24px';
        keyDisplay.style.fontFamily = 'Courier New';
        keyDisplay.style.textShadow = '2px 2px 4px black';
        document.body.appendChild(keyDisplay);
    }
    keyDisplay.innerText = `KEYS: 🔑 ${gameState.keys}`;
    if (window.updateModalKeys) window.updateModalKeys(gameState.keys);
    
    // 更新歡迎介面金幣與鑰匙
    const welcomeKey = document.getElementById('welcome-key-count');
    const welcomeCoin = document.getElementById('welcome-coin-count');
    if (welcomeKey) welcomeKey.innerText = gameState.keys;
    if (welcomeCoin) welcomeCoin.innerText = gameState.coins;

    // 更新商店金幣顯示 (兩者獨立)
    const coinDisplay = document.getElementById('shop-coin-display');
    if (coinDisplay) coinDisplay.innerText = gameState.coins;

    // 更新 MEGA 狀態顯示
    let megaDisplay = document.getElementById('mega-display');
    if (gameState.isMega) {
        if (!megaDisplay) {
            megaDisplay = document.createElement('div');
            megaDisplay.id = 'mega-display';
            megaDisplay.style.position = 'absolute';
            megaDisplay.style.bottom = '100px';
            megaDisplay.style.right = '20px';
            megaDisplay.style.color = '#00ff00';
            megaDisplay.style.fontSize = '20px';
            megaDisplay.style.fontWeight = 'bold';
            document.body.appendChild(megaDisplay);
        }
        const timeLeft = Math.ceil((15000 - (performance.now() - gameState.megaTime)) / 1000);
        megaDisplay.innerText = `MEGA MODE: ${timeLeft}s`;
    } else if (megaDisplay) {
        megaDisplay.remove();
    }

    // 更新滑行冷卻顯示
    let slideDisplay = document.getElementById('slide-display');
    if (!slideDisplay) {
        slideDisplay = document.createElement('div');
        slideDisplay.id = 'slide-display';
        slideDisplay.style.position = 'absolute';
        slideDisplay.style.top = '40px';
        slideDisplay.style.left = '50%';
        slideDisplay.style.transform = 'translateX(-50%)';
        slideDisplay.style.color = '#00ffff';
        slideDisplay.style.fontSize = '18px';
        slideDisplay.style.fontFamily = 'Arial';
        slideDisplay.style.textShadow = '1px 1px 2px black';
        document.body.appendChild(slideDisplay);
    }
    
    const now = performance.now();
    const remaining = Math.max(0, gameState.slideCooldown - (now - gameState.lastSlideTime));
    if (remaining > 0) {
        slideDisplay.innerText = `SLIDE COOLDOWN: ${(remaining / 1000).toFixed(1)}s`;
        slideDisplay.style.color = '#ff4444';
    } else {
        slideDisplay.innerText = `SLIDE READY (C)`;
        slideDisplay.style.color = '#00ffff';
    }

    // 更新彈藥顯示
    const ammoText = document.getElementById('ammo-text');
    if (ammoText) {
        const currentAmmo = gameState.currentAmmo[gameState.currentSlot];
        ammoText.innerText = currentAmmo === Infinity ? '∞' : currentAmmo;
        if (gameState.isReloading) ammoText.innerText = "換彈中...";
    }
}
window.updateUI = updateUI;

// --- 商店系統已遷移至 game.html ---

let prevTime = performance.now();
let lastMoveEmit = 0;

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    // 處理時間暫停技能 (F鍵啟動, 30s冷卻)
    if (gameState.equippedSkills.includes('timestop')) {
        if (!window.timeStopCooldown) window.timeStopCooldown = 0;
        if (keys['f'] && time - window.timeStopCooldown > 30000 && !window.isTimeStopped) {
            window.isTimeStopped = true;
            window.timeStopCooldown = time;
            
            // 畫面變黃特效
            const overlay = document.createElement('div');
            overlay.id = 'time-stop-overlay';
            overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,0,0.3);pointer-events:none;z-index:9999;mix-blend-mode:overlay;";
            document.body.appendChild(overlay);
            
            setTimeout(() => {
                window.isTimeStopped = false;
                const o = document.getElementById('time-stop-overlay');
                if(o) o.remove();
            }, 10000);
        }
    }

    // 更新其他玩家的平滑位移與動畫
    Object.keys(otherPlayers).forEach(id => {
        const p = otherPlayers[id];
        const ud = p.userData;
        
        // 平滑插值位置與旋轉
        const dist = p.position.distanceTo(ud.targetPosition);
        p.position.lerp(ud.targetPosition, 0.15);
        p.rotation.y += (ud.targetRotationY - p.rotation.y) * 0.15;

        // 走路動畫邏輯
        if (dist > 0.01) {
            ud.walkCycle += delta * 10;
            const angle = Math.sin(ud.walkCycle) * 0.5;
            ud.leftLeg.rotation.x = angle;
            ud.rightLeg.rotation.x = -angle;
            ud.leftArm.rotation.x = -angle;
            ud.rightArm.rotation.x = angle;
            ud.model.position.y = Math.abs(Math.cos(ud.walkCycle)) * 0.1; // 彈跳效果
        } else {
            // 停止時回到原位
            ud.leftLeg.rotation.x *= 0.8;
            ud.rightLeg.rotation.x *= 0.8;
            ud.leftArm.rotation.x *= 0.8;
            ud.rightArm.rotation.x *= 0.8;
            ud.model.position.y *= 0.8;
        }

        // 血條轉向玩家
        const hpBarBg = p.getObjectByName("hpBarBg");
        if (hpBarBg) hpBarBg.quaternion.copy(camera.quaternion);
    });

    if (controls.isLocked) {
        if (gameState.isFiring) attack(); // 持續射擊檢測

        // --- 本地玩家手腳動畫 ---
        const isMoving = moveForward || moveBackward || moveLeft || moveRight;
        if (isMoving && !gameState.isSliding && gameState.canJump) {
            const walkCycle = time * 0.01;
            const bob = Math.sin(walkCycle) * 0.05;
            const swing = Math.sin(walkCycle) * 0.2;
            
            // 手部擺動
            leftArm.position.z = -0.3 + swing * 0.5;
            rightArm.position.z = -0.3 - swing * 0.5;
            limbGroup.position.y = bob;
            
            // 腳部走動
            leftLeg.rotation.x = swing;
            rightLeg.rotation.x = -swing;
            leftLeg.position.z = 0.2 + swing * 0.3;
            rightLeg.position.z = 0.2 - swing * 0.3;
        } else if (gameState.isSliding) {
            // 滑行姿勢：腳向前伸，身體後仰感
            leftLeg.rotation.x = -1.2;
            rightLeg.rotation.x = -1.2;
            leftLeg.position.z = -0.8;
            rightLeg.position.z = -0.6;
            leftLeg.position.y = -0.8;
            rightLeg.position.y = -0.8;
            
            leftArm.position.y = -0.2;
            rightArm.position.y = -0.2;
        } else {
            // 靜止狀態恢復
            leftLeg.rotation.x *= 0.9;
            rightLeg.rotation.x *= 0.9;
            leftLeg.position.set(-0.25, -1.5, 0.2);
            rightLeg.position.set(0.25, -1.5, 0.2);
            leftArm.position.set(-0.4, -0.4, -0.3);
            rightArm.position.set(0.4, -0.4, -0.3);
            limbGroup.position.y *= 0.9;
        }

        // 傳送位置給伺服器
        if (socket && time - lastMoveEmit > 50) {
            socket.emit('playerMovement', {
                position: camera.position,
                rotation: { y: camera.rotation.y }
            });
            lastMoveEmit = time;
        }

        if (!window.isTimeStopped) {
            mixers.forEach(mixer => mixer.update(delta));
            enemies.forEach((enemy, enemyIdx) => {
                const dist = enemy.position.distanceTo(camera.position);
                enemy.lookAt(camera.position.x, 0, camera.position.z);

                // NPC 移動邏輯：朝玩家靠近 (只在水平面移動)
                if (dist > 5 && dist < 100) {
                    const moveDir = new THREE.Vector3();
                    const targetPos = new THREE.Vector3(camera.position.x, enemy.position.y, camera.position.z);
                    moveDir.subVectors(targetPos, enemy.position).normalize();
                    enemy.position.addScaledVector(moveDir, 12.0 * delta); 
                    enemy.position.y = 0; // 強制固定在地面
                }

                // 處理燃燒傷害 (DOT)
                if (enemy.userData.burnTicks > 0) {
                    if (time - enemy.userData.lastBurnTime > 500) {
                        enemy.userData.hp -= 10;
                        enemy.userData.burnTicks--;
                        enemy.userData.lastBurnTime = time;
                        
                        // 檢查燃燒是否致死
                        if (enemy.userData.hp <= 0) {
                            sounds.death();
                            if (gameState.achievements.includes('gold_flamethrower')) {
                                spawnGoldenStatue(enemy.position, enemy.quaternion);
                            }

                            let keyReward = gameState.equippedSkills.includes('scavenger') ? 20 : 10;
                            if (gameState.owned_items.includes('vip')) keyReward = Math.floor(keyReward * 1.5);
                            gameState.keys += keyReward;

                            if (gameState.equippedSkills.includes('vampiric')) {
                                gameState.playerHP = Math.min(gameState.maxHP, gameState.playerHP + 50);
                            }
                            
                            const currentWeapon = gameState.currentSlot;
                            gameState.weaponKills[currentWeapon] = (gameState.weaponKills[currentWeapon] || 0) + 1;
                            gameState.kills++;
                            checkAchievements();
                            
                            saveGameProgress();
                            updateUI();
                            if (Math.random() < 0.15) spawnHealthPack(enemy.position);
                            scene.remove(enemy);
                            enemies.splice(enemyIdx, 1);
                            if (enemies.length === 0) { gameState.wave++; canSpawnWave = true; }
                            return;
                        }

                        // 燃燒視覺效果
                        const modelContainer = enemy.getObjectByName("modelContainer");
                        if (modelContainer) {
                            modelContainer.traverse(node => {
                                if (node.isMesh) {
                                    node.material.color.setHex(0xff4500);
                                    setTimeout(() => { if(node.material) node.material.color.setHex(0x555555); }, 100);
                                }
                            });
                        }
                    }
                }

                // 讓血量條始終面對玩家
                const hpBarBg = enemy.getObjectByName("hpBarBg");
                if (hpBarBg) {
                    hpBarBg.lookAt(camera.position);
                }

                // 敵人攻擊邏輯
                if (dist < enemy.userData.attackRange) {
                    const now = time;
                    const isElite = enemy.userData.type === 'elite';
                    const isBoss = enemy.userData.type === 'boss';
                    
                    if (isBoss) {
                        if (enemy.userData.isReloading) return;
                        if (now - enemy.userData.lastAttackTime > 300) {
                            if (enemy.userData.currentAmmo > 0) {
                                gameState.playerHP -= enemy.userData.attackDamage;
                                enemy.userData.currentAmmo--;
                                enemy.userData.lastAttackTime = now;
                                
                                const enemyPos = new THREE.Vector3();
                                enemy.getWorldPosition(enemyPos);
                                enemyPos.y += 6.5;
                                
                                const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
                                createTracer(enemyPos, camera.position, colors[Math.floor(Math.random() * colors.length)]);
                            } else {
                                enemy.userData.isReloading = true;
                                setTimeout(() => {
                                    enemy.userData.currentAmmo = enemy.userData.ammo;
                                    enemy.userData.isReloading = false;
                                }, enemy.userData.reloadTime);
                            }
                        }
                    } else {
                        const attackCooldown = isElite ? (enemy.userData.weaponType === 'machinegun' ? 200 : 1500) : 1000;

                        if (now - enemy.userData.lastAttackTime > attackCooldown) {
                            gameState.playerHP -= enemy.userData.attackDamage;
                            enemy.userData.lastAttackTime = now;
                            
                            const enemyPos = new THREE.Vector3();
                            enemy.getWorldPosition(enemyPos);
                            enemyPos.y += 1.3; 
                            
                            let tracerColor = 0xff0000; 
                            if (isElite) {
                                if (enemy.userData.weaponType === 'flamethrower') tracerColor = 0xff4500;
                                else if (enemy.userData.weaponType === 'rpg') tracerColor = 0xffff00;
                            }
                            
                            createTracer(enemyPos, camera.position, tracerColor);

                            if (isElite && enemy.userData.weaponType === 'rpg') {
                                const sphere = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5 }));
                                sphere.position.copy(camera.position);
                                scene.add(sphere);
                                setTimeout(() => scene.remove(sphere), 200);
                                gameState.playerHP -= 5; 
                            }
                        }
                    }

                    const hpBar = document.getElementById('hp-bar');
                    if(hpBar) {
                        hpBar.style.backgroundColor = 'white';
                        setTimeout(() => { if(hpBar) hpBar.style.backgroundColor = '#00ffff'; }, 100);
                    }
                }
            });
        }

        if (gameState.playerHP <= 0) {
            saveGameProgress(); 
            alert("你被擊敗了！生存了 " + (gameState.wave - 1) + " 波。");
            location.reload();
            return;
        }

        // 物理更新
        velocity.y -= GRAVITY * delta;
        const damping = Math.exp(-10.0 * delta);
        velocity.x *= damping;
        velocity.z *= damping;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        
        if (direction.lengthSq() > 0) direction.normalize();
        
        let currentSpeed = 400.0;
        if (gameState.equippedSkills.includes('adrenaline') && gameState.playerHP < 50) currentSpeed *= 1.4;

        if (gameState.isSliding) {
            currentSpeed = 800.0;
            if (performance.now() - gameState.slideTime > 500) {
                gameState.isSliding = false;
                camera.position.y += 0.8;
            }
        }

        if (moveForward || moveBackward) velocity.z -= direction.z * currentSpeed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * currentSpeed * delta;
        
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        const halfSize = MAP_SIZE / 2 - 2;
        camera.position.x = Math.max(-halfSize, Math.min(halfSize, camera.position.x));
        camera.position.z = Math.max(-halfSize, Math.min(halfSize, camera.position.z));

        camera.position.y += velocity.y * delta;

        const baseHeight = gameState.isMega ? 4.0 : 1.6;
        if (camera.position.y < baseHeight) {
            velocity.y = 0;
            camera.position.y = gameState.isSliding ? baseHeight * 0.5 : baseHeight;
            gameState.canJump = true;
        }

        // 撿取物品
        items.forEach((item, index) => {
            const dist = item.position.distanceTo(camera.position);
            if (gameState.equippedSkills.includes('magnetic') && dist < 15 && dist > 2) {
                const pullDir = new THREE.Vector3().subVectors(camera.position, item.position).normalize();
                item.position.addScaledVector(pullDir, 15 * delta);
            }

            if (dist < 2) {
                sounds.pickup();
                if (item.userData.type === 'health') {
                    if (gameState.equippedSkills.includes('berserker')) return; 
                    gameState.playerHP = Math.min(gameState.maxHP, gameState.playerHP + 50);
                    scene.remove(item);
                    items.splice(index, 1);
                    updateUI();
                } else if (item.userData.type === 'mega') {
                    gameState.isMega = true;
                    gameState.megaTime = time;
                    gameState.maxHP = 500;
                    gameState.playerHP = 500;
                    scene.remove(item);
                    items.splice(index, 1);
                    weaponGroup.scale.set(2, 2, 2);
                    updateUI();
                }
            }
        });

        if (gameState.isMega) {
            renderer.setClearColor(0x002200, 1);
            if (time - gameState.megaTime > 15000) {
                gameState.isMega = false;
                gameState.maxHP = 250;
                gameState.playerHP = Math.min(250, gameState.playerHP);
                renderer.setClearColor(0x000000, 1);
                weaponGroup.scale.set(1, 1, 1);
            }
        }

        if (enemies.length === 0 && canSpawnWave) spawnWave();
    }
    prevTime = time;
    updateUI();
    renderer.render(scene, camera);
}

switchWeapon('rifle');
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
