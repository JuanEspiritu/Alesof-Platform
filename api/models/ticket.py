from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column(String(200))
    descripcion: Mapped[str] = mapped_column(Text)
    cliente_id: Mapped[int] = mapped_column(Integer, ForeignKey("clientes.id"))
    tecnico_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("empleados.id"), nullable=True)
    prioridad: Mapped[str] = mapped_column(String(20), default="media")  # baja, media, alta, crítica
    estado: Mapped[str] = mapped_column(String(20), default="abierto")  # abierto, en_proceso, resuelto, cerrado
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    cliente = relationship("Cliente", back_populates="tickets")
    tecnico = relationship("Empleado")
