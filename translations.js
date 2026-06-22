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
        'tut-back': '返回首頁',
        'game-prepare': '戰鬥準備',
        'game-operator': '操作員',
        'game-loadout': '裝備配置',
        'game-back-to-menu': '返回主選單 (ESC)',
        'game-primary': '主武器',
        'game-secondary': '副武器',
        'game-skill': '技能槽',
        'game-unselected': '未選擇',
        'game-start-combat': '開始戰鬥',
        'game-arsenal-btn': '打開武器庫'
    },
    'en': {
        'main-title': 'ARENA',
        'main-subtitle': '3D Survival Multiplayer',
        'main-start': 'LAUNCH GAME',
        'main-tutorial': 'HOW TO PLAY',
        'main-logout': 'LOGOUT',
        'main-rank-btn': 'LEADERBOARD',
        'main-player': 'Player',
        'main-credits': 'CREDITS',
        'tut-back': 'Back Home',
        'game-prepare': 'PRE-COMBAT',
        'game-operator': 'OPERATOR',
        'game-loadout': 'LOADOUT',
        'game-back-to-menu': 'Back to Menu (ESC)',
        'game-primary': 'PRIMARY',
        'game-secondary': 'SECONDARY',
        'game-skill': 'SKILL',
        'game-unselected': 'EMPTY',
        'game-start-combat': 'START',
        'game-arsenal-btn': 'ARSENAL'
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

    // 更新 data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (pageTranslations[lang] && pageTranslations[lang][key]) {
            el.innerText = pageTranslations[lang][key];
        }
    });

    // 特殊按鈕
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) startBtn.innerText = pageTranslations[lang]['game-start-combat'];

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
const translations = { "zh": { "nav-home": "首頁", "nav-battle": "戰鬥", "nav-skills": "技能", "nav-tutorial": "教學", "nav-rank": "排行", "nav-about": "關於", "nav-arsenal": "武器庫", "lang-toggle": "English", "w-rifle": "自動步槍", "w-knife": "軍用匕首", "w-sniper": "狙擊步槍", "w-shotgun": "散彈槍", "w-pistol": "手槍", "w-paintball": "漆彈槍 (BOSS)", "w-machinegun": "機關槍", "w-rpg": "火箭筒", "w-flamethrower": "噴火器", "s-vampiric": "擊殺回血", "s-adrenaline": "殘血爆發", "s-shield": "護盾過載", "s-scavenger": "資源加倍", "s-shadow": "影子滑行", "s-precision": "致命精準", "s-berserker": "狂暴之魂", "s-magnetic": "金鑰磁鐵" }, "en": { "nav-home": "HOME", "nav-battle": "BATTLE", "nav-skills": "SKILLS", "nav-tutorial": "TUTORIAL", "nav-rank": "RANKING", "nav-about": "ABOUT", "nav-arsenal": "ARSENAL", "lang-toggle": "中文", "w-rifle": "Rifle", "w-knife": "Knife", "w-sniper": "Sniper", "w-shotgun": "Shotgun", "w-pistol": "Pistol", "w-paintball": "Paintball (BOSS)", "w-machinegun": "Machine Gun", "w-rpg": "RPG", "w-flamethrower": "Flamethrower", "s-vampiric": "Vampiric Strike", "s-adrenaline": "Adrenaline Rush", "s-shield": "Shield Overload", "s-scavenger": "Master Scavenger", "s-shadow": "Shadow Step", "s-precision": "Deadly Precision", "s-berserker": "Berserker Soul", "s-magnetic": "Credit Magnet" } }; const pageTranslations = { "zh": { "game-prepare": "戰鬥準備", "game-operator": "操作員", "game-loadout": "裝備配置", "game-back-to-menu": "返回主選單 (ESC)", "game-primary": "主武器", "game-secondary": "副武器", "game-skill": "技能槽", "game-unselected": "未選擇", "game-start-combat": "開始戰鬥", "game-arsenal-btn": "打開武器庫" }, "en": { "game-prepare": "PRE-COMBAT", "game-operator": "OPERATOR", "game-loadout": "LOADOUT", "game-back-to-menu": "Back (ESC)", "game-primary": "PRIMARY", "game-secondary": "SECONDARY", "game-skill": "SKILL", "game-unselected": "EMPTY", "game-start-combat": "START", "game-arsenal-btn": "ARSENAL" } }; function getTranslation(lang, key) { return (translations[lang] && translations[lang][key]) || (pageTranslations[lang] && pageTranslations[lang][key]) || key; } function updateLanguage(lang) { localStorage.setItem("game_lang", lang); document.documentElement.lang = lang === "zh" ? "zh-TW" : "en"; const navs = [["index.html", "home"], ["game.html", "battle"], ["skills.html", "skills"], ["tutorial.html", "tutorial"], ["leaderboard.html", "rank"], ["credits.html", "about"]]; navs.forEach(n => { const el = document.querySelector(`a[href="${n[0]}"]`); if (el) el.innerText = translations[lang]["nav-" + n[1]]; }); const langBtn = document.getElementById("lang-toggle"); if (langBtn) langBtn.innerText = translations[lang]["lang-toggle"]; document.querySelectorAll("[data-i18n]").forEach(el => { const key = el.getAttribute("data-i18n"); if (pageTranslations[lang][key]) el.innerText = pageTranslations[lang][key]; }); const startBtn = document.getElementById("start-game-btn"); if (startBtn) startBtn.innerText = pageTranslations[lang]["game-start-combat"]; window.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang } })); } function toggleLanguage() { const currentLang = localStorage.getItem("game_lang") || "zh"; updateLanguage(currentLang === "zh" ? "en" : "zh"); } document.addEventListener("DOMContentLoaded", () => { updateLanguage(localStorage.getItem("game_lang") || "zh"); });
