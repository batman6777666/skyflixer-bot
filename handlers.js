const {
  WELCOME_MESSAGE, OTT_AUTO_REPLY, WARNING_MESSAGES,
  VIOLATION_LINK, VIOLATION_BANNED_WORD, VIOLATION_PROMOTION, VIOLATION_REPEATED,
  ADMIN_IDS
} = require('./config');

const {
  checkLinkViolation, checkPromotion, checkBannedWords,
  containsOttKeywords, checkSpam
} = require('./filters');

const {
  addWarning, removeWarning, getWarningCount, clearWarnings,
  addBannedWord, removeBannedWord, getBannedWords,
  addBannedUser, removeBannedUser, addTempBan, removeTempBan,
  addMute, removeMute, getExpiredTempBans, getExpiredMutes,
  clearUserHistory, db
} = require('./database');

function isAdmin(userId) {
  return ADMIN_IDS.includes(userId);
}

function getUsernameDisplay(user) {
  if (user.username) {
    return `@${user.username}`;
  }
  return user.first_name || `User_${user.id}`;
}

async function deleteAndWarn(ctx, reason, violationType) {
  const message = ctx.message;
  const user = message.from;
  const chat = message.chat;
  
  try {
    await message.delete();
  } catch (e) {
    console.log(`Failed to delete message: ${e.message}`);
    return;
  }
  
  const usernameDisplay = getUsernameDisplay(user);
  const warningCount = addWarning(user.id, chat.id, user.username || '');
  
  if (WARNING_MESSAGES[warningCount]) {
    const warnText = WARNING_MESSAGES[warningCount].replace('{username}', usernameDisplay);
    await ctx.reply(warnText, { parse_mode: 'Markdown' });
  }
  
  if (warningCount >= 5) {
    try {
      await ctx.banChatMember(chat.id, user.id);
      addBannedUser(user.id, chat.id, user.username || '', '3 violations');
      clearWarnings(user.id);
      clearUserHistory(user.id, chat.id);
    } catch (e) {
      console.log(`Failed to ban user: ${e.message}`);
    }
  }
  
  await notifyAdmin(ctx, user, chat, reason, message.text || '', warningCount);
}

async function notifyAdmin(ctx, user, chat, reason, deletedContent, warningCount) {
  const username = getUsernameDisplay(user);
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  
  if (deletedContent.length > 500) {
    deletedContent = deletedContent.slice(0, 500) + '...';
  }
  
  const notification = `🚨 **Message Deleted Alert**
👤 **User:** ${username} (\`${user.id}\`)
❌ **Reason:** ${reason}
📝 **Deleted Message Content:** \`${deletedContent}\`
🕐 **Time:** ${timeStr}
⚠️ **Warning Count:** ${warningCount}/5`;
  
  for (const adminId of ADMIN_IDS) {
    try {
      await ctx.telegram.sendMessage(adminId, notification, { parse_mode: 'Markdown' });
    } catch (e) {
      console.log(`Failed to notify admin ${adminId}: ${e.message}`);
    }
  }
}

async function checkTempBansAndMutes(ctx) {
  const expiredBans = getExpiredTempBans();
  for (const { userId, chatId } of expiredBans) {
    try {
      await ctx.telegram.unbanChatMember(chatId, userId);
      removeTempBan(userId);
    } catch (e) {
      console.log(`Failed to unban user ${userId}: ${e.message}`);
    }
  }
  
  const expiredMutes = getExpiredMutes();
  for (const { userId, chatId } of expiredMutes) {
    try {
      await ctx.telegram.restrictChatMember(chatId, userId, {
        can_send_messages: true,
        can_send_media_messages: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
        can_change_info: false,
        can_invite_users: true,
        can_pin_messages: false
      });
      removeMute(userId);
    } catch (e) {
      console.log(`Failed to unmute user ${userId}: ${e.message}`);
    }
  }
}

async function handleWelcomeNewMember(ctx) {
  const newMembers = ctx.message.new_chat_members;
  if (!newMembers) return;
  
  for (const member of newMembers) {
    if (member.is_bot) continue;
    
    const username = member.username || member.first_name || `User_${member.id}`;
    const welcomeText = WELCOME_MESSAGE.replace('{username}', username);
    
    await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
  }
}

async function handleMessage(ctx) {
  if (!ctx.message || !ctx.message.from) return;
  
  const message = ctx.message;
  const user = message.from;
  const chat = message.chat;
  const text = message.text || '';
  
  if (isAdmin(user.id)) return;
  
  const spamCheck = checkSpam(user.id, chat.id, text);
  if (spamCheck.isSpam) {
    await deleteAndWarn(ctx, spamCheck.reason, VIOLATION_REPEATED);
    return;
  }
  
  const bannedWordCheck = checkBannedWords(text);
  if (bannedWordCheck.hasBannedWord) {
    await deleteAndWarn(ctx, `${VIOLATION_BANNED_WORD}: ${bannedWordCheck.word}`, VIOLATION_BANNED_WORD);
    return;
  }
  
  const linkCheck = checkLinkViolation(text);
  if (linkCheck.isViolation) {
    await deleteAndWarn(ctx, linkCheck.reason, VIOLATION_LINK);
    return;
  }
  
  const promoCheck = checkPromotion(text);
  if (promoCheck.isPromotion) {
    await deleteAndWarn(ctx, promoCheck.reason, VIOLATION_PROMOTION);
    return;
  }
  
  if (containsOttKeywords(text)) {
    await ctx.reply(OTT_AUTO_REPLY, { parse_mode: 'Markdown' });
  }
}

async function banCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  if (!ctx.args || ctx.args.length === 0) {
    await ctx.reply('Usage: /ban @username or /ban user_id');
    return;
  }
  
  const target = ctx.args[0];
  const chatId = ctx.message.chat.id;
  
  try {
    let userId, username;
    
    if (target.startsWith('@')) {
      username = target.slice(1);
      const members = await ctx.getChatAdministrators(chatId);
      const found = members.find(m => m.user.username === username);
      if (!found) {
        await ctx.reply(`❌ Could not find user ${target}`);
        return;
      }
      userId = found.user.id;
    } else {
      userId = parseInt(target);
      const member = await ctx.getChatMember(chatId, userId);
      username = member.user.username || String(userId);
    }
    
    await ctx.banChatMember(chatId, userId);
    addBannedUser(userId, chatId, username, 'Manual ban by admin');
    await ctx.reply(`✅ ${target} has been banned.`);
  } catch (e) {
    await ctx.reply(`❌ Failed to ban: ${e.message}`);
  }
}

async function tempbanCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  if (!ctx.args || ctx.args.length < 1) {
    await ctx.reply('Usage: /tempban @username [duration] (default: 2h, m=minutes, h=hours, d=days)');
    return;
  }
  
  const target = ctx.args[0];
  const durationStr = ctx.args.length > 1 ? ctx.args[1] : '2h';
  const chatId = ctx.message.chat.id;
  
  const unit = durationStr.slice(-1).toLowerCase();
  let value;
  try {
    value = parseInt(durationStr.slice(0, -1));
  } catch {
    await ctx.reply('❌ Invalid duration format. Use: 30m, 2h, 1d');
    return;
  }
  
  let minutes;
  if (unit === 'm') {
    minutes = value;
  } else if (unit === 'h') {
    minutes = value * 60;
  } else if (unit === 'd') {
    minutes = value * 60 * 24;
  } else {
    await ctx.reply('❌ Invalid unit. Use m, h, or d.');
    return;
  }
  
  try {
    let userId, username;
    
    if (target.startsWith('@')) {
      username = target.slice(1);
      const members = await ctx.getChatAdministrators(chatId);
      const found = members.find(m => m.user.username === username);
      if (!found) {
        await ctx.reply(`❌ Could not find user ${target}`);
        return;
      }
      userId = found.user.id;
    } else {
      userId = parseInt(target);
      const member = await ctx.getChatMember(chatId, userId);
      username = member.user.username || String(userId);
    }
    
    const untilDate = Math.floor(Date.now() / 1000) + minutes * 60;
    await ctx.banChatMember(chatId, userId, { until_date: untilDate });
    addTempBan(userId, chatId, username, minutes);
    await ctx.reply(`✅ ${target} has been banned for ${durationStr}.`);
  } catch (e) {
    await ctx.reply(`❌ Failed to tempban: ${e.message}`);
  }
}

async function kickCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  if (!ctx.args || ctx.args.length === 0) {
    await ctx.reply('Usage: /kick @username or /kick user_id');
    return;
  }
  
  const target = ctx.args[0];
  const chatId = ctx.message.chat.id;
  
  try {
    let userId;
    
    if (target.startsWith('@')) {
      const username = target.slice(1);
      const members = await ctx.getChatAdministrators(chatId);
      const found = members.find(m => m.user.username === username);
      if (!found) {
        await ctx.reply(`❌ Could not find user ${target}`);
        return;
      }
      userId = found.user.id;
    } else {
      userId = parseInt(target);
    }
    
    await ctx.banChatMember(chatId, userId);
    await ctx.unbanChatMember(chatId, userId);
    await ctx.reply(`✅ ${target} has been kicked.`);
  } catch (e) {
    await ctx.reply(`❌ Failed to kick: ${e.message}`);
  }
}

async function warnCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  if (!ctx.args || ctx.args.length === 0) {
    await ctx.reply('Usage: /warn @username or /warn user_id');
    return;
  }
  
  const target = ctx.args[0];
  const chatId = ctx.message.chat.id;
  
  try {
    let userId, username;
    
    if (target.startsWith('@')) {
      username = target.slice(1);
      const members = await ctx.getChatAdministrators(chatId);
      const found = members.find(m => m.user.username === username);
      if (!found) {
        await ctx.reply(`❌ Could not find user ${target}`);
        return;
      }
      userId = found.user.id;
    } else {
      userId = parseInt(target);
      try {
        const member = await ctx.getChatMember(chatId, userId);
        username = member.user.username || String(userId);
      } catch {
        username = String(userId);
      }
    }
    
    const warningCount = addWarning(userId, chatId, username);
    
    if (WARNING_MESSAGES[warningCount]) {
      const warnText = WARNING_MESSAGES[warningCount].replace('{username}', target);
      await ctx.telegram.sendMessage(chatId, warnText);
    }
    
    await ctx.reply(`✅ Warning issued to ${target} (${warningCount}/5)`);
    
    if (warningCount >= 5) {
      try {
        await ctx.banChatMember(chatId, userId);
        addBannedUser(userId, chatId, username, '3 violations');
        clearWarnings(userId);
      } catch (e) {
        await ctx.reply(`⚠️ Failed to ban: ${e.message}`);
      }
    }
  } catch (e) {
    await ctx.reply(`❌ Failed to warn: ${e.message}`);
  }
}

async function unwarnCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  if (!ctx.args || ctx.args.length === 0) {
    await ctx.reply('Usage: /unwarn @username or /unwarn user_id');
    return;
  }
  
  const target = ctx.args[0];
  
  try {
    let userId;
    
    if (target.startsWith('@')) {
      const result = db.prepare(
        'SELECT user_id FROM warnings WHERE username = ? COLLATE NOCASE'
      ).get(target.slice(1));
      
      if (result) {
        userId = result.user_id;
      } else {
        await ctx.reply(`❌ Could not find user ${target}`);
        return;
      }
    } else {
      userId = parseInt(target);
    }
    
    const newCount = removeWarning(userId);
    await ctx.reply(`✅ Warning removed from ${target} (${newCount}/5 remaining)`);
  } catch (e) {
    await ctx.reply(`❌ Failed to unwarn: ${e.message}`);
  }
}

async function warningsCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  if (!ctx.args || ctx.args.length === 0) {
    await ctx.reply('Usage: /warnings @username or /warnings user_id');
    return;
  }
  
  const target = ctx.args[0];
  
  try {
    let userId, warningCount;
    
    if (target.startsWith('@')) {
      const result = db.prepare(
        'SELECT user_id, warning_count FROM warnings WHERE username = ? COLLATE NOCASE'
      ).get(target.slice(1));
      
      if (result) {
        userId = result.user_id;
        warningCount = result.warning_count;
      } else {
        await ctx.reply(`✅ ${target} has 0 warnings.`);
        return;
      }
    } else {
      userId = parseInt(target);
      warningCount = getWarningCount(userId);
    }
    
    await ctx.reply(`⚠️ ${target} has ${warningCount}/5 warnings.`);
  } catch (e) {
    await ctx.reply(`❌ Failed to get warnings: ${e.message}`);
  }
}

async function muteCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  if (!ctx.args || ctx.args.length < 2) {
    await ctx.reply('Usage: /mute @username 30m (m=minutes, h=hours)');
    return;
  }
  
  const target = ctx.args[0];
  const durationStr = ctx.args[1];
  const chatId = ctx.message.chat.id;
  
  const unit = durationStr.slice(-1).toLowerCase();
  let value;
  try {
    value = parseInt(durationStr.slice(0, -1));
  } catch {
    await ctx.reply('❌ Invalid duration format. Use: 30m, 2h');
    return;
  }
  
  let minutes;
  if (unit === 'm') {
    minutes = value;
  } else if (unit === 'h') {
    minutes = value * 60;
  } else {
    await ctx.reply('❌ Invalid unit. Use m or h.');
    return;
  }
  
  try {
    let userId, username;
    
    if (target.startsWith('@')) {
      username = target.slice(1);
      const members = await ctx.getChatAdministrators(chatId);
      const found = members.find(m => m.user.username === username);
      if (!found) {
        await ctx.reply(`❌ Could not find user ${target}`);
        return;
      }
      userId = found.user.id;
    } else {
      userId = parseInt(target);
      try {
        const member = await ctx.getChatMember(chatId, userId);
        username = member.user.username || String(userId);
      } catch {
        username = String(userId);
      }
    }
    
    await ctx.restrictChatMember(chatId, userId, {
      can_send_messages: false,
      can_send_media_messages: false,
      can_send_polls: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
      can_change_info: false,
      can_invite_users: false,
      can_pin_messages: false
    });
    
    addMute(userId, chatId, username, minutes);
    await ctx.reply(`✅ ${target} has been muted for ${durationStr}.`);
  } catch (e) {
    await ctx.reply(`❌ Failed to mute: ${e.message}`);
  }
}

async function unmuteCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  if (!ctx.args || ctx.args.length === 0) {
    await ctx.reply('Usage: /unmute @username or /unmute user_id');
    return;
  }
  
  const target = ctx.args[0];
  const chatId = ctx.message.chat.id;
  
  try {
    let userId;
    
    if (target.startsWith('@')) {
      const username = target.slice(1);
      const members = await ctx.getChatAdministrators(chatId);
      const found = members.find(m => m.user.username === username);
      if (!found) {
        await ctx.reply(`❌ Could not find user ${target}`);
        return;
      }
      userId = found.user.id;
    } else {
      userId = parseInt(target);
    }
    
    await ctx.restrictChatMember(chatId, userId, {
      can_send_messages: true,
      can_send_media_messages: true,
      can_send_polls: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
      can_change_info: false,
      can_invite_users: true,
      can_pin_messages: false
    });
    
    removeMute(userId);
    await ctx.reply(`✅ ${target} has been unmuted.`);
  } catch (e) {
    await ctx.reply(`❌ Failed to unmute: ${e.message}`);
  }
}

async function spamCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  if (!ctx.args || ctx.args.length === 0) {
    await ctx.reply('Usage: /spam @username or /spam user_id');
    return;
  }
  
  const target = ctx.args[0];
  const chatId = ctx.message.chat.id;
  
  try {
    let userId, username;
    
    if (target.startsWith('@')) {
      username = target.slice(1);
      const members = await ctx.getChatAdministrators(chatId);
      const found = members.find(m => m.user.username === username);
      if (!found) {
        await ctx.reply(`❌ Could not find user ${target}`);
        return;
      }
      userId = found.user.id;
    } else {
      userId = parseInt(target);
      try {
        const member = await ctx.getChatMember(chatId, userId);
        username = member.user.username || String(userId);
      } catch {
        username = String(userId);
      }
    }
    
    await ctx.banChatMember(chatId, userId);
    addBannedUser(userId, chatId, username, 'Marked as spammer');
    clearWarnings(userId);
    clearUserHistory(userId, chatId);
    await ctx.reply(`✅ ${target} marked as spammer and banned.`);
  } catch (e) {
    await ctx.reply(`❌ Failed to ban: ${e.message}`);
  }
}

async function addwordCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  if (!ctx.args || ctx.args.length === 0) {
    await ctx.reply('Usage: /addword word');
    return;
  }
  
  const word = ctx.args[0].toLowerCase();
  
  if (addBannedWord(word)) {
    await ctx.reply(`✅ Added '${word}' to banned words list.`);
  } else {
    await ctx.reply(`⚠️ '${word}' is already in the banned words list.`);
  }
}

async function removewordCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  if (!ctx.args || ctx.args.length === 0) {
    await ctx.reply('Usage: /removeword word');
    return;
  }
  
  const word = ctx.args[0].toLowerCase();
  
  if (removeBannedWord(word)) {
    await ctx.reply(`✅ Removed '${word}' from banned words list.`);
  } else {
    await ctx.reply(`⚠️ '${word}' was not in the banned words list.`);
  }
}

async function filterlistCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  const words = getBannedWords();
  if (words.length > 0) {
    const wordList = words.map(w => `• ${w}`).join('\n');
    await ctx.reply(`🚫 **Banned Words:**\n${wordList}`, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply('✅ No banned words in the list.');
  }
}

async function unbanCommand(ctx) {
  if (!isAdmin(ctx.message.from.id)) {
    await ctx.reply('❌ Admin only command.');
    return;
  }
  
  if (!ctx.args || ctx.args.length === 0) {
    await ctx.reply('Usage: /unban @username or /unban user_id');
    return;
  }
  
  const target = ctx.args[0];
  const chatId = ctx.message.chat.id;
  
  try {
    let userId;
    
    if (target.startsWith('@')) {
      const result = db.prepare(
        'SELECT user_id FROM banned_users WHERE username = ? COLLATE NOCASE'
      ).get(target.slice(1));
      
      if (result) {
        userId = result.user_id;
      } else {
        await ctx.reply(`❌ Could not find banned user ${target}`);
        return;
      }
    } else {
      userId = parseInt(target);
    }
    
    await ctx.unbanChatMember(chatId, userId);
    removeBannedUser(userId);
    removeTempBan(userId);
    await ctx.reply(`✅ ${target} has been unbanned.`);
  } catch (e) {
    await ctx.reply(`❌ Failed to unban: ${e.message}`);
  }
}

module.exports = {
  isAdmin,
  getUsernameDisplay,
  deleteAndWarn,
  notifyAdmin,
  checkTempBansAndMutes,
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
  unbanCommand
};
