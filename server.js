const express = require('express');
const { fork } = require('child_process');
const path = require('path');
const { BOT_TOKEN, ADMIN_IDS } = require('./config');
const {
  initDatabase,
  getBannedWords,
  getActiveWarningsCount,
  getTempBansCount
} = require('./database');

let botRunning = false;
let botProcess = null;

function runBot() {
  botProcess = fork(path.join(__dirname, 'bot.js'), [], {
    env: { ...process.env },
    stdio: 'inherit'
  });
  
  botRunning = true;
  console.log('Starting Telegram bot in background process...');
  
  botProcess.on('exit', (code) => {
    console.log(`Bot process exited with code ${code}`);
    botRunning = false;
  });
  
  botProcess.on('error', (err) => {
    console.error('Bot process error:', err);
    botRunning = false;
  });
}

function getStats() {
  const stats = {
    bot_running: botRunning,
    banned_words_count: 0,
    banned_words: [],
    active_warnings: 0,
    temp_bans: 0,
    admin_ids: ADMIN_IDS,
    timestamp: new Date().toLocaleString()
  };
  
  try {
    const banned = getBannedWords();
    stats.banned_words = banned;
    stats.banned_words_count = banned.length;
    stats.active_warnings = getActiveWarningsCount();
    stats.temp_bans = getTempBansCount();
  } catch (e) {
    console.error('Error getting stats:', e);
  }
  
  return stats;
}

const DASHBOARD_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <title>SKYFLIXER BOT Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { 
            text-align: center; 
            margin-bottom: 30px;
            font-size: 2.5em;
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
            padding: 25px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            transition: transform 0.3s;
        }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-card h3 { 
            color: #feca57; 
            margin-bottom: 10px;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .stat-card .value { 
            font-size: 2.5em; 
            font-weight: bold;
            color: #fff;
        }
        .section {
            background: rgba(255,255,255,0.05);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
        }
        .section h2 {
            color: #ff6b6b;
            margin-bottom: 15px;
            border-bottom: 2px solid #ff6b6b;
            padding-bottom: 10px;
        }
        .word-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .word-tag {
            background: #ff6b6b;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9em;
        }
        .status {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
        }
        .status.online { background: #2ecc71; }
        .status.offline { background: #e74c3c; }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        th { color: #feca57; }
        .refresh-btn {
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            color: #1a1a2e;
            font-weight: bold;
            cursor: pointer;
            float: right;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            color: rgba(255,255,255,0.5);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 SKYFLIXER ADMIN BOT</h1>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Bot Status</h3>
                <span class="status {status_class}">
                    {status_text}
                </span>
            </div>
            <div class="stat-card">
                <h3>Banned Words</h3>
                <div class="value">{banned_words_count}</div>
            </div>
            <div class="stat-card">
                <h3>Active Warnings</h3>
                <div class="value">{active_warnings}</div>
            </div>
            <div class="stat-card">
                <h3>Temp Bans</h3>
                <div class="value">{temp_bans}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🚫 Banned Words Filter</h2>
            <div class="word-list">
                {word_tags}
            </div>
        </div>
        
        <div class="section">
            <h2>⚙️ Configuration</h2>
            <table>
                <tr>
                    <th>Setting</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Warning Limit</td>
                    <td>5 warnings before ban</td>
                </tr>
                <tr>
                    <td>Spam Detection</td>
                    <td>10 repeated messages</td>
                </tr>
                <tr>
                    <td>Temp Ban Default</td>
                    <td>2 hours</td>
                </tr>
                <tr>
                    <td>Allowed Domain</td>
                    <td>skyflixer.fun</td>
                </tr>
                <tr>
                    <td>Admin IDs</td>
                    <td>{admin_ids}</td>
                </tr>
            </table>
        </div>
        
        <div class="footer">
            <p>Last updated: {timestamp}</p>
            <p>SKYFLIXER BOT &copy; 2024</p>
        </div>
    </div>
</body>
</html>
`;

const app = express();
const PORT = process.env.PORT || 7860;

app.use(express.json());

app.get('/', (req, res) => {
  const stats = getStats();
  
  const wordTags = stats.banned_words
    .map(word => `<span class="word-tag">${word}</span>`)
    .join('');
  
  const html = DASHBOARD_TEMPLATE
    .replace('{status_class}', stats.bot_running ? 'online' : 'offline')
    .replace('{status_text}', stats.bot_running ? 'ONLINE' : 'OFFLINE')
    .replace('{banned_words_count}', stats.banned_words_count)
    .replace('{active_warnings}', stats.active_warnings)
    .replace('{temp_bans}', stats.temp_bans)
    .replace('{word_tags}', wordTags)
    .replace('{admin_ids}', stats.admin_ids.join(', ') || 'Not set')
    .replace('{timestamp}', stats.timestamp);
  
  res.send(html);
});

app.get('/api/stats', (req, res) => {
  res.json(getStats());
});

app.get('/api/banned-words', (req, res) => {
  const words = getBannedWords();
  res.json({
    banned_words: words,
    count: words.length
  });
});

app.post('/webhook', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    bot_token_configured: !!BOT_TOKEN,
    admin_ids_configured: ADMIN_IDS.length > 0
  });
});

console.log('Initializing database...');
initDatabase();
console.log('Database initialized');

if (BOT_TOKEN) {
  runBot();
  console.log('Telegram bot process started');
} else {
  console.warn('WARNING: BOT_TOKEN not set, bot will not run');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dashboard server running on port ${PORT}`);
});
