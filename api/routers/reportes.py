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

router = APIRouter(prefix="/api/reportes", tags=["Reportes"])


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
