from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.auth import get_current_user, require_roles
from core.database import get_db
from models.cliente import Cliente
from models.usuario import Usuario
from schemas.cliente import ClienteCreate, ClienteResponse, ClienteUpdate

router = APIRouter(prefix="/api/clientes", tags=["Clientes"])


@router.get("/", response_model=list[ClienteResponse])
def listar(
    search: str = "",
    sede: str = "",
    estado: str = "",
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor", "tecnico")),
):
    q = db.query(Cliente)
    if search:
        q = q.filter(Cliente.nombre.ilike(f"%{search}%") | Cliente.ruc.ilike(f"%{search}%"))
    if sede:
        q = q.filter(Cliente.sede == sede)
    if estado:
        q = q.filter(Cliente.estado == estado)
    total = q.count()
    items = q.order_by(Cliente.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return items


@router.get("/count")
def count(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    return {"total": db.query(Cliente).count()}


@router.get("/{cliente_id}", response_model=ClienteResponse)
def obtener(
    cliente_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


@router.post("/", response_model=ClienteResponse, status_code=201)
def crear(
    data: ClienteCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    if db.query(Cliente).filter(Cliente.ruc == data.ruc).first():
        raise HTTPException(status_code=400, detail="Ya existe un cliente con ese RUC")
    cliente = Cliente(**data.model_dump())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.put("/{cliente_id}", response_model=ClienteResponse)
def actualizar(
    cliente_id: int,
    data: ClienteUpdate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cliente, field, value)
    db.commit()
    db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}")
def eliminar(
    cliente_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador")),
):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    db.delete(cliente)
    db.commit()
    return {"detail": "Cliente eliminado"}
