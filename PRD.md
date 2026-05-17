Project: SKYFLIXER ADMIN BOT (Python | Telegram)**

---

**Bot Name:** SKYFLIXER ADMIN BOT

**Language:** Python (using `python-telegram-bot` library)

**Purpose:** A fully automated Telegram group admin bot for the SkyFlixer community that handles welcome messages, link filtering, word filtering, spam detection, and admin controls.

---

## 1. WELCOME MESSAGE

When a new user joins the group, the bot must automatically send this welcome message:

> 🎬 Welcome to **SkyFlixer** Official Channel, {username}! 🎉
> 🌐 Your ultimate destination for movies & web series!
> 👉 Visit us: **skyflixer.fun**
> 📌 **Rules:**
> • No spam or self-promotion
> • No external links allowed
> • Be respectful to all members
> Enjoy your stay! 🍿

---

## 2. LINK FILTERING RULES

- **Allowed links:** Only URLs containing `skyflixer.fun` domain are allowed in the group.
- **Delete all other links:** Any message containing an external URL or Telegram link (t.me, any website link) that is NOT from `skyflixer.fun` must be automatically deleted.
- **Warning system on link violation:**
  - 1st violation → Delete message + send warning ⚠️
  - 2nd violation → Delete message + 2nd warning ⚠️⚠️
  - 3rd violation → Delete message + auto ban from group 🚫

---

## 3. WORD FILTER

- Maintain a list of banned words/phrases. Default banned words to start with:
  - `multimovies`
  - `netmirror`
- If any user sends a message containing a banned word, the bot must:
  - Automatically delete that message
  - Send a warning to the user
  - Warning count applies same as link violation (3 warnings = ban)

---

## 4. OTT PLATFORM DETECTION & AUTO REPLY

- If any user mentions OTT platform names or their URLs in the group such as:
  - `netflix`, `netflix.com`
  - `prime video`, `primevideo.com`
  - `hotstar`, `hotstar.com`
  - `zee5`, `sony liv`, `jiocinema`
  - Or uses words like `website`, `site`, `link` asking for streaming
- Bot must **auto-reply** to that user with:
  > 🎬 Looking for movies & web series?
  > Visit our official website 👇
  > 🌐 **skyflixer.fun**

---

## 5. PROMOTION & SPAM DETECTION

- If any user sends:
  - Their own Telegram channel/group link (`t.me/...`)
  - Any promotional message with external links
  - Repeated same messages (3 times = spam)
- Bot must:
  - Delete the message immediately
  - Issue a warning
  - On 3rd warning → permanent ban

---

## 6. ADMIN COMMANDS

All commands below are **admin-only** and must not work for regular users:

| Command | Function |
|---|---|
| `/ban @user` or `/ban user_id` | Permanently ban a user from the group |
| `/tempban @user 1h` | Temporarily ban a user (supports `m` = minutes, `h` = hours, `d` = days) |
| `/kick @user` | Remove user from group (can rejoin) |
| `/warn @user` | Manually give a warning to a user |
| `/unwarn @user` | Remove one warning from a user |
| `/warnings @user` | Check how many warnings a user has |
| `/mute @user 30m` | Mute a user for specified time |
| `/unmute @user` | Unmute a user |
| `/spam @user` | Mark user as spammer and ban immediately |
| `/addword word` | Add a new word to the banned word filter list |
| `/removeword word` | Remove a word from the banned word filter list |
| `/filterlist` | Show all currently banned words |
| `/unban @user` | Unban a previously banned user |

---

## 7. WARNING SYSTEM (GLOBAL)

- Every user has a warning counter stored in a database (SQLite recommended).
- Warnings are cumulative across all violation types (links, words, promotion).
- **3 warnings = automatic permanent ban.**
- When a warning is issued, bot must notify the group:
  > ⚠️ @username has received warning 2/3. Next violation will result in a ban!
- When banned:
  > 🚫 @username has been banned after 3 violations. Bye bye!

---

## 8. TECHNICAL REQUIREMENTS

- **Language:** Python 3.10+
- **Library:** `python-telegram-bot` v20+ (async version)
- **Database:** SQLite (to store warnings, banned words, banned users)
- **Bot Token:** Loaded from `.env` file using `python-dotenv`
- **Deployment ready:** Code must be clean, modular with separate files:
  - `bot.py` — main entry point
  - `handlers.py` — all message and command handlers
  - `database.py` — all database functions
  - `filters.py` — link and word filter logic
  - `config.py` — configuration and constants
  - `.env` — bot token storage

---

## 9. ADDITIONAL NOTES

- Bot must have **admin privileges** in the group to delete messages and ban users.
- All filtering must work in **groups and supergroups.**
- Bot should **ignore messages from admins** (do not filter or warn admins).
- Banned word list must be **case-insensitive** (e.g., `NetMirror` = `netmirror`).
- Tempban must **automatically unban** the user after the time expires.

10. ADMIN NOTIFICATION SYSTEM

- Whenever the bot **deletes any message** from the group (link violation, banned word, promotion, spam), it must **privately notify the admin** on Telegram via bot's private message.

- Notification format must be:

> 🚨 **Message Deleted Alert**
> 👤 **User:** @username (user\_id)
> ❌ **Reason:** External link detected / Banned word / Promotion
> 📝 **Deleted Message Content:** `[exact message text here]`
> 🕐 **Time:** 12:45 PM
> ⚠️ **Warning Count:** 2/3

- This notification must be sent **only to the admin's private Telegram chat**, not in the group.
- Admin's Telegram user ID must be stored in the `.env` file as `ADMIN_ID`.
- If multiple admins exist, store all their IDs in `.env` as a list and notify **all of them.

BOT TOKEN : 8609987338:AAEEDqJsHL1n-6SWcamO1r1oJJOn3Zfh2lI

ADMIN USERNAME : @UNKNOWN01689