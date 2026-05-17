#!/bin/bash
# Startup script for SKYFLIXER ADMIN BOT on Hugging Face Spaces
# Runs Telegram bot in background and Express dashboard in foreground

echo "[STARTUP] Starting SKYFLIXER ADMIN BOT..."
echo "[STARTUP] Environment check:"
echo "  - Node: $(node --version 2>&1)"
echo "  - Bot token: ${BOT_TOKEN:0:10}... (length: ${#BOT_TOKEN})"
echo "  - Admin IDs: $ADMIN_ID"
echo "  - HTTPS_PROXY: ${HTTPS_PROXY:-not set}"

echo "[STARTUP] Starting Express dashboard..."
node server.js
