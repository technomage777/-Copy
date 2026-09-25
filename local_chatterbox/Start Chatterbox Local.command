#!/bin/bash
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Local Chatterbox is not installed yet."
  echo "Run Install Chatterbox Local.command first."
  read -p "Press Enter to close..."
  exit 1
fi

source .venv/bin/activate
echo "Starting Story Voice Studio local Chatterbox Turbo..."
echo "Leave this window open while using the local engine."
echo ""
exec python -m uvicorn server:app --host 127.0.0.1 --port 8765
