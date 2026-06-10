const translations = {
    'zh': {
        'nav-home': '首頁',
        'nav-battle': '戰鬥',
        'nav-skills': '技能',
        'nav-tutorial': '教學',
        'nav-rank': '排行',
        'nav-about': '關於',
        'nav-arsenal': '武器庫',
        'lang-toggle': 'English'
    },
    'en': {
        'nav-home': 'HOME',
        'nav-battle': 'BATTLE',
        'nav-skills': 'SKILLS',
        'nav-tutorial': 'TUTORIAL',
        'nav-rank': 'RANKING',
        'nav-about': 'ABOUT',
        'nav-arsenal': 'ARSENAL',
        'lang-toggle': '中文'
    }
};

const pageTranslations = {
    'zh': {
        'main-title': 'ARENA',
        'main-subtitle': '3D 生存多人連線',
        'main-start': '啟動遊戲',
        'main-tutorial': '新手教學',
        'main-logout': '登出帳號',
        'main-rank-btn': '全球排行榜'
    },
    'en': {
        'main-title': 'ARENA',
        'main-subtitle': '3D Survival Multiplayer',
        'main-start': 'LAUNCH GAME',
        'main-tutorial': 'HOW TO PLAY',
        'main-logout': 'LOGOUT',
        'main-rank-btn': 'LEADERBOARD'
    }
};

function updateLanguage(lang) {
    localStorage.setItem('game_lang', lang);
    document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';
    
    // 更新導航列
    const navHome = document.querySelector('a[href="index.html"]');
    const navBattle = document.querySelector('a[href="game.html"]');
    const navSkills = document.querySelector('a[href="skills.html"]');
    const navTutorial = document.querySelector('a[href="tutorial.html"]');
    const navRank = document.querySelector('a[href="leaderboard.html"]');
    const navAbout = document.querySelector('a[href="credits.html"]');
    const navArsenal = document.querySelector('a[onclick*="toggleWeaponsModal"]');
    const langBtn = document.getElementById('lang-toggle');

    if (navHome) navHome.innerText = translations[lang]['nav-home'];
    if (navBattle) navBattle.innerText = translations[lang]['nav-battle'];
    if (navSkills) navSkills.innerText = translations[lang]['nav-skills'];
    if (navTutorial) navTutorial.innerText = translations[lang]['nav-tutorial'];
    if (navRank) navRank.innerText = translations[lang]['nav-rank'];
    if (navAbout) navAbout.innerText = translations[lang]['nav-about'];
    if (navArsenal) navArsenal.innerText = translations[lang]['nav-arsenal'];
    if (langBtn) langBtn.innerText = translations[lang]['lang-toggle'];

    // 更新頁面內容 (透過 data-i18n 屬性)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (pageTranslations[lang] && pageTranslations[lang][key]) {
            el.innerText = pageTranslations[lang][key];
        }
    });

    // 特殊處理：game.html 的開始按鈕
    const startCombatBtn = document.getElementById('start-game-btn');
    if (startCombatBtn) {
        startCombatBtn.innerText = lang === 'zh' ? '開始戰鬥' : 'INITIATE COMBAT';
    }
}

function toggleLanguage() {
    const currentLang = localStorage.getItem('game_lang') || 'zh';
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    updateLanguage(newLang);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('game_lang') || 'zh';
    updateLanguage(savedLang);
});
