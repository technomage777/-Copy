#!/bin/bash
set -e
cd "$(dirname "$0")"

if command -v python3.11 >/dev/null 2>&1; then
  PY="$(command -v python3.11)"
elif command -v python3 >/dev/null 2>&1; then
  PY="$(command -v python3)"
else
  echo "Python 3.11 is required."
  echo "Install Python 3.11, then double-click this file again."
  read -p "Press Enter to close..."
  exit 1
fi

echo "Using $($PY --version)"
"$PY" -m venv .venv

if [ -x ".venv/bin/python3" ]; then
  VENV_PY=".venv/bin/python3"
elif [ -x ".venv/bin/python" ]; then
  VENV_PY=".venv/bin/python"
else
  echo "Could not create a working virtual environment."
  read -p "Press Enter to close..."
  exit 1
fi

"$VENV_PY" -m pip install --upgrade pip setuptools wheel
"$VENV_PY" -m pip install -r requirements.txt

echo ""
echo "Installation complete."
echo "Double-click Start Chatterbox Local.command whenever you want to use the local engine."
read -p "Press Enter to close..."
