from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.auth import get_current_user, require_roles
from core.database import get_db
from models.cliente import Cliente
from models.empleado import Empleado
from models.ticket import Ticket
from models.usuario import Usuario
from schemas.ticket import TicketCreate, TicketResponse, TicketUpdate

router = APIRouter(prefix="/api/soporte", tags=["Soporte"])


def _to_response(t: Ticket) -> dict:
    d = {c.name: getattr(t, c.name) for c in t.__table__.columns}
    d["cliente_nombre"] = t.cliente.nombre if t.cliente else None
    d["tecnico_nombre"] = t.tecnico.nombre if t.tecnico else None
    return d


@router.get("/", response_model=list[TicketResponse])
def listar(
    estado: str = "",
    prioridad: str = "",
    tecnico_id: int | None = None,
    cliente_id: int | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    q = db.query(Ticket)
    if current_user.rol == "cliente":
        cliente = db.query(Cliente).filter(Cliente.email == current_user.email).first()
        if cliente:
            q = q.filter(Ticket.cliente_id == cliente.id)
        else:
            return []
    if estado:
        q = q.filter(Ticket.estado == estado)
    if prioridad:
        q = q.filter(Ticket.prioridad == prioridad)
    if tecnico_id:
        q = q.filter(Ticket.tecnico_id == tecnico_id)
    if cliente_id and current_user.rol != "cliente":
        q = q.filter(Ticket.cliente_id == cliente_id)
    items = q.order_by(Ticket.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return [_to_response(t) for t in items]


@router.get("/count")
def count(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    return {"total": db.query(Ticket).count()}


@router.get("/por-estado")
def por_estado(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    from sqlalchemy import func

    rows = db.query(Ticket.estado, func.count(Ticket.id)).group_by(Ticket.estado).all()
    return [{"estado": r[0], "cantidad": r[1]} for r in rows]


@router.get("/{ticket_id}", response_model=TicketResponse)
def obtener(
    ticket_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    return _to_response(ticket)


@router.post("/", response_model=TicketResponse, status_code=201)
def crear(
    data: TicketCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    if not db.query(Cliente).filter(Cliente.id == data.cliente_id).first():
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if data.tecnico_id and not db.query(Empleado).filter(Empleado.id == data.tecnico_id).first():
        raise HTTPException(status_code=404, detail="Técnico no encontrado")
    ticket = Ticket(**data.model_dump())
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return _to_response(ticket)


@router.put("/{ticket_id}", response_model=TicketResponse)
def actualizar(
    ticket_id: int,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor", "tecnico")),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ticket, field, value)
    db.commit()
    db.refresh(ticket)
    return _to_response(ticket)


@router.delete("/{ticket_id}")
def eliminar(
    ticket_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador")),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    db.delete(ticket)
    db.commit()
    return {"detail": "Ticket eliminado"}
