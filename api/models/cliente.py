from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(200))
    ruc: Mapped[str] = mapped_column(String(11), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(150))
    telefono: Mapped[str] = mapped_column(String(20))
    sede: Mapped[str] = mapped_column(String(50))  # Lima, Arequipa, AWS
    plan: Mapped[str] = mapped_column(String(50))  # Básico 50Mbps, Empresarial 200Mbps, Premium 500Mbps, Corporativo 1Gbps
    estado: Mapped[str] = mapped_column(String(20), default="activo")  # activo, suspendido, retirado
    fecha_contrato: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    facturas = relationship("Factura", back_populates="cliente")
    tickets = relationship("Ticket", back_populates="cliente")
