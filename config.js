const dotenv = require('dotenv');

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_ID_STR = process.env.ADMIN_ID || '';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '@UNKNOWN01689';

const ADMIN_IDS = ADMIN_ID_STR
  ? ADMIN_ID_STR.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x))
  : [];

const ALLOWED_DOMAIN = 'skyflixer.fun';

const DEFAULT_BANNED_WORDS = ['multimovies', 'netmirror'];

const OTT_KEYWORDS = [
  'netflix', 'netflix.com',
  'prime video', 'primevideo.com', 'amazon prime',
  'hotstar', 'hotstar.com', 'disney+',
  'zee5', 'zee5.com',
  'sony liv', 'sonyliv.com',
  'jiocinema', 'jio cinema',
  'website', 'site', 'link'
];

const WELCOME_MESSAGE = `🎬 Welcome to **SkyFlixer** Official Channel, {username}! 🎉
🌐 Your ultimate destination for movies & web series!
👉 Visit us: **skyflixer.fun**
📌 **Rules:**
• No spam or self-promotion
• No external links allowed
• Be respectful to all members
Enjoy your stay! 🍿`;

const OTT_AUTO_REPLY = `🎬 Looking for movies & web series?
Visit our official website 👇
🌐 **skyflixer.fun**`;

const WARNING_MESSAGES = {
  1: '⚠️ {username} has received warning 1/5. Be careful!',
  2: '⚠️ {username} has received warning 2/5. Watch your behavior!',
  3: '⚠️ {username} has received warning 3/5. Last warning!',
  4: '⚠️ {username} has received warning 4/5. Next violation will result in a ban!',
  5: '🚫 {username} has been banned after 5 violations. Bye bye!'
};

const VIOLATION_LINK = 'External link detected';
const VIOLATION_BANNED_WORD = 'Banned word';
const VIOLATION_PROMOTION = 'Promotion/Spam';
const VIOLATION_REPEATED = 'Repeated message (spam)';

module.exports = {
  BOT_TOKEN,
  ADMIN_IDS,
  ADMIN_USERNAME,
  ALLOWED_DOMAIN,
  DEFAULT_BANNED_WORDS,
  OTT_KEYWORDS,
  WELCOME_MESSAGE,
  OTT_AUTO_REPLY,
  WARNING_MESSAGES,
  VIOLATION_LINK,
  VIOLATION_BANNED_WORD,
  VIOLATION_PROMOTION,
  VIOLATION_REPEATED
};
