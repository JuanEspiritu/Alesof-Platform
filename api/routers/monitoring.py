import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.config import settings
from core.database import get_db, SessionLocal
from core.permissions import has_permission, permissions_for_role, require_permissions
from models.cliente import Cliente
from models.factura import Factura
from models.monitoring import (
    Alert, AutomationRule, BackupJob, Hypervisor, ITService, MonitoringAgent,
    MonitoringEvent, MonitoringMetric, NetworkLink, PhysicalDevice, SecurityControl, Site, SLAContract, VirtualMachine,
)
from models.ticket import Ticket
from models.usuario import Usuario
from providers.network import NetworkMonitoringProvider
from providers.notifications import TelegramNotificationProvider, TwilioNotificationProvider
from providers.aws import CloudWatchProvider
from providers.veeam import VeeamProvider
from providers.vmware import VMwareMonitoringProvider
from services.monitoring_service import create_alert, create_event, model_dict, record_metric, risk_summary, utcnow
from services.vmware_inventory import compare_vmware_inventory, save_inventory_snapshot
from services.websocket_manager import noc_manager

router = APIRouter(tags=["Monitoring"])
network_provider = NetworkMonitoringProvider()
ws_tickets: dict[str, tuple[int, float]] = {}


class AgentHeartbeat(BaseModel):
    name: str = "ALESOF-AGENT-LIMA"
    version: str = "1.0.0"
    ip: str | None = None
    capabilities: list[str] = Field(default_factory=list)


class AgentEventInput(BaseModel):
    agent: str = "ALESOF-AGENT-LIMA"
    source: str
    resource: str
    status: str
    severity: str = "INFO"
    latency_ms: float | None = None
    message: str = "Evento recibido desde agente on-premise"
    vlan: str | None = None


class NetworkTarget(BaseModel):
    host: str
    port: int | None = Field(default=None, ge=1, le=65535)
    url: str | None = None


class AlertAssign(BaseModel):
    technician_id: int


class SecurityUpdate(BaseModel):
    status: str
    evidence: str | None = None


def serialize_alert(db: Session, alert: Alert):
    data = model_dict(alert)
    site = db.query(Site).filter(Site.id == alert.site_id).first() if alert.site_id else None
    data["site"] = site.name if site else None
    return data


def public_status(value: str | None) -> str:
    normalized = (value or "UNKNOWN").upper()
    if normalized in {"ONLINE", "UP", "POWEREDON", "SUCCESS"}:
        return "online"
    if normalized in {"WARNING", "DEGRADED", "MAINTENANCE"}:
        return "degraded"
    if normalized in {"OFFLINE", "DOWN", "CRITICAL", "FAILED", "POWEREDOFF"}:
        return "critical"
    return "unknown"


def public_severity(value: str | None) -> str:
    normalized = (value or "INFO").upper()
    if normalized == "CRITICAL":
        return "critical"
    if normalized in {"HIGH", "WARNING", "MEDIUM"}:
        return "warning"
    if normalized in {"OK", "SUCCESS", "RESOLVED"}:
        return "success"
    return "info"


def latest_provenance(db: Session, resource: str, fallback: str = "SIMULATED") -> str:
    metric = db.query(MonitoringMetric).filter(MonitoringMetric.resource == resource).order_by(MonitoringMetric.id.desc()).first()
    if not metric:
        return fallback
    created_at = metric.created_at.replace(tzinfo=timezone.utc) if metric.created_at.tzinfo is None else metric.created_at
    return metric.provenance if created_at >= utcnow() - timedelta(minutes=5) else "STALE"


def validate_agent_key(agent_key: str | None):
    if not agent_key or hashlib.sha256(agent_key.encode()).hexdigest() != hashlib.sha256(settings.AGENT_API_KEY.encode()).hexdigest():
        raise HTTPException(status_code=401, detail="Agent API key invalida")


@router.get("/api/auth/permissions")
def current_permissions(user: Usuario = Depends(get_current_user)):
    return {"role": user.rol, "permissions": permissions_for_role(user.rol)}


@router.get("/api/integrations/status")
def integration_status(_user: Usuario = Depends(require_permissions("can_view_noc"))):
    return {
        "agent": {"configured": settings.AGENT_API_KEY != "change-me-agent-key"},
        "vmware": {"configured": bool(settings.VMWARE_USERNAME and settings.VMWARE_PASSWORD and
            any([settings.VMWARE_ESXI01_URL, settings.VMWARE_ESXI02_URL, settings.VMWARE_ESXI03_URL]))},
        "aws_cloudwatch": {"configured": CloudWatchProvider().configured()},
        "veeam": {"configured": VeeamProvider().configured()},
        "telegram": {"configured": bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID)},
        "twilio": {"configured": bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and
            settings.TWILIO_FROM_NUMBER and settings.TWILIO_TO_NUMBER and settings.TWILIO_VOICE_URL)},
    }


@router.post("/api/integrations/aws/sync")
async def sync_cloudwatch(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_manage_services"))):
    result = await CloudWatchProvider().snapshot()
    if not result.get("configured"):
        raise HTTPException(status_code=503, detail=result["detail"])
    site = db.query(Site).filter(Site.name == "Trujillo").first()
    alarms = result.get("active_alarms", [])
    record_metric(db, "CLOUDWATCH", "Trujillo", "active_alarms", len(alarms), "count", "AWS")
    for alarm in alarms:
        create_alert(db, title=f"AWS: {alarm['name']}", description=alarm.get("reason") or "Alarma CloudWatch activa",
            severity="HIGH", source="AWS", resource=alarm["name"], site_id=site.id if site else None,
            recommendation="Revisar CloudWatch, recurso afectado y runbook de la sede Trujillo.")
    if site:
        site.status = "WARNING" if alarms else "ONLINE"
        site.last_check = utcnow()
    db.commit()
    await noc_manager.broadcast({"type": "cloudwatch_synced", "severity": "HIGH" if alarms else "INFO",
        "title": f"CloudWatch sincronizado: {len(alarms)} alarmas", "source": "AWS",
        "affected_resource": "Trujillo", "timestamp": utcnow().isoformat()})
    return result


@router.post("/api/integrations/veeam/sync")
async def sync_veeam(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_manage_services"))):
    result = await VeeamProvider().snapshot()
    if not result.get("configured"):
        raise HTTPException(status_code=503, detail=result["detail"])
    sessions = result.get("sessions", [])
    failed = 0
    for session in sessions:
        state = str(session.get("state") or session.get("result") or session.get("status") or "UNKNOWN").upper()
        if state in {"FAILED", "ERROR"}:
            failed += 1
    record_metric(db, "VEEAM", "Veeam", "failed_sessions", failed, "count", "VEEAM")
    create_event(db, event_type="veeam_synced", source="VEEAM", resource="Veeam", status="WARNING" if failed else "ONLINE",
        severity="HIGH" if failed else "INFO", message=f"Veeam reporto {len(sessions)} sesiones y {failed} fallidas",
        payload={"session_count": len(sessions), "failed_count": failed})
    db.commit()
    await noc_manager.broadcast({"type": "veeam_synced", "severity": "HIGH" if failed else "INFO",
        "title": f"Veeam sincronizado: {failed} fallos", "source": "VEEAM",
        "affected_resource": "Backups", "timestamp": utcnow().isoformat()})
    return {"configured": True, "session_count": len(sessions), "failed_count": failed}


@router.get("/api/dashboard/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_permissions("can_view_noc")),
):
    active_alerts = db.query(Alert).filter(Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])).all()
    services_down = db.query(ITService).filter(ITService.status.in_(["OFFLINE", "CRITICAL"])).count()
    vms_off = db.query(VirtualMachine).filter(VirtualMachine.power_state != "poweredOn").count()
    sites_alert = len({alert.site_id for alert in active_alerts if alert.site_id})
    dmz_risk = db.query(ITService).filter(ITService.exposure == "DMZ", ITService.status != "ONLINE").count()
    risk = risk_summary(db)
    return {
        "availability": round(db.query(ITService).filter(ITService.status == "ONLINE").count() / max(db.query(ITService).count(), 1) * 100, 1),
        "active_customers": db.query(Cliente).filter(Cliente.estado == "activo").count(),
        "open_tickets": db.query(Ticket).filter(Ticket.estado.in_(["abierto", "en_proceso"])).count(),
        "critical_tickets": db.query(Ticket).filter(Ticket.prioridad == "crítica", Ticket.estado.in_(["abierto", "en_proceso"])).count(),
        "services_down": services_down,
        "vms_off": vms_off,
        "sites_with_alerts": sites_alert,
        "dmz_services_at_risk": dmz_risk,
        "revenue_collected": float(db.query(Factura).filter(Factura.estado == "pagado").with_entities(Factura.monto).all() and sum(float(row[0]) for row in db.query(Factura.monto).filter(Factura.estado == "pagado").all())),
        "sla_at_risk": db.query(ITService).filter(ITService.uptime_percent < ITService.sla_target).count(),
        "risk": risk,
        "recent_events": [model_dict(item) for item in db.query(MonitoringEvent).order_by(MonitoringEvent.id.desc()).limit(8).all()],
    }


@router.get("/api/noc/status")
def noc_status(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    now = utcnow()
    devices = db.query(PhysicalDevice).all()
    hypervisors = db.query(Hypervisor).all()
    services = db.query(ITService).order_by(ITService.exposure, ITService.name).all()
    agents = db.query(MonitoringAgent).all()
    links = db.query(NetworkLink).all()
    active_alerts = db.query(Alert).filter(Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])).order_by(Alert.id.desc()).all()
    open_tickets = db.query(Ticket).filter(Ticket.estado.in_(["abierto", "en_proceso"])).count()
    critical_tickets = db.query(Ticket).filter(Ticket.prioridad == "crítica", Ticket.estado.in_(["abierto", "en_proceso"])).count()

    site_rows = []
    for site in db.query(Site).order_by(Site.id).all():
        site_devices = [item for item in devices if item.site_id == site.id]
        site_hypervisors = [item for item in hypervisors if item.site_id == site.id]
        monitored = [*site_devices, *site_hypervisors]
        online = sum(1 for item in monitored if public_status(item.status) == "online")
        related_agent = next((agent for agent in agents if agent.site_id == site.id and agent.status == "ONLINE" and agent.last_heartbeat and
            (agent.last_heartbeat.replace(tzinfo=timezone.utc) if agent.last_heartbeat.tzinfo is None else agent.last_heartbeat) >= now - timedelta(seconds=60)), None)
        related_link = next((link for link in links if link.target_site_id == site.id), None)
        vmware_live = any(item.provider.lower() == "vmware" and
            (item.last_check.replace(tzinfo=timezone.utc) if item.last_check.tzinfo is None else item.last_check) >= now - timedelta(minutes=5)
            for item in site_hypervisors)
        cloud_source = latest_provenance(db, site.name) if site.kind == "cloud" else "SIMULATED"
        link_checked_at = related_link.last_check.replace(tzinfo=timezone.utc) if related_link and related_link.last_check.tzinfo is None else related_link.last_check if related_link else None
        link_source = related_link.provenance if related_link and link_checked_at and link_checked_at >= now - timedelta(minutes=2) else "STALE" if related_link and related_link.provenance != "SIMULATED" else "SIMULATED"
        source = "AGENT" if related_agent else "VMWARE" if vmware_live else cloud_source if cloud_source != "SIMULATED" else link_source
        observed_status = site.status if source in {"AGENT", "VMWARE", "AWS"} else "UNKNOWN"
        latency = site.latency_ms
        if related_link and related_link.latency_ms is not None:
            latency = related_link.latency_ms
        site_rows.append({
            "name": site.name,
            "role": {"virtualized": "Data center virtualizado en ESXi", "physical": "Sede fisica", "cloud": "Sede desplegada en AWS"}.get(site.kind, "Sede empresarial"),
            "cidr": site.cidr,
            "latency_ms": latency,
            "devices_total": len(monitored),
            "devices_online": online,
            "availability": round(online / len(monitored) * 100, 1) if monitored else 0,
            "status": public_status(observed_status),
            "source": source,
            "last_check": site.last_check,
        })

    service_rows = []
    for service in services:
        source = latest_provenance(db, service.name)
        status = public_status(service.status if source in {"AGENT", "VMWARE", "AWS", "VEEAM"} else "UNKNOWN")
        metric = "Sin telemetria real"
        if service.latency_ms is not None and source in {"AGENT", "VMWARE", "AWS", "VEEAM"}:
            metric = f"{service.latency_ms:.0f} ms · uptime {service.uptime_percent:.2f}%"
        service_rows.append({
            "name": service.name,
            "owner": service.owner,
            "target": f"{service.sla_target:.1f}%",
            "status": status,
            "metric": metric,
            "source": source,
            "last_check": service.last_check,
        })

    event_rows = [{
        "id": str(alert.id),
        "severity": public_severity(alert.severity),
        "title": alert.title,
        "message": alert.description,
        "source": alert.source,
        "href": "/dashboard/alertas",
    } for alert in active_alerts[:8]]
    if not event_rows:
        event_rows.append({
            "id": "noc-no-active-alerts",
            "severity": "success",
            "title": "Sin alertas activas",
            "message": "No existen incidentes pendientes en la base de datos.",
            "source": "DATABASE",
            "href": "/dashboard/alertas",
        })

    severity_rank = {"success": 0, "info": 1, "warning": 2, "critical": 3}
    overall = max((event["severity"] for event in event_rows), key=lambda value: severity_rank[value])
    total_assets = len(devices) + len(hypervisors)
    online_assets = sum(1 for item in [*devices, *hypervisors] if public_status(item.status) == "online")
    real_services = [item for item in service_rows if item["source"] in {"AGENT", "VMWARE", "AWS", "VEEAM"}]
    availability = round(sum(1 for item in real_services if item["status"] == "online") / len(real_services) * 100, 1) if real_services else 0
    signature = hashlib.sha256("|".join(f"{item.id}:{item.status}" for item in active_alerts).encode()).hexdigest()[:16]
    return {
        "updated_at": now,
        "status": overall,
        "alert_signature": signature,
        "kpis": {
            "availability": availability,
            "open_tickets": open_tickets,
            "critical_tickets": critical_tickets,
            "devices_total": total_assets,
            "devices_online": online_assets,
            "devices_maintenance": sum(1 for item in devices if item.status == "MAINTENANCE"),
            "overdue_invoices": db.query(Factura).filter(Factura.estado == "vencido").count(),
            "pending_invoices": db.query(Factura).filter(Factura.estado == "pendiente").count(),
        },
        "risk": risk_summary(db),
        "sites": site_rows,
        "services": service_rows,
        "vpn_links": [{
            "name": item.name,
            "type": item.link_type,
            "latency_ms": item.latency_ms,
            "packet_loss": item.packet_loss,
            "status": public_status(item.status),
            "source": item.provenance,
            "last_check": item.last_check,
        } for item in links],
        "events": event_rows,
        "enterprise_modules": [
            {"name": "Backups", "summary": "Ejecuciones, RPO, RTO y pruebas de restauracion.", "priority": "Alta"},
            {"name": "Seguridad", "summary": "Controles, evidencias y riesgos de infraestructura.", "priority": "Alta"},
            {"name": "SLA", "summary": "Disponibilidad y compromisos por servicio empresarial.", "priority": "Media"},
            {"name": "Agentes", "summary": "Colectores on-premise y su ultimo heartbeat.", "priority": "Alta"},
        ],
        "devices": [model_dict(item) for item in devices],
        "hypervisors": [model_dict(item) for item in hypervisors],
        "vms": [model_dict(item) for item in db.query(VirtualMachine).all()],
        "agents": [model_dict(item) for item in agents],
        "active_alerts": [serialize_alert(db, item) for item in active_alerts],
    }


@router.get("/api/noc/events")
def noc_events(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    return [model_dict(item) for item in db.query(MonitoringEvent).order_by(MonitoringEvent.id.desc()).limit(limit).all()]


@router.post("/api/agents/heartbeat")
def agent_heartbeat(payload: AgentHeartbeat, x_agent_key: str | None = Header(default=None), db: Session = Depends(get_db)):
    validate_agent_key(x_agent_key)
    agent = db.query(MonitoringAgent).filter(MonitoringAgent.name == payload.name).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente no registrado")
    agent.status, agent.version, agent.ip = "ONLINE", payload.version, payload.ip
    agent.capabilities, agent.last_heartbeat = payload.capabilities, utcnow()
    db.commit()
    return model_dict(agent)


@router.post("/api/agents/events")
async def agent_event(payload: AgentEventInput, x_agent_key: str | None = Header(default=None), db: Session = Depends(get_db)):
    validate_agent_key(x_agent_key)
    agent = db.query(MonitoringAgent).filter(MonitoringAgent.name == payload.agent).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agente no registrado")
    event = create_event(db, event_type="agent_observation", source=payload.source, resource=payload.resource,
        status=payload.status, severity=payload.severity, message=payload.message, site_id=agent.site_id,
        payload={"latency_ms": payload.latency_ms, "vlan": payload.vlan})
    normalized_status = "ONLINE" if payload.status in ["UP", "ONLINE"] else "OFFLINE" if payload.status in ["DOWN", "OFFLINE"] else payload.status
    vm = db.query(VirtualMachine).filter(VirtualMachine.name == payload.resource).first()
    service = db.query(ITService).filter((ITService.name.ilike(f"%{payload.resource}%")) | (ITService.host == payload.resource)).first()
    if not service and vm:
        service = db.query(ITService).filter(ITService.vm_id == vm.id).first()
    device = db.query(PhysicalDevice).filter(PhysicalDevice.name == payload.resource).first()
    hypervisor = db.query(Hypervisor).filter(Hypervisor.name == payload.resource).first()
    link = db.query(NetworkLink).filter(NetworkLink.name == payload.resource.replace("-", " - ")).first() if payload.source == "VPN" else None
    if service:
        service.status, service.latency_ms, service.last_check = normalized_status, payload.latency_ms, utcnow()
        record_metric(db, payload.source, service.name, "latency", payload.latency_ms, "ms", "AGENT")
    if device:
        device.status, device.latency_ms, device.last_check = normalized_status, payload.latency_ms, utcnow()
    if hypervisor:
        hypervisor.status, hypervisor.latency_ms, hypervisor.last_check = normalized_status, payload.latency_ms, utcnow()
    if link:
        link.status, link.latency_ms, link.provenance, link.last_check = normalized_status, payload.latency_ms, "AGENT", utcnow()
    record_metric(db, payload.source, payload.resource, "latency", payload.latency_ms, "ms", "AGENT")
    if payload.status in ["DOWN", "OFFLINE", "CRITICAL"] or payload.severity in ["HIGH", "CRITICAL"]:
        create_alert(db, title=f"{payload.resource} requiere atencion", description=payload.message,
            severity=payload.severity, source=payload.source, resource=payload.resource,
            site_id=agent.site_id, vlan=payload.vlan)
    db.commit()
    message = {"type": "agent_event", "severity": payload.severity, "title": payload.message,
        "site": "Lima", "vlan": payload.vlan, "source": payload.source,
        "affected_resource": payload.resource, "timestamp": event.created_at.isoformat()}
    await noc_manager.broadcast(message)
    return model_dict(event)


@router.get("/api/metrics/{resource}")
def resource_metrics(resource: str, metric: str = "", limit: int = Query(100, ge=1, le=1000), db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    query = db.query(MonitoringMetric).filter(MonitoringMetric.resource == resource)
    if metric:
        query = query.filter(MonitoringMetric.metric == metric)
    return [model_dict(item) for item in query.order_by(MonitoringMetric.id.desc()).limit(limit).all()]


@router.get("/api/agents")
def list_agents(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    result = []
    for item in db.query(MonitoringAgent).all():
        data = model_dict(item)
        site = db.query(Site).filter(Site.id == item.site_id).first()
        data["site"] = site.name if site else None
        result.append(data)
    return result


@router.get("/api/agents/{agent_id}")
def get_agent(agent_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    item = db.query(MonitoringAgent).filter(MonitoringAgent.id == agent_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    return model_dict(item)


@router.get("/api/hypervisors")
def list_hypervisors(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    result = []
    for item in db.query(Hypervisor).all():
        data = model_dict(item)
        data["vm_count"] = db.query(VirtualMachine).filter(VirtualMachine.hypervisor_id == item.id).count()
        site = db.query(Site).filter(Site.id == item.site_id).first()
        data["site"] = site.name if site else None
        result.append(data)
    return result


@router.get("/api/hypervisors/inventory/compare")
def vmware_inventory_comparison(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_permissions("can_view_noc")),
):
    return compare_vmware_inventory(db)


@router.get("/api/hypervisors/{hypervisor_id}")
def get_hypervisor(hypervisor_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    item = db.query(Hypervisor).filter(Hypervisor.id == hypervisor_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Hipervisor no encontrado")
    return model_dict(item)


@router.get("/api/hypervisors/{hypervisor_id}/vms")
def hypervisor_vms(hypervisor_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    return [model_dict(item) for item in db.query(VirtualMachine).filter(VirtualMachine.hypervisor_id == hypervisor_id).all()]


@router.post("/api/hypervisors/{hypervisor_id}/ping")
async def ping_hypervisor(hypervisor_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_run_network_tests"))):
    item = db.query(Hypervisor).filter(Hypervisor.id == hypervisor_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Hipervisor no encontrado")
    result = await network_provider.check_port(item.management_ip, 443)
    item.status, item.latency_ms, item.last_check = result["status"], result.get("latency_ms"), utcnow()
    db.commit()
    return {**model_dict(item), "check": result}


@router.post("/api/hypervisors/{hypervisor_id}/sync")
async def sync_hypervisor(hypervisor_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_manage_vms"))):
    item = db.query(Hypervisor).filter(Hypervisor.id == hypervisor_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Hipervisor no encontrado")
    endpoints = {
        "ESXi-01": settings.VMWARE_ESXI01_URL,
        "ESXi-02": settings.VMWARE_ESXI02_URL,
        "ESXi-03": settings.VMWARE_ESXI03_URL,
    }
    endpoint = endpoints.get(item.name, "")
    if not endpoint or not settings.VMWARE_USERNAME or not settings.VMWARE_PASSWORD:
        raise HTTPException(status_code=503, detail="Configure credenciales VMware mediante variables de entorno")
    provider = VMwareMonitoringProvider(endpoint, settings.VMWARE_USERNAME, settings.VMWARE_PASSWORD)
    snapshot = await provider.inspect_host(item.name)
    discovered = await provider.list_vms(item.name)
    for field in ["status", "cpu_percent", "ram_percent", "datastore_percent", "uptime_seconds", "version", "vmnics_up", "vmnics_down"]:
        if field in snapshot:
            setattr(item, field, snapshot[field])
    item.provider, item.last_check = "vmware", utcnow()
    expected = {vm.name for vm in db.query(VirtualMachine).filter(VirtualMachine.hypervisor_id == item.id).all()}
    actual = {vm["name"] for vm in discovered}
    save_inventory_snapshot(db, item, discovered)
    create_event(db, event_type="hypervisor_synced", source="ESXI", resource=item.name,
        status=item.status, severity="INFO", message=f"Inventario real sincronizado: {len(actual)} VMs",
        site_id=item.site_id, payload={"actual": sorted(actual), "expected": sorted(expected)})
    db.commit()
    return {"hypervisor": model_dict(item), "discovered_vms": discovered,
        "expected_vms": sorted(expected), "missing_from_host": sorted(expected - actual),
        "unmapped_on_host": sorted(actual - expected), "comparison": compare_vmware_inventory(db)}


@router.get("/api/vms")
def list_vms(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    result = []
    for item in db.query(VirtualMachine).order_by(VirtualMachine.name).all():
        data = model_dict(item)
        hypervisor = db.query(Hypervisor).filter(Hypervisor.id == item.hypervisor_id).first()
        site = db.query(Site).filter(Site.id == item.site_id).first()
        data["hypervisor"] = hypervisor.name if hypervisor else None
        data["site"] = site.name if site else None
        result.append(data)
    return result


@router.get("/api/vms/{vm_id}")
def get_vm(vm_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    item = db.query(VirtualMachine).filter(VirtualMachine.id == vm_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="VM no encontrada")
    return model_dict(item)


async def change_vm_state(vm_id: int, state: str, confirmed: bool, user: Usuario, db: Session):
    vm = db.query(VirtualMachine).filter(VirtualMachine.id == vm_id).first()
    if not vm:
        raise HTTPException(status_code=404, detail="VM no encontrada")
    permission = "can_power_off_vm" if state in ["poweredOff", "suspended"] else "can_restart_vm" if state == "restarting" else "can_power_on_vm"
    if not has_permission(user, permission):
        raise HTTPException(status_code=403, detail=f"Falta permiso {permission}")
    if user.rol == "tecnico" and vm.criticality == "CRITICAL" and not vm.allow_technician_power:
        raise HTTPException(status_code=403, detail="La VM critica requiere autorizacion de supervisor")
    if not confirmed:
        raise HTTPException(status_code=409, detail="Confirme explicitamente la accion sobre la VM")
    hypervisor = db.query(Hypervisor).filter(Hypervisor.id == vm.hypervisor_id).first()
    if not hypervisor:
        raise HTTPException(status_code=409, detail="La VM no tiene un hipervisor asociado")
    endpoints = {
        "ESXi-01": settings.VMWARE_ESXI01_URL,
        "ESXi-02": settings.VMWARE_ESXI02_URL,
        "ESXi-03": settings.VMWARE_ESXI03_URL,
    }
    endpoint = endpoints.get(hypervisor.name, "")
    if not endpoint or not settings.VMWARE_USERNAME or not settings.VMWARE_PASSWORD:
        raise HTTPException(status_code=503, detail="VMware no esta configurado; no se modifico el estado local")
    action = {"poweredOn": "power-on", "poweredOff": "power-off", "restarting": "restart", "suspended": "suspend"}[state]
    provider = VMwareMonitoringProvider(endpoint, settings.VMWARE_USERNAME, settings.VMWARE_PASSWORD)
    try:
        result = await provider.power_action(vm.name, action)
    except Exception as exc:
        create_event(db, event_type="vm_action_failed", source="VMWARE", resource=vm.name,
            status="FAILED", severity="HIGH", message=f"Fallo {action} solicitado por {user.email}", site_id=vm.site_id,
            payload={"user": user.email, "action": action, "error": str(exc)})
        db.commit()
        raise HTTPException(status_code=502, detail=f"VMware rechazo la accion: {exc}") from exc
    final_state = result["power_state"]
    vm.power_state, vm.last_state_change = final_state, utcnow()
    severity = "CRITICAL" if final_state == "poweredOff" and vm.criticality == "CRITICAL" else "INFO"
    event = create_event(db, event_type="vm_state_changed", source="VM", resource=vm.name,
        status=final_state, severity=severity, message=f"{vm.name} cambio a {final_state}", site_id=vm.site_id,
        payload={"user": user.email, "provider": "VMWARE", "action": action})
    if severity == "CRITICAL":
        create_alert(db, title=f"VM critica apagada: {vm.name}", description=f"{vm.name} se encuentra apagada.",
            severity="CRITICAL", source="VM", resource=vm.name, site_id=vm.site_id,
            vlan=vm.vlan, vm_id=vm.id, recommendation="Validar host ESXi y encender la VM si es seguro.")
    db.commit()
    await noc_manager.broadcast({"type": "vm_state_changed", "severity": severity, "title": event.message,
        "site": "Lima", "vlan": vm.vlan, "source": "VM", "affected_resource": vm.name,
        "timestamp": event.created_at.isoformat()})
    return model_dict(vm)


@router.post("/api/vms/{vm_id}/power-on")
async def power_on_vm(vm_id: int, confirm: bool = Query(False), db: Session = Depends(get_db), user: Usuario = Depends(get_current_user)):
    return await change_vm_state(vm_id, "poweredOn", confirm, user, db)


@router.post("/api/vms/{vm_id}/power-off")
async def power_off_vm(vm_id: int, confirm: bool = Query(False), db: Session = Depends(get_db), user: Usuario = Depends(get_current_user)):
    return await change_vm_state(vm_id, "poweredOff", confirm, user, db)


@router.post("/api/vms/{vm_id}/restart")
async def restart_vm(vm_id: int, confirm: bool = Query(False), db: Session = Depends(get_db), user: Usuario = Depends(get_current_user)):
    return await change_vm_state(vm_id, "restarting", confirm, user, db)


@router.post("/api/vms/{vm_id}/suspend")
async def suspend_vm(vm_id: int, confirm: bool = Query(False), db: Session = Depends(get_db), user: Usuario = Depends(get_current_user)):
    return await change_vm_state(vm_id, "suspended", confirm, user, db)


@router.get("/api/vms/{vm_id}/events")
def vm_events(vm_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    vm = db.query(VirtualMachine).filter(VirtualMachine.id == vm_id).first()
    if not vm:
        raise HTTPException(status_code=404, detail="VM no encontrada")
    return [model_dict(item) for item in db.query(MonitoringEvent).filter(MonitoringEvent.resource == vm.name).order_by(MonitoringEvent.id.desc()).all()]


@router.get("/api/network/health")
def network_health(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    return {
        "sites": [model_dict(item) for item in db.query(Site).all()],
        "devices": [model_dict(item) for item in db.query(PhysicalDevice).all()],
        "checks": [model_dict(item) for item in db.query(ITService).filter(ITService.service_type.in_(["VPN", "DNS", "NETWORK", "PROXY", "WEB", "MAIL", "FILE"])).all()],
    }


@router.post("/api/network/ping")
async def network_ping(target: NetworkTarget, _user: Usuario = Depends(require_permissions("can_run_network_tests"))):
    # TCP reachability is used instead of raw ICMP so the API works without root privileges.
    return {"host": target.host, **await network_provider.check_port(target.host, target.port or 443)}


@router.post("/api/network/check-port")
async def network_port(target: NetworkTarget, _user: Usuario = Depends(require_permissions("can_run_network_tests"))):
    if not target.port:
        raise HTTPException(status_code=422, detail="port es obligatorio")
    return {"host": target.host, "port": target.port, **await network_provider.check_port(target.host, target.port)}


@router.post("/api/network/check-http")
async def network_http(target: NetworkTarget, _user: Usuario = Depends(require_permissions("can_run_network_tests"))):
    url = target.url or target.host
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    return {"url": url, **await network_provider.check_http(url, verify_tls=False)}


@router.post("/api/network/check-dns")
async def network_dns(target: NetworkTarget, _user: Usuario = Depends(require_permissions("can_run_network_tests"))):
    return {"host": target.host, **await network_provider.resolve_dns(target.host)}


@router.get("/api/devices")
def list_devices(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    result = []
    for item in db.query(PhysicalDevice).order_by(PhysicalDevice.name).all():
        data = model_dict(item)
        site = db.query(Site).filter(Site.id == item.site_id).first()
        data["site"] = site.name if site else None
        result.append(data)
    return result


@router.get("/api/devices/{device_id}")
def get_device(device_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    item = db.query(PhysicalDevice).filter(PhysicalDevice.id == device_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    return model_dict(item)


@router.post("/api/devices/{device_id}/ping")
async def ping_device(device_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_run_network_tests"))):
    item = db.query(PhysicalDevice).filter(PhysicalDevice.id == device_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    result = await network_provider.check_port(item.ip, item.management_port)
    item.status, item.latency_ms, item.last_check = result["status"], result.get("latency_ms"), utcnow()
    db.commit()
    return {**model_dict(item), "check": result}


@router.get("/api/devices/{device_id}/events")
def device_events(device_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    item = db.query(PhysicalDevice).filter(PhysicalDevice.id == device_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
    return [model_dict(event) for event in db.query(MonitoringEvent).filter(MonitoringEvent.resource == item.name).order_by(MonitoringEvent.id.desc()).all()]


@router.get("/api/services")
def list_services(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    return [model_dict(item) for item in db.query(ITService).order_by(ITService.exposure, ITService.name).all()]


@router.get("/api/services/{service_id}")
def get_service(service_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    item = db.query(ITService).filter(ITService.id == service_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return model_dict(item)


@router.get("/api/services/{service_id}/metrics")
def service_metrics(service_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    item = db.query(ITService).filter(ITService.id == service_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return {"status": item.status, "latency_ms": item.latency_ms, "uptime_percent": item.uptime_percent, "sla_target": item.sla_target, "last_check": item.last_check}


@router.get("/api/services/{service_id}/alerts")
def service_alerts(service_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    return [serialize_alert(db, item) for item in db.query(Alert).filter(Alert.service_id == service_id).order_by(Alert.id.desc()).all()]


@router.get("/api/alerts")
def list_alerts(status: str = "", severity: str = "", db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    return [serialize_alert(db, item) for item in query.order_by(Alert.id.desc()).all()]


@router.get("/api/alerts/active")
def active_alerts(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    return [serialize_alert(db, item) for item in db.query(Alert).filter(Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])).order_by(Alert.id.desc()).all()]


@router.get("/api/alerts/integrations/status")
def notification_integrations(_user: Usuario = Depends(require_permissions("can_view_noc"))):
    return {
        "telegram": {"configured": bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID)},
        "twilio": {"configured": bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and
            settings.TWILIO_FROM_NUMBER and settings.TWILIO_TO_NUMBER and settings.TWILIO_VOICE_URL)},
    }


@router.get("/api/alerts/{alert_id}")
def get_alert(alert_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    item = db.query(Alert).filter(Alert.id == alert_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    return serialize_alert(db, item)


@router.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int, db: Session = Depends(get_db), user: Usuario = Depends(require_permissions("can_acknowledge_alert"))):
    item = db.query(Alert).filter(Alert.id == alert_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    item.status, item.acknowledged_at = "ACKNOWLEDGED", utcnow()
    create_event(db, event_type="alert_acknowledged", source="SYSTEM", resource=item.affected_resource,
        status=item.status, severity="INFO", message=f"Alerta reconocida por {user.email}", site_id=item.site_id)
    db.commit()
    await noc_manager.broadcast({"type": "alert_acknowledged", "severity": item.severity, "title": item.title,
        "source": item.source, "affected_resource": item.affected_resource, "timestamp": utcnow().isoformat()})
    return serialize_alert(db, item)


@router.post("/api/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int, db: Session = Depends(get_db), user: Usuario = Depends(require_permissions("can_resolve_alert"))):
    item = db.query(Alert).filter(Alert.id == alert_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    item.status, item.resolved_at = "RESOLVED", utcnow()
    create_event(db, event_type="alert_resolved", source="SYSTEM", resource=item.affected_resource,
        status=item.status, severity="INFO", message=f"Alerta resuelta por {user.email}", site_id=item.site_id)
    db.commit()
    await noc_manager.broadcast({"type": "alert_resolved", "severity": item.severity, "title": item.title,
        "source": item.source, "affected_resource": item.affected_resource, "timestamp": utcnow().isoformat()})
    return serialize_alert(db, item)


@router.post("/api/alerts/{alert_id}/assign")
def assign_alert(alert_id: int, payload: AlertAssign, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_assign_ticket"))):
    item = db.query(Alert).filter(Alert.id == alert_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    item.technician_id = payload.technician_id
    db.commit()
    return serialize_alert(db, item)


@router.post("/api/alerts/{alert_id}/create-ticket")
def alert_ticket(alert_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_create_ticket"))):
    from services.monitoring_service import maybe_create_ticket
    item = db.query(Alert).filter(Alert.id == alert_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    ticket = maybe_create_ticket(db, item)
    db.commit()
    return {"alert_id": item.id, "ticket_id": item.ticket_id, "created": ticket is not None}


@router.post("/api/alerts/{alert_id}/notify")
async def notify_alert(alert_id: int, channel: str = Query("all", pattern="^(all|telegram|twilio)$"),
    db: Session = Depends(get_db), user: Usuario = Depends(require_permissions("can_acknowledge_alert"))):
    item = db.query(Alert).filter(Alert.id == alert_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    providers = []
    if channel in {"all", "telegram"}:
        providers.append(TelegramNotificationProvider())
    if channel in {"all", "twilio"}:
        providers.append(TwilioNotificationProvider())
    results = []
    for provider in providers:
        try:
            results.append(await provider.send(item.title, item.description, {"alert_id": item.id}))
        except Exception as exc:
            results.append({"provider": provider.__class__.__name__, "sent": False, "error": type(exc).__name__})
    create_event(db, event_type="alert_notification_requested", source="SYSTEM", resource=item.affected_resource,
        status="SENT" if any(result.get("sent") for result in results) else "NOT_CONFIGURED",
        severity="INFO", message=f"Escalamiento solicitado por {user.email}", site_id=item.site_id,
        payload={"channel": channel, "results": results})
    db.commit()
    return {"alert_id": item.id, "results": results}


@router.get("/api/automation/rules")
def automation_rules(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    return [model_dict(item) for item in db.query(AutomationRule).all()]


@router.post("/api/automation/auto-ticket/run")
def run_auto_ticket(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_assign_ticket"))):
    from services.monitoring_service import maybe_create_ticket
    created = []
    for alert in db.query(Alert).filter(Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"]), Alert.ticket_id.is_(None)).all():
        ticket = maybe_create_ticket(db, alert)
        if ticket:
            created.append(ticket.id)
    db.commit()
    return {"created_ticket_ids": created}


@router.get("/api/risk")
def get_risk(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    summary = risk_summary(db)
    summary["dmz"] = _scope_risk(db, "VLAN90")
    summary["aws"] = _site_risk(db, "Trujillo")
    summary["on_premise"] = _site_risk(db, "Lima")
    return summary


@router.get("/api/risk/sites")
def risk_sites(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_reports"))):
    return risk_summary(db)["sites"]


@router.get("/api/risk/services")
def risk_services(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_reports"))):
    result = []
    for service in db.query(ITService).all():
        alerts = db.query(Alert).filter(Alert.service_id == service.id, Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])).count()
        score = min(100, (30 if service.status != "ONLINE" else 0) + alerts * 20 + (20 if service.uptime_percent < service.sla_target else 0))
        result.append({"service": service.name, "score": score, "status": service.status, "vlan": service.vlan})
    return result


@router.get("/api/sla")
def list_sla(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_sla"))):
    result = []
    for contract in db.query(SLAContract).all():
        customer = db.query(Cliente).filter(Cliente.id == contract.customer_id).first()
        service = db.query(ITService).filter(ITService.id == contract.service_id).first()
        result.append({**model_dict(contract), "customer": customer.nombre if customer else None,
            "service": service.name if service else None, "current_availability": service.uptime_percent if service else 0,
            "at_risk": bool(service and (service.status != "ONLINE" or service.uptime_percent < contract.availability_target))})
    return result


@router.get("/api/sla/impact")
def sla_impact(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_sla"))):
    contracts = list_sla(db, _user)
    at_risk = [item for item in contracts if item["at_risk"]]
    return {"total": len(contracts), "at_risk": len(at_risk), "estimated_penalty": round(sum(item["monthly_fee"] * item["penalty_percent"] / 100 for item in at_risk), 2), "contracts": at_risk}


@router.get("/api/sla/{sla_id}")
def get_sla(sla_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_sla"))):
    contract = db.query(SLAContract).filter(SLAContract.id == sla_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="SLA no encontrado")
    return model_dict(contract)


def _scope_risk(db: Session, vlan: str):
    alerts = db.query(Alert).filter(Alert.vlan == vlan, Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])).all()
    return min(100, sum({"CRITICAL": 30, "HIGH": 20, "MEDIUM": 10}.get(item.severity, 5) for item in alerts))


def _site_risk(db: Session, name: str):
    site = db.query(Site).filter(Site.name == name).first()
    if not site:
        return 0
    alerts = db.query(Alert).filter(Alert.site_id == site.id, Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])).all()
    return min(100, sum({"CRITICAL": 30, "HIGH": 20, "MEDIUM": 10}.get(item.severity, 5) for item in alerts))


@router.get("/api/backups")
def list_backups(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    return [model_dict(item) for item in db.query(BackupJob).order_by(BackupJob.name).all()]


@router.get("/api/backups/summary")
def backup_summary(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_noc"))):
    total = db.query(BackupJob).count()
    return {"total": total, "success": db.query(BackupJob).filter(BackupJob.status == "SUCCESS").count(),
        "failed": db.query(BackupJob).filter(BackupJob.status == "FAILED").count(),
        "not_executed": db.query(BackupJob).filter(BackupJob.status == "NOT_EXECUTED").count()}


@router.post("/api/backups/{backup_id}/simulate-run")
async def simulate_backup(backup_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_manage_services"))):
    item = db.query(BackupJob).filter(BackupJob.id == backup_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Backup no encontrado")
    item.status, item.last_run = "SUCCESS", utcnow()
    db.commit()
    await noc_manager.broadcast({"type": "backup_completed", "severity": "INFO", "title": item.name,
        "source": "BACKUP", "affected_resource": item.protected_resource, "timestamp": utcnow().isoformat()})
    return model_dict(item)


@router.post("/api/backups/{backup_id}/mark-tested")
def mark_backup_tested(backup_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_manage_services"))):
    item = db.query(BackupJob).filter(BackupJob.id == backup_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Backup no encontrado")
    item.last_restore_test = utcnow()
    db.commit()
    return model_dict(item)


@router.get("/api/security/controls")
def security_controls(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_reports"))):
    return [model_dict(item) for item in db.query(SecurityControl).order_by(SecurityControl.category, SecurityControl.name).all()]


@router.get("/api/security/summary")
def security_summary(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_reports"))):
    return {"total": db.query(SecurityControl).count(),
        "compliant": db.query(SecurityControl).filter(SecurityControl.status == "COMPLIANT").count(),
        "in_review": db.query(SecurityControl).filter(SecurityControl.status == "IN_REVIEW").count(),
        "non_compliant": db.query(SecurityControl).filter(SecurityControl.status == "NON_COMPLIANT").count()}


@router.post("/api/security/controls/{control_id}/update-status")
def update_security(control_id: int, payload: SecurityUpdate, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_manage_security"))):
    item = db.query(SecurityControl).filter(SecurityControl.id == control_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Control no encontrado")
    item.status, item.last_audit = payload.status, utcnow()
    if payload.evidence:
        item.evidence = payload.evidence
    db.commit()
    return model_dict(item)


@router.get("/api/reports/availability")
def report_availability(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_reports"))):
    return {
        "sites": [{"name": item.name, "availability": item.availability, "status": item.status} for item in db.query(Site).all()],
        "services": [{"name": item.name, "availability": item.uptime_percent, "target": item.sla_target, "status": item.status} for item in db.query(ITService).all()],
        "vlans": _availability_by_vlan(db),
    }


def _availability_by_vlan(db: Session):
    result = []
    vlans = sorted({item.vlan for item in db.query(ITService).all() if item.vlan})
    for vlan in vlans:
        services = db.query(ITService).filter(ITService.vlan == vlan).all()
        result.append({"vlan": vlan, "availability": round(sum(item.uptime_percent for item in services) / len(services), 2), "services": len(services)})
    return result


@router.get("/api/reports/infrastructure")
def report_infrastructure(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_reports"))):
    return {"hypervisors": [model_dict(item) for item in db.query(Hypervisor).all()],
        "vms": [model_dict(item) for item in db.query(VirtualMachine).all()],
        "devices": [model_dict(item) for item in db.query(PhysicalDevice).all()],
        "agents": [model_dict(item) for item in db.query(MonitoringAgent).all()]}


@router.get("/api/reports/dmz")
def report_dmz(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_reports"))):
    services = db.query(ITService).filter(ITService.exposure == "DMZ").all()
    return {"vlan": "VLAN90", "services": [model_dict(item) for item in services],
        "active_alerts": [serialize_alert(db, item) for item in db.query(Alert).filter(Alert.vlan == "VLAN90", Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])).all()]}


@router.get("/api/reports/devices")
def report_devices(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_view_reports"))):
    return [model_dict(item) for item in db.query(PhysicalDevice).order_by(PhysicalDevice.device_type, PhysicalDevice.name).all()]


SIMULATIONS = {
    "haproxy-down": ("SERVICE", "HAProxy", "CRITICAL", "VLAN90"),
    "web-down": ("SERVICE", "WEB-LIMA-01", "HIGH", "VLAN90"),
    "mail-down": ("SERVICE", "MAIL-LIMA-01", "HIGH", "VLAN90"),
    "dns-down": ("SERVICE", "DNS2-LIMA-01", "HIGH", "VLAN90"),
    "app-down": ("SERVICE", "APP-LIMA-01", "CRITICAL", "VLAN30"),
    "file-down": ("SERVICE", "FILE-LIMA-01", "HIGH", "VLAN30"),
    "vm-down": ("VM", "APP-LIMA-01", "CRITICAL", "VLAN30"),
    "vpn-down": ("VPN", "Lima-Trujillo", "HIGH", "WAN"),
    "service-down": ("SERVICE", "Alesof Backend API", "CRITICAL", "CLOUD"),
    "backup-failed": ("BACKUP", "DB diario", "HIGH", "VLAN80"),
    "high-cpu": ("ESXI", "ESXi-01", "HIGH", "VLAN50"),
    "router-down": ("DEVICE", "RTR-LIMA-01", "CRITICAL", "VLAN50"),
    "switch-down": ("DEVICE", "SW-LIMA-CORE-01", "CRITICAL", "VLAN50"),
    "ap-warning": ("DEVICE", "AP-LIMA-01", "MEDIUM", "VLAN50"),
    "agent-offline": ("AGENT", "ALESOF-AGENT-LIMA", "HIGH", "VLAN50"),
}


@router.post("/api/simulation/reset")
async def reset_simulation(db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_manage_services"))):
    if not settings.ENABLE_SIMULATION:
        raise HTTPException(status_code=404, detail="Recurso no disponible")
    db.query(ITService).update({ITService.status: "ONLINE"})
    db.query(VirtualMachine).update({VirtualMachine.power_state: "poweredOn"})
    db.query(PhysicalDevice).update({PhysicalDevice.status: "ONLINE"})
    db.query(Hypervisor).update({Hypervisor.status: "ONLINE", Hypervisor.cpu_percent: 44})
    db.query(MonitoringAgent).update({MonitoringAgent.status: "ONLINE", MonitoringAgent.last_heartbeat: utcnow()})
    db.query(BackupJob).update({BackupJob.status: "SUCCESS"})
    for alert in db.query(Alert).filter(Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"]), Alert.source != "SECURITY").all():
        alert.status, alert.resolved_at = "RESOLVED", utcnow()
    db.commit()
    await noc_manager.broadcast({"type": "noc_status_update", "severity": "INFO", "title": "Simulacion restablecida",
        "source": "SYSTEM", "affected_resource": "PLATFORM", "timestamp": utcnow().isoformat()})
    return {"detail": "Estado de simulacion restablecido"}


@router.post("/api/simulation/{scenario}")
async def run_simulation(scenario: str, db: Session = Depends(get_db), _user: Usuario = Depends(require_permissions("can_manage_services"))):
    if not settings.ENABLE_SIMULATION:
        raise HTTPException(status_code=404, detail="Recurso no disponible")
    config = SIMULATIONS.get(scenario)
    if not config:
        raise HTTPException(status_code=404, detail="Escenario no encontrado")
    source, resource, severity, vlan = config
    lima = db.query(Site).filter(Site.name == "Lima").first()
    if source == "SERVICE":
        service = db.query(ITService).filter((ITService.name.ilike(f"%{resource}%")) | (ITService.host == resource)).first()
        if service:
            service.status = "OFFLINE"
    elif source == "VM":
        vm = db.query(VirtualMachine).filter(VirtualMachine.name == resource).first()
        if vm:
            vm.power_state, vm.last_state_change = "poweredOff", utcnow()
    elif source == "DEVICE":
        device = db.query(PhysicalDevice).filter(PhysicalDevice.name == resource).first()
        if device:
            device.status = "WARNING" if severity == "MEDIUM" else "OFFLINE"
    elif source == "ESXI":
        host = db.query(Hypervisor).filter(Hypervisor.name == resource).first()
        if host:
            host.cpu_percent, host.status = 92, "WARNING"
    elif source == "BACKUP":
        backup = db.query(BackupJob).filter(BackupJob.name == resource).first()
        if backup:
            backup.status, backup.last_run = "FAILED", utcnow()
    elif source == "AGENT":
        agent = db.query(MonitoringAgent).filter(MonitoringAgent.name == resource).first()
        if agent:
            agent.status = "OFFLINE"

    description = f"Escenario controlado: {resource} reporta estado anormal."
    event = create_event(db, event_type=scenario.replace("-", "_"), source=source, resource=resource,
        status="OFFLINE", severity=severity, message=description, site_id=lima.id if lima else None,
        payload={"simulation": True, "vlan": vlan})
    alert = create_alert(db, title=f"{resource} requiere atencion", description=description,
        severity=severity, source=source, resource=resource, site_id=lima.id if lima else None,
        vlan=vlan, recommendation="Ejecutar diagnostico, validar dependencias y seguir el procedimiento de escalamiento.")
    db.commit()
    message = {"type": f"{scenario.replace('-', '_')}", "severity": severity,
        "title": alert.title, "site": "Lima", "vlan": vlan, "source": source,
        "affected_resource": resource, "timestamp": event.created_at.isoformat(), "alert_id": alert.id,
        "ticket_id": alert.ticket_id}
    await noc_manager.broadcast(message)
    return message


@router.post("/api/noc/ws-ticket")
def create_ws_ticket(user: Usuario = Depends(require_permissions("can_view_noc"))):
    now = time.monotonic()
    for key, (_, expires_at) in list(ws_tickets.items()):
        if expires_at <= now:
            ws_tickets.pop(key, None)
    ticket = secrets.token_urlsafe(24)
    ws_tickets[ticket] = (user.id, now + 30)
    return {"ticket": ticket, "expires_in": 30}


@router.websocket("/ws/noc")
async def noc_websocket(websocket: WebSocket, ticket: str = Query(default="")):
    db = SessionLocal()
    try:
        ticket_data = ws_tickets.pop(ticket, None)
        if not ticket_data or ticket_data[1] <= time.monotonic():
            await websocket.close(code=1008)
            return
        user = db.query(Usuario).filter(Usuario.id == ticket_data[0], Usuario.activo.is_(True)).first()
        if not user or not has_permission(user, "can_view_noc"):
            await websocket.close(code=1008)
            return
        await noc_manager.connect(websocket)
        await websocket.send_json({"type": "connected", "severity": "INFO", "title": "NOC Live conectado", "timestamp": utcnow().isoformat()})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        noc_manager.disconnect(websocket)
    finally:
        db.close()
