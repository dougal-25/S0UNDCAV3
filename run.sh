#!/usr/bin/env bash
# Sound Cave dev launcher.
# Starts the API (port 8000) AND the static site (port 3000) in one command.
# Open http://localhost:3000 in your browser. Ctrl+C kills both.

set -e
cd "$(dirname "$0")"

if [ ! -d venv ]; then
  echo "❌ venv missing — run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

# shellcheck disable=SC1091
source venv/bin/activate

cleanup() {
  echo ""
  echo "🛑 Shutting down…"
  [ -n "${API_PID:-}" ] && kill "$API_PID" 2>/dev/null || true
  [ -n "${WEB_PID:-}" ] && kill "$WEB_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# Free the ports if a previous run got stuck
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "🔥 Starting API on http://localhost:8000 …"
python content_api.py > /tmp/soundcave_api.log 2>&1 &
API_PID=$!

echo "🌐 Starting website on http://localhost:3000 …"
python -m http.server 3000 > /tmp/soundcave_web.log 2>&1 &
WEB_PID=$!

sleep 2

echo ""
echo "✅ Sound Cave is running."
echo "   👉 Open this in your browser:  http://localhost:3000"
echo ""
echo "   API logs:  tail -f /tmp/soundcave_api.log"
echo "   Web logs:  tail -f /tmp/soundcave_web.log"
echo ""
echo "Press Ctrl+C to stop everything."

wait
