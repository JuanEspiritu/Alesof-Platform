from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.auth import require_roles
from core.database import get_db
from models.equipo import Equipo
from models.usuario import Usuario
from schemas.equipo import EquipoCreate, EquipoResponse, EquipoUpdate

router = APIRouter(prefix="/api/inventario", tags=["Inventario"])


@router.get("/", response_model=list[EquipoResponse])
def listar(
    search: str = "",
    tipo: str = "",
    sede: str = "",
    estado: str = "",
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor", "tecnico")),
):
    q = db.query(Equipo)
    if search:
        q = q.filter(Equipo.nombre.ilike(f"%{search}%") | Equipo.serie.ilike(f"%{search}%"))
    if tipo:
        q = q.filter(Equipo.tipo == tipo)
    if sede:
        q = q.filter(Equipo.sede == sede)
    if estado:
        q = q.filter(Equipo.estado == estado)
    return q.order_by(Equipo.id.desc()).offset((page - 1) * limit).limit(limit).all()


@router.get("/count")
def count(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor", "tecnico")),
):
    return {"total": db.query(Equipo).count()}


@router.get("/{equipo_id}", response_model=EquipoResponse)
def obtener(
    equipo_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor", "tecnico")),
):
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return equipo


@router.post("/", response_model=EquipoResponse, status_code=201)
def crear(
    data: EquipoCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    if db.query(Equipo).filter(Equipo.serie == data.serie).first():
        raise HTTPException(status_code=400, detail="Ya existe un equipo con ese número de serie")
    equipo = Equipo(**data.model_dump())
    db.add(equipo)
    db.commit()
    db.refresh(equipo)
    return equipo


@router.put("/{equipo_id}", response_model=EquipoResponse)
def actualizar(
    equipo_id: int,
    data: EquipoUpdate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(equipo, field, value)
    db.commit()
    db.refresh(equipo)
    return equipo


@router.delete("/{equipo_id}")
def eliminar(
    equipo_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador")),
):
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    db.delete(equipo)
    db.commit()
    return {"detail": "Equipo eliminado"}
