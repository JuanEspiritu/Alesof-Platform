from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    cidr: Mapped[str] = mapped_column(String(50))
    kind: Mapped[str] = mapped_column(String(30), default="on_premise")
    status: Mapped[str] = mapped_column(String(20), default="ONLINE")
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    availability: Mapped[float] = mapped_column(Float, default=100.0)
    last_check: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class PhysicalDevice(Base):
    __tablename__ = "physical_devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    device_type: Mapped[str] = mapped_column(String(30))
    ip: Mapped[str] = mapped_column(String(45), unique=True)
    brand: Mapped[str] = mapped_column(String(80))
    model: Mapped[str] = mapped_column(String(100))
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"))
    status: Mapped[str] = mapped_column(String(20), default="ONLINE")
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    uptime_seconds: Mapped[int] = mapped_column(Integer, default=0)
    management_port: Mapped[int] = mapped_column(Integer, default=22)
    management_vlan: Mapped[str] = mapped_column(String(30), default="VLAN50")
    owner: Mapped[str] = mapped_column(String(120), default="Infraestructura")
    criticality: Mapped[str] = mapped_column(String(20), default="HIGH")
    last_check: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Hypervisor(Base):
    __tablename__ = "hypervisors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    management_ip: Mapped[str] = mapped_column(String(255))
    provider: Mapped[str] = mapped_column(String(30), default="mock")
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"))
    status: Mapped[str] = mapped_column(String(20), default="ONLINE")
    cpu_percent: Mapped[float] = mapped_column(Float, default=0)
    ram_percent: Mapped[float] = mapped_column(Float, default=0)
    datastore_percent: Mapped[float] = mapped_column(Float, default=0)
    uptime_seconds: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[str] = mapped_column(String(80), default="VMware ESXi 8.0")
    vmnics_up: Mapped[int] = mapped_column(Integer, default=1)
    vmnics_down: Mapped[int] = mapped_column(Integer, default=0)
    vmkernel: Mapped[str] = mapped_column(String(120), default="vmk0")
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_check: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class VirtualMachine(Base):
    __tablename__ = "virtual_machines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    hypervisor_id: Mapped[int | None] = mapped_column(ForeignKey("hypervisors.id"), nullable=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"))
    power_state: Mapped[str] = mapped_column(String(20), default="poweredOn")
    ip: Mapped[str] = mapped_column(String(45))
    operating_system: Mapped[str] = mapped_column(String(100))
    cpu_count: Mapped[int] = mapped_column(Integer, default=2)
    ram_gb: Mapped[float] = mapped_column(Float, default=4)
    disk_gb: Mapped[float] = mapped_column(Float, default=60)
    vlan: Mapped[str] = mapped_column(String(30))
    service_name: Mapped[str] = mapped_column(String(150))
    criticality: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    allow_technician_power: Mapped[bool] = mapped_column(Boolean, default=True)
    last_state_change: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class VMwareInventorySnapshot(Base):
    __tablename__ = "vmware_inventory_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hypervisor_id: Mapped[int] = mapped_column(ForeignKey("hypervisors.id"), index=True)
    discovered_vms: Mapped[list] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String(30), default="VMWARE")
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class ITService(Base):
    __tablename__ = "it_services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    service_type: Mapped[str] = mapped_column(String(60))
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"))
    vm_id: Mapped[int | None] = mapped_column(ForeignKey("virtual_machines.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ONLINE")
    host: Mapped[str] = mapped_column(String(255))
    port: Mapped[int | None] = mapped_column(Integer, nullable=True)
    protocol: Mapped[str] = mapped_column(String(20), default="TCP")
    owner: Mapped[str] = mapped_column(String(120))
    sla_target: Mapped[float] = mapped_column(Float, default=99.0)
    uptime_percent: Mapped[float] = mapped_column(Float, default=100.0)
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    exposure: Mapped[str] = mapped_column(String(20), default="INTERNAL")
    vlan: Mapped[str] = mapped_column(String(30))
    criticality: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    last_check: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class MonitoringAgent(Base):
    __tablename__ = "monitoring_agents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"))
    api_key_hash: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="OFFLINE")
    version: Mapped[str] = mapped_column(String(30), default="1.0.0")
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    capabilities: Mapped[list] = mapped_column(JSON, default=list)
    last_heartbeat: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class MonitoringEvent(Base):
    __tablename__ = "monitoring_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(50))
    source: Mapped[str] = mapped_column(String(30))
    resource: Mapped[str] = mapped_column(String(150))
    status: Mapped[str] = mapped_column(String(30))
    severity: Mapped[str] = mapped_column(String(20), default="INFO")
    site_id: Mapped[int | None] = mapped_column(ForeignKey("sites.id"), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class MonitoringMetric(Base):
    __tablename__ = "monitoring_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(30))
    resource: Mapped[str] = mapped_column(String(150), index=True)
    metric: Mapped[str] = mapped_column(String(80), index=True)
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20), default="")
    provenance: Mapped[str] = mapped_column(String(30), default="SIMULATED")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class NetworkLink(Base):
    __tablename__ = "network_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    source_site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"))
    target_site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"))
    link_type: Mapped[str] = mapped_column(String(30), default="IPSEC")
    status: Mapped[str] = mapped_column(String(20), default="UNKNOWN")
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    packet_loss: Mapped[float | None] = mapped_column(Float, nullable=True)
    provenance: Mapped[str] = mapped_column(String(30), default="SIMULATED")
    last_check: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE")
    source: Mapped[str] = mapped_column(String(30))
    site_id: Mapped[int | None] = mapped_column(ForeignKey("sites.id"), nullable=True)
    vlan: Mapped[str | None] = mapped_column(String(30), nullable=True)
    affected_resource: Mapped[str] = mapped_column(String(150))
    service_id: Mapped[int | None] = mapped_column(ForeignKey("it_services.id"), nullable=True)
    vm_id: Mapped[int | None] = mapped_column(ForeignKey("virtual_machines.id"), nullable=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("physical_devices.id"), nullable=True)
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("clientes.id"), nullable=True)
    technician_id: Mapped[int | None] = mapped_column(ForeignKey("empleados.id"), nullable=True)
    ticket_id: Mapped[int | None] = mapped_column(ForeignKey("tickets.id"), nullable=True)
    recommendation: Mapped[str] = mapped_column(Text, default="Validar conectividad y escalar al responsable.")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class BackupJob(Base):
    __tablename__ = "backup_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True)
    protected_resource: Mapped[str] = mapped_column(String(150))
    backup_type: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), default="NOT_EXECUTED")
    repository: Mapped[str] = mapped_column(String(150))
    offsite_target: Mapped[str | None] = mapped_column(String(150), nullable=True)
    rto_hours: Mapped[int] = mapped_column(Integer, default=4)
    rpo_hours: Mapped[int] = mapped_column(Integer, default=24)
    retention_days: Mapped[int] = mapped_column(Integer, default=30)
    schedule: Mapped[str] = mapped_column(String(80))
    last_run: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_restore_test: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class SecurityControl(Base):
    __tablename__ = "security_controls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True)
    category: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(30), default="IN_REVIEW")
    risk: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    owner: Mapped[str] = mapped_column(String(120))
    evidence: Mapped[str] = mapped_column(Text, default="Pendiente")
    recommendation: Mapped[str] = mapped_column(Text)
    last_audit: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), unique=True)
    source: Mapped[str] = mapped_column(String(30))
    resource_pattern: Mapped[str] = mapped_column(String(150))
    minimum_severity: Mapped[str] = mapped_column(String(20))
    ticket_priority: Mapped[str] = mapped_column(String(20))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_assign_department: Mapped[str] = mapped_column(String(80), default="Soporte")


class SLAContract(Base):
    __tablename__ = "sla_contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"))
    service_id: Mapped[int] = mapped_column(ForeignKey("it_services.id"))
    name: Mapped[str] = mapped_column(String(150))
    availability_target: Mapped[float] = mapped_column(Float, default=99.0)
    response_minutes: Mapped[int] = mapped_column(Integer, default=60)
    resolution_minutes: Mapped[int] = mapped_column(Integer, default=480)
    monthly_fee: Mapped[float] = mapped_column(Float, default=0)
    penalty_percent: Mapped[float] = mapped_column(Float, default=5)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
