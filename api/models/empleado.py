from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Empleado(Base):
    __tablename__ = "empleados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150))
    dni: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(150))
    cargo: Mapped[str] = mapped_column(String(100))
    departamento: Mapped[str] = mapped_column(String(50))  # TI, Soporte, Ventas, Administración, Operaciones
    sede: Mapped[str] = mapped_column(String(50))
    estado: Mapped[str] = mapped_column(String(20), default="activo")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
