const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DATA_FILE = path.join(__dirname, 'players_data.json');
const playersData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

async function migrate() {
    console.log('--- 開始執行強制遷移測試 ---');
    for (const nickname in playersData) {
        console.log(`正在處理: ${nickname}...`);
        const p = playersData[nickname];
        const dataToUpload = {
            nickname: nickname,
            keys: p.keys || 300,
            unlockedweapons: p.unlockedWeapons || ['rifle', 'pistol'],
            unlockedskills: p.unlockedSkills || []
        };

        const { error } = await supabase
            .from('players')
            .upsert([dataToUpload]);

        if (error) {
            console.error(`❌ ${nickname} 遷移失敗:`, error.message);
        } else {
            console.log(`✅ ${nickname} 遷移成功！`);
        }
    }
    console.log('--- 遷移完成 ---');
    process.exit();
}

migrate();
