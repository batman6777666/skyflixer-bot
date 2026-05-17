const { Telegraf } = require('telegraf');
const { BOT_TOKEN, ADMIN_IDS } = require('./config');
const { initDatabase } = require('./database');
const {
  handleWelcomeNewMember,
  handleMessage,
  banCommand,
  tempbanCommand,
  kickCommand,
  warnCommand,
  unwarnCommand,
  warningsCommand,
  muteCommand,
  unmuteCommand,
  spamCommand,
  addwordCommand,
  removewordCommand,
  filterlistCommand,
  unbanCommand,
  checkTempBansAndMutes
} = require('./handlers');

function checkNetworkConnectivity() {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = net.createConnection({ host: 'api.telegram.org', port: 443 }, () => {
      console.log('✓ Network connectivity to Telegram API verified');
      socket.end();
      resolve(true);
    });
    
    socket.on('error', (e) => {
      console.log('✗ Cannot reach Telegram API:', e.message);
      console.log('This usually means:');
      console.log('  1. Outbound network is blocked (check firewall)');
      console.log('  2. HTTPS_PROXY needs to be configured (required on Hugging Face Spaces)');
      console.log('  3. DNS resolution issue');
      resolve(false);
    });
    
    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function startCommand(ctx) {
  if (ctx.message.chat.type === 'private') {
    await ctx.reply('👋 Hi! I\'m SkyFlixer Admin Bot. Use /help to see commands.');
  }
}

async function helpCommand(ctx) {
  const userId = ctx.message.from.id;
  
  let helpText;
  if (ADMIN_IDS.includes(userId)) {
    helpText = `🤖 **SKYFLIXER ADMIN BOT - Commands**

**Admin Commands:**
/ban @user - Permanently ban a user
/tempban @user 1h - Temp ban (m=minutes, h=hours, d=days)
/kick @user - Kick user (can rejoin)
/warn @user - Give warning
/unwarn @user - Remove warning
/warnings @user - Check warnings
/mute @user 30m - Mute user
/unmute @user - Unmute user
/spam @user - Mark as spammer & ban
/addword word - Add banned word
/removeword word - Remove banned word
/filterlist - Show banned words
/unban @user - Unban user

**Bot Features:**
• Auto-welcome new members
• Link filtering (only skyflixer.fun allowed)
• Word filtering (multimovies, netmirror banned by default)
• OTT platform auto-reply
• Spam detection (3 repeats = spam)
• 3 warnings = auto ban
• Admin notifications for deletions`;
  } else {
    helpText = '❌ You are not authorized to view admin commands.';
  }
  
  await ctx.reply(helpText, { parse_mode: 'Markdown' });
}

async function main() {
  initDatabase();
  console.log('Database initialized');
  
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN not found! Please check your environment variables.');
    return;
  }
  
  if (ADMIN_IDS.length === 0) {
    console.warn('ADMIN_ID not set! Admin notifications and commands will not work properly.');
  }
  
  const connected = await checkNetworkConnectivity();
  if (!connected) {
    console.error('Network check failed. Please configure HTTPS proxy if required.');
    console.log('On Hugging Face Spaces: Add HTTPS_PROXY secret from Space Settings → Networking');
    return;
  }
  
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (httpsProxy) {
    console.log(`✓ Using HTTPS proxy: ${httpsProxy}`);
  } else {
    console.warn('No HTTPS proxy detected. If running on Hugging Face Spaces, set HTTPS_PROXY secret.');
  }
  
  const maxRetries = 5;
  let retryDelay = 10;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Starting SKYFLIXER ADMIN BOT... (Attempt ${attempt}/${maxRetries})`);
      
      const botOptions = {
        telegram: {
          agentOptions: {
            keepAlive: true,
          },
        },
      };
      
      if (httpsProxy) {
        const { HttpsProxyAgent } = require('https-proxy-agent');
        botOptions.telegram.agent = new HttpsProxyAgent(httpsProxy);
      }
      
      const bot = new Telegraf(BOT_TOKEN, botOptions);
      
      bot.command('start', startCommand);
      bot.command('help', helpCommand);
      bot.command('ban', banCommand);
      bot.command('tempban', tempbanCommand);
      bot.command('kick', kickCommand);
      bot.command('warn', warnCommand);
      bot.command('unwarn', unwarnCommand);
      bot.command('warnings', warningsCommand);
      bot.command('mute', muteCommand);
      bot.command('unmute', unmuteCommand);
      bot.command('spam', spamCommand);
      bot.command('addword', addwordCommand);
      bot.command('removeword', removewordCommand);
      bot.command('filterlist', filterlistCommand);
      bot.command('unban', unbanCommand);
      
      bot.on('new_chat_members', handleWelcomeNewMember);
      bot.on('text', handleMessage);
      
      bot.catch((err, ctx) => {
        console.error(`Update ${ctx.update.update_id} caused error:`, err);
      });
      
      setInterval(async () => {
        try {
          await checkTempBansAndMutes(bot);
        } catch (e) {
          console.error('Error checking temp bans/mutes:', e);
        }
      }, 60000);
      
      console.log('Connecting to Telegram API...');
      await bot.launch({
        dropPendingUpdates: true,
      });
      
      console.log('Bot is running! Press Ctrl+C to stop.');
      
      process.once('SIGINT', () => bot.stop('SIGINT'));
      process.once('SIGTERM', () => bot.stop('SIGTERM'));
      
      return;
      
    } catch (e) {
      console.error(`Bot startup/shutdown error (attempt ${attempt}):`, e);
      if (attempt < maxRetries) {
        console.log(`Retrying in ${retryDelay} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
        retryDelay = Math.min(retryDelay * 2, 300);
      } else {
        console.error('All retry attempts exhausted. Bot failed to start.');
        throw e;
      }
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
