-- 在 Supabase 的 SQL Editor 中執行以下指令來建立資料表

CREATE TABLE IF NOT EXISTS players (
    nickname TEXT PRIMARY KEY,
    keys INTEGER DEFAULT 300,
    unlockedWeapons JSONB DEFAULT '["rifle", "pistol"]'::jsonb,
    unlockedSkills JSONB DEFAULT '[]'::jsonb,
    total_kills INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 開啟 Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- 建立原則：允許匿名存取（這取決於您的安全需求，開發階段可以先全開）
CREATE POLICY "Allow public read and write" ON players
    FOR ALL
    USING (true)
    WITH CHECK (true);
