from collections import defaultdict

from sqlalchemy.orm import Session

from models.monitoring import Hypervisor, VMwareInventorySnapshot


EXPECTED_VMWARE_TOPOLOGY = {
    "ESXi-01": [
        {"name": "Router-Master", "role": "Gateway principal", "aliases": []},
        {"name": "Router-Backup", "role": "Gateway de respaldo", "aliases": []},
        {"name": "Creador-ISP2", "role": "Simulador ISP secundario", "aliases": []},
        {"name": "VC-LIMA-01", "role": "vCenter", "aliases": ["VCENTER-LIMA"]},
        {"name": "SW-LIMA-CORE-01", "role": "Switch core virtual", "aliases": []},
        {"name": "SW-LIMA-CORE-02", "role": "Switch core virtual redundante", "aliases": []},
    ],
    "ESXi-02": [
        {"name": "AD-LIMA-01", "role": "Active Directory", "aliases": ["Data-WinServer"]},
        {"name": "DB-LIMA-01", "role": "Base de datos MySQL", "aliases": []},
        {"name": "DHCP-LIMA-01", "role": "DHCP", "aliases": []},
        {"name": "GLPI-LIMA-01", "role": "Mesa de ayuda GLPI", "aliases": []},
        {"name": "PBX-LIMA-01", "role": "Telefonia IP", "aliases": []},
        {"name": "MON-LIMA-01", "role": "Monitoreo Zabbix", "aliases": ["ZABBIX-LIMA-01", "ZABBIX-LIMA", "Zabbix"]},
    ],
    "ESXi-03": [
        {"name": "APP-LIMA-01", "role": "API y logica empresarial", "aliases": []},
        {"name": "FILE-LIMA-01", "role": "Archivos compartidos", "aliases": []},
        {"name": "HAProxy", "role": "Proxy reverso y balanceo", "aliases": ["HAProxy-LIMA-01", "HAPROXY"]},
        {"name": "WEB-LIMA-01", "role": "Frontend Next.js", "aliases": []},
        {"name": "MAIL-LIMA-01", "role": "Correo empresarial", "aliases": []},
        {"name": "DNS2-LIMA-01", "role": "DNS publico secundario", "aliases": []},
        {"name": "Veeam-Proxy", "role": "Proxy de respaldos Veeam", "aliases": ["Veeam Proxy", "VEEAM-PROXY"]},
    ],
}


def save_inventory_snapshot(db: Session, hypervisor: Hypervisor, discovered: list[dict]) -> VMwareInventorySnapshot:
    snapshot = VMwareInventorySnapshot(
        hypervisor_id=hypervisor.id,
        discovered_vms=discovered,
        source="VMWARE",
    )
    db.add(snapshot)
    return snapshot


def compare_vmware_inventory(db: Session) -> dict:
    hypervisors = {item.name: item for item in db.query(Hypervisor).all()}
    actual_by_host: dict[str, list[dict]] = {}
    collected_at: dict[str, object] = {}

    for host_name, hypervisor in hypervisors.items():
        snapshot = (
            db.query(VMwareInventorySnapshot)
            .filter(VMwareInventorySnapshot.hypervisor_id == hypervisor.id)
            .order_by(VMwareInventorySnapshot.id.desc())
            .first()
        )
        actual_by_host[host_name] = snapshot.discovered_vms if snapshot else []
        collected_at[host_name] = snapshot.collected_at if snapshot else None

    actual_locations: dict[str, list[str]] = defaultdict(list)
    for host_name, discovered in actual_by_host.items():
        for vm in discovered:
            actual_locations[str(vm.get("name", ""))].append(host_name)

    consumed: set[tuple[str, str]] = set()
    rows = []
    for expected_host, expected_vms in EXPECTED_VMWARE_TOPOLOGY.items():
        host_has_data = collected_at.get(expected_host) is not None
        for expected in expected_vms:
            candidates = [expected["name"], *expected["aliases"]]
            match_name = next((name for name in candidates if expected_host in actual_locations.get(name, [])), None)
            actual_host = None
            if not match_name:
                for name in candidates:
                    locations = actual_locations.get(name, [])
                    if locations:
                        match_name, actual_host = name, locations[0]
                        break
            if match_name and actual_host is None:
                actual_host = expected_host

            if not host_has_data:
                status = "NO_DATA"
            elif match_name and actual_host == expected_host and match_name == expected["name"]:
                status = "CORRECT"
            elif match_name and actual_host == expected_host:
                status = "RENAME"
            elif match_name:
                status = "MOVE"
            else:
                status = "MISSING"

            if match_name and actual_host:
                consumed.add((actual_host, match_name))
            rows.append({
                "expected_name": expected["name"],
                "role": expected["role"],
                "expected_host": expected_host,
                "actual_name": match_name,
                "actual_host": actual_host,
                "status": status,
            })

    for actual_host, discovered in actual_by_host.items():
        for vm in discovered:
            actual_name = str(vm.get("name", ""))
            if actual_name and (actual_host, actual_name) not in consumed:
                rows.append({
                    "expected_name": None,
                    "role": "No incluido en la topologia objetivo",
                    "expected_host": None,
                    "actual_name": actual_name,
                    "actual_host": actual_host,
                    "status": "UNPLANNED",
                })

    counts = {status: sum(1 for row in rows if row["status"] == status) for status in
        ["CORRECT", "MISSING", "MOVE", "RENAME", "UNPLANNED", "NO_DATA"]}
    return {
        "summary": counts,
        "hosts": [{
            "name": host,
            "management_ip": hypervisors[host].management_ip if host in hypervisors else None,
            "collected_at": collected_at.get(host),
            "discovered_count": len(actual_by_host.get(host, [])),
        } for host in EXPECTED_VMWARE_TOPOLOGY],
        "items": rows,
    }
