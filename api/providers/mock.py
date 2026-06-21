from providers.base import HypervisorProvider, MonitoringProvider


class MockMonitoringProvider(MonitoringProvider):
    async def collect(self) -> list[dict]:
        return [
            {"source": "SERVICE", "resource": "HAPROXY", "status": "ONLINE", "latency_ms": 12},
            {"source": "SERVICE", "resource": "WEB-LIMA-01", "status": "ONLINE", "latency_ms": 18},
            {"source": "VPN", "resource": "Lima-Trujillo", "status": "ONLINE", "latency_ms": 72},
        ]


class MockVMwareProvider(HypervisorProvider):
    async def inspect_host(self, host: str) -> dict:
        return {
            "host": host,
            "status": "ONLINE",
            "cpu_percent": 44.0,
            "ram_percent": 61.0,
            "datastore_percent": 58.0,
            "version": "VMware ESXi 8.0 (mock provider)",
        }

    async def list_vms(self, host: str) -> list[dict]:
        return []

    async def power_action(self, vm_name: str, action: str) -> dict:
        raise RuntimeError("El proveedor simulado no ejecuta acciones sobre VMs")
