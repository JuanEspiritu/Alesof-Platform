from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Equipo(Base):
    __tablename__ = "equipos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150))
    tipo: Mapped[str] = mapped_column(String(50))  # router, switch, OLT, servidor, access_point
    marca: Mapped[str] = mapped_column(String(100))
    modelo: Mapped[str] = mapped_column(String(100))
    serie: Mapped[str] = mapped_column(String(100), unique=True)
    sede: Mapped[str] = mapped_column(String(50))
    vlan: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), default="activo")  # activo, mantenimiento, dañado, retirado
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
