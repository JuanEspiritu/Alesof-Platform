#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Ejecute este instalador con sudo." >&2
  exit 1
fi

id alesof-agent >/dev/null 2>&1 || useradd --system --home /nonexistent --shell /usr/sbin/nologin alesof-agent
install -d -o root -g root -m 0755 /opt/alesof-agent
install -o root -g root -m 0755 alesof_agent.py /opt/alesof-agent/alesof_agent.py
install -o root -g root -m 0644 alesof-agent.service /etc/systemd/system/alesof-agent.service

if [[ ! -f /etc/alesof-agent.env ]]; then
  install -o root -g alesof-agent -m 0640 .env.example /etc/alesof-agent.env
  echo "Edite /etc/alesof-agent.env antes de iniciar el servicio."
fi

systemctl daemon-reload
systemctl enable alesof-agent.service
echo "Instalado. Inicie con: sudo systemctl start alesof-agent"
