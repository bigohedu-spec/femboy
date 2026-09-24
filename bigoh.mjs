#!/usr/bin/env node
// Big-Oh Hosting CLI v0.1.0 — 建置於 2026-09-09T09:56:49.023Z
// 原始碼：packages/cli/src/bigoh.mjs（沒有壓縮，可以直接讀）
/**
 * Big-Oh Hosting CLI —— 讓 AI 自己完成部署。
 *
 * 單一檔案、**零相依**。學生（或他的 AI）只要有 Node 就能跑：
 *
 *   node bigoh.mjs login      連接這台電腦（只要做一次）
 *   node bigoh.mjs deploy     把目前資料夾發布上去
 *   node bigoh.mjs whoami     我是誰、我有哪些作品
 *   node bigoh.mjs logout     斷開這台電腦
 *
 * ── 為什麼憑證放在 ~/.bigoh/ 而不是專案資料夾 ─────────────────────────
 * §1 前提 2：學生會把程式碼貼給 AI、貼到群組、互相傳。
 * 只要 token 不在那包東西裡面，那件事就不會變成外洩。
 * 這也是 H1 說的「學生的**程式碼**不得持有憑證」—— 家目錄的設定檔不是程式碼。
 *
 * ── 為什麼用 device flow ─────────────────────────────────────────────
 * 如果讓學生從網頁複製一段 token 貼進終端機，那段 token 會經過剪貼簿，
 * 而小學生**一定**會順手貼進 AI 對話框問「這是什麼」。
 * device flow 讓 token 只在「伺服器 → CLI → 磁碟」之間走，
 * 學生從頭到尾只看到一個 8 碼短碼。
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
  rmSync,
} from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import { homedir } from 'node:os';
import { deflateRawSync } from 'node:zlib';

/* ══════════════════════════════════════════════════ 設定 ══════════ */

const CONFIG_DIR = join(homedir(), '.bigoh');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/** 預設的 API 位置。可以用 BIGOH_API 覆蓋（本機開發用）。 */
const DEFAULT_API = process.env.BIGOH_API || 'https://api.bigoh.uk';

/**
 * 這些數字的真相來源是 packages/shared/src/{quotas,tiers}.js。
 * CLI 是獨立檔案不能 import，所以抄一份在這裡 ——
 * tests/cli.test.js 會逐一比對，抄錯會讓測試紅字。
 *
 * 在本機先擋一次的理由：學生上傳 20 MB 才被伺服器拒絕，那 20 MB 的等待是白費的。
 */
const ALLOWED_EXT = new Set([
  'html',
  'css',
  'js',
  'mjs',
  'json',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'svg',
  'ktx2',
  'basis',
  'glb',
  'gltf',
  'bin',
  'obj',
  'mtl',
  'fbx',
  'hdr',
  'exr',
  'mp3',
  'wav',
  'ogg',
  'm4a',
  'mp4',
  'webm',
  'woff',
  'woff2',
  'txt',
  'md',
  'csv',
]);

const MAX_FILES = 500;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 24 * 1024 * 1024;
const WARN_BYTES = 30 * 1024 * 1024;

/** 不會被上傳的東西。包含「絕對不能上傳」的那幾個。 */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.github',
  '.vscode',
  '.wrangler',
  'dist',
  'build',
  '__MACOSX',
  '.next',
  '.cache',
]);
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db', '.env', '.gitignore', 'bigoh.mjs']);

/* ══════════════════════════════════════════════════ 進入點 ════════ */

const [, , command, ...rest] = process.argv;
const flags = parseFlags(rest);

/**
 * 分派包在函式裡，在**檔案最後一行**才呼叫。
 *
 * 直接寫在這個位置的話，下面那些 const（STARTER_HTML、COPILOT_INSTRUCTIONS…）
 * 還沒初始化就被用到，會炸「Cannot access 'STARTER_HTML' before initialization」。
 * 那個訊息對小學生毫無意義，所以寧可把進入點移到檔案最後面。
 */
async function main() {
  try {
    switch (command) {
      case 'login':
        await login();
        break;
      case 'logout':
        await logout();
        break;
      case 'whoami':
        await whoami();
        break;
      case 'deploy':
        await deploy();
        break;
      case 'init':
        await init();
        break;
      default:
        usage();
        process.exit(command ? 1 : 0);
    }
  } catch (err) {
    // 學生看到的最後一行一定是中文，而且說得出下一步（§13）。
    console.error(`\n✗ ${err.message}`);
    if (process.env.BIGOH_DEBUG) console.error(err);
    process.exit(1);
  }
}

function usage() {
  console.log(`
Big-Oh Hosting —— 把你的作品放到網路上

  node bigoh.mjs login             連接這台電腦（只要做一次）
  node bigoh.mjs deploy            把目前資料夾發布上去
  node bigoh.mjs deploy --slug 名字  指定網址（第一次會問你）
  node bigoh.mjs whoami            我是誰、我有哪些作品
  node bigoh.mjs logout            斷開這台電腦
  node bigoh.mjs init              產生 index.html 與給 AI 看的說明檔

網址會長這樣：https://你取的名字.bigoh.uk
`);
}

/* ══════════════════════════════════════════════ 連接這台電腦 ══════ */

async function login() {
  const label = flags.label ?? `${process.env.COMPUTERNAME || process.env.HOSTNAME || '這台電腦'}`;
  const start = await api('POST', '/v1/cli/device', { label });

  console.log(`
┌────────────────────────────────────────────┐
│  請在瀏覽器打開：                          │
│    ${start.verifyUrl.padEnd(38)}│
│                                            │
│  然後輸入這個代碼：                        │
│                                            │
│         ${start.userCode.padEnd(35)}│
│                                            │
└────────────────────────────────────────────┘

等你按「允許」…（${Math.floor(start.expiresIn / 60)} 分鐘內有效）`);

  const deadline = Date.now() + start.expiresIn * 1000;
  while (Date.now() < deadline) {
    await sleep(start.interval * 1000);
    const res = await apiRaw('POST', '/v1/cli/device/token', {
      deviceCode: start.deviceCode,
    });
    if (res.status === 428) {
      process.stdout.write('.');
      continue;
    }
    if (!res.ok) throw new Error(res.body.message ?? '連接失敗。請重新執行一次 login。');

    saveConfig({
      token: res.body.token,
      apiOrigin: res.body.apiOrigin ?? DEFAULT_API,
      expiresAt: res.body.expiresAt,
    });
    console.log(`\n\n✓ 連接好了，${res.body.student.nickname}！`);
    console.log(`  憑證存在 ${CONFIG_FILE}`);
    console.log('  （它不在你的專案資料夾裡，所以把程式碼分享給別人不會外洩）\n');
    console.log('  接下來：node bigoh.mjs deploy');
    return;
  }
  throw new Error('等太久了，這次的連接逾時。請重新執行一次 login。');
}

async function logout() {
  if (existsSync(CONFIG_FILE)) rmSync(CONFIG_FILE);
  console.log('✓ 已經斷開這台電腦。');
}

async function whoami() {
  const me = await api('GET', '/v1/cli/whoami');
  console.log(`\n${me.student.nickname}（${me.student.classId} 班）\n`);
  if (!me.projects.length) {
    console.log('  還沒有作品。用 node bigoh.mjs deploy 發布第一個吧！\n');
    return;
  }
  for (const p of me.projects) {
    const mark = p.status === 'published' ? '●' : '○';
    console.log(`  ${mark} ${p.title}`);
    console.log(`    ${p.url}`);
  }
  console.log('');
}

/* ══════════════════════════════════════════════════ 部署 ══════════ */

async function deploy() {
  const dir = flags.dir ? join(process.cwd(), flags.dir) : process.cwd();
  const slug = flags.slug ?? guessSlug(dir);
  const title = flags.title ?? slug;

  console.log(`\n正在打包 ${dir}…`);
  const files = collectFiles(dir);

  if (!files.some((f) => f.path === 'index.html')) {
    throw new Error(
      '這個資料夾裡沒有 index.html。\n' +
        '  作品的第一頁一定要叫 index.html（全部小寫）。\n' +
        '  還沒開始寫的話可以跑：node bigoh.mjs init',
    );
  }

  const total = files.reduce((n, f) => n + f.bytes, 0);
  if (files.length > MAX_FILES) {
    throw new Error(`檔案太多了（${files.length} 個，上限 ${MAX_FILES} 個）。請刪掉用不到的檔案。`);
  }
  if (total > MAX_TOTAL_BYTES) {
    throw new Error(
      `作品太大了（${mb(total)} MB，上限 ${mb(MAX_TOTAL_BYTES)} MB）。請把最大的圖片或模型換小一點。`,
    );
  }

  for (const f of files) {
    const ext = extname(f.path).slice(1).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw new Error(
        `檔案「${f.path}」的類型（.${ext || '沒有副檔名'}）不能上傳。\n` +
          '  請把它刪掉，或改成圖片、音效、模型這類允許的檔案。',
      );
    }
  }

  for (const f of files) console.log(`  + ${f.path}  ${kb(f.bytes)}`);
  console.log(`  共 ${files.length} 個檔案 / ${mb(total)} MB`);

  if (total > WARN_BYTES) {
    console.log(`\n⚠ 這個作品有 ${mb(total)} MB，在教室的筆電上可能要載很久。`);
    console.log('  建議把 .glb 用 Draco 壓縮、圖片換成 KTX2。（還是可以發布）');
  }

  const zip = makeZip(files.map((f) => ({ path: f.path, body: readFileSync(f.abs) })));
  if (zip.length > MAX_UPLOAD_BYTES) {
    throw new Error(
      `壓縮後還是太大（${mb(zip.length)} MB，一次最多 ${mb(MAX_UPLOAD_BYTES)} MB）。\n` +
        '  請把最大的圖片或模型換小一點，或問老師。',
    );
  }

  console.log(`\n上傳中…（${mb(zip.length)} MB）`);
  const q = `?slug=${encodeURIComponent(slug)}&title=${encodeURIComponent(title)}`;
  const res = await apiRaw('POST', `/v1/deploy${q}`, zip, 'application/zip');

  if (!res.ok) throw new Error(res.body.message ?? `發布失敗（HTTP ${res.status}）`);

  for (const w of res.body.warnings ?? []) console.log(`\n⚠ ${w}`);

  if (res.body.live) {
    console.log(`\n✓ 上線了！\n`);
    console.log(`    ${res.body.url}\n`);
    console.log(`  作品頁：${res.body.pageUrl}`);
    console.log(`  版本：v${res.body.version}（舊版都留著，隨時可以還原）\n`);
  } else {
    console.log(`\n✓ 送出了（v${res.body.version}）。${res.body.hint ?? ''}\n`);
  }
}

/* ══════════════════════════════════════════════════ init ═════════ */

async function init() {
  const dir = process.cwd();
  const wrote = [];

  if (!existsSync(join(dir, 'index.html'))) {
    writeFileSync(join(dir, 'index.html'), STARTER_HTML, 'utf8');
    wrote.push('index.html');
  }

  const ghDir = join(dir, '.github');
  mkdirSync(ghDir, { recursive: true });
  const instructions = join(ghDir, 'copilot-instructions.md');
  if (!existsSync(instructions)) {
    writeFileSync(instructions, COPILOT_INSTRUCTIONS, 'utf8');
    wrote.push('.github/copilot-instructions.md');
  }

  if (wrote.length === 0) {
    console.log('這個資料夾已經準備好了，直接跑 node bigoh.mjs deploy 就可以。');
    return;
  }
  console.log('\n✓ 建好了：');
  for (const f of wrote) console.log(`  ${f}`);
  console.log(`
  .github/copilot-instructions.md 是給 AI 看的說明。
  VS Code 的 Copilot 會自動讀它，然後就知道這個平台的規則
  （哪些檔案能用、不能連外站、three.js 怎麼 import…）。

  接下來跟 Copilot 說「幫我做一個 XXX，然後部署上去」就好。
`);
}

/* ══════════════════════════════════════════════ HTTP / 設定檔 ════ */

function loadConfig() {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error('還沒有連接這台電腦。請先執行：node bigoh.mjs login');
  }
  const cfg = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  if (cfg.expiresAt && cfg.expiresAt < Date.now()) {
    throw new Error('連接過期了。請重新執行：node bigoh.mjs login');
  }
  return cfg;
}

function saveConfig(cfg) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  });
}

/** 需要憑證的呼叫。 */
async function api(method, path, body) {
  const res = await apiRaw(method, path, body);
  if (!res.ok) throw new Error(res.body.message ?? `伺服器回了 HTTP ${res.status}`);
  return res.body;
}

async function apiRaw(method, path, body, contentType) {
  // login 的前兩步還沒有憑證，其餘都要。
  const anonymous = path.startsWith('/v1/cli/device');
  const cfg = anonymous ? { apiOrigin: DEFAULT_API } : loadConfig();
  const origin = process.env.BIGOH_API || cfg.apiOrigin || DEFAULT_API;

  const headers = {};
  if (!anonymous) headers.authorization = `Bearer ${cfg.token}`;
  let payload;
  if (body instanceof Uint8Array) {
    headers['content-type'] = contentType ?? 'application/octet-stream';
    payload = body;
  } else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(origin + path, { method, headers, body: payload });
  } catch (err) {
    throw new Error(`連不上伺服器（${origin}）。檢查一下網路，或問老師。`);
  }
  const text = await res.text();
  let parsed = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { message: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

/* ══════════════════════════════════════════════ 檔案與 ZIP ═══════ */

function collectFiles(dir) {
  const out = [];
  walk(dir);
  return out.sort((a, b) => a.path.localeCompare(b.path));

  function walk(current) {
    for (const name of readdirSync(current)) {
      const abs = join(current, name);
      const st = statSync(abs);
      if (st.isDirectory()) {
        if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
        walk(abs);
      } else {
        if (SKIP_FILES.has(name) || name.startsWith('.')) continue;
        const path = relative(dir, abs).split('\\').join('/');
        out.push({ path, abs, bytes: st.size });
      }
    }
  }
}

/** 從資料夾名字猜一個合法的網址名稱。 */
function guessSlug(dir) {
  const base = dir.split(/[\\/]/).filter(Boolean).pop() ?? 'my-project';
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  if (!/^[a-z][a-z0-9-]{2,29}$/.test(slug)) {
    throw new Error(
      `沒辦法從資料夾名字「${base}」想出網址。\n` +
        '  請自己指定一個：node bigoh.mjs deploy --slug kai-dino\n' +
        '  （只能用小寫英文、數字和短橫線，開頭要是英文字母，3 到 30 個字）',
    );
  }
  return slug;
}

/* --------- 最小的 ZIP 產生器。零相依，只用 node:zlib 的 deflate。 --------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeZip(files) {
  const enc = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const f of files) {
    // flag bit 11 = 檔名是 UTF-8。一定要設 —— 不設的話伺服器會擋下來
    // 要學生把中文檔名改成英文（§9 陷阱 10）。
    const nameBytes = enc.encode(f.path);
    const raw = f.body;
    const deflated = deflateRawSync(raw);
    // 壓不小就用 stored，省得解壓縮還變大。
    const useDeflate = deflated.length < raw.length;
    const data = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);

    const lfh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lfh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x800, true);
    lv.setUint16(8, method, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lfh.set(nameBytes, 30);
    locals.push(lfh, data);

    const cdh = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdh.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x800, true);
    cv.setUint16(10, method, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cdh.set(nameBytes, 46);
    centrals.push(cdh);

    offset += lfh.length + data.length;
  }

  const cdSize = centrals.reduce((n, c) => n + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);

  const parts = [...locals, ...centrals, eocd];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/* ══════════════════════════════════════════════════ 雜項 ═════════ */

function parseFlags(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else out[key] = true;
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mb = (n) => (Math.round((n / 1048576) * 10) / 10).toString();
const kb = (n) => (n < 1024 ? `${n} B` : `${Math.round(n / 1024)} KB`);

/* ══════════════════════════════════════════════ init 的樣板 ══════ */

const STARTER_HTML = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>我的作品</title>
<style>
  body { margin: 0; display: grid; place-items: center; min-height: 100vh;
         font-family: system-ui, sans-serif; background: #10131a; color: #fff; }
</style>
</head>
<body>
  <h1>哈囉！</h1>
  <script>
    console.log('開始寫你的作品吧');
  </script>
</body>
</html>
`;

/**
 * 給 Copilot 看的專案限制。
 *
 * ⚠ **內容不寫在這裡。** 規則的唯一真相是
 *   packages/shared/src/student-docs.js 的 rulesMarkdown()。
 *   scripts/build-cli.mjs 在建置時把下面這個佔位字串換成真的內容
 *   （找不到佔位字串就直接讓建置失敗，不會靜默產生壞掉的 CLI）。
 *
 * 為什麼要這樣繞：CLI 是零相依的單檔，學生 curl 下來就跑，
 * 沒辦法在執行時 import packages/shared。
 */
const COPILOT_INSTRUCTIONS = "# 專案限制（給 AI 看的）\n\n> **這份文件是給 AI 助手（例如 VS Code Copilot）看的。**\n> 你正在幫一位國小三到六年級的學生做網頁作品，這個作品最後要放到\n> **Big-Oh Hosting**（`bigoh.uk`）。這裡寫的是**寫程式的時候**必須遵守的限制。\n>\n> 做完之後怎麼上架，看另一份 `DEPLOY-FOR-AI.md`。\n\n---\n\n## 最重要的一件事：這裡不能跑伺服器\n\n**這個平台只放「瀏覽器裡跑得動的東西」。沒有 Node、沒有 Python、沒有常駐後端。**\n\n所以下面這些**全部不能用**：\n\n| 你可能想寫的 | 為什麼不行 |\n|---|---|\n| `express`、`fastify`、任何 `server.js` | 平台不執行伺服器程式，檔案不會被跑起來 |\n| `socket.io` | 同上。多人連線用 `BO.room`（見下面） |\n| `npm install`、`package.json`、打包工具 | 平台不做安裝也不做 build，上傳什麼就跑什麼 |\n| Firebase / Supabase / 任何外部資料庫 | 需要金鑰。**學生不能持有金鑰** —— 發布掃描看到金鑰特徵就直接拒絕上線（外部 API 本身是可以打的，見下面，但**需要金鑰的不行**）|\n| 自己接的登入系統 | 用 `BO.account`（見下面） |\n\n**但你需要的功能平台都有** —— 存檔、排行榜、多人連線、帳號登入，\n全部用全域的 `window.BO`，不用 import、不用網址、不用金鑰。往下看。\n\n> 如果學生給你一份原本用 Express + socket.io + Supabase 寫的專案，\n> **不要試圖保留那個架構**。把它改寫成「靜態前端 + BO」才是對的做法。\n\n---\n\n## 平台提供的功能：`window.BO`\n\n作品等級是 L2 以上時，平台會自動注入 `bo.js`，全域就有 `BO` 可以用。\n不需要 `import`、不需要 `<script src>`、不需要任何設定值。\n\n```js\n// 存檔（每個作品 100 格，每筆最多 8 KB）\nawait BO.set('level', 7);\nconst lv = await BO.get('level');\n\n// 排行榜（每個作品 3 個榜，各留前 100。名字由平台決定，不能自己傳）\nawait BO.score('main', 120);\nconst top = await BO.top('main', 10);   // [{ name, score, at }]\n\n// 計數器\nconst plays = await BO.bump('plays');\n\n// 留言板（先審後顯：AI 初審通過才會出現）\nawait BO.post('guestbook', '很好玩');\nconst msgs = await BO.list('guestbook', 20);\n```\n\n### 多人連線（取代 socket.io）\n\n```js\nconst room = await BO.room.create({ max: 8 });   // 回一個 4 碼房號\n// 或 const room = await BO.room.join('K3F9');\n\nroom.on('join',  (p) => spawn(p.id, p.name));\nroom.on('leave', (p) => remove(p.id));\n\nroom.state({ x, y, z, ry });   // 可以每幀呼叫，平台會節流 + 只送有變化的欄位\nroom.players;                  // 座標**已經內插過**，直接 mesh.position.set(p.x,p.y,p.z) 就是順的\n\nroom.send('shoot', { dir: [0,0,-1] });\nroom.on('shoot', (p, data) => bullet(p.id, data.dir));\n\nroom.isHost;                   // 第一個進來的人\nroom.setShared({ round: 2 });  // 房主設定，全房同步\nroom.on('shared', (s) => applyRound(s.round));\n```\n\n一間房最多 **8 人**，單一作品同時最多 **20 間房**。\n**沒有配對系統，只有 4 碼房號** —— 教室裡喊房號比任何配對機制好用。\n房主離線會自動換人。**不要自己寫節流或內插**，SDK 已經做掉了。\n\n### 帳號登入（取代自己做 login）\n\n```js\nawait BO.account.signup(暱稱, 密碼);   // 密碼由平台雜湊，你碰不到\nawait BO.account.login(暱稱, 密碼);    // 登入後存檔/排行自動綁這個帳號、跨裝置\nBO.account.current();                  // { id, nickname } 或 null\nBO.account.logout();\n```\n\n不需要密碼的話，`BO.visitor` 本來就存在（匿名 id + 可愛暱稱），存檔會綁它。\n\n**所有 `BO` 的錯誤訊息都是中文**，可以直接顯示給學生看。\n\n---\n\n## 外部 API：**可以用**，但有三件事不行\n\n`fetch()` 打外部網址是**允許的**（GET、POST 都可以）：\n\n```js\nconst r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=25&longitude=121&current=temperature_2m');\nconst data = await r.json();\n```\n\n但這三件事仍然被擋：\n\n| 不行的事 | 為什麼 |\n|---|---|\n| **需要金鑰的 API** | 發布掃描會攔下看起來像金鑰的字串，直接拒絕上線。<br>未成年不該申請第三方金鑰，而且金鑰放在前端等於公開給所有人用 |\n| **外部 `<script src=\"https://…\">`** | 那是讓別人的程式碼在你的作品裡執行 —— 跟「讀一份資料」完全不同等級 |\n| **外部圖片／音樂／字型**（`<img src=\"https://…\">`） | 兒童站台上不顯示未經檢查的外部內容 |\n\n所以：**找不需要金鑰的公開 API**（天氣、公開資料、圖鑑那類）。\n如果 API 回傳的是圖片網址，你**沒辦法直接顯示它** —— 要嘛換一個回傳文字的 API，\n要嘛把圖片存進專案一起上傳。\n\n> 給 AI 的提醒：外部 API 隨時可能掛掉或改格式。\n> **一定要用 `try/catch` 包起來，失敗時給一句中文提示**，\n> 不要讓整個遊戲因為天氣 API 沒回應就整頁空白。\n\n---\n\n## 可以用的函式庫\n\n直接 bare import，平台已經準備好，**不要自己寫 `<script type=\"importmap\">`**：\n\n```js\nimport * as THREE from 'three';                                    // 0.169\nimport { OrbitControls } from 'three/addons/controls/OrbitControls.js';\nimport { GLTFLoader }   from 'three/addons/loaders/GLTFLoader.js';\nimport { DRACOLoader }  from 'three/addons/loaders/DRACOLoader.js';\nimport RAPIER from 'rapier';    // 物理，0.14\nimport * as Tone from 'tone';   // 音樂，15\nimport p5 from 'p5';            // 畫圖，1.9\n```\n\n**只有這幾個。** 需要別的函式庫，把它的檔案放進專案一起上傳\n（但不能從外部網址載入）。\n\n> ⚠ **絕對不要自己寫 importmap。** 平台會自動注入指向自家 CDN 的那一份；\n> 你自己寫了平台就不注入，結果會去作品自己的網域找檔案 → 全部 404、\n> 畫面停在載入中。這是最常見也最難查的錯。\n\n---\n\n## 會讓部署被**拒絕**的東西\n\n這幾項是自動掃描，命中就直接退回，不會上線：\n\n1. **廣告程式碼**（`adsbygoogle`、`googlesyndication` 等）\n   平台自己在外框頁處理廣告，作品裡不可以有。\n2. **API 金鑰或資料庫設定**（`apiKey:`、`authDomain:`、`firebaseapp.com`、\n   `supabase`、AWS/OpenAI 金鑰、私鑰檔等）—— 所以**需要金鑰的外部 API 用不了**\n3. **真名、學校、班級、學號**當作者名 —— 只能用暱稱。\n4. **不允許的副檔名**（見下面白名單）\n5. **中文檔名** —— 壓縮時會變亂碼，之後網址對不上。\n\n---\n\n## 檔案規則\n\n- 第一頁一定要叫 **`index.html`**（全小寫，放專案根目錄）\n- 檔名只用**英文、數字、`-`、`_`**\n- 允許的副檔名：\n\n```\nhtml css js mjs json\npng jpg jpeg gif webp avif svg ktx2 basis\nglb gltf bin obj mtl fbx hdr exr\nmp3 wav ogg m4a mp4 webm\nwoff woff2 txt md csv\n```\n\n- 單一作品最多 **500 個檔案**、**150 MB**\n- **一次上傳最多 24 MB** —— 素材太大要壓（`.glb` 用 Draco、貼圖用 KTX2）\n- 超過 30 MB 會跳警告（教室筆電會載很久），但不擋\n\n---\n\n## 效能：目標是教室的舊筆電\n\n**1366×768 的老機器**，不是你的開發機。\n\n```js\nrenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));\n```\n\n不要做太吃效能的東西：粒子數量、光源數量、後製效果都要克制。\n載入時間也算 —— 學生會在很慢的網路上打開。\n\n---\n\n## 使用者是九到十二歲的小朋友\n\n- 介面文字、註解、你跟學生講的話，**一律用繁體中文**\n- 講白話，不要用專有名詞\n- 出錯時告訴他「要改哪裡」，**不要貼英文堆疊追蹤**\n- 平台回的錯誤訊息本來就是中文而且會說下一步，照著做就好\n\n---\n\n## 快速自我檢查\n\n寫完之後，對照這幾條：\n\n- [ ] 有 `index.html` 在根目錄，檔名全是英數\n- [ ] 沒有 `<script type=\"importmap\">`\n- [ ] 沒有外部 `<script src>`、外部圖片／字型（fetch 外部 API 可以）\n- [ ] 沒有 `package.json` / `server.js` / `node_modules`\n- [ ] 沒有金鑰、沒有 Firebase/Supabase 設定\n- [ ] 沒有廣告碼\n- [ ] 作者名是暱稱\n- [ ] 需要存檔／排行／多人／登入的地方，用的是 `BO`\n\n全部打勾就可以照 `DEPLOY-FOR-AI.md` 上架了。\n";

/* ══ 進入點在最後：上面所有的 const 都初始化完了才開始跑 ══ */

await main();
