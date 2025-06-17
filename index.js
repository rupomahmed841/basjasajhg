const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// --- UptimeRobot keep-alive server ---
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Bot is alive!\n');
}).listen(PORT, () => {
  console.log('Keep-alive server running on port', PORT);
});

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
    await bot.sendMessage(msg.chat.id, '❌ Please send a valid Facebook profile link.');
    return;
  }

  // Check if it's a numeric ID link
  const numericIdMatch = text.match(/facebook\.com\/profile\.php\?id=(\d+)/);
  if (numericIdMatch) {
    await bot.sendMessage(msg.chat.id, `✅ Facebook UID: ${numericIdMatch[1]}`);
    return;
  }

  // For username links, explain the limitation
  const usernameMatch = text.match(/facebook\.com\/([^/?]+)/);
  if (usernameMatch) {
    await bot.sendMessage(
      msg.chat.id,
      `⚠️ Facebook blocks bots from accessing username-based links.\n\n` +
      `To get a UID, please use a numeric profile link like this:\n` +
      `https://facebook.com/profile.php?id=123456789`
    );
    return;
  }

  // Fallback for any other format
  await bot.sendMessage(
    msg.chat.id,
    '❌ Unsupported link format. Please use a valid Facebook profile link.'
  );
});
