#!/usr/bin/env bash
set -euo pipefail

target="${1:-${SECURITY_BASE_URL:-http://127.0.0.1:3000}}"
command -v docker >/dev/null 2>&1 || { echo 'Docker is required for the OWASP ZAP baseline scan.' >&2; exit 1; }

docker run --rm -t -v "$(pwd):/zap/wrk/:rw" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t "$target" \
  -r zap-baseline-report.html \
  -J zap-baseline-report.json \
  -I
