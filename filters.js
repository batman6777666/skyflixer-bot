const { ALLOWED_DOMAIN, OTT_KEYWORDS } = require('./config');
const { isBannedWord, countRepeatedMessages, addMessageHistory } = require('./database');

const URL_PATTERN = /http[s]?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/;
const TELEGRAM_LINK_PATTERN = /t\.me\/[a-zA-Z0-9_]+|telegram\.me\/[a-zA-Z0-9_]+/;
const DOMAIN_PATTERN = /https?:\/\/([^/\s]+)/;

function containsUrl(text) {
  return URL_PATTERN.test(text) || TELEGRAM_LINK_PATTERN.test(text);
}

function isAllowedLink(text) {
  const urls = text.match(URL_PATTERN) || [];
  
  for (const url of urls) {
    const match = url.match(DOMAIN_PATTERN);
    if (match) {
      let domain = match[1].toLowerCase();
      if (domain.startsWith('www.')) {
        domain = domain.slice(4);
      }
      if (!domain.includes(ALLOWED_DOMAIN)) {
        return false;
      }
    } else {
      return false;
    }
  }
  
  const tgLinks = text.match(TELEGRAM_LINK_PATTERN) || [];
  for (const link of tgLinks) {
    if (!link.toLowerCase().includes(ALLOWED_DOMAIN)) {
      return false;
    }
  }
  
  return true;
}

function checkLinkViolation(text) {
  if (!containsUrl(text)) {
    return { isViolation: false, reason: null };
  }
  
  if (!isAllowedLink(text)) {
    return { isViolation: true, reason: 'External link detected' };
  }
  
  return { isViolation: false, reason: null };
}

function containsTelegramLink(text) {
  return TELEGRAM_LINK_PATTERN.test(text);
}

function checkPromotion(text) {
  if (containsTelegramLink(text)) {
    return { isPromotion: true, reason: 'Promotion/Spam' };
  }
  
  return { isPromotion: false, reason: null };
}

function checkBannedWords(text) {
  const word = isBannedWord(text);
  if (word) {
    return { hasBannedWord: true, word };
  }
  return { hasBannedWord: false, word: null };
}

function containsOttKeywords(text) {
  const textLower = text.toLowerCase();
  for (const keyword of OTT_KEYWORDS) {
    if (textLower.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function checkSpam(userId, chatId, text) {
  addMessageHistory(userId, chatId, text);
  
  const count = countRepeatedMessages(userId, chatId, text);
  
  if (count >= 10) {
    return { isSpam: true, reason: 'Repeated message (spam)' };
  }
  
  return { isSpam: false, reason: null };
}

module.exports = {
  containsUrl,
  isAllowedLink,
  checkLinkViolation,
  containsTelegramLink,
  checkPromotion,
  checkBannedWords,
  containsOttKeywords,
  checkSpam
};
