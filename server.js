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

        // 1. 優先嘗試從本地 JSON 載入基礎資料
        if (oldPlayerData[nickname]) {
            const oldData = oldPlayerData[nickname];
            playerData = {
                nickname: nickname,
                keys: oldData.keys || 300,
                unlockedweapons: oldData.unlockedWeapons || ['rifle', 'pistol'],
                unlockedskills: oldData.unlockedSkills || []
            };
        }

        // 2. 如果有 Supabase，嘗試從雲端同步
        if (supabase) {
            try {
                // 讀取雲端現有資料
                const { data: cloudData } = await supabase
                    .from('players')
                    .select('*')
                    .eq('nickname', nickname)
                    .single();
                
                if (cloudData) {
                    // 如果雲端有資料，檢查是否需要從本地遷移 (以金鑰或武器數量判斷)
                    const shouldMigrate = !playerData || 
                        (playerData.keys > (cloudData.keys || 0)) || 
                        (playerData.unlockedweapons?.length > (cloudData.unlockedWeapons?.length || cloudData.unlockedweapons?.length || 0));

                    if (shouldMigrate && playerData) {
                        console.log(`[遷移] 正在將 ${nickname} 的本地資料同步至雲端...`);
                        const { data: upsertedData, error: upsertError } = await supabase
                            .from('players')
                            .upsert([{
                                nickname: nickname,
                                keys: playerData.keys,
                                unlockedweapons: playerData.unlockedweapons,
                                unlockedskills: playerData.unlockedskills
                            }])
                            .select()
                            .single();

                        if (!upsertError) {
                            playerData = upsertedData;
                            console.log(`[成功] ${nickname} 資料同步完成！`);
                        }
                    } else {
                        // 否則以雲端資料為準
                        playerData = cloudData;
                    }
                } else if (playerData) {
                    // 雲端沒資料但本地有，直接上傳本地資料
                    const { data: insertedData } = await supabase
                        .from('players')
                        .insert([{
                            nickname: nickname,
                            keys: playerData.keys,
                            unlockedweapons: playerData.unlockedweapons,
                            unlockedskills: playerData.unlockedskills
                        }])
                        .select()
                        .single();
                    if (insertedData) playerData = insertedData;
                }
            } catch (e) {
                console.error('Supabase 同步錯誤:', e);
            }
        }

        // 3. 如果依然沒資料 (完全的新玩家)
        if (!playerData) {
            playerData = {
                nickname: nickname,
                keys: 300,
                unlockedweapons: ['rifle', 'pistol'],
                unlockedskills: []
            };
            
            // 如果有 Supabase，在雲端建立新玩家
            if (supabase) {
                try {
                    const { data: insertedData } = await supabase
                        .from('players')
                        .insert([playerData])
                        .select()
                        .single();
                    if (insertedData) playerData = insertedData;
                } catch (e) {
                    console.error('建立雲端新玩家失敗:', e);
                }
            }
        }
        
        // 將存檔發送回客戶端 (確保欄位名稱相容性)
        socket.emit('loginSuccess', {
            nickname: nickname,
            data: {
                ...playerData,
                unlockedSkills: playerData.unlockedskills || [],
                unlockedWeapons: playerData.unlockedweapons || ['rifle', 'pistol']
            }
        });

        // 綁定暱稱到連線物件
        if (players[socket.id]) {
            players[socket.id].nickname = nickname;
        }
    });

    // 處理進度儲存
    socket.on('saveProgress', async (data) => {
        if (!data.nickname) return;

        // 1. 更新本地資料 (即使沒有 Supabase 也能持久化)
        const updateData = {
            keys: data.keys,
            unlockedWeapons: data.unlockedWeapons || ['rifle', 'pistol'],
            unlockedSkills: data.unlockedSkills || []
        };
        
        oldPlayerData[data.nickname] = updateData;

        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(oldPlayerData, null, 2));
        } catch (e) {
            console.error('儲存本地存檔失敗:', e);
        }

        // 2. 如果有 Supabase，同步到雲端
        if (supabase) {
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
        weapon: 'rifle',
        room: 'global' // 預設在大廳
    };

    // 處理加入房間 (單挑模式)
    socket.on('joinDuel', (roomCode) => {
        const room = roomCode || 'global';
        
        // 檢查房間人數 (如果是單挑模式，限制 2 人)
        if (room !== 'global') {
            const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
            if (roomSize >= 2) {
                socket.emit('duelError', '房間已滿 (最多 2 人)');
                return;
            }
        }

        // 離開舊房間
        const oldRoom = players[socket.id].room;
        socket.leave(oldRoom);
        
        // 加入新房間
        socket.join(room);
        players[socket.id].room = room;
        
        console.log(`Player ${socket.id} joined room: ${room}`);

        // 發送房間內的玩家給該玩家
        const roomPlayers = {};
        Object.keys(players).forEach(id => {
            if (players[id].room === room) roomPlayers[id] = players[id];
        });
        socket.emit('currentPlayers', roomPlayers);

        // 廣播給房間內其他人
        socket.to(room).emit('newPlayer', players[socket.id]);
        socket.emit('duelJoined', room);
    });

    // 處理位置更新
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            const room = players[socket.id].room;
            players[socket.id].position = movementData.position;
            players[socket.id].rotation = movementData.rotation;
            socket.to(room).emit('playerMoved', players[socket.id]);
        }
    });

    // 處理受傷
    socket.on('playerHit', (data) => {
        const targetId = data.targetId;
        const damage = data.damage;
        if (players[targetId]) {
            const room = players[socket.id].room;
            players[targetId].hp -= damage;
            if (players[targetId].hp <= 0) {
                players[targetId].hp = 150; // 復活
                if (players[socket.id]) players[socket.id].score += 1;
                io.to(room).emit('playerDeath', { victimId: targetId, killerId: socket.id, players: players });
            } else {
                io.to(room).emit('hpUpdate', { id: targetId, hp: players[targetId].hp });
            }
        }
    });

    // 處理射擊
    socket.on('playerFire', (fireData) => {
        const room = players[socket.id].room;
        socket.to(room).emit('playerFired', {
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
