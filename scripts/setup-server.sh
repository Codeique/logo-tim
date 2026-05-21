#!/usr/bin/env bash
# Bootstrap script for a fresh Ubuntu 22.04 VPS.
# Run once as root: bash setup-server.sh
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
REPO_URL="${REPO_URL:-https://github.com/YOUR_ORG/logo-tim.git}"
APP_DIR="/opt/logotim"

echo "==> Installing system dependencies..."
apt-get update -qq
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg git ufw

echo "==> Installing Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> Creating deploy user: ${DEPLOY_USER}..."
if ! id "${DEPLOY_USER}" &>/dev/null; then
  useradd -m -s /bin/bash "${DEPLOY_USER}"
fi
usermod -aG docker "${DEPLOY_USER}"

echo "==> Configuring firewall (ufw)..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment "SSH"
ufw allow 80/tcp   comment "HTTP"
ufw allow 443/tcp  comment "HTTPS"
ufw --force enable

echo "==> Cloning repository to ${APP_DIR}..."
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone "${REPO_URL}" "${APP_DIR}"
fi
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"

echo "==> Setting up environment file..."
if [ ! -f "${APP_DIR}/.env" ]; then
  cp "${APP_DIR}/.env.prod.example" "${APP_DIR}/.env"
  echo ""
  echo "!!! ACTION REQUIRED: Fill in ${APP_DIR}/.env with your secrets before starting."
fi

echo ""
echo "==> Setup complete. Next steps:"
echo "  1. Edit ${APP_DIR}/.env — fill in POSTGRES_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET, DOMAIN"
echo "  2. Add your SSH public key to /home/${DEPLOY_USER}/.ssh/authorized_keys"
echo "  3. Issue SSL cert: see scripts/issue-cert.sh"
echo "  4. Start the stack: cd ${APP_DIR} && docker compose -f docker-compose.prod.yml up -d"
