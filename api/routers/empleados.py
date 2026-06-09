from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.auth import require_roles
from core.database import get_db
from models.empleado import Empleado
from models.usuario import Usuario
from schemas.empleado import EmpleadoCreate, EmpleadoResponse, EmpleadoUpdate

router = APIRouter(prefix="/api/empleados", tags=["Empleados"])


@router.get("/", response_model=list[EmpleadoResponse])
def listar(
    search: str = "",
    departamento: str = "",
    sede: str = "",
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    q = db.query(Empleado)
    if search:
        q = q.filter(Empleado.nombre.ilike(f"%{search}%") | Empleado.dni.ilike(f"%{search}%"))
    if departamento:
        q = q.filter(Empleado.departamento == departamento)
    if sede:
        q = q.filter(Empleado.sede == sede)
    return q.order_by(Empleado.id.desc()).offset((page - 1) * limit).limit(limit).all()


@router.get("/count")
def count(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    return {"total": db.query(Empleado).count()}


@router.get("/{empleado_id}", response_model=EmpleadoResponse)
def obtener(
    empleado_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return empleado


@router.post("/", response_model=EmpleadoResponse, status_code=201)
def crear(
    data: EmpleadoCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador")),
):
    if db.query(Empleado).filter(Empleado.dni == data.dni).first():
        raise HTTPException(status_code=400, detail="Ya existe un empleado con ese DNI")
    empleado = Empleado(**data.model_dump())
    db.add(empleado)
    db.commit()
    db.refresh(empleado)
    return empleado


@router.put("/{empleado_id}", response_model=EmpleadoResponse)
def actualizar(
    empleado_id: int,
    data: EmpleadoUpdate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador")),
):
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(empleado, field, value)
    db.commit()
    db.refresh(empleado)
    return empleado


@router.delete("/{empleado_id}")
def eliminar(
    empleado_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador")),
):
    empleado = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if not empleado:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    db.delete(empleado)
    db.commit()
    return {"detail": "Empleado eliminado"}
