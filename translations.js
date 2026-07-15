const translations = {
    'zh': {
        'nav-home': '首頁',
        'nav-battle': '戰鬥',
        'nav-skills': '技能',
        'nav-tutorial': '教學',
        'nav-rank': '排行',
        'nav-about': '關於',
        'nav-arsenal': '武器庫',
        'lang-toggle': 'English',
        'skill-active': '已啟用',
        'skill-locked': '未解鎖',
        'skill-owned': '已擁有',
        'skill-aug': '強化完成',
        'skill-unlock': '解鎖強化',
        'w-rifle': '自動步槍',
        'w-knife': '軍用匕首',
        'w-sniper': '狙擊步槍',
        'w-shotgun': '散彈槍',
        'w-pistol': '手槍',
        'w-paintball': '漆彈槍 (BOSS)',
        'w-machinegun': '機關槍',
        'w-rpg': '火箭筒',
        'w-flamethrower': '噴火器',
        'w-energy': '誠諒手槍',
        'w-glass': '玻璃槍',
        's-vampiric': '擊殺回血',
        's-adrenaline': '殘血爆發',
        's-shield': '護盾過載',
        's-scavenger': '資源加倍',
        's-shadow': '影子滑行',
        's-precision': '致命精準',
        's-berserker': '狂暴之魂',
        's-magnetic': '金鑰磁鐵'
    },
    'en': {
        'nav-home': 'HOME',
        'nav-battle': 'BATTLE',
        'nav-skills': 'SKILLS',
        'nav-tutorial': 'TUTORIAL',
        'nav-rank': 'RANKING',
        'nav-about': 'ABOUT',
        'nav-arsenal': 'ARSENAL',
        'lang-toggle': '中文',
        'skill-active': 'ACTIVE',
        'skill-locked': 'LOCKED',
        'skill-owned': 'OWNED',
        'skill-aug': 'Augmented',
        'skill-unlock': 'Unlock Augment',
        'w-rifle': 'Rifle',
        'w-knife': 'Knife',
        'w-sniper': 'Sniper',
        'w-shotgun': 'Shotgun',
        'w-pistol': 'Pistol',
        'w-paintball': 'Paintball (BOSS)',
        'w-machinegun': 'Machine Gun',
        'w-rpg': 'RPG',
        'w-flamethrower': 'Flamethrower',
        'w-energy': 'Energy Pistol',
        'w-glass': 'Glass Cannon',
        's-vampiric': 'Vampiric Strike',
        's-adrenaline': 'Adrenaline Rush',
        's-shield': 'Shield Overload',
        's-scavenger': 'Master Scavenger',
        's-shadow': 'Shadow Step',
        's-precision': 'Deadly Precision',
        's-berserker': 'Berserker Soul',
        's-magnetic': 'Credit Magnet'
    }
};

const pageTranslations = {
    'zh': {
        'main-title': 'ARENA',
        'main-subtitle': '3D 生存多人連線',
        'main-start': '啟動遊戲',
        'main-tutorial': '新手教學',
        'main-logout': '登出帳號',
        'main-rank-btn': '全球排行榜',
        'main-player': '玩家',
        'main-credits': '持有金鑰',
        'tut-title': '操作手冊',
        'tut-subtitle': '強化你的戰鬥效能',
        'tut-basic-ctrl': '⌨️ 基礎控制',
        'tut-section-1': '基本移動',
        'tut-move': '：移動角色',
        'tut-jump': '：跳躍',
        'tut-slide': '：戰術滑行 (增加速度與降低身位)',
        'tut-section-2': '戰鬥操作',
        'tut-combat': '🖱️ 戰鬥操作',
        'tut-fire': '：開火 / 近戰攻擊',
        'tut-aim': '：瞄準 / 重擊',
        'tut-reload': '：重新裝彈',
        'tut-swap': '使用數字鍵 1-5 切換已解鎖的武器。',
        'tut-backstab': '背刺機制：從敵人背後攻擊可造成極高傷害。',
        'tut-headshot': '爆頭機制：擊中頭部可獲得 2.5 倍傷害。',
        'tut-weapons': '🔫 武器系統',
        'tut-weapon-switch': '使用數字鍵切換武器：',
        'tut-rifle-desc': '1. 自動步槍：均衡型，適合大多數戰鬥。',
        'tut-knife-desc': '2. 軍用匕首：潛行利器，背刺可秒殺。',
        'tut-sniper-desc': '3. 狙擊步槍：單發致命，適合遠距離。',
        'tut-shotgun-desc': '4. 散彈槍：近戰王者，擴散範圍大。',
        'tut-pistol-desc': '5. 手槍：可靠的副手武器。',
        'tut-economy': '💰 經濟與生存',
        'tut-keys-info': '鑰匙 (Keys)：擊敗敵人獲得，用於解鎖武器。',
        'tut-hp-info': '補血包：擊敗敵人有機率掉落，回復 50 HP。',
        'tut-wave-info': '波次系統：波次越高，敵人難度越大。',
        'tut-section-3': '資源與強化',
        'tut-keys': '擊殺敵人可獲得金鑰 (🔑)。',
        'tut-upgrade': '在技能選單中使用金鑰來永久強化你的角色屬性。',
        'tut-back': '返回首頁',
        'rank-title': '全球排行榜',
        'rank-online': '🏆 全球精英記分板',
        'rank-subtitle': '頂尖操作員排名',
        'rank-player': '操作員',
        'rank-score': '擊殺數',
        'rank-credits': '金鑰數量',
        'rank-loading': '正在連線至資料庫...',
        'rank-pos': '排名',
        'rank-id': '玩家 ID',
        'rank-kills': '擊殺數',
        'about-title': '✨ 關於此專案',
        'about-subtitle': '這是一個基於 Three.js 與 Socket.IO 開發的快節奏 3D 多人連線生存射擊遊戲。',
        'about-p1': '3D Survival Arena 致力於將復古 Arena Shooter 體驗與現代網頁技術結合。',
        'about-tech': '🛠️ 技術棧 (Tech Stack)',
        'about-dev': '📖 開發背景',
        'about-dev-p': '本專案最初是為了測試大規模多人連線下的實體同步與 3D 碰撞效能。',
        'login-title': '操作員登入',
        'login-desc': '請輸入您的代號以同步進度',
        'login-input': '代號 (例如: Operator_7)',
        'login-btn': '同步資料並進入',
        'game-prepare': '戰鬥準備',
        'game-operator': '操作員',
        'game-loadout': '裝備配置',
        'game-back-to-menu': '返回主選單 (ESC)',
        'game-primary': '主武器',
        'game-secondary': '副武器',
        'game-skill': '技能槽',
        'game-unselected': '未選擇',
        'game-start-combat': '開始戰鬥',
        'game-arsenal-btn': '打開武器庫',
        'skills-title': '技能強化系統',
        'skills-subtitle': '提升你的作戰效能',
        'skills-balance': '可用金鑰'
    },
    'en': {
        'nav-home': 'HOME',
        'nav-battle': 'BATTLE',
        'nav-skills': 'SKILLS',
        'nav-tutorial': 'TUTORIAL',
        'nav-rank': 'RANKING',
        'nav-about': 'ABOUT',
        'nav-arsenal': 'ARSENAL',
        'lang-toggle': '中文',
        'skill-active': 'ACTIVE',
        'skill-locked': 'LOCKED',
        'skill-owned': 'OWNED',
        'skill-aug': 'Augmented',
        'skill-unlock': 'Unlock Augment',
        'w-rifle': 'Rifle',
        'w-knife': 'Knife',
        'w-sniper': 'Sniper',
        'w-shotgun': 'Shotgun',
        'w-pistol': 'Pistol',
        'w-paintball': 'Paintball (BOSS)',
        'w-machinegun': 'Machine Gun',
        'w-rpg': 'RPG',
        'w-flamethrower': 'Flamethrower',
        'w-energy': 'Energy Pistol',
        'w-glass': 'Glass Cannon',
        's-vampiric': 'Vampiric Strike',
        's-adrenaline': 'Adrenaline Rush',
        's-shield': 'Shield Overload',
        's-scavenger': 'Master Scavenger',
        's-shadow': 'Shadow Step',
        's-precision': 'Deadly Precision',
        's-berserker': 'Berserker Soul',
        's-magnetic': 'Credit Magnet',
        'tut-title': 'OPERATIONAL MANUAL',
        'tut-subtitle': 'Optimize your combat efficiency',
        'tut-basic-ctrl': '⌨️ BASIC CONTROLS',
        'tut-section-1': 'Movement',
        'tut-move': ': Move Character',
        'tut-jump': ': Jump',
        'tut-slide': ': Tactical Slide (Speed boost & low profile)',
        'tut-section-2': 'Combat',
        'tut-combat': '🖱️ COMBAT OPS',
        'tut-fire': ': Fire / Melee',
        'tut-aim': ': Aim / Heavy Attack',
        'tut-reload': ': Reload',
        'tut-swap': 'Use keys 1-5 to switch between unlocked weapons.',
        'tut-backstab': 'Backstab: Huge damage from behind with knife.',
        'tut-headshot': 'Headshot: 2.5x damage multiplier.',
        'tut-weapons': '🔫 WEAPONRY',
        'tut-weapon-switch': 'Use number keys to switch:',
        'tut-rifle-desc': '1. Rifle: Balanced for all situations.',
        'tut-knife-desc': '2. Knife: Stealthy, lethal backstabs.',
        'tut-sniper-desc': '3. Sniper: One shot, one kill.',
        'tut-shotgun-desc': '4. Shotgun: King of close quarters.',
        'tut-pistol-desc': '5. Pistol: Reliable sidearm.',
        'tut-economy': '💰 ECONOMY',
        'tut-keys-info': 'Keys: Earned from kills, used to unlock weapons.',
        'tut-hp-info': 'HP Pack: Dropped by enemies, restores 50 HP.',
        'tut-wave-info': 'Waves: Higher waves mean tougher enemies.',
        'tut-section-3': 'Resources',
        'tut-keys': 'Eliminate enemies to earn Credits (🔑).',
        'tut-upgrade': 'Use Credits in Skills menu to permanently enhance your character.',
        'tut-back': 'Back Home',
        'rank-title': 'LEADERBOARD',
        'rank-online': '🏆 GLOBAL ELITE BOARD',
        'rank-subtitle': 'Top Operators Ranking',
        'rank-player': 'OPERATOR',
        'rank-score': 'KILLS',
        'rank-credits': 'CREDITS',
        'rank-loading': 'Connecting to Database...',
        'rank-pos': 'Rank',
        'rank-id': 'Player ID',
        'rank-kills': 'Kills',
        'about-title': '✨ ABOUT PROJECT',
        'about-subtitle': 'A fast-paced 3D multiplayer survival shooter built with Three.js and Socket.IO.',
        'about-p1': '3D Survival Arena combines retro Arena Shooter vibes with modern web tech.',
        'about-tech': '🛠️ TECH STACK',
        'about-dev': '📖 BACKGROUND',
        'about-dev-p': 'Tested for large-scale synchronization and 3D collision performance.',
        'login-title': 'OPERATOR LOGIN',
        'login-desc': 'Enter your codename to sync progress',
        'login-input': 'Codename (e.g., Operator_7)',
        'login-btn': 'SYNC & ENTER',
        'game-prepare': 'PRE-COMBAT',
        'game-operator': 'OPERATOR',
        'game-loadout': 'LOADOUT',
        'game-back-to-menu': 'Back (ESC)',
        'game-primary': 'PRIMARY',
        'game-secondary': 'SECONDARY',
        'game-skill': 'SKILL',
        'game-unselected': 'EMPTY',
        'game-start-combat': 'START',
        'game-arsenal-btn': 'ARSENAL',
        'skills-title': 'SKILL AUGMENTATION',
        'skills-subtitle': 'Enhance your operator\'s efficiency',
        'skills-balance': 'AVAILABLE CREDITS'
    }
};

function getTranslation(lang, key) {
    if (!translations[lang]) return key;
    return translations[lang][key] || (pageTranslations[lang] && pageTranslations[lang][key]) || key;
}

function updateLanguage(lang) {
    localStorage.setItem('game_lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';
    
    // 更新導航列
    const navItems = [
        { href: 'index.html', key: 'nav-home' },
        { href: 'game.html', key: 'nav-battle' },
        { href: 'skills.html', key: 'nav-skills' },
        { href: 'tutorial.html', key: 'nav-tutorial' },
        { href: 'leaderboard.html', key: 'nav-rank' },
        { href: 'credits.html', key: 'nav-about' }
    ];

    navItems.forEach(item => {
        const el = document.querySelector(`.navbar a[href="${item.href}"]`);
        if (el) el.innerText = translations[lang][item.key];
    });

    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.innerText = translations[lang]['lang-toggle'];

    // 更新所有具有 data-i18n 屬性的元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translatedText = (pageTranslations[lang] && pageTranslations[lang][key]) || (translations[lang] && translations[lang][key]);
        if (translatedText) {
            // 如果是輸入框，更新 placeholder
            if (el.tagName === 'INPUT') {
                el.placeholder = translatedText;
            } else {
                el.innerText = translatedText;
            }
        }
    });

    // 特殊處理
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn && pageTranslations[lang]['game-start-combat']) {
        startBtn.innerText = pageTranslations[lang]['game-start-combat'];
    }

    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

function toggleLanguage() {
    const currentLang = localStorage.getItem('game_lang') || 'zh';
    updateLanguage(currentLang === 'zh' ? 'en' : 'zh');
}

document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('game_lang') || 'zh';
    updateLanguage(savedLang);
});
