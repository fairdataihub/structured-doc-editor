#!/bin/sh
set -e

echo "Starting server..."
exec node /app/server/index.mjs
