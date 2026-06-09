from datetime import datetime

from pydantic import BaseModel, EmailStr


class EmpleadoBase(BaseModel):
    nombre: str
    dni: str
    email: EmailStr
    cargo: str
    departamento: str
    sede: str
    estado: str = "activo"


class EmpleadoCreate(EmpleadoBase):
    pass


class EmpleadoUpdate(BaseModel):
    nombre: str | None = None
    dni: str | None = None
    email: EmailStr | None = None
    cargo: str | None = None
    departamento: str | None = None
    sede: str | None = None
    estado: str | None = None


class EmpleadoResponse(EmpleadoBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
