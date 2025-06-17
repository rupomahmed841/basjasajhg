# Telegram Facebook UID Bot

A Telegram bot that extracts Facebook profile UID from a given profile link. Designed for deployment on Render.com.

## Features
- Send a Facebook profile link to the bot, and it replies with the UID.
- Supports both numeric IDs and usernames.
- Ready for deployment on Render.com (uses webhooks).

## Setup Instructions

1. **Clone the repo and install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set Environment Variables:**
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from BotFather.
   - `WEBHOOK_URL`: Your Render.com web service URL (e.g., `https://your-app.onrender.com`).

   On Render, set these in the dashboard under Environment.

3. **Deploy to Render.com:**
   - Add the repo to Render as a new Web Service.
   - Ensure `Procfile` is present.
   - Set environment variables as above.

4. **Set Telegram Webhook:**
   The bot will set the webhook automatically when started on Render.

## Usage
- Start the bot with `/start`.
- Send a Facebook profile link (e.g., `https://facebook.com/zuck` or `https://facebook.com/profile.php?id=4`).
- The bot replies with the UID.

## Notes
- Facebook may block automated scraping. If UID extraction fails, try another link or check if the profile is public.
