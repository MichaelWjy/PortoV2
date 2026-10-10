#!/usr/bin/env bash
# Regenerates the Cloudflare real-IP snippet and the UFW allow-list for ports 80/443.
# Run as root on the VPS (e.g. weekly from cron), then: nginx -t && systemctl reload nginx
set -euo pipefail

out=/etc/nginx/snippets/cloudflare-real-ip.conf
tmp=$(mktemp)
{
  echo "# Generated $(date -u +%FT%TZ) by update-cloudflare-ips.sh"
  for ip in $(curl -fsS https://www.cloudflare.com/ips-v4) $(curl -fsS https://www.cloudflare.com/ips-v6); do
    echo "set_real_ip_from $ip;"
  done
} > "$tmp"
install -m 644 "$tmp" "$out"
rm -f "$tmp"

if [[ "${1:-}" == "--firewall" ]]; then
  for ip in $(curl -fsS https://www.cloudflare.com/ips-v4) $(curl -fsS https://www.cloudflare.com/ips-v6); do
    ufw allow proto tcp from "$ip" to any port 80,443 comment cloudflare >/dev/null
  done
  echo "UFW rules added for Cloudflare ranges."
fi
echo "Wrote $out"
