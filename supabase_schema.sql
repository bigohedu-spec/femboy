-- 在 Supabase 的 SQL Editor 中執行以下指令來建立資料表

CREATE TABLE IF NOT EXISTS players (
    nickname TEXT PRIMARY KEY,
    keys INTEGER DEFAULT 300,
    coins INTEGER DEFAULT 300,
    unlockedWeapons JSONB DEFAULT '["rifle", "pistol"]'::jsonb,
    unlockedSkills JSONB DEFAULT '[]'::jsonb,
    owned_items JSONB DEFAULT '[]'::jsonb,
    weapon_kills JSONB DEFAULT '{}'::jsonb,
    total_kills INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 建立成就資料表
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    nickname TEXT REFERENCES players(nickname),
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(nickname, achievement_id)
);

-- 開啟 Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- 建立原則：允許匿名存取
CREATE POLICY "Allow public read and write" ON players
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public read and write achievements" ON achievements
    FOR ALL
    USING (true)
    WITH CHECK (true);
