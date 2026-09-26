#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Local Chatterbox is not installed yet."
  echo "Run Install Chatterbox Local.command first."
  read -p "Press Enter to close..."
  exit 1
fi

if [ -x ".venv/bin/python3" ]; then
  VENV_PY=".venv/bin/python3"
elif [ -x ".venv/bin/python" ]; then
  VENV_PY=".venv/bin/python"
else
  echo "The local Python environment is incomplete."
  echo "Run Install Chatterbox Local.command again."
  read -p "Press Enter to close..."
  exit 1
fi

echo "Starting Story Voice Studio — Offline..."
echo "Using $($VENV_PY --version)"
echo "The local interface will open at http://127.0.0.1:8765"
echo "Leave this window open while using Chatterbox."
echo ""

(sleep 6; open "http://127.0.0.1:8765") >/dev/null 2>&1 &
exec "$VENV_PY" -m uvicorn server:app --host 127.0.0.1 --port 8765
