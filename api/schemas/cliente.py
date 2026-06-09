from datetime import date, datetime

from pydantic import BaseModel, EmailStr


class ClienteBase(BaseModel):
    nombre: str
    ruc: str
    email: EmailStr
    telefono: str
    sede: str
    plan: str
    estado: str = "activo"
    fecha_contrato: date


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    nombre: str | None = None
    ruc: str | None = None
    email: EmailStr | None = None
    telefono: str | None = None
    sede: str | None = None
    plan: str | None = None
    estado: str | None = None
    fecha_contrato: date | None = None


class ClienteResponse(ClienteBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
