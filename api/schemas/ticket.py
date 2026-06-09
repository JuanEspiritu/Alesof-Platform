from datetime import datetime

from pydantic import BaseModel


class TicketBase(BaseModel):
    titulo: str
    descripcion: str
    cliente_id: int
    tecnico_id: int | None = None
    prioridad: str = "media"
    estado: str = "abierto"


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    titulo: str | None = None
    descripcion: str | None = None
    tecnico_id: int | None = None
    prioridad: str | None = None
    estado: str | None = None


class TicketResponse(TicketBase):
    id: int
    created_at: datetime
    updated_at: datetime
    cliente_nombre: str | None = None
    tecnico_nombre: str | None = None

    model_config = {"from_attributes": True}
