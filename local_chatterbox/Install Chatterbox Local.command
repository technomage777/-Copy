#!/bin/bash
set -e
cd "$(dirname "$0")"

if command -v python3.11 >/dev/null 2>&1; then
  PY=python3.11
elif command -v python3 >/dev/null 2>&1; then
  PY=python3
else
  echo "Python 3.11 is required."
  echo "Install Python 3.11, then double-click this file again."
  read -p "Press Enter to close..."
  exit 1
fi

echo "Using $($PY --version)"
$PY -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

echo ""
echo "Installation complete."
echo "Double-click Start Chatterbox Local.command whenever you want to use the local engine."
read -p "Press Enter to close..."
