from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.auth import get_current_user, require_roles
from core.database import get_db
from models.cliente import Cliente
from models.factura import Factura
from models.usuario import Usuario
from schemas.factura import FacturaCreate, FacturaResponse, FacturaUpdate

router = APIRouter(prefix="/api/facturacion", tags=["Facturación"])


def _to_response(f: Factura) -> dict:
    d = {c.name: getattr(f, c.name) for c in f.__table__.columns}
    d["cliente_nombre"] = f.cliente.nombre if f.cliente else None
    return d


@router.get("/", response_model=list[FacturaResponse])
def listar(
    estado: str = "",
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    q = db.query(Factura)
    if estado:
        q = q.filter(Factura.estado == estado)
    items = q.order_by(Factura.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return [_to_response(f) for f in items]


@router.get("/count")
def count(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    return {"total": db.query(Factura).count()}


@router.get("/ingresos")
def ingresos_mensuales(
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    from sqlalchemy import extract, func

    rows = (
        db.query(
            extract("year", Factura.fecha_emision).label("anio"),
            extract("month", Factura.fecha_emision).label("mes"),
            func.sum(Factura.monto).label("total"),
        )
        .filter(Factura.estado == "pagado")
        .group_by("anio", "mes")
        .order_by("anio", "mes")
        .all()
    )
    return [{"anio": int(r.anio), "mes": int(r.mes), "total": float(r.total)} for r in rows]


@router.get("/{factura_id}", response_model=FacturaResponse)
def obtener(
    factura_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    factura = db.query(Factura).filter(Factura.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return _to_response(factura)


@router.post("/", response_model=FacturaResponse, status_code=201)
def crear(
    data: FacturaCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    if not db.query(Cliente).filter(Cliente.id == data.cliente_id).first():
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    if db.query(Factura).filter(Factura.numero == data.numero).first():
        raise HTTPException(status_code=400, detail="Ya existe una factura con ese número")
    factura = Factura(**data.model_dump())
    db.add(factura)
    db.commit()
    db.refresh(factura)
    return _to_response(factura)


@router.put("/{factura_id}", response_model=FacturaResponse)
def actualizar(
    factura_id: int,
    data: FacturaUpdate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador", "supervisor")),
):
    factura = db.query(Factura).filter(Factura.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(factura, field, value)
    db.commit()
    db.refresh(factura)
    return _to_response(factura)


@router.delete("/{factura_id}")
def eliminar(
    factura_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("administrador")),
):
    factura = db.query(Factura).filter(Factura.id == factura_id).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    db.delete(factura)
    db.commit()
    return {"detail": "Factura eliminada"}
