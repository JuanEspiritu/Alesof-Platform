import asyncio
import ssl
from urllib.parse import urlparse

from providers.base import HypervisorProvider


class VMwareMonitoringProvider(HypervisorProvider):
    """ESXi/vCenter provider backed by pyVmomi. Secrets remain runtime-only."""

    def __init__(self, base_url: str, username: str, password: str, verify_tls: bool = False):
        parsed = urlparse(base_url if "://" in base_url else f"https://{base_url}")
        self.host = parsed.hostname or base_url
        self.port = parsed.port or 443
        self.username = username
        self.password = password
        self.verify_tls = verify_tls

    def _connect(self):
        from pyVim.connect import SmartConnect

        context = ssl.create_default_context() if self.verify_tls else ssl._create_unverified_context()
        return SmartConnect(host=self.host, port=self.port, user=self.username, pwd=self.password, sslContext=context)

    def _snapshot(self):
        from pyVim.connect import Disconnect

        connection = self._connect()
        try:
            content = connection.RetrieveContent()
            host = content.rootFolder.childEntity[0].hostFolder.childEntity[0].host[0]
            hardware = host.hardware
            quick = host.summary.quickStats
            cpu_capacity = max(hardware.cpuInfo.hz * hardware.cpuInfo.numCpuCores / 1_000_000, 1)
            ram_capacity = max(hardware.memorySize / 1024 / 1024, 1)
            datastores = list(host.datastore)
            capacity = sum(ds.summary.capacity for ds in datastores)
            free = sum(ds.summary.freeSpace for ds in datastores)
            pnics = list(host.config.network.pnic)
            return {
                "name": host.name,
                "status": "ONLINE" if str(host.runtime.connectionState) == "connected" else "WARNING",
                "cpu_percent": round((quick.overallCpuUsage or 0) / cpu_capacity * 100, 1),
                "ram_percent": round((quick.overallMemoryUsage or 0) / ram_capacity * 100, 1),
                "datastore_percent": round((capacity - free) / capacity * 100, 1) if capacity else 0,
                "uptime_seconds": quick.uptime or 0,
                "version": host.config.product.fullName,
                "vmnics_up": sum(1 for pnic in pnics if pnic.linkSpeed),
                "vmnics_down": sum(1 for pnic in pnics if not pnic.linkSpeed),
                "vms": [
                    {
                        "name": vm.name,
                        "power_state": str(vm.runtime.powerState),
                        "cpu_count": vm.config.hardware.numCPU if vm.config else 0,
                        "ram_gb": round((vm.config.hardware.memoryMB if vm.config else 0) / 1024, 1),
                        "ip": vm.guest.ipAddress,
                        "operating_system": vm.config.guestFullName if vm.config else "Unknown",
                    }
                    for vm in host.vm
                ],
            }
        finally:
            Disconnect(connection)

    async def inspect_host(self, host: str) -> dict:
        snapshot = await asyncio.get_running_loop().run_in_executor(None, self._snapshot)
        return {key: value for key, value in snapshot.items() if key != "vms"}

    async def list_vms(self, host: str) -> list[dict]:
        snapshot = await asyncio.get_running_loop().run_in_executor(None, self._snapshot)
        return snapshot["vms"]

    def _power_action(self, vm_name: str, action: str) -> dict:
        import time
        from pyVim.connect import Disconnect
        from pyVmomi import vim

        connection = self._connect()
        try:
            content = connection.RetrieveContent()
            view = content.viewManager.CreateContainerView(content.rootFolder, [vim.VirtualMachine], True)
            try:
                vm = next((item for item in view.view if item.name == vm_name), None)
            finally:
                view.Destroy()
            if not vm:
                raise RuntimeError(f"VM no encontrada en VMware: {vm_name}")
            operations = {
                "power-on": vm.PowerOnVM_Task,
                "power-off": vm.PowerOffVM_Task,
                "restart": vm.ResetVM_Task,
                "suspend": vm.SuspendVM_Task,
            }
            if action not in operations:
                raise ValueError(f"Accion VMware no soportada: {action}")
            task = operations[action]()
            deadline = time.monotonic() + 90
            while str(task.info.state) not in {"success", "error"} and time.monotonic() < deadline:
                time.sleep(0.5)
            if str(task.info.state) != "success":
                error = task.info.error.msg if task.info.error else "timeout esperando respuesta de VMware"
                raise RuntimeError(error)
            return {"name": vm.name, "power_state": str(vm.runtime.powerState), "provider": "VMWARE"}
        finally:
            Disconnect(connection)

    async def power_action(self, vm_name: str, action: str) -> dict:
        return await asyncio.get_running_loop().run_in_executor(None, self._power_action, vm_name, action)
