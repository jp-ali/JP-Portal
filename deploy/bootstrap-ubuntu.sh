#!/usr/bin/env bash
set -Eeuo pipefail

# Run once as root on the Ubuntu VM, passing a public SSH key file for the
# dedicated deployment account. No password or private key belongs here.
public_key_file="${1:?Usage: sudo bash bootstrap-ubuntu.sh /path/to/deployment.pub}"
[[ "$(id -u)" -eq 0 ]] || { echo 'Run this script with sudo.' >&2; exit 1; }
[[ -r "$public_key_file" ]] || { echo 'Public key file is unreadable.' >&2; exit 1; }
public_key="$(tr -d '\r\n' < "$public_key_file")"
[[ "$public_key" =~ ^ssh-ed25519\ [A-Za-z0-9+/=]+(\ .*)?$ ]] || {
  echo 'Expected a single Ed25519 public key.' >&2
  exit 1
}

. /etc/os-release
[[ "$ID" == ubuntu && ( "$VERSION_CODENAME" == noble || "$VERSION_CODENAME" == resolute ) && "$(dpkg --print-architecture)" == amd64 ]] || {
  echo 'This bootstrap is prepared for Ubuntu 24.04 or 26.04 amd64 only.' >&2
  exit 1
}

# Keep remote access available after reboot before changing packages.
systemctl enable --now ssh

apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

if ! id deployment >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash --user-group deployment
fi
usermod --append --groups docker deployment
install -d -m 0700 -o deployment -g deployment /home/deployment/.ssh
authorized_keys=/home/deployment/.ssh/authorized_keys
touch "$authorized_keys"
if ! grep -qxF "$public_key" "$authorized_keys"; then
  printf '%s\n' "$public_key" >> "$authorized_keys"
fi
chown deployment:deployment "$authorized_keys"
chmod 0600 "$authorized_keys"
install -d -m 0750 -o deployment -g deployment /opt/jp-portal

docker compose version
systemctl is-active ssh docker
echo 'Bootstrap complete. Application, database, firewall and DNS are not configured yet.'
