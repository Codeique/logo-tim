#!/usr/bin/env bash
# Issue a Let's Encrypt certificate using the certbot container.
# Run once after the stack is up with HTTP (port 80) accessible.
# Usage: DOMAIN=your-domain.com EMAIL=you@example.com bash scripts/issue-cert.sh
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN=your-domain.com}"
EMAIL="${EMAIL:?Set EMAIL=you@example.com}"

echo "==> Issuing certificate for ${DOMAIN}..."

docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  -d "${DOMAIN}"

echo "==> Certificate issued. Reloading nginx..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "==> Done. Certificate stored in certbot-conf volume."
echo "    Auto-renewal is handled by the certbot container (checks every 12h)."
