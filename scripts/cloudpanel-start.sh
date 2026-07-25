#!/usr/bin/env bash
set -euo pipefail

APP_PORT="${1:-8000}"
APP_DIR="/home/mallor/htdocs/mallor.esmeralab.site"
LOG_DIR="$APP_DIR/logs"

cd "$APP_DIR"
mkdir -p "$LOG_DIR"

export PATH="$HOME/.local/bin:$PATH"

if pgrep -u "$USER" -f "gunicorn config.wsgi:application" >/dev/null; then
  pkill -u "$USER" -f "gunicorn config.wsgi:application"
  sleep 2
fi

nohup python -m gunicorn config.wsgi:application \
  --bind "127.0.0.1:$APP_PORT" \
  --workers 3 \
  --timeout 120 \
  --access-logfile "$LOG_DIR/gunicorn-access.log" \
  --error-logfile "$LOG_DIR/gunicorn-error.log" \
  > "$LOG_DIR/gunicorn.log" 2>&1 &

echo "Mallor started on 127.0.0.1:$APP_PORT"
