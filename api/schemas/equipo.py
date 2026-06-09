from datetime import datetime

from pydantic import BaseModel


class EquipoBase(BaseModel):
    nombre: str
    tipo: str
    marca: str
    modelo: str
    serie: str
    sede: str
    vlan: str | None = None
    ip: str | None = None
    estado: str = "activo"


class EquipoCreate(EquipoBase):
    pass


class EquipoUpdate(BaseModel):
    nombre: str | None = None
    tipo: str | None = None
    marca: str | None = None
    modelo: str | None = None
    serie: str | None = None
    sede: str | None = None
    vlan: str | None = None
    ip: str | None = None
    estado: str | None = None


class EquipoResponse(EquipoBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
