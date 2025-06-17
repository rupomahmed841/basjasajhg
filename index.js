const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

// Regex patterns for extracting Facebook UID
const FB_ID_REGEX = /facebook.com\/(?:profile.php\?id=|)([0-9]+)/;
const USERNAME_REGEX = /facebook.com\/([A-Za-z0-9.]+)/;

async function getFacebookUid(link) {
  let match = FB_ID_REGEX.exec(link);
  if (match) {
    return match[1];
  }
  match = USERNAME_REGEX.exec(link);
  if (match) {
    const username = match[1];
    try {
      const res = await axios.get(`https://www.facebook.com/${username}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });
      const uidMatch = res.data.match(/"userID":"(\\d+)"/);
      if (uidMatch) {
        return uidMatch[1];
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

bot.onText(/\/(start|help)/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Send me a Facebook profile link to get the UID.');
});

bot.on('message', async (msg) => {
  const text = msg.text && msg.text.trim();
  if (!text || text.startsWith('/')) return;
  if (!text.includes('facebook.com')) {
    bot.sendMessage(msg.chat.id, 'Please send a valid Facebook profile link.');
    return;
  }
  const uid = await getFacebookUid(text);
  if (uid) {
    bot.sendMessage(msg.chat.id, `Facebook UID: ${uid}`);
  } else {
    bot.sendMessage(msg.chat.id, 'Could not extract UID. Please check the link.');
  }
});
