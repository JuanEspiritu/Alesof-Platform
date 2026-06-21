import asyncio
import time
from datetime import datetime, timedelta, timezone

from core.config import settings
from core.database import SessionLocal
from models.monitoring import Alert, Hypervisor, MonitoringAgent, MonitoringMetric, VirtualMachine
from providers.vmware import VMwareMonitoringProvider
from services.monitoring_service import create_alert, create_event, record_metric, utcnow
from services.websocket_manager import noc_manager


VMWARE_ENDPOINTS = {
    "ESXi-01": lambda: settings.VMWARE_ESXI01_URL,
    "ESXi-02": lambda: settings.VMWARE_ESXI02_URL,
    "ESXi-03": lambda: settings.VMWARE_ESXI03_URL,
}


async def sync_vmware(db):
    if not settings.VMWARE_USERNAME or not settings.VMWARE_PASSWORD:
        return
    synced = []
    for hypervisor in db.query(Hypervisor).all():
        endpoint_factory = VMWARE_ENDPOINTS.get(hypervisor.name)
        endpoint = endpoint_factory() if endpoint_factory else ""
        if not endpoint:
            continue
        provider = VMwareMonitoringProvider(endpoint, settings.VMWARE_USERNAME, settings.VMWARE_PASSWORD)
        try:
            snapshot = await provider.inspect_host(hypervisor.name)
            discovered = await provider.list_vms(hypervisor.name)
            for field in ["status", "cpu_percent", "ram_percent", "datastore_percent", "uptime_seconds", "version", "vmnics_up", "vmnics_down"]:
                if field in snapshot:
                    setattr(hypervisor, field, snapshot[field])
            hypervisor.provider = "vmware"
            hypervisor.last_check = utcnow()
            for metric, unit in [("cpu_percent", "%"), ("ram_percent", "%"), ("datastore_percent", "%")]:
                record_metric(db, "ESXI", hypervisor.name, metric, snapshot.get(metric), unit, "VMWARE")
            known = {item.name: item for item in db.query(VirtualMachine).filter(VirtualMachine.hypervisor_id == hypervisor.id).all()}
            for observed in discovered:
                vm = known.get(observed["name"])
                if not vm:
                    continue
                old_state = vm.power_state
                vm.power_state = observed["power_state"]
                vm.cpu_count = observed.get("cpu_count") or vm.cpu_count
                vm.ram_gb = observed.get("ram_gb") or vm.ram_gb
                vm.ip = observed.get("ip") or vm.ip
                vm.operating_system = observed.get("operating_system") or vm.operating_system
                record_metric(db, "ESXI", vm.name, "power_state", 1 if vm.power_state == "poweredOn" else 0, "boolean", "VMWARE")
                if old_state != vm.power_state:
                    vm.last_state_change = utcnow()
                    create_event(db, event_type="vm_state_observed", source="VMWARE", resource=vm.name,
                        status=vm.power_state, severity="HIGH" if vm.power_state != "poweredOn" and vm.criticality == "CRITICAL" else "INFO",
                        message=f"VMware detecto cambio de {old_state} a {vm.power_state}", site_id=vm.site_id,
                        payload={"hypervisor": hypervisor.name, "provenance": "VMWARE"})
            synced.append(hypervisor.name)
        except Exception as exc:
            hypervisor.status = "WARNING"
            hypervisor.last_check = utcnow()
            existing = db.query(Alert).filter(Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"]),
                Alert.source == "VMWARE", Alert.affected_resource == hypervisor.name).first()
            if not existing:
                create_alert(db, title=f"Sin telemetria VMware: {hypervisor.name}",
                    description="El recolector no pudo consultar el hipervisor configurado.", severity="HIGH",
                    source="VMWARE", resource=hypervisor.name, site_id=hypervisor.site_id,
                    recommendation="Validar conectividad, puerto de administracion y credenciales runtime.")
                create_event(db, event_type="vmware_collection_failed", source="VMWARE", resource=hypervisor.name,
                    status="WARNING", severity="HIGH", message="Fallo de recoleccion VMware", site_id=hypervisor.site_id,
                    payload={"error_type": type(exc).__name__})
    db.commit()
    if synced:
        await noc_manager.broadcast({"type": "noc_status_update", "severity": "INFO",
            "title": "Telemetria VMware actualizada", "source": "VMWARE",
            "affected_resource": ", ".join(synced), "timestamp": utcnow().isoformat()})


async def monitoring_scheduler():
    last_vmware_sync = 0.0
    last_metric_cleanup = 0.0
    while True:
        await asyncio.sleep(15)
        db = SessionLocal()
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(seconds=60)
            for agent in db.query(MonitoringAgent).all():
                heartbeat = agent.last_heartbeat.replace(tzinfo=timezone.utc) if agent.last_heartbeat else None
                if agent.status == "ONLINE" and (not heartbeat or heartbeat < cutoff):
                    agent.status = "OFFLINE"
                    event = create_event(db, event_type="agent_offline", source="AGENT", resource=agent.name,
                        status="OFFLINE", severity="HIGH", message=f"{agent.name} dejo de reportar", site_id=agent.site_id)
                    alert = create_alert(db, title=f"Agente offline: {agent.name}",
                        description="El colector on-premise no envia heartbeat dentro de la ventana esperada.",
                        severity="HIGH", source="AGENT", resource=agent.name, site_id=agent.site_id,
                        recommendation="Validar servicio del agente, red local y salida hacia el backend.")
                    db.commit()
                    await noc_manager.broadcast({"type": "agent_offline", "severity": "HIGH", "title": alert.title,
                        "source": "AGENT", "affected_resource": agent.name, "timestamp": event.created_at.isoformat(),
                        "alert_id": alert.id, "ticket_id": alert.ticket_id})
            if time.monotonic() - last_vmware_sync >= max(settings.VMWARE_POLL_SECONDS, 30):
                await sync_vmware(db)
                last_vmware_sync = time.monotonic()
            if time.monotonic() - last_metric_cleanup >= 3600:
                cutoff = datetime.now(timezone.utc) - timedelta(days=max(settings.METRIC_RETENTION_DAYS, 1))
                db.query(MonitoringMetric).filter(MonitoringMetric.created_at < cutoff).delete(synchronize_session=False)
                db.commit()
                last_metric_cleanup = time.monotonic()
        finally:
            db.close()
