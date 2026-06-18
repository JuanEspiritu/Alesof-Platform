from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from core.auth import get_current_user, require_roles
from core.database import get_db
from models.cliente import Cliente
from models.empleado import Empleado
from models.equipo import Equipo
from models.factura import Factura
from models.ticket import Ticket
from models.usuario import Usuario

router = APIRouter(prefix="/api/reportes", tags=["Reportes"])


def _severity_rank(severity: str) -> int:
    return {"success": 0, "info": 1, "warning": 2, "critical": 3}.get(severity, 0)


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    total_clientes = db.query(Cliente).count()
    total_empleados = db.query(Empleado).count()
    tickets_abiertos = db.query(Ticket).filter(Ticket.estado.in_(["abierto", "en_proceso"])).count()
    ingresos_total = db.query(func.coalesce(func.sum(Factura.monto), 0)).filter(Factura.estado == "pagado").scalar()
    return {
        "total_clientes": total_clientes,
        "total_empleados": total_empleados,
        "tickets_abiertos": tickets_abiertos,
        "ingresos_mes": float(ingresos_total),
    }


@router.get("/clientes-por-mes")
def clientes_por_mes(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    from sqlalchemy import extract

    rows = (
        db.query(
            extract("year", Cliente.fecha_contrato).label("anio"),
            extract("month", Cliente.fecha_contrato).label("mes"),
            func.count(Cliente.id).label("total"),
        )
        .group_by("anio", "mes")
        .order_by("anio", "mes")
        .all()
    )
    return [{"anio": int(r.anio), "mes": int(r.mes), "total": r.total} for r in rows]


@router.get("/tickets-por-tecnico")
def tickets_por_tecnico(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    rows = (
        db.query(Empleado.nombre, func.count(Ticket.id).label("total"))
        .join(Ticket, Ticket.tecnico_id == Empleado.id)
        .filter(Ticket.estado == "resuelto")
        .group_by(Empleado.nombre)
        .all()
    )
    return [{"tecnico": r[0], "resueltos": r[1]} for r in rows]


@router.get("/disponibilidad-sedes")
def disponibilidad_sedes(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    sedes = ["Lima", "Arequipa", "AWS"]
    result = []
    for sede in sedes:
        total = db.query(Equipo).filter(Equipo.sede == sede).count()
        activos = db.query(Equipo).filter(Equipo.sede == sede, Equipo.estado == "activo").count()
        result.append({
            "sede": sede,
            "total_equipos": total,
            "activos": activos,
            "disponibilidad": round((activos / total * 100) if total > 0 else 0, 1),
        })
    return result


@router.get("/ultimos-tickets")
def ultimos_tickets(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    tickets = db.query(Ticket).order_by(Ticket.id.desc()).limit(5).all()
    result = []
    for t in tickets:
        result.append({
            "id": t.id,
            "titulo": t.titulo,
            "prioridad": t.prioridad,
            "estado": t.estado,
            "cliente": t.cliente.nombre if t.cliente else None,
            "tecnico": t.tecnico.nombre if t.tecnico else None,
            "created_at": t.created_at.isoformat(),
        })
    return result


@router.get("/notificaciones")
def notificaciones(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    notifications = []

    ticket_query = db.query(Ticket)
    if current_user.rol == "cliente":
      cliente = db.query(Cliente).filter(Cliente.email == current_user.email).first()
      if not cliente:
          return []
      ticket_query = ticket_query.filter(Ticket.cliente_id == cliente.id)

    critical_count = ticket_query.filter(
        Ticket.prioridad == "crítica",
        Ticket.estado.in_(["abierto", "en_proceso"]),
    ).count()
    open_count = ticket_query.filter(Ticket.estado == "abierto").count()

    if critical_count:
        notifications.append({
            "id": "tickets-criticos",
            "type": "critical",
            "title": "Tickets críticos activos",
            "message": f"{critical_count} incidencia(s) requieren atención prioritaria.",
            "href": "/dashboard/soporte",
        })
    elif open_count:
        notifications.append({
            "id": "tickets-abiertos",
            "type": "warning",
            "title": "Tickets abiertos",
            "message": f"{open_count} ticket(s) nuevos pendientes de triage.",
            "href": "/dashboard/soporte",
        })

    if current_user.rol in ["administrador", "supervisor"]:
        vencidas = db.query(Factura).filter(Factura.estado == "vencido").count()
        pendientes = db.query(Factura).filter(Factura.estado == "pendiente").count()
        mantenimiento = db.query(Equipo).filter(Equipo.estado == "mantenimiento").count()
        total_equipos = db.query(Equipo).count()
        activos = db.query(Equipo).filter(Equipo.estado == "activo").count()
        disponibilidad = round((activos / total_equipos * 100) if total_equipos else 0, 1)

        if vencidas:
            notifications.append({
                "id": "facturas-vencidas",
                "type": "critical",
                "title": "Facturas vencidas",
                "message": f"{vencidas} factura(s) vencidas deben revisarse.",
                "href": "/dashboard/facturacion",
            })
        elif pendientes:
            notifications.append({
                "id": "facturas-pendientes",
                "type": "warning",
                "title": "Cartera pendiente",
                "message": f"{pendientes} factura(s) pendientes de cobro.",
                "href": "/dashboard/facturacion",
            })

        if mantenimiento:
            notifications.append({
                "id": "equipos-mantenimiento",
                "type": "info",
                "title": "Equipos en mantenimiento",
                "message": f"{mantenimiento} equipo(s) fuera de operación normal.",
                "href": "/dashboard/inventario",
            })

        notifications.append({
            "id": "disponibilidad-global",
            "type": "success" if disponibilidad >= 90 else "warning",
            "title": "Disponibilidad global",
            "message": f"{disponibilidad}% de equipos activos registrados.",
            "href": "/dashboard/reportes",
        })

    if not notifications:
        notifications.append({
            "id": "sin-alertas",
            "type": "success",
            "title": "Sin alertas críticas",
            "message": "No hay eventos pendientes para tu rol.",
            "href": "/dashboard/soporte",
        })

    return notifications[:6]


@router.get("/noc-live")
def noc_live(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_roles("administrador", "supervisor", "tecnico")),
):
    total_equipos = db.query(Equipo).count()
    activos = db.query(Equipo).filter(Equipo.estado == "activo").count()
    mantenimiento = db.query(Equipo).filter(Equipo.estado == "mantenimiento").count()
    danados = db.query(Equipo).filter(Equipo.estado == "dañado").count()
    tickets_abiertos = db.query(Ticket).filter(Ticket.estado.in_(["abierto", "en_proceso"])).count()
    tickets_criticos = db.query(Ticket).filter(
        Ticket.prioridad == "crítica",
        Ticket.estado.in_(["abierto", "en_proceso"]),
    ).count()
    facturas_vencidas = db.query(Factura).filter(Factura.estado == "vencido").count()
    facturas_pendientes = db.query(Factura).filter(Factura.estado == "pendiente").count()
    disponibilidad_global = round((activos / total_equipos * 100) if total_equipos else 0, 1)

    sedes_config = {
        "Lima": {"cidr": "10.10.0.0/16", "rol": "Data Center principal", "latencia_ms": 2},
        "Arequipa": {"cidr": "10.20.0.0/16", "rol": "Sede fisica", "latencia_ms": 38},
        "Trujillo": {"cidr": "10.30.0.0/16", "rol": "Sede hibrida", "latencia_ms": 52},
        "AWS": {"cidr": "10.100.0.0/16", "rol": "Extension cloud", "latencia_ms": 74},
    }
    sedes = []
    for sede, meta in sedes_config.items():
        total = db.query(Equipo).filter(Equipo.sede == sede).count()
        ok = db.query(Equipo).filter(Equipo.sede == sede, Equipo.estado == "activo").count()
        availability = round((ok / total * 100) if total else (99.6 if sede in ["Trujillo", "AWS"] else 0), 1)
        status = "online" if availability >= 95 else "degraded" if availability >= 75 else "critical"
        sedes.append({
            "name": sede,
            "role": meta["rol"],
            "cidr": meta["cidr"],
            "latency_ms": meta["latencia_ms"],
            "devices_total": total,
            "devices_online": ok,
            "availability": availability,
            "status": status,
        })

    services = [
        {"name": "Active Directory", "owner": "Infraestructura", "target": "99.5%", "status": "online", "metric": "LDAP/DNS operativo"},
        {"name": "DNS + DHCP", "owner": "Redes", "target": "99.5%", "status": "online", "metric": "Scopes activos"},
        {"name": "ERP Odoo", "owner": "Aplicaciones", "target": "99.0%", "status": "online", "metric": "Docker saludable"},
        {"name": "Zabbix Server", "owner": "NOC", "target": "99.5%", "status": "warning" if tickets_criticos else "online", "metric": f"{tickets_abiertos} eventos abiertos"},
        {"name": "Veeam Backup", "owner": "Continuidad", "target": "RPO 24h", "status": "online", "metric": "Ultimo job OK"},
        {"name": "Correo Zimbra", "owner": "Comunicaciones", "target": "99.0%", "status": "online", "metric": "SMTP/IMAP OK"},
        {"name": "VPN IPsec", "owner": "Redes", "target": "< 100 ms WAN", "status": "critical" if tickets_criticos else "online", "metric": "3 tuneles monitoreados"},
        {"name": "vCenter Cluster", "owner": "Virtualizacion", "target": "HA activo", "status": "online", "metric": "2 nodos Lima"},
    ]

    vpn_links = [
        {"name": "Lima - Arequipa", "type": "IPsec", "latency_ms": 38, "packet_loss": 0.3, "status": "critical" if tickets_criticos else "online"},
        {"name": "Lima - Trujillo", "type": "IPsec", "latency_ms": 52, "packet_loss": 0.2, "status": "online"},
        {"name": "Lima - AWS", "type": "IPsec", "latency_ms": 74, "packet_loss": 0.4, "status": "online"},
    ]

    events = []
    latest_critical = (
        db.query(Ticket)
        .filter(Ticket.prioridad == "crítica", Ticket.estado.in_(["abierto", "en_proceso"]))
        .order_by(Ticket.updated_at.desc())
        .first()
    )
    if latest_critical:
        events.append({
            "id": f"ticket-{latest_critical.id}",
            "severity": "critical",
            "title": latest_critical.titulo,
            "message": latest_critical.descripcion,
            "source": "Mesa de ayuda",
            "href": "/dashboard/soporte",
        })
    if facturas_vencidas and current_user.rol in ["administrador", "supervisor"]:
        events.append({
            "id": "billing-overdue",
            "severity": "warning",
            "title": "Cartera vencida",
            "message": f"{facturas_vencidas} factura(s) vencidas requieren seguimiento administrativo.",
            "source": "Facturacion",
            "href": "/dashboard/facturacion",
        })
    if mantenimiento:
        events.append({
            "id": "maintenance-devices",
            "severity": "info",
            "title": "Equipos en mantenimiento",
            "message": f"{mantenimiento} activo(s) fuera de operacion normal.",
            "source": "Inventario",
            "href": "/dashboard/inventario",
        })
    if not events:
        events.append({
            "id": "noc-stable",
            "severity": "success",
            "title": "Operacion estable",
            "message": "No hay eventos criticos activos para el NOC.",
            "source": "NOC",
            "href": "/dashboard/noc",
        })

    highest_severity = max(events, key=lambda item: _severity_rank(item["severity"]))["severity"]
    alert_signature = f"{tickets_criticos}:{facturas_vencidas}:{mantenimiento}:{danados}:{highest_severity}"

    return {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "status": highest_severity,
        "alert_signature": alert_signature,
        "kpis": {
            "availability": disponibilidad_global,
            "open_tickets": tickets_abiertos,
            "critical_tickets": tickets_criticos,
            "devices_total": total_equipos,
            "devices_online": activos,
            "devices_maintenance": mantenimiento,
            "overdue_invoices": facturas_vencidas if current_user.rol in ["administrador", "supervisor"] else 0,
            "pending_invoices": facturas_pendientes if current_user.rol in ["administrador", "supervisor"] else 0,
        },
        "sites": sedes,
        "services": services,
        "vpn_links": vpn_links,
        "events": sorted(events, key=lambda item: _severity_rank(item["severity"]), reverse=True)[:8],
        "enterprise_modules": [
            {"name": "Contratos SLA", "summary": "Control de tiempos de respuesta, penalidades y renovaciones.", "priority": "Alta"},
            {"name": "CMDB", "summary": "Relaciona activos, servicios, sedes y clientes afectados.", "priority": "Alta"},
            {"name": "Backups y DR", "summary": "RPO/RTO, jobs Veeam y pruebas de restauracion.", "priority": "Media"},
            {"name": "Seguridad", "summary": "ACLs, eventos, hardening y auditoria de cambios.", "priority": "Alta"},
        ],
    }
