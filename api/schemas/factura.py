from datetime import date, datetime

from pydantic import BaseModel


class FacturaBase(BaseModel):
    cliente_id: int
    numero: str
    monto: float
    fecha_emision: date
    fecha_vencimiento: date
    estado: str = "pendiente"


class FacturaCreate(FacturaBase):
    pass


class FacturaUpdate(BaseModel):
    monto: float | None = None
    fecha_vencimiento: date | None = None
    estado: str | None = None


class FacturaResponse(FacturaBase):
    id: int
    created_at: datetime
    cliente_nombre: str | None = None

    model_config = {"from_attributes": True}
