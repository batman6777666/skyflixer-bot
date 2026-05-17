---
title: SKYFLIXER ADMIN BOT
emoji: 🎬
colorFrom: red
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference

# SKYFLIXER ADMIN BOT

A fully automated Telegram group admin bot for the SkyFlixer community.

## Features

- **Welcome Messages** - Automatic welcome for new members
- **Link Filtering** - Only allows `skyflixer.fun` links, deletes others with warning system
- **Word Filter** - Automatically deletes messages containing banned words
- **OTT Platform Detection** - Auto-replies when OTT platforms are mentioned
- **Spam Detection** - Detects repeated messages (10x = spam)
- **Admin Commands** - Complete set of moderation commands
- **Warning System** - 5 warnings = automatic permanent ban
- **Admin Notifications** - Private alerts when messages are deleted

## Admin Commands

| Command | Description |
|---------|-------------|
| `/ban @user` | Permanently ban a user |
| `/tempban @user 1h` | Temporarily ban (m=minutes, h=hours, d=days) |
| `/kick @user` | Remove user (can rejoin) |
| `/warn @user` | Give a warning |
| `/unwarn @user` | Remove one warning |
| `/warnings @user` | Check warning count |
| `/mute @user 30m` | Mute user for specified time |
| `/unmute @user` | Unmute user |
| `/spam @user` | Mark as spammer and ban |
| `/addword word` | Add word to banned list |
| `/removeword word` | Remove word from banned list |
| `/filterlist` | Show all banned words |
| `/unban @user` | Unban a user |

## Setup Instructions

### 1. Configure Environment Variables

Edit the `.env` file and replace the placeholder values:

```env
BOT_TOKEN=your_bot_token_here
ADMIN_ID=your_telegram_user_id
ADMIN_USERNAME=@your_username
```

**IMPORTANT:** You must replace `ADMIN_ID` with your actual numeric Telegram user ID.

**How to get your Telegram User ID:**
1. Message @userinfobot on Telegram
2. It will reply with your ID (e.g., `123456789`)
3. Copy that number into the `.env` file

### 1a. Configure HTTPS Proxy (Required on Hugging Face Spaces)

Hugging Face Spaces requires an HTTPS proxy for outbound connections.

**On Hugging Face Spaces:**
1. Go to your Space → Settings → **Networking**
2. Enable **Outbound proxy**
3. Copy the proxy URL (e.g., `https://proxy.example.com:8080`)
4. Go to your Space → Settings → **Secrets**
5. Add a new secret:
   - Name: `HTTPS_PROXY`
   - Value: `your_proxy_url_from_step_3`

**On Docker/Other Platforms (if needed):**
```env
HTTPS_PROXY=https://proxy.example.com:8080
HTTP_PROXY=http://proxy.example.com:8080
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Bot

```bash
# Run bot only
npm run bot

# Run dashboard (includes bot in background)
npm start
```

### 4. Add Bot to Your Group

1. Add the bot to your Telegram group
2. Make the bot an **Administrator** with these permissions:
   - Delete messages
   - Restrict members
   - Ban users
   - Invite users

## Project Structure

```
SKYFLIXER BOT/
├── bot.js           # Main bot entry point
├── server.js        # Express dashboard server
├── handlers.js      # Message and command handlers
├── database.js      # SQLite database functions
├── filters.js       # Link and word filtering logic
├── config.js        # Configuration and constants
├── package.json     # Node.js dependencies
├── .env             # Environment variables
└── README.md        # This file
```

## Default Banned Words

- `multimovies`
- `netmirror`

Add more using `/addword` command.

## Warning System

- **1st violation:** Delete + Warning ⚠️
- **2nd violation:** Delete + Warning ⚠️⚠️
- **3rd-4th violation:** Delete + Warning ⚠️
- **5th violation:** Delete + Auto-ban 🚫

Warnings persist across all violation types (links, words, spam).

## Notes

- Bot ignores messages from admins
- Temp bans automatically expire
- All deleted messages are logged and admins are notified privately
- Database is stored in `skyflixer_bot.db` (auto-created)

## Troubleshooting

### Bot fails to start with `Timed out` error

**Cause:** Network connectivity issue. The bot cannot reach Telegram's API.

**Solutions:**

1. **On Hugging Face Spaces** (most common):
   - Enable outbound proxy in Space Settings → Networking
   - Add `HTTPS_PROXY` secret in Space Settings → Secrets
   - Redeploy the Space

2. **On Docker/VPS**:
   Check outbound connectivity:
   ```bash
   curl -I https://api.telegram.org --retry 3 --retry-delay 5
   ```
   If it fails, check firewall rules or proxy settings.

3. **Verify BOT_TOKEN**:
   ```bash
   echo $BOT_TOKEN
   ```
   Ensure token is set and not expired.

4. **Check logs**:
   ```bash
   docker logs <container_name>
   ```

### Database errors

If you see database lock errors, ensure only one bot instance is running. The bot uses SQLite which doesn't support concurrent writes from multiple processes.

## Deployment

### Hugging Face Spaces (Recommended)

1. Create new Space with SDK: **Docker**
2. Upload all files
3. Add Secrets:
   - `BOT_TOKEN` (from @BotFather)
   - `ADMIN_ID` (your numeric Telegram ID)
   - `HTTPS_PROXY` (from Space Settings → Networking → Proxy URL)
4. Enable "Always On" in Settings (for 24/7 uptime)
5. Deploy

### Docker

```bash
docker build -t skyflixer-bot .
docker run -d \
  -e BOT_TOKEN="your_token" \
  -e ADMIN_ID="your_id" \
  -v ./data:/app \
  --restart unless-stopped \
  skyflixer-bot
```

### Direct Node.js

```bash
npm install
node bot.js
```

## License

MIT
