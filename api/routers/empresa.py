from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.auth import require_roles
from core.database import get_db
from models.cliente import Cliente
from models.empleado import Empleado
from models.equipo import Equipo
from models.factura import Factura
from models.ticket import Ticket
from models.usuario import Usuario

router = APIRouter(prefix="/api/empresa", tags=["Empresa"])


def _now():
    return datetime.now(timezone.utc).isoformat()


def _module(title: str, description: str, stats: list[dict], records: list[dict], filters: list[dict] | None = None):
    return {
        "title": title,
        "description": description,
        "updated_at": _now(),
        "stats": stats,
        "filters": filters or [],
        "records": records,
    }


def _sla_from_plan(plan: str):
    if "Corporativo" in plan:
        return {"level": "Critico", "response": "15 min", "resolution": "4 h", "availability": "99.5%", "fee": 4500}
    if "Premium" in plan:
        return {"level": "Alto", "response": "30 min", "resolution": "8 h", "availability": "99.0%", "fee": 2800}
    if "Empresarial" in plan:
        return {"level": "Estandar", "response": "1 h", "resolution": "24 h", "availability": "98.5%", "fee": 1500}
    return {"level": "Basico", "response": "4 h", "resolution": "48 h", "availability": "97.0%", "fee": 350}


@router.get("/sedes")
def sedes(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor", "tecnico")),
):
    meta = {
        "Lima": {"role": "Data Center principal", "cidr": "10.10.0.0/16", "manager": "Carmen Salazar", "risk": "Medio"},
        "Arequipa": {"role": "Sede fisica operativa", "cidr": "10.20.0.0/16", "manager": "Miguel Chavez", "risk": "Bajo"},
        "Trujillo": {"role": "Sede hibrida", "cidr": "10.30.0.0/16", "manager": "Luis Quispe", "risk": "Medio"},
        "AWS": {"role": "Extension cloud", "cidr": "10.100.0.0/16", "manager": "Jorge Ramirez", "risk": "Bajo"},
    }
    records = []
    for name, info in meta.items():
        total_devices = db.query(Equipo).filter(Equipo.sede == name).count()
        online = db.query(Equipo).filter(Equipo.sede == name, Equipo.estado == "activo").count()
        employees = db.query(Empleado).filter(Empleado.sede == name).count()
        clients = db.query(Cliente).filter(Cliente.sede == name).count()
        availability = round((online / total_devices * 100) if total_devices else (99.6 if name in ["Trujillo", "AWS"] else 0), 1)
        status = "Critico" if availability < 75 else "Degradado" if availability < 95 else "Operativo"
        records.append({
            "id": name.lower(),
            "title": name,
            "subtitle": info["role"],
            "status": status,
            "priority": info["risk"],
            "owner": info["manager"],
            "category": "Sede",
            "meta": [
                {"label": "CIDR", "value": info["cidr"]},
                {"label": "Equipos", "value": f"{online}/{total_devices} activos"},
                {"label": "Clientes", "value": clients},
                {"label": "Personal", "value": employees},
            ],
            "metrics": [
                {"label": "Disponibilidad", "value": f"{availability}%"},
                {"label": "Latencia", "value": "2 ms" if name == "Lima" else "38 ms" if name == "Arequipa" else "52 ms" if name == "Trujillo" else "74 ms"},
            ],
        })
    return _module(
        "Sedes empresariales",
        "Control operativo por sede: Lima virtualizada, Arequipa fisica y Trujillo en AWS.",
        [
            {"label": "Sedes", "value": len(records), "tone": "brand"},
            {"label": "Operativas", "value": sum(1 for item in records if item["status"] == "Operativo"), "tone": "success"},
            {"label": "Equipos", "value": db.query(Equipo).count(), "tone": "accent"},
            {"label": "Clientes asociados", "value": db.query(Cliente).count(), "tone": "soft"},
        ],
        records,
        [{"key": "status", "label": "Estado", "options": ["Operativo", "Degradado", "Critico"]}],
    )


@router.get("/servicios")
def servicios(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor", "tecnico")),
):
    critical = db.query(Ticket).filter(Ticket.prioridad == "crítica", Ticket.estado.in_(["abierto", "en_proceso"])).count()
    open_tickets = db.query(Ticket).filter(Ticket.estado.in_(["abierto", "en_proceso"])).count()
    services = [
        ("Active Directory", "Identidad corporativa, DNS interno y autenticacion.", "Infraestructura", "Operativo", "Alta", "99.5%", "AD-LIMA-01"),
        ("DNS + DHCP", "Resolucion de nombres y entrega de IP por VLAN.", "Redes", "Operativo", "Alta", "99.5%", "VLANs 10/20/30/40"),
        ("APP-LIMA-01", "Servidor de aplicaciones y servicios empresariales internos.", "Aplicaciones", "Operativo", "Alta", "99.0%", "10.10.30.50:8000"),
        ("Zabbix", "Monitoreo centralizado de sedes, VMs y red.", "NOC", "Degradado" if critical else "Operativo", "Alta", "99.5%", f"{open_tickets} eventos activos"),
        ("Veeam Backup", "Backups full e incrementales hacia TrueNAS.", "Continuidad", "Operativo", "Alta", "RPO 24h", "Ultimo job OK"),
        ("Zimbra Mail", "Correo corporativo y comunicacion interna.", "Comunicaciones", "Operativo", "Media", "99.0%", "mail.alesof.pe"),
        ("FreePBX", "Telefonia IP por sedes y extensiones.", "Comunicaciones", "Operativo", "Media", "98.5%", "Plan 1xxx/2xxx/3xxx"),
        ("VPN IPsec", "Conectividad segura Lima-AQP-TRU-AWS.", "Redes", "Critico" if critical else "Operativo", "Critica", "<100 ms", "3 tuneles"),
    ]
    records = [
        {
            "id": name.lower().replace(" ", "-"),
            "title": name,
            "subtitle": desc,
            "status": status,
            "priority": priority,
            "owner": owner,
            "category": "Servicio TI",
            "meta": [{"label": "SLA", "value": sla}, {"label": "Referencia", "value": reference}],
            "metrics": [{"label": "Estado", "value": status}, {"label": "Responsable", "value": owner}],
        }
        for name, desc, owner, status, priority, sla, reference in services
    ]
    return _module(
        "Servicios TI",
        "Catalogo de servicios criticos de Alesof S.A.C. con responsable, SLA y salud operacional.",
        [
            {"label": "Servicios", "value": len(records), "tone": "brand"},
            {"label": "Operativos", "value": sum(1 for item in records if item["status"] == "Operativo"), "tone": "success"},
            {"label": "Criticos", "value": sum(1 for item in records if item["status"] == "Critico"), "tone": "critical"},
            {"label": "Eventos", "value": open_tickets, "tone": "warning"},
        ],
        records,
        [{"key": "status", "label": "Estado", "options": ["Operativo", "Degradado", "Critico"]}],
    )


@router.get("/contratos")
def contratos(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    clients = db.query(Cliente).order_by(Cliente.fecha_contrato.desc()).all()
    records = []
    monthly_total = 0
    for client in clients:
        sla = _sla_from_plan(client.plan)
        monthly_total += sla["fee"] if client.estado == "activo" else 0
        open_tickets = db.query(Ticket).filter(Ticket.cliente_id == client.id, Ticket.estado.in_(["abierto", "en_proceso"])).count()
        unpaid = db.query(Factura).filter(Factura.cliente_id == client.id, Factura.estado.in_(["pendiente", "vencido"])).count()
        renewal_year = date.today().year + 1
        records.append({
            "id": f"ctr-{client.id}",
            "title": client.nombre,
            "subtitle": client.plan,
            "status": "Suspendido" if client.estado == "suspendido" else "Con riesgo" if unpaid else "Vigente",
            "priority": sla["level"],
            "owner": "Administracion comercial",
            "category": "Contrato SLA",
            "meta": [
                {"label": "RUC", "value": client.ruc},
                {"label": "Sede", "value": client.sede},
                {"label": "Respuesta", "value": sla["response"]},
                {"label": "Resolucion", "value": sla["resolution"]},
            ],
            "metrics": [
                {"label": "Disponibilidad", "value": sla["availability"]},
                {"label": "MRR", "value": f"S/ {sla['fee']:,}"},
                {"label": "Tickets", "value": open_tickets},
                {"label": "Renovacion", "value": f"{client.fecha_contrato.day:02d}/{client.fecha_contrato.month:02d}/{renewal_year}"},
            ],
        })
    return _module(
        "Contratos y SLA",
        "Gestion de contratos, niveles de servicio, ingresos recurrentes y riesgo comercial.",
        [
            {"label": "Contratos", "value": len(records), "tone": "brand"},
            {"label": "Vigentes", "value": sum(1 for item in records if item["status"] == "Vigente"), "tone": "success"},
            {"label": "Con riesgo", "value": sum(1 for item in records if item["status"] == "Con riesgo"), "tone": "warning"},
            {"label": "MRR estimado", "value": f"S/ {monthly_total:,}", "tone": "accent"},
        ],
        records,
        [{"key": "status", "label": "Estado", "options": ["Vigente", "Con riesgo", "Suspendido"]}],
    )


@router.get("/proyectos")
def proyectos(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor", "tecnico")),
):
    records = [
        {
            "id": "prj-vpn-aws",
            "title": "VPN Lima - AWS",
            "subtitle": "Túnel IPsec hacia VPC 10.100.0.0/16 con VGW.",
            "status": "En ejecucion",
            "priority": "Alta",
            "owner": "Luis Quispe",
            "category": "Cloud",
            "meta": [{"label": "Inicio", "value": "2026-05-28"}, {"label": "Fin", "value": "2026-06-20"}],
            "metrics": [{"label": "Avance", "value": "72%"}, {"label": "Riesgo", "value": "Medio"}],
        },
        {
            "id": "prj-zabbix",
            "title": "Monitoreo Zabbix multisede",
            "subtitle": "Server Lima, SNMPv3, agentes y proxy Arequipa.",
            "status": "En ejecucion",
            "priority": "Alta",
            "owner": "Jorge Ramirez",
            "category": "NOC",
            "meta": [{"label": "Inicio", "value": "2026-05-12"}, {"label": "Fin", "value": "2026-06-18"}],
            "metrics": [{"label": "Avance", "value": "81%"}, {"label": "Hosts", "value": db.query(Equipo).count()}],
        },
        {
            "id": "prj-veeam",
            "title": "Backups Veeam + TrueNAS",
            "subtitle": "Full semanal, incremental diario y prueba de restore.",
            "status": "Planificado",
            "priority": "Media",
            "owner": "Carmen Salazar",
            "category": "Continuidad",
            "meta": [{"label": "Inicio", "value": "2026-06-17"}, {"label": "Fin", "value": "2026-06-30"}],
            "metrics": [{"label": "Avance", "value": "35%"}, {"label": "RPO", "value": "24h"}],
        },
        {
            "id": "prj-hardening",
            "title": "Hardening switching",
            "subtitle": "Port Security, DHCP Snooping, DAI, BPDU Guard y Storm Control.",
            "status": "En ejecucion",
            "priority": "Alta",
            "owner": "Miguel Chavez",
            "category": "Seguridad",
            "meta": [{"label": "Inicio", "value": "2026-06-01"}, {"label": "Fin", "value": "2026-06-22"}],
            "metrics": [{"label": "Avance", "value": "64%"}, {"label": "Sedes", "value": "Lima/AQP"}],
        },
    ]
    return _module(
        "Proyectos empresariales",
        "Iniciativas activas de infraestructura, cloud, seguridad y continuidad.",
        [
            {"label": "Proyectos", "value": len(records), "tone": "brand"},
            {"label": "En ejecucion", "value": sum(1 for item in records if item["status"] == "En ejecucion"), "tone": "accent"},
            {"label": "Alta prioridad", "value": sum(1 for item in records if item["priority"] == "Alta"), "tone": "warning"},
            {"label": "Planificados", "value": sum(1 for item in records if item["status"] == "Planificado"), "tone": "soft"},
        ],
        records,
        [{"key": "status", "label": "Estado", "options": ["En ejecucion", "Planificado", "Cerrado"]}],
    )


@router.get("/backups")
def backups(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor", "tecnico")),
):
    records = [
        ("Backup Full VMs Lima", "Veeam hacia TrueNAS ds-backup-lima.", "Exitoso", "Critica", "BKP-LIMA-01", "Domingo 02:00", "4 semanas"),
        ("Incremental diario", "Cambios diarios de VMs criticas.", "Exitoso", "Alta", "BKP-LIMA-01", "Lun-Sab 02:00", "7 dias"),
        ("Restore sandbox", "Prueba SureBackup en red aislada.", "Pendiente", "Alta", "Carmen Salazar", "Lunes 04:00", "1 prueba/semana"),
        ("S3 off-site", "Backups cifrados hacia alesof-storage.", "Exitoso", "Media", "AWS", "Diario 03:30", "90 dias + Glacier"),
    ]
    data = [
        {
            "id": name.lower().replace(" ", "-"),
            "title": name,
            "subtitle": desc,
            "status": status,
            "priority": priority,
            "owner": owner,
            "category": "Backup",
            "meta": [{"label": "Ventana", "value": window}, {"label": "Retencion", "value": retention}],
            "metrics": [{"label": "RTO", "value": "4h"}, {"label": "RPO", "value": "24h"}],
        }
        for name, desc, status, priority, owner, window, retention in records
    ]
    return _module(
        "Backups y continuidad",
        "Gobierno de respaldo, restauracion y recuperacion ante desastres.",
        [
            {"label": "Jobs", "value": len(data), "tone": "brand"},
            {"label": "Exitosos", "value": sum(1 for item in data if item["status"] == "Exitoso"), "tone": "success"},
            {"label": "Pendientes", "value": sum(1 for item in data if item["status"] == "Pendiente"), "tone": "warning"},
            {"label": "VMs protegidas", "value": db.query(Equipo).filter(Equipo.tipo == "servidor").count(), "tone": "accent"},
        ],
        data,
        [{"key": "status", "label": "Estado", "options": ["Exitoso", "Pendiente", "Fallido"]}],
    )


@router.get("/seguridad")
def seguridad(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor", "tecnico")),
):
    critical_tickets = db.query(Ticket).filter(Ticket.prioridad == "crítica", Ticket.estado.in_(["abierto", "en_proceso"])).count()
    records = [
        ("ACL Management", "SSH solo desde VLAN 10/130 y red de gestion.", "Cumple", "Alta", "Redes", "Routers"),
        ("Port Security", "Maximo 2 MAC sticky por puerto de acceso.", "Cumple", "Media", "Operaciones", "Switching"),
        ("DHCP Snooping + DAI", "Bloqueo de DHCP rogue y ARP spoofing.", "Cumple", "Alta", "Redes", "Switching"),
        ("BPDU Guard", "Err-disable ante switch no autorizado.", "Cumple", "Alta", "Operaciones", "Acceso"),
        ("Security Groups AWS", "ALB publico, EC2 privado, RDS solo desde EC2.", "Revision", "Alta", "Cloud", "AWS"),
        ("Eventos criticos", "Tickets criticos abiertos que pueden impactar seguridad.", "Atencion" if critical_tickets else "Cumple", "Critica", "NOC", f"{critical_tickets} eventos"),
    ]
    data = [
        {
            "id": name.lower().replace(" ", "-"),
            "title": name,
            "subtitle": desc,
            "status": status,
            "priority": priority,
            "owner": owner,
            "category": "Control",
            "meta": [{"label": "Dominio", "value": domain}, {"label": "Responsable", "value": owner}],
            "metrics": [{"label": "Riesgo", "value": priority}, {"label": "Estado", "value": status}],
        }
        for name, desc, status, priority, owner, domain in records
    ]
    return _module(
        "Seguridad y cumplimiento",
        "Controles de red, cloud, acceso y hardening para Alesof S.A.C.",
        [
            {"label": "Controles", "value": len(data), "tone": "brand"},
            {"label": "Cumplen", "value": sum(1 for item in data if item["status"] == "Cumple"), "tone": "success"},
            {"label": "Revision", "value": sum(1 for item in data if item["status"] == "Revision"), "tone": "warning"},
            {"label": "Atencion", "value": sum(1 for item in data if item["status"] == "Atencion"), "tone": "critical"},
        ],
        data,
        [{"key": "status", "label": "Estado", "options": ["Cumple", "Revision", "Atencion"]}],
    )
