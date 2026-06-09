from datetime import date

from core.auth import hash_password
from core.database import SessionLocal
from models.cliente import Cliente
from models.empleado import Empleado
from models.equipo import Equipo
from models.factura import Factura
from models.ticket import Ticket
from models.usuario import Usuario


def run_seed():
    db = SessionLocal()

    if db.query(Usuario).count() > 0:
        db.close()
        return

    usuarios = [
        Usuario(nombre="Administrador Alesof", email="admin@alesof.pe", password_hash=hash_password("Admin2026*"), rol="administrador"),
        Usuario(nombre="Carlos Mendoza", email="supervisor@alesof.pe", password_hash=hash_password("Super2026*"), rol="supervisor"),
        Usuario(nombre="Luis Quispe", email="tecnico@alesof.pe", password_hash=hash_password("Tecnico2026*"), rol="tecnico"),
        Usuario(nombre="María Fernández", email="cliente@alesof.pe", password_hash=hash_password("Cliente2026*"), rol="cliente"),
    ]
    db.add_all(usuarios)
    db.flush()

    clientes = [
        Cliente(nombre="Grupo Romero S.A.", ruc="20100023203", email="contacto@gruporomero.pe", telefono="01-6155000", sede="Lima", plan="Corporativo 1Gbps", estado="activo", fecha_contrato=date(2024, 3, 15)),
        Cliente(nombre="Ferreyros S.A.A.", ruc="20100028698", email="info@ferreyros.com.pe", telefono="01-2115050", sede="Lima", plan="Premium 500Mbps", estado="activo", fecha_contrato=date(2024, 5, 20)),
        Cliente(nombre="Alicorp S.A.A.", ruc="20100055237", email="redes@alicorp.com.pe", telefono="01-3150800", sede="Lima", plan="Corporativo 1Gbps", estado="activo", fecha_contrato=date(2024, 7, 10)),
        Cliente(nombre="Minera Cerro Verde S.A.A.", ruc="20170072465", email="ti@cerroverde.pe", telefono="054-253500", sede="Arequipa", plan="Premium 500Mbps", estado="activo", fecha_contrato=date(2024, 1, 8)),
        Cliente(nombre="Gloria S.A.", ruc="20100190797", email="soporte@gloria.com.pe", telefono="054-284010", sede="Arequipa", plan="Empresarial 200Mbps", estado="activo", fecha_contrato=date(2024, 9, 1)),
        Cliente(nombre="Caja Arequipa", ruc="20100209641", email="infra@cajaarequipa.pe", telefono="054-380380", sede="Arequipa", plan="Corporativo 1Gbps", estado="activo", fecha_contrato=date(2025, 1, 15)),
        Cliente(nombre="StartUp Tech Perú S.A.C.", ruc="20605432187", email="admin@startuptech.pe", telefono="01-7458900", sede="AWS", plan="Empresarial 200Mbps", estado="activo", fecha_contrato=date(2025, 3, 20)),
        Cliente(nombre="Distribuidora Norte S.R.L.", ruc="20481023456", email="ti@distnorte.pe", telefono="044-298500", sede="AWS", plan="Básico 50Mbps", estado="activo", fecha_contrato=date(2025, 6, 1)),
        Cliente(nombre="Consultores Andinos E.I.R.L.", ruc="20567891234", email="gerencia@consultandinos.pe", telefono="01-4567890", sede="Lima", plan="Básico 50Mbps", estado="suspendido", fecha_contrato=date(2024, 11, 10)),
        Cliente(nombre="Red Médica del Sur S.A.", ruc="20398765432", email="sistemas@redmedicasur.pe", telefono="054-210300", sede="Arequipa", plan="Premium 500Mbps", estado="activo", fecha_contrato=date(2025, 2, 14)),
        Cliente(nombre="Transportes Lima Express S.A.C.", ruc="20512345678", email="operaciones@limaexpress.pe", telefono="01-3456789", sede="Lima", plan="Empresarial 200Mbps", estado="activo", fecha_contrato=date(2025, 4, 5)),
        Cliente(nombre="AgroExport Perú S.A.", ruc="20601234567", email="logistica@agroexport.pe", telefono="044-567890", sede="AWS", plan="Empresarial 200Mbps", estado="activo", fecha_contrato=date(2026, 1, 10)),
    ]
    db.add_all(clientes)
    db.flush()

    empleados = [
        Empleado(nombre="Luis Quispe Huamán", dni="45678912", email="lquispe@alesof.pe", cargo="Ingeniero de Redes Senior", departamento="TI", sede="Lima", estado="activo"),
        Empleado(nombre="Ana Torres Medina", dni="41234567", email="atorres@alesof.pe", cargo="Técnico de Soporte", departamento="Soporte", sede="Lima", estado="activo"),
        Empleado(nombre="Jorge Ramírez Soto", dni="43210987", email="jramirez@alesof.pe", cargo="Administrador de Sistemas", departamento="TI", sede="Lima", estado="activo"),
        Empleado(nombre="Rosa Condori Apaza", dni="46789012", email="rcondori@alesof.pe", cargo="Técnico de Campo", departamento="Soporte", sede="Arequipa", estado="activo"),
        Empleado(nombre="Diego Vargas Ponce", dni="44567891", email="dvargas@alesof.pe", cargo="Ejecutivo Comercial", departamento="Ventas", sede="Lima", estado="activo"),
        Empleado(nombre="Patricia Flores Rojas", dni="42345678", email="pflores@alesof.pe", cargo="Contadora", departamento="Administración", sede="Lima", estado="activo"),
        Empleado(nombre="Miguel Chávez Díaz", dni="47890123", email="mchavez@alesof.pe", cargo="Técnico de Fibra Óptica", departamento="Operaciones", sede="Arequipa", estado="activo"),
        Empleado(nombre="Carmen Salazar Vega", dni="40123456", email="csalazar@alesof.pe", cargo="Jefa de Operaciones", departamento="Operaciones", sede="Lima", estado="activo"),
    ]
    db.add_all(empleados)
    db.flush()

    equipos = [
        Equipo(nombre="Router Core Lima", tipo="router", marca="Cisco", modelo="ISR 4321", serie="FCW2345L0P1", sede="Lima", vlan="VLAN 10", ip="10.10.10.1", estado="activo"),
        Equipo(nombre="Switch Distribución Lima", tipo="switch", marca="Cisco", modelo="Catalyst 3850", serie="FOC2134Y8K2", sede="Lima", vlan="VLAN 20", ip="10.10.10.2", estado="activo"),
        Equipo(nombre="OLT Lima Principal", tipo="OLT", marca="Huawei", modelo="MA5800-X7", serie="HW2024OLT001", sede="Lima", vlan="VLAN 100", ip="10.10.30.10", estado="activo"),
        Equipo(nombre="Servidor Zabbix", tipo="servidor", marca="Dell", modelo="PowerEdge R740", serie="DELL-R740-001", sede="Lima", vlan="VLAN 30", ip="10.10.30.20", estado="activo"),
        Equipo(nombre="Servidor MySQL", tipo="servidor", marca="Dell", modelo="PowerEdge R740", serie="DELL-R740-002", sede="Lima", vlan="VLAN 30", ip="10.10.30.30", estado="activo"),
        Equipo(nombre="Router Arequipa", tipo="router", marca="Cisco", modelo="ISR 2911", serie="FCW2345AQP1", sede="Arequipa", vlan="VLAN 10", ip="10.20.10.1", estado="activo"),
        Equipo(nombre="Switch Arequipa", tipo="switch", marca="Cisco", modelo="Catalyst 2960", serie="FOC2134AQP2", sede="Arequipa", vlan="VLAN 20", ip="10.20.10.2", estado="activo"),
        Equipo(nombre="AP Oficina AQP", tipo="access_point", marca="Ubiquiti", modelo="UniFi U6 Pro", serie="UBI-U6P-AQP01", sede="Arequipa", vlan="VLAN 50", ip="10.20.50.1", estado="activo"),
        Equipo(nombre="Firewall AWS", tipo="router", marca="Fortinet", modelo="FortiGate 60F", serie="FG60F-AWS-001", sede="AWS", vlan="VLAN 10", ip="172.16.0.1", estado="activo"),
        Equipo(nombre="Servidor Web AWS", tipo="servidor", marca="AWS", modelo="EC2 t3.xlarge", serie="AWS-EC2-WEB01", sede="AWS", vlan=None, ip="172.16.1.10", estado="activo"),
        Equipo(nombre="Switch Core Lima 2", tipo="switch", marca="Cisco", modelo="Nexus 3048", serie="FOC2234N3K1", sede="Lima", vlan="VLAN 10", ip="10.10.10.3", estado="mantenimiento"),
        Equipo(nombre="AP Recepción Lima", tipo="access_point", marca="Ubiquiti", modelo="UniFi U6 LR", serie="UBI-U6LR-LIM01", sede="Lima", vlan="VLAN 50", ip="10.10.50.1", estado="activo"),
    ]
    db.add_all(equipos)
    db.flush()

    facturas = [
        Factura(cliente_id=1, numero="F001-000101", monto=4500.00, fecha_emision=date(2026, 1, 5), fecha_vencimiento=date(2026, 2, 5), estado="pagado"),
        Factura(cliente_id=1, numero="F001-000102", monto=4500.00, fecha_emision=date(2026, 2, 5), fecha_vencimiento=date(2026, 3, 5), estado="pagado"),
        Factura(cliente_id=1, numero="F001-000103", monto=4500.00, fecha_emision=date(2026, 3, 5), fecha_vencimiento=date(2026, 4, 5), estado="pagado"),
        Factura(cliente_id=2, numero="F001-000201", monto=2800.00, fecha_emision=date(2026, 1, 10), fecha_vencimiento=date(2026, 2, 10), estado="pagado"),
        Factura(cliente_id=2, numero="F001-000202", monto=2800.00, fecha_emision=date(2026, 2, 10), fecha_vencimiento=date(2026, 3, 10), estado="pagado"),
        Factura(cliente_id=3, numero="F001-000301", monto=4500.00, fecha_emision=date(2026, 3, 1), fecha_vencimiento=date(2026, 4, 1), estado="pagado"),
        Factura(cliente_id=4, numero="F001-000401", monto=2800.00, fecha_emision=date(2026, 4, 1), fecha_vencimiento=date(2026, 5, 1), estado="pagado"),
        Factura(cliente_id=5, numero="F001-000501", monto=1500.00, fecha_emision=date(2026, 5, 1), fecha_vencimiento=date(2026, 6, 1), estado="pagado"),
        Factura(cliente_id=6, numero="F001-000601", monto=4500.00, fecha_emision=date(2026, 5, 15), fecha_vencimiento=date(2026, 6, 15), estado="pendiente"),
        Factura(cliente_id=7, numero="F001-000701", monto=1500.00, fecha_emision=date(2026, 5, 20), fecha_vencimiento=date(2026, 6, 20), estado="pendiente"),
        Factura(cliente_id=8, numero="F001-000801", monto=350.00, fecha_emision=date(2026, 4, 1), fecha_vencimiento=date(2026, 5, 1), estado="vencido"),
        Factura(cliente_id=10, numero="F001-001001", monto=2800.00, fecha_emision=date(2026, 6, 1), fecha_vencimiento=date(2026, 7, 1), estado="pendiente"),
        Factura(cliente_id=11, numero="F001-001101", monto=1500.00, fecha_emision=date(2026, 6, 1), fecha_vencimiento=date(2026, 7, 1), estado="pendiente"),
        Factura(cliente_id=12, numero="F001-001201", monto=1500.00, fecha_emision=date(2026, 6, 5), fecha_vencimiento=date(2026, 7, 5), estado="pendiente"),
    ]
    db.add_all(facturas)
    db.flush()

    tickets = [
        Ticket(titulo="Sin conexión a internet", descripcion="El cliente reporta caída total de servicio de internet desde las 8am. Se verificó que el enlace principal está caído.", cliente_id=1, tecnico_id=1, prioridad="crítica", estado="en_proceso"),
        Ticket(titulo="Lentitud en red interna", descripcion="Velocidad de descarga muy por debajo del plan contratado. Cliente mide 20Mbps cuando debería tener 500Mbps.", cliente_id=2, tecnico_id=2, prioridad="alta", estado="abierto"),
        Ticket(titulo="Configuración de VLAN", descripcion="Solicitud de creación de nueva VLAN para separar tráfico de cámaras de seguridad.", cliente_id=4, tecnico_id=1, prioridad="media", estado="resuelto"),
        Ticket(titulo="Cambio de plan de servicio", descripcion="Cliente solicita upgrade de Empresarial 200Mbps a Premium 500Mbps.", cliente_id=5, tecnico_id=None, prioridad="baja", estado="abierto"),
        Ticket(titulo="Falla en OLT", descripcion="OLT del nodo Lima Norte presenta alarmas críticas. Múltiples clientes afectados.", cliente_id=3, tecnico_id=3, prioridad="crítica", estado="en_proceso"),
        Ticket(titulo="Instalación de access point", descripcion="Cliente requiere instalación de un AP adicional en su segundo piso.", cliente_id=6, tecnico_id=4, prioridad="media", estado="resuelto"),
        Ticket(titulo="Problema con facturación", descripcion="Cliente indica que le llegó doble factura del mes de mayo.", cliente_id=7, tecnico_id=None, prioridad="baja", estado="abierto"),
        Ticket(titulo="Migración a cloud", descripcion="Solicitud de migración de servidor on-premise a instancia AWS.", cliente_id=10, tecnico_id=3, prioridad="alta", estado="abierto"),
        Ticket(titulo="Corte de fibra óptica", descripcion="Corte de fibra en avenida Ejército, Arequipa. Afecta a 3 clientes de la zona.", cliente_id=4, tecnico_id=7, prioridad="crítica", estado="en_proceso"),
        Ticket(titulo="Renovación de contrato", descripcion="Cliente desea renovar contrato por 2 años adicionales con descuento.", cliente_id=11, tecnico_id=None, prioridad="baja", estado="cerrado"),
    ]
    db.add_all(tickets)

    db.commit()
    db.close()
    print("Seed completado exitosamente")
