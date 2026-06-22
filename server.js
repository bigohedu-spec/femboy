require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 伺服器端舊資料庫路徑 (用於遷移)
const DATA_FILE = path.join(__dirname, 'players_data.json');

// 讀取舊存檔的函數
function loadOldPlayerData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('讀取舊存檔失敗:', e);
    }
    return {};
}

const oldPlayerData = loadOldPlayerData();

// 初始化 Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (!supabase) {
    console.warn('⚠️ 未偵測到 SUPABASE_URL 或 SUPABASE_KEY，將無法儲存資料。請參考 .env.template 設定環境變數。');
}

app.use(express.static(__dirname));

const players = {};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // 處理登入請求
    socket.on('login', async (payload) => {
        const nickname = typeof payload === 'string' ? payload : payload.nickname;
        
        let playerData = null;

        if (supabase) {
            try {
                // 1. 優先從 Supabase 讀取現有資料
                const { data: cloudData } = await supabase
                    .from('players')
                    .select('*')
                    .eq('nickname', nickname)
                    .single();
                
                playerData = cloudData;

                // 2. 檢查舊檔案是否需要強制覆蓋雲端
                if (oldPlayerData[nickname]) {
                    const oldData = oldPlayerData[nickname];
                    // 條件：雲端沒人，或者舊檔案的金鑰/武器更多
                    const shouldMigrate = !playerData || 
                        (oldData.keys > (playerData.keys || 0)) || 
                        (oldData.unlockedWeapons?.length > (playerData.unlockedweapons?.length || 0));

                    if (shouldMigrate) {
                        console.log(`[遷移] 正在將 ${nickname} 的本地資料同步至雲端...`);
                        const migrationSource = {
                            nickname: nickname,
                            keys: oldData.keys || 300,
                            unlockedweapons: oldData.unlockedWeapons || ['rifle', 'pistol'],
                            unlockedskills: oldData.unlockedSkills || []
                        };

                        const { data: upsertedData, error: upsertError } = await supabase
                            .from('players')
                            .upsert([migrationSource])
                            .select()
                            .single();

                        if (!upsertError) {
                            playerData = upsertedData;
                            console.log(`[成功] ${nickname} 資料同步完成！`);
                        } else {
                            console.error('[失敗] 同步雲端錯誤:', upsertError);
                        }
                    }
                }
            } catch (e) {
                console.error('Supabase 流程錯誤:', e);
            }
        }

        // 3. 如果依然沒資料 (完全的新玩家)
        if (!playerData && supabase) {
            try {
                const newData = {
                    nickname: nickname,
                    keys: 300,
                    unlockedweapons: ['rifle', 'pistol'],
                    unlockedskills: []
                };
                const { data: insertedData } = await supabase
                    .from('players')
                    .insert([newData])
                    .select()
                    .single();
                playerData = insertedData;
            } catch (e) {
                console.error('建立新玩家失敗:', e);
            }
        }

        // 4. 如果 Supabase 失敗或未設定，回退到記憶體模式 (非持久化)
        if (!playerData) {
            playerData = {
                nickname: nickname,
                keys: 300,
                unlockedweapons: ['rifle', 'pistol'],
                unlockedskills: []
            };
        }
        
        // 將存檔發送回客戶端
        socket.emit('loginSuccess', {
            nickname: nickname,
            data: playerData
        });

        // 綁定暱稱到連線物件
        if (players[socket.id]) {
            players[socket.id].nickname = nickname;
        }
    });

    // 處理進度儲存
    socket.on('saveProgress', async (data) => {
        if (data.nickname && supabase) {
            try {
                const { error } = await supabase
                    .from('players')
                    .update({
                        keys: data.keys,
                        unlockedweapons: data.unlockedWeapons,
                        unlockedskills: data.unlockedSkills || []
                    })
                    .eq('nickname', data.nickname);

                if (error) {
                    console.error('儲存到 Supabase 失敗:', error);
                }
            } catch (e) {
                console.error('儲存時發生錯誤:', e);
            }
        }
    });

    // 初始化新玩家
    players[socket.id] = {
        id: socket.id,
        position: { x: 0, y: 1.6, z: 0 },
        rotation: { y: 0 },
        hp: 250,
        score: 0,
        weapon: 'rifle'
    };

    // 發送現有玩家給新玩家
    socket.emit('currentPlayers', players);

    // 廣播新玩家給其他玩家
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // 處理位置更新
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].position = movementData.position;
            players[socket.id].rotation = movementData.rotation;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // 處理受傷
    socket.on('playerHit', (data) => {
        const targetId = data.targetId;
        const damage = data.damage;
        if (players[targetId]) {
            players[targetId].hp -= damage;
            if (players[targetId].hp <= 0) {
                players[targetId].hp = 150; // 復活
                if (players[socket.id]) players[socket.id].score += 1;
                io.emit('playerDeath', { victimId: targetId, killerId: socket.id, players: players });
            } else {
                io.emit('hpUpdate', { id: targetId, hp: players[targetId].hp });
            }
        }
    });

    // 處理射擊
    socket.on('playerFire', (fireData) => {
        socket.broadcast.emit('playerFired', {
            id: socket.id,
            ...fireData
        });
    });

    // 處理斷線
    socket.on('disconnect', async () => {
        console.log('Player disconnected:', socket.id);
        const player = players[socket.id];
        if (player && player.nickname && player.score > 0 && supabase) {
            try {
                // 斷線時更新總擊殺數 (累加)
                const { data: currentData } = await supabase
                    .from('players')
                    .select('total_kills')
                    .eq('nickname', player.nickname)
                    .single();
                
                const newTotal = (currentData?.total_kills || 0) + player.score;
                
                await supabase
                    .from('players')
                    .update({ total_kills: newTotal })
                    .eq('nickname', player.nickname);
            } catch (e) {
                console.error('斷線更新數據失敗:', e);
            }
        }
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });

    // 獲取全球排行榜
    socket.on('getGlobalLeaderboard', async () => {
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('players')
                    .select('nickname, total_kills')
                    .order('total_kills', { ascending: false })
                    .limit(10);
                
                if (!error) {
                    socket.emit('globalLeaderboardData', data);
                }
            } catch (e) {
                console.error('獲取排行榜失敗:', e);
            }
        }
    });
});

let PORT = process.env.PORT || 3000;

function startServer(port) {
    server.listen(port, '0.0.0.0', () => {
        console.log('=========================================');
        console.log(`🚀 多人連線伺服器啟動成功！`);
        console.log(`🔗 伺服器運行端口: ${port}`);
        console.log('=========================================');
    }).on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.log(`⚠️  端口 ${port} 已被佔用，嘗試切換到 ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('❌ 伺服器啟動出錯：', e);
        }
    });
}

startServer(PORT);
