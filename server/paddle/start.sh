#!/usr/bin/env bash
# Start the PaddleOCR sidecar. Run separately from the Node server.
set -e
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$PATH"
exec python3 server.py
