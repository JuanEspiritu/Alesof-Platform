import hashlib
from datetime import datetime, timedelta, timezone

from core.config import settings
from core.database import SessionLocal
from models.equipo import Equipo
from models.cliente import Cliente
from models.ticket import Ticket
from models.monitoring import (
    Alert, AutomationRule, BackupJob, Hypervisor, ITService, MonitoringAgent, MonitoringEvent,
    NetworkLink, PhysicalDevice, SecurityControl, Site, SLAContract, VirtualMachine,
)


def now():
    return datetime.now(timezone.utc)


RUNTIME_FIELDS = {
    "status", "latency_ms", "availability", "last_check", "provider", "cpu_percent", "ram_percent",
    "datastore_percent", "uptime_seconds", "vmnics_up", "vmnics_down", "power_state", "last_state_change",
    "last_heartbeat", "capabilities", "ip", "uptime_percent", "packet_loss", "provenance", "last_run",
    "last_restore_test", "last_audit", "evidence", "acknowledged_at", "resolved_at", "ticket_id",
    "technician_id",
}


def upsert(db, model, lookup: dict, values: dict):
    item = db.query(model).filter_by(**lookup).first()
    if not item:
        item = model(**lookup, **values)
        db.add(item)
        db.flush()
    else:
        for field, value in values.items():
            if field not in RUNTIME_FIELDS:
                setattr(item, field, value)
    return item


def run_monitoring_seed(include_demo: bool = True):
    db = SessionLocal()
    try:
        legacy_asset = db.query(Equipo).filter(Equipo.marca == "Huawei").first()
        if legacy_asset:
            legacy_asset.nombre, legacy_asset.tipo, legacy_asset.marca, legacy_asset.modelo = "Servidor ESXi Lima 01", "servidor", "Dell", "PowerEdge R740"
            legacy_asset.serie, legacy_asset.vlan, legacy_asset.ip = "ESXI-LIMA-01-HW", "VLAN 50", "172.17.25.23"
        firewall = db.query(Equipo).filter(Equipo.marca == "Fortinet").first()
        if firewall:
            firewall.nombre, firewall.tipo, firewall.marca = "AWS Web Service", "aws_resource", "AWS"
            firewall.modelo, firewall.serie, firewall.vlan, firewall.ip = "Application Load Balancer", "AWS-ALB-WEB01", None, "10.100.1.20"
        ticket = db.query(Ticket).filter(Ticket.id == 5).first()
        if ticket:
            ticket.titulo = "Alerta de capacidad en ESXi-01"
            ticket.descripcion = "El host ESXi-01 reporta consumo elevado de recursos y requiere revision del NOC."
        legacy_zabbix = db.query(Equipo).filter(Equipo.nombre == "Servidor Zabbix", Equipo.ip == "10.10.30.20").first()
        if legacy_zabbix:
            legacy_zabbix.ip, legacy_zabbix.vlan = "10.10.70.10", "VLAN 70"

        sites = {}
        for name, code, cidr, kind, latency in [
            ("Lima", "LIM", "10.10.0.0/16", "virtualized", 2),
            ("Arequipa", "AQP", "10.20.0.0/16", "physical", 34),
            ("Trujillo", "TRU", "10.100.0.0/16", "cloud", 72),
        ]:
            sites[name] = upsert(db, Site, {"name": name}, {
                "code": code, "cidr": cidr, "kind": kind, "status": "ONLINE",
                "latency_ms": latency, "availability": 99.6, "last_check": now(),
            })

        legacy_aws = db.query(Site).filter(Site.name == "AWS").first()
        if legacy_aws:
            trujillo_id = sites["Trujillo"].id
            for model in [PhysicalDevice, Hypervisor, VirtualMachine, ITService, MonitoringAgent, MonitoringEvent, Alert]:
                db.query(model).filter(model.site_id == legacy_aws.id).update({"site_id": trujillo_id}, synchronize_session=False)
            db.query(NetworkLink).filter(NetworkLink.name == "Lima - AWS").delete(synchronize_session=False)
            db.query(NetworkLink).filter(NetworkLink.source_site_id == legacy_aws.id).update({"source_site_id": trujillo_id}, synchronize_session=False)
            db.query(NetworkLink).filter(NetworkLink.target_site_id == legacy_aws.id).update({"target_site_id": trujillo_id}, synchronize_session=False)
            db.delete(legacy_aws)
            db.flush()

        hypervisors = {}
        for name, ip, cpu, ram, datastore in [
            ("ESXi-01", "172.17.25.23", 44, 61, 58),
            ("ESXi-02", "172.17.25.19", 37, 54, 49),
            ("ESXi-03", "172.17.25.2", 51, 66, 62),
        ]:
            hypervisors[name] = upsert(db, Hypervisor, {"name": name}, {
                "management_ip": ip, "provider": "mock", "site_id": sites["Lima"].id,
                "status": "ONLINE", "cpu_percent": cpu, "ram_percent": ram,
                "datastore_percent": datastore, "uptime_seconds": 1284400,
                "version": "VMware ESXi 8.0",
                "vmnics_up": 2, "vmnics_down": 0, "vmkernel": "vmk0, vmk1",
                "latency_ms": 3, "last_check": now(),
            })

        for name, target, latency in [
            ("Lima - Arequipa", "Arequipa", 34),
            ("Lima - Trujillo", "Trujillo", 72),
        ]:
            upsert(db, NetworkLink, {"name": name}, {
                "source_site_id": sites["Lima"].id, "target_site_id": sites[target].id,
                "link_type": "IPSEC", "status": "UNKNOWN", "latency_ms": latency,
                "packet_loss": None, "provenance": "SIMULATED", "last_check": now(),
            })

        _seed_vms_and_services(db, sites, hypervisors)
        _seed_devices_and_operations(db, sites, include_demo)
        db.commit()
    finally:
        db.close()


def _seed_vms_and_services(db, sites, hypervisors):
    for old_name, new_name in {
        "HAPROXY": "HAProxy",
        "ZABBIX-LIMA": "MON-LIMA-01",
        "ZABBIX-LIMA-01": "MON-LIMA-01",
        "VCENTER-LIMA": "VC-LIMA-01",
    }.items():
        legacy = db.query(VirtualMachine).filter(VirtualMachine.name == old_name).first()
        if legacy and not db.query(VirtualMachine).filter(VirtualMachine.name == new_name).first():
            legacy.name = new_name
            db.flush()
    vms = {}
    legacy_db_vm = db.query(VirtualMachine).filter(VirtualMachine.name == "DB-LIMA-01", VirtualMachine.ip == "10.10.30.20").first()
    if legacy_db_vm:
        legacy_db_vm.ip = "10.10.30.30"
    legacy_dhcp_vm = db.query(VirtualMachine).filter(VirtualMachine.name == "DHCP-LIMA-01", VirtualMachine.ip == "10.10.30.30").first()
    if legacy_dhcp_vm:
        legacy_dhcp_vm.ip = "10.10.30.31"
    specs = [
        ("Router-Master", "ESXi-01", "10.10.10.2", "Ubuntu Server 22.04", 2, 4, 30, "VLAN10", "Gateway principal", "CRITICAL"),
        ("Router-Backup", "ESXi-01", "10.10.10.3", "Ubuntu Server 22.04", 2, 4, 30, "VLAN10", "Gateway de respaldo", "CRITICAL"),
        ("Creador-ISP2", "ESXi-01", "168.17.25.1", "Ubuntu Server 22.04", 1, 2, 20, "WAN2", "ISP2 simulado", "MEDIUM"),
        ("VC-LIMA-01", "ESXi-01", "10.10.50.10", "Photon OS", 4, 12, 120, "VLAN50", "vCenter", "CRITICAL"),
        ("SW-LIMA-CORE-01", "ESXi-01", "10.10.10.11", "Virtual Network Appliance", 2, 4, 20, "VLAN10", "Switch core virtual", "CRITICAL"),
        ("SW-LIMA-CORE-02", "ESXi-01", "10.10.10.12", "Virtual Network Appliance", 2, 4, 20, "VLAN10", "Switch core virtual", "CRITICAL"),
        ("AD-LIMA-01", "ESXi-02", "10.10.30.10", "Windows Server 2022 (Data-WinServer)", 4, 8, 100, "VLAN30", "Active Directory", "CRITICAL"),
        ("DB-LIMA-01", "ESXi-02", "10.10.30.30", "Ubuntu Server 22.04", 4, 8, 150, "VLAN30", "Base de datos MySQL", "CRITICAL"),
        ("DHCP-LIMA-01", "ESXi-02", "10.10.30.31", "Windows Server 2022", 2, 4, 60, "VLAN30", "DHCP", "HIGH"),
        ("GLPI-LIMA-01", "ESXi-02", "10.10.30.40", "Ubuntu Server 22.04", 4, 8, 100, "VLAN30", "Gestion de activos GLPI", "HIGH"),
        ("PBX-LIMA-01", "ESXi-02", "10.10.40.10", "Linux / FreePBX", 2, 4, 80, "VLAN40", "Telefonia IP", "HIGH"),
        ("MON-LIMA-01", "ESXi-02", "10.10.70.10", "Ubuntu Server 22.04", 4, 8, 120, "VLAN70", "Monitoreo Zabbix", "CRITICAL"),
        ("APP-LIMA-01", "ESXi-03", "10.10.30.50", "Ubuntu Server 22.04", 4, 8, 100, "VLAN30", "Application Service", "CRITICAL"),
        ("FILE-LIMA-01", "ESXi-03", "10.10.30.60", "Windows Server 2022", 4, 12, 500, "VLAN30", "File Sharing", "HIGH"),
        ("HAProxy", "ESXi-03", "10.10.90.10", "Ubuntu Server 22.04", 2, 4, 40, "VLAN90", "HAProxy Reverse Proxy", "CRITICAL"),
        ("WEB-LIMA-01", "ESXi-03", "10.10.90.20", "Ubuntu Server 22.04", 2, 4, 60, "VLAN90", "Public Web", "HIGH"),
        ("MAIL-LIMA-01", "ESXi-03", "10.10.90.30", "Ubuntu Server 22.04", 4, 8, 200, "VLAN90", "Mail Service", "HIGH"),
        ("DNS2-LIMA-01", "ESXi-03", "10.10.90.40", "Ubuntu Server 22.04", 2, 2, 30, "VLAN90", "Public DNS", "HIGH"),
        ("Veeam-Proxy", "ESXi-03", "10.10.80.30", "Windows Server 2022", 4, 8, 120, "VLAN80", "Proxy de respaldos Veeam", "HIGH"),
    ]
    for name, host, ip, os_name, cpu, ram, disk, vlan, service, criticality in specs:
        vms[name] = upsert(db, VirtualMachine, {"name": name}, {
            "hypervisor_id": hypervisors[host].id, "site_id": sites["Lima"].id,
            "power_state": "poweredOn", "ip": ip, "operating_system": os_name,
            "cpu_count": cpu, "ram_gb": ram, "disk_gb": disk, "vlan": vlan,
            "service_name": service, "criticality": criticality,
            "allow_technician_power": criticality != "CRITICAL", "last_state_change": now(),
        })

    services = {}
    legacy_db_service = db.query(ITService).filter(ITService.name == "Alesof Database").first()
    if legacy_db_service and legacy_db_service.host == "10.10.30.20":
        legacy_db_service.host, legacy_db_service.port = "10.10.30.30", 3306
    legacy_dhcp_service = db.query(ITService).filter(ITService.name == "DHCP", ITService.host == "10.10.30.30").first()
    if legacy_dhcp_service:
        legacy_dhcp_service.host = "10.10.30.31"
    service_specs = [
        ("Alesof Web Platform", "WEB", "Trujillo", None, "alesof.pe", 443, "HTTPS", "PUBLIC", "CLOUD", "CRITICAL"),
        ("Alesof Backend API", "API", "Trujillo", None, "api.alesof.pe", 443, "HTTPS", "PUBLIC", "CLOUD", "CRITICAL"),
        ("Alesof Database", "DATABASE", "Lima", "DB-LIMA-01", "10.10.30.30", 3306, "TCP", "INTERNAL", "VLAN30", "CRITICAL"),
        ("APP-LIMA-01 Application Service", "APPLICATION", "Lima", "APP-LIMA-01", "10.10.30.50", 8000, "HTTP", "INTERNAL", "VLAN30", "CRITICAL"),
        ("FILE-LIMA-01 File Sharing", "FILE", "Lima", "FILE-LIMA-01", "10.10.30.60", 445, "TCP", "INTERNAL", "VLAN30", "HIGH"),
        ("HAProxy Reverse Proxy", "PROXY", "Lima", "HAProxy", "10.10.90.10", 443, "HTTPS", "DMZ", "VLAN90", "CRITICAL"),
        ("WEB-LIMA-01 Public Web", "WEB", "Lima", "WEB-LIMA-01", "10.10.90.20", 443, "HTTPS", "DMZ", "VLAN90", "HIGH"),
        ("MAIL-LIMA-01 Mail Service", "MAIL", "Lima", "MAIL-LIMA-01", "10.10.90.30", 25, "TCP", "DMZ", "VLAN90", "HIGH"),
        ("DNS2-LIMA-01 Public DNS", "DNS", "Lima", "DNS2-LIMA-01", "10.10.90.40", 53, "DNS", "DMZ", "VLAN90", "HIGH"),
        ("Active Directory", "IDENTITY", "Lima", "AD-LIMA-01", "10.10.30.10", 389, "TCP", "INTERNAL", "VLAN30", "CRITICAL"),
        ("DNS Interno", "DNS", "Lima", "AD-LIMA-01", "10.10.30.10", 53, "DNS", "INTERNAL", "VLAN30", "HIGH"),
        ("DHCP", "NETWORK", "Lima", "DHCP-LIMA-01", "10.10.30.31", 67, "UDP", "INTERNAL", "VLAN30", "HIGH"),
        ("GLPI", "ITSM", "Lima", "GLPI-LIMA-01", "10.10.30.40", 443, "HTTPS", "INTERNAL", "VLAN30", "HIGH"),
        ("FreePBX", "TELEPHONY", "Lima", "PBX-LIMA-01", "10.10.40.10", 5060, "UDP", "INTERNAL", "VLAN40", "HIGH"),
        ("Zabbix", "MONITORING", "Lima", "MON-LIMA-01", "10.10.70.10", 10051, "TCP", "INTERNAL", "VLAN70", "CRITICAL"),
        ("Veeam", "BACKUP", "Lima", None, "10.10.80.20", 9392, "TCP", "INTERNAL", "VLAN80", "HIGH"),
        ("TrueNAS", "STORAGE", "Lima", None, "10.10.80.10", 2049, "TCP", "INTERNAL", "VLAN80", "CRITICAL"),
        ("vCenter", "VIRTUALIZATION", "Lima", "VC-LIMA-01", "10.10.50.10", 443, "HTTPS", "INTERNAL", "VLAN50", "CRITICAL"),
        ("VPN IPsec", "VPN", "Lima", None, "168.121.48.254", 500, "UDP", "PUBLIC", "WAN", "CRITICAL"),
        ("AWS Web Service", "CLOUD", "Trujillo", None, "alesof.pe", 443, "HTTPS", "PUBLIC", "CLOUD", "HIGH"),
        ("AWS Storage", "STORAGE", "Trujillo", None, "s3.amazonaws.com", 443, "HTTPS", "PUBLIC", "CLOUD", "HIGH"),
    ]
    for name, kind, site, vm, host, port, protocol, exposure, vlan, criticality in service_specs:
        services[name] = upsert(db, ITService, {"name": name}, {
            "service_type": kind, "site_id": sites[site].id, "vm_id": vms[vm].id if vm else None,
            "status": "ONLINE", "host": host, "port": port, "protocol": protocol,
            "owner": "NOC Alesof", "sla_target": 99.5 if criticality == "CRITICAL" else 99.0,
            "uptime_percent": 99.8, "latency_ms": 12, "exposure": exposure,
            "vlan": vlan, "criticality": criticality, "last_check": now(),
        })

    contract_services = [
        services["Alesof Web Platform"], services["Alesof Backend API"],
        services["APP-LIMA-01 Application Service"], services["FILE-LIMA-01 File Sharing"],
    ]
    for index, customer in enumerate(db.query(Cliente).filter(Cliente.estado == "activo").all()):
        service = contract_services[index % len(contract_services)]
        corporate = "Corporativo" in customer.plan
        premium = "Premium" in customer.plan
        upsert(db, SLAContract, {"customer_id": customer.id, "service_id": service.id}, {
            "name": f"SLA {customer.nombre} - {service.name}",
            "availability_target": 99.5 if corporate else 99.0 if premium else 98.5,
            "response_minutes": 15 if corporate else 30 if premium else 60,
            "resolution_minutes": 240 if corporate else 480 if premium else 1440,
            "monthly_fee": 4500 if corporate else 2800 if premium else 1500,
            "penalty_percent": 10 if corporate else 5, "status": "ACTIVE",
        })

    legacy_hypervisor = db.query(Hypervisor).filter(Hypervisor.name == "vCenter-Lima").first()
    if legacy_hypervisor and not db.query(VirtualMachine).filter(VirtualMachine.hypervisor_id == legacy_hypervisor.id).first():
        db.delete(legacy_hypervisor)


def _seed_devices_and_operations(db, sites, include_demo: bool):
    legacy_esxi_device = db.query(PhysicalDevice).filter(PhysicalDevice.name == "ESXI-LIMA-01").first()
    if legacy_esxi_device:
        db.query(Alert).filter(Alert.device_id == legacy_esxi_device.id).update({"device_id": None}, synchronize_session=False)
        db.delete(legacy_esxi_device)
        db.flush()
    for name, dtype, ip, brand, model, criticality in [
        ("RTR-LIMA-01", "ROUTER", "10.10.50.1", "Cisco", "ISR 1100", "CRITICAL"),
        ("SW-LIMA-CORE-01", "SWITCH", "10.10.50.2", "Cisco", "Catalyst 1000", "CRITICAL"),
        ("SW-LIMA-ACC-01", "SWITCH", "10.10.50.3", "Cisco", "Catalyst 1000", "HIGH"),
        ("AP-LIMA-01", "ACCESS_POINT", "10.10.50.20", "Ubiquiti", "UniFi U6 Pro", "MEDIUM"),
    ]:
        upsert(db, PhysicalDevice, {"name": name}, {
            "device_type": dtype, "ip": ip, "brand": brand, "model": model,
            "site_id": sites["Lima"].id, "status": "ONLINE", "latency_ms": 3,
            "uptime_seconds": 1296000, "management_port": 22, "management_vlan": "VLAN50",
            "owner": "Infraestructura Alesof", "criticality": criticality, "last_check": now(),
        })

    upsert(db, MonitoringAgent, {"name": "ALESOF-AGENT-LIMA"}, {
        "site_id": sites["Lima"].id,
        "api_key_hash": hashlib.sha256(settings.AGENT_API_KEY.encode()).hexdigest(),
        "status": "OFFLINE", "version": "1.0.0",
        "capabilities": ["PING", "TCP", "HTTP", "DNS", "VMWARE"],
    })

    for name, resource, btype, repository, schedule in [
        ("DB diario", "Alesof Database", "INCREMENTAL", "TrueNAS ds-backup-lima", "Diario 02:00"),
        ("APP-LIMA full", "APP-LIMA-01", "FULL", "TrueNAS ds-backup-lima", "Domingo 02:00"),
        ("FILE-LIMA incremental", "FILE-LIMA-01", "INCREMENTAL", "TrueNAS ds-backup-lima", "Lun-Sab 02:30"),
        ("DMZ services", "VLAN90 services", "FULL", "TrueNAS + AWS S3", "Diario 03:00"),
        ("Network configs", "Routers y switches", "CONFIG", "Git + AWS S3", "Diario 01:00"),
    ]:
        upsert(db, BackupJob, {"name": name}, {
            "protected_resource": resource, "backup_type": btype, "status": "SUCCESS" if include_demo else "NOT_EXECUTED",
            "repository": repository, "offsite_target": "AWS S3", "rto_hours": 4,
            "rpo_hours": 24, "retention_days": 30, "schedule": schedule,
            "last_run": now() - timedelta(hours=8) if include_demo else None,
            "last_restore_test": now() - timedelta(days=14) if include_demo else None,
        })

    for name, category, status, risk, recommendation in [
        ("ACL de administracion", "NETWORK", "COMPLIANT", "HIGH", "Mantener SSH restringido a VLAN50."),
        ("Port Security", "SWITCHING", "COMPLIANT", "MEDIUM", "Auditar MAC sticky trimestralmente."),
        ("DHCP Snooping", "SWITCHING", "COMPLIANT", "HIGH", "Verificar uplinks trusted."),
        ("Dynamic ARP Inspection", "SWITCHING", "IN_REVIEW", "HIGH", "Completar evidencia en switches."),
        ("BPDU Guard", "SWITCHING", "COMPLIANT", "HIGH", "Mantener PortFast solo en acceso."),
        ("Security Groups AWS", "CLOUD", "COMPLIANT", "HIGH", "Revisar reglas publicas mensualmente."),
        ("MFA administrativo", "IDENTITY", "NON_COMPLIANT", "CRITICAL", "Activar MFA en cuentas privilegiadas."),
        ("Hardening ESXi", "VIRTUALIZATION", "IN_REVIEW", "HIGH", "Deshabilitar servicios no usados y rotar credenciales."),
        ("DMZ VLAN90", "SEGMENTATION", "COMPLIANT", "CRITICAL", "Validar ACL DMZ hacia LAN."),
        ("SSL HAProxy", "CERTIFICATES", "IN_REVIEW", "HIGH", "Instalar certificado publico y monitorear vencimiento."),
    ]:
        upsert(db, SecurityControl, {"name": name}, {
            "category": category, "status": status if include_demo else "IN_REVIEW", "risk": risk, "owner": "Seguridad TI",
            "evidence": "Registro interno Alesof" if include_demo else "Pendiente",
            "recommendation": recommendation,
            "last_audit": now() - timedelta(days=7) if include_demo else None,
        })

    for name, source, resource, severity, priority in [
        ("VM critica apagada", "VM", "*", "CRITICAL", "crítica"),
        ("HAProxy caido", "SERVICE", "HAProxy", "CRITICAL", "crítica"),
        ("Web DMZ caida", "SERVICE", "WEB-LIMA-01", "HIGH", "alta"),
        ("VPN caida", "VPN", "*", "HIGH", "alta"),
        ("Backup fallido", "BACKUP", "*", "MEDIUM", "media"),
        ("Agente offline", "AGENT", "ALESOF-AGENT-LIMA", "HIGH", "alta"),
    ]:
        upsert(db, AutomationRule, {"name": name}, {
            "source": source, "resource_pattern": resource, "minimum_severity": severity,
            "ticket_priority": priority, "enabled": True, "auto_assign_department": "Soporte",
        })

    if include_demo and db.query(Alert).count() == 0:
        db.add(Alert(
            title="MFA administrativo pendiente",
            description="Las cuentas privilegiadas aun no tienen MFA obligatorio.",
            severity="HIGH", status="ACTIVE", source="SECURITY", site_id=sites["Lima"].id,
            affected_resource="Identity Management",
            recommendation="Habilitar MFA para administradores y supervisores NOC.",
        ))
