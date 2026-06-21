"""ALESOF-AGENT-LIMA: dependency-free on-premise monitoring collector."""

import json
import os
import socket
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

BACKEND_URL = os.getenv("ALESOF_BACKEND_URL", "http://localhost:8000").rstrip("/")
AGENT_API_KEY = os.getenv("ALESOF_AGENT_API_KEY", "")
AGENT_NAME = os.getenv("ALESOF_AGENT_NAME", "ALESOF-AGENT-LIMA")
INTERVAL = int(os.getenv("ALESOF_AGENT_INTERVAL", "30"))

TARGETS = [
    ("APP-LIMA-01", "10.10.30.50", 8000, "SERVICE", "VLAN30"),
    ("FILE-LIMA-01", "10.10.30.60", 445, "SERVICE", "VLAN30"),
    ("HAProxy", "10.10.90.10", 443, "SERVICE", "VLAN90"),
    ("WEB-LIMA-01", "10.10.90.20", 443, "SERVICE", "VLAN90"),
    ("MAIL-LIMA-01", "10.10.90.30", 25, "SERVICE", "VLAN90"),
    ("DNS2-LIMA-01", "10.10.90.40", 53, "SERVICE", "VLAN90"),
    ("ESXi-01", "172.17.25.23", 443, "ESXI", "VLAN50"),
    ("ESXi-02", "172.17.25.19", 443, "ESXI", "VLAN50"),
    ("ESXi-03", "172.17.25.2", 443, "ESXI", "VLAN50"),
    ("RTR-LIMA-01", "10.10.50.1", 22, "DEVICE", "VLAN50"),
    ("SW-LIMA-CORE-01", "10.10.50.2", 22, "DEVICE", "VLAN50"),
    ("AP-LIMA-01", "10.10.50.20", 443, "DEVICE", "VLAN50"),
]


def post(path: str, payload: dict):
    request = urllib.request.Request(
        f"{BACKEND_URL}{path}",
        data=json.dumps(payload).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "X-Agent-Key": AGENT_API_KEY},
    )
    with urllib.request.urlopen(request, timeout=8) as response:
        return json.loads(response.read().decode())


def check_tcp(host: str, port: int):
    started = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=3):
            return "UP", round((time.perf_counter() - started) * 1000, 1)
    except OSError:
        return "DOWN", None


def heartbeat():
    post("/api/agents/heartbeat", {
        "name": AGENT_NAME,
        "version": "1.0.0",
        "ip": socket.gethostbyname(socket.gethostname()),
        "capabilities": ["PING", "TCP", "HTTP", "DNS", "VMWARE"],
    })


def collect_once():
    heartbeat()
    for resource, host, port, source, vlan in TARGETS:
        status, latency = check_tcp(host, port)
        post("/api/agents/events", {
            "agent": AGENT_NAME,
            "source": source,
            "resource": resource,
            "status": status,
            "severity": "HIGH" if status == "DOWN" else "INFO",
            "latency_ms": latency,
            "message": f"{resource} {status} en {host}:{port}",
            "vlan": vlan,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })


def main():
    if not AGENT_API_KEY:
        raise SystemExit("Defina ALESOF_AGENT_API_KEY antes de iniciar el agente")
    print(f"{AGENT_NAME} enviando datos a {BACKEND_URL} cada {INTERVAL}s")
    while True:
        try:
            collect_once()
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            print(f"Error de comunicacion: {exc}")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
