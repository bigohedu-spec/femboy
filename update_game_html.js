const fs = require('fs');
const content = fs.readFileSync('c:/Users/User/Downloads/femboy/game.html', 'utf8');

const newJS = `let currentLoadout = { primary: 'rifle', secondary: null, skill: null };

        const weaponCats = {
            rifle: 'primary', sniper: 'primary', shotgun: 'primary', paintball: 'primary',
            machinegun: 'primary', rpg: 'primary', flamethrower: 'primary',
            pistol: 'secondary', knife: 'secondary'
        };

        function selectSkill(id) {
            currentLoadout.skill = id;
            updateLoadoutUI();
        }

        function removeSkillFromLoadout() {
            currentLoadout.skill = null;
            updateLoadoutUI();
        }

        function updateLoadoutUI() {
            const unlocked = window.getUnlockedWeapons ? window.getUnlockedWeapons() : ['rifle', 'pistol'];
            const prefix = (localStorage.getItem('playerNickname') || 'guest') + '_';
            const unlockedSkills = JSON.parse(localStorage.getItem(prefix + 'game_unlocked_skills')) || [];
            const container = document.getElementById('unlocked-weapon-tags');
            const skillContainer = document.getElementById('unlocked-skill-tags');
            
            const weaponNames = {
                rifle: '自動步槍', knife: '軍用匕首', sniper: '狙擊步槍', 
                shotgun: '散彈槍', pistol: '手槍', paintball: '漆彈槍 (BOSS)',
                machinegun: '機關槍', rpg: '火箭筒', flamethrower: '噴火器'
            };

            const skillNames = {
                'vampire': '擊殺回血', 'adrenaline': '殘血爆發', 'shield': '護盾過載',
                'scavenger': '資源加倍', 'speed': '急速位移', 'berserk': '狂暴火力',
                'regen': '自動回血', 'shadow': '影子滑行'
            };

            container.innerHTML = '';
            unlocked.forEach(id => {
                const isSelected = currentLoadout.primary === id || currentLoadout.secondary === id;
                const tag = document.createElement('div');
                tag.className = 'weapon-tag' + (isSelected ? ' selected' : '');
                tag.innerText = weaponNames[id] || id;
                tag.onclick = () => addToLoadout(id);
                container.appendChild(tag);
            });

            if (skillContainer) {
                skillContainer.innerHTML = '';
                unlockedSkills.forEach(id => {
                    const isSelected = currentLoadout.skill === id;
                    const tag = document.createElement('div');
                    tag.className = 'weapon-tag' + (isSelected ? ' selected' : '');
                    tag.style.borderColor = 'var(--neon-yellow)';
                    tag.style.color = isSelected ? 'black' : 'var(--neon-yellow)';
                    if (isSelected) tag.style.background = 'var(--neon-yellow)';
                    tag.innerText = skillNames[id] || id;
                    tag.onclick = () => selectSkill(id);
                    skillContainer.appendChild(tag);
                });
            }

            // 更新槽位顯示
            const pSlot = document.getElementById('slot-0');
            const sSlot = document.getElementById('slot-1');
            const skillSlot = document.getElementById('slot-skill');

            if (currentLoadout.primary) {
                pSlot.innerHTML = \`<span style="opacity: 0.4; font-size: 9px;">PRIMARY</span><span class="weapon-name">\${weaponNames[currentLoadout.primary]}</span><button class="remove-btn">×</button>\`;
                pSlot.classList.add('active');
            } else {
                pSlot.innerHTML = '<span style="opacity: 0.4; font-size: 9px;">PRIMARY</span><span class="weapon-name">未選擇</span><button class="remove-btn">×</button>';
                pSlot.classList.remove('active');
            }

            if (currentLoadout.secondary) {
                sSlot.innerHTML = \`<span style="opacity: 0.4; font-size: 9px;">SECONDARY</span><span class="weapon-name">\${weaponNames[currentLoadout.secondary]}</span><button class="remove-btn">×</button>\`;
                sSlot.classList.add('active');
            } else {
                sSlot.innerHTML = '<span style="opacity: 0.4; font-size: 9px;">SECONDARY</span><span class="weapon-name">未選擇</span><button class="remove-btn">×</button>';
                sSlot.classList.remove('active');
            }

            if (skillSlot) {
                if (currentLoadout.skill) {
                    skillSlot.innerHTML = \`<span style="opacity: 0.4; font-size: 9px; color: var(--neon-yellow);">SKILL</span><span class="skill-name">\${skillNames[currentLoadout.skill] || currentLoadout.skill}</span><button class="remove-btn">×</button>\`;
                    skillSlot.classList.add('active');
                    skillSlot.style.borderColor = 'var(--neon-yellow)';
                } else {
                    skillSlot.innerHTML = '<span style="opacity: 0.4; font-size: 9px; color: var(--neon-yellow);">SKILL</span><span class="skill-name">未選擇</span><button class="remove-btn">×</button>';
                    skillSlot.classList.remove('active');
                    skillSlot.style.borderColor = '#333';
                }
            }
            
            if (window.setEquippedWeapons) {
                const list = [];
                if (currentLoadout.primary) list.push(currentLoadout.primary);
                if (currentLoadout.secondary) list.push(currentLoadout.secondary);
                window.setEquippedWeapons(list);
            }
            
            if (window.setEquippedSkill) {
                window.setEquippedSkill(currentLoadout.skill);
            }

            const startBtn = document.getElementById('start-game-btn');
            if (currentLoadout.primary || currentLoadout.secondary) {
                startBtn.style.display = 'block';
            } else {
                startBtn.style.display = 'none';
            }
        }\`;

const startTag = 'let currentLoadout';
const endTag = 'function addToLoadout';
const startIdx = content.indexOf(startTag);
const endIdx = content.indexOf(endTag);

if (startIdx !== -1 && endIdx !== -1) {
    const finalContent = content.substring(0, startIdx) + newJS + '\n\n        ' + content.substring(endIdx);
    fs.writeFileSync('c:/Users/User/Downloads/femboy/game.html', finalContent, 'utf8');
    console.log('Successfully updated game.html');
} else {
    console.error('Could not find markers in game.html');
}
