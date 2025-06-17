import os
import re
import requests
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters

TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')

# Regex patterns for extracting Facebook UID
FB_ID_REGEX = re.compile(r"facebook.com/(?:profile.php\?id=|)([0-9]+)")
USERNAME_REGEX = re.compile(r"facebook.com/([A-Za-z0-9.]+)")

def get_facebook_uid(link: str) -> str:
    match = FB_ID_REGEX.search(link)
    if match:
        return match.group(1)
    # If not numeric, try to resolve username to UID
    match = USERNAME_REGEX.search(link)
    if match:
        username = match.group(1)
        # Try to fetch UID from Facebook page source
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            res = requests.get(f'https://www.facebook.com/{username}', headers=headers, timeout=10)
            uid_match = re.search(r'"userID":"(\d+)"', res.text)
            if uid_match:
                return uid_match.group(1)
        except Exception:
            return None
    return None

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('Send me a Facebook profile link to get the UID.')

async def get_uid(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if 'facebook.com' not in text:
        await update.message.reply_text('Please send a valid Facebook profile link.')
        return
    uid = get_facebook_uid(text)
    if uid:
        await update.message.reply_text(f'Facebook UID: {uid}')
    else:
        await update.message.reply_text('Could not extract UID. Please check the link.')

def main():
    application = ApplicationBuilder().token(TOKEN).build()
    application.add_handler(CommandHandler('start', start))
    application.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), get_uid))
    application.run_polling()

if __name__ == '__main__':
    main()
