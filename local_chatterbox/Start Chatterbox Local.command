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

echo "Starting Story Voice Studio local Chatterbox Turbo..."
echo "Using $($VENV_PY --version)"
echo "Leave this window open while using the local engine."
echo ""
exec "$VENV_PY" -m uvicorn server:app --host 127.0.0.1 --port 8765
