from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.cliente import Cliente
from models.empleado import Empleado
from models.monitoring import Alert, AutomationRule, MonitoringEvent, MonitoringMetric, Site
from models.ticket import Ticket


SEVERITY_SCORE = {"INFO": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
TICKET_PRIORITY = {"LOW": "baja", "MEDIUM": "media", "HIGH": "alta", "CRITICAL": "crítica"}


def utcnow():
    return datetime.now(timezone.utc)


def model_dict(item) -> dict:
    return {column.name: getattr(item, column.name) for column in item.__table__.columns}


def create_event(
    db: Session,
    *,
    event_type: str,
    source: str,
    resource: str,
    status: str,
    severity: str,
    message: str,
    site_id: int | None = None,
    payload: dict | None = None,
) -> MonitoringEvent:
    event = MonitoringEvent(
        event_type=event_type,
        source=source,
        resource=resource,
        status=status,
        severity=severity,
        message=message,
        site_id=site_id,
        payload=payload or {},
    )
    db.add(event)
    db.flush()
    return event


def record_metric(db: Session, source: str, resource: str, metric: str, value: float | None, unit: str = "", provenance: str = "SIMULATED"):
    if value is None:
        return None
    item = MonitoringMetric(source=source, resource=resource, metric=metric, value=value, unit=unit, provenance=provenance)
    db.add(item)
    return item


def create_alert(
    db: Session,
    *,
    title: str,
    description: str,
    severity: str,
    source: str,
    resource: str,
    site_id: int | None = None,
    vlan: str | None = None,
    service_id: int | None = None,
    vm_id: int | None = None,
    device_id: int | None = None,
    recommendation: str = "Validar conectividad y escalar al responsable.",
    auto_ticket: bool = True,
) -> Alert:
    existing = db.query(Alert).filter(
        Alert.affected_resource == resource,
        Alert.source == source,
        Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"]),
    ).first()
    if existing:
        return existing

    alert = Alert(
        title=title,
        description=description,
        severity=severity,
        status="ACTIVE",
        source=source,
        site_id=site_id,
        vlan=vlan,
        affected_resource=resource,
        service_id=service_id,
        vm_id=vm_id,
        device_id=device_id,
        recommendation=recommendation,
    )
    db.add(alert)
    db.flush()
    if auto_ticket:
        maybe_create_ticket(db, alert)
    return alert


def maybe_create_ticket(db: Session, alert: Alert) -> Ticket | None:
    if alert.ticket_id or SEVERITY_SCORE.get(alert.severity, 0) < SEVERITY_SCORE["HIGH"]:
        return None
    rule = db.query(AutomationRule).filter(
        AutomationRule.enabled.is_(True),
        AutomationRule.source == alert.source,
    ).first()
    if not rule and alert.severity != "CRITICAL":
        return None
    client = db.query(Cliente).filter(Cliente.estado == "activo").first()
    if not client:
        return None
    technician = db.query(Empleado).filter(Empleado.departamento.in_(["Soporte", "TI"]), Empleado.estado == "activo").first()
    ticket = Ticket(
        titulo=f"[AUTO] {alert.title}",
        descripcion=f"Generado por Alesof NOC. {alert.description}\nRecomendacion: {alert.recommendation}",
        cliente_id=client.id,
        tecnico_id=technician.id if technician else None,
        prioridad=rule.ticket_priority if rule else TICKET_PRIORITY.get(alert.severity, "alta"),
        estado="abierto",
    )
    db.add(ticket)
    db.flush()
    alert.ticket_id = ticket.id
    return ticket


def risk_summary(db: Session) -> dict:
    active = db.query(Alert).filter(Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"])).all()
    score = min(100, sum({"CRITICAL": 30, "HIGH": 20, "MEDIUM": 10, "LOW": 5, "INFO": 0}.get(a.severity, 0) for a in active))
    level = "Bajo" if score <= 30 else "Medio" if score <= 60 else "Alto" if score <= 80 else "Critico"
    sites = []
    for site in db.query(Site).all():
        site_alerts = [alert for alert in active if alert.site_id == site.id]
        site_score = min(100, sum({"CRITICAL": 30, "HIGH": 20, "MEDIUM": 10, "LOW": 5}.get(a.severity, 0) for a in site_alerts))
        sites.append({"site": site.name, "score": site_score, "level": "Bajo" if site_score <= 30 else "Medio" if site_score <= 60 else "Alto" if site_score <= 80 else "Critico"})
    return {"score": score, "level": level, "active_alerts": len(active), "sites": sites}
