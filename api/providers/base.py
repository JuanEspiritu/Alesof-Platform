from abc import ABC, abstractmethod


class MonitoringProvider(ABC):
    @abstractmethod
    async def collect(self) -> list[dict]:
        """Return normalized monitoring observations."""


class HypervisorProvider(ABC):
    @abstractmethod
    async def inspect_host(self, host: str) -> dict:
        """Return normalized hypervisor information."""

    @abstractmethod
    async def list_vms(self, host: str) -> list[dict]:
        """Return normalized virtual machines."""

    @abstractmethod
    async def power_action(self, vm_name: str, action: str) -> dict:
        """Execute a confirmed power action and return the observed final state."""
