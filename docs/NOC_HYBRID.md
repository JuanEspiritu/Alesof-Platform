# Alesof Platform - Operacion NOC Hibrida

## Componentes

- `web/`: Next.js 16, dashboard y consola NOC.
- `api/`: FastAPI, persistencia, WebSocket, alertas y automatizacion.
- `agent/`: ALESOF-AGENT-LIMA para monitoreo dentro de la red local.
- `api/providers/`: providers de red, VMware, CloudWatch, Veeam y notificaciones.

## Sedes empresariales

- Lima: data center virtualizado sobre los tres hipervisores ESXi.
- Arequipa: sede fisica conectada por VPN IPsec.
- Trujillo: sede cloud desplegada en AWS, conectada desde Lima.

AWS no es una cuarta sede. Es la plataforma donde opera la sede Trujillo.

## Inicio local

Backend:

```bash
cd api
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd web
pnpm install
pnpm dev
```

## Esquema y datos iniciales

Alembic administra el esquema. La API ejecuta `alembic upgrade head` al iniciar cuando `AUTO_MIGRATE=true`.

Modos disponibles:

- `SEED_MODE=none`: no inserta información.
- `SEED_MODE=reference`: registra topología, servicios y controles pendientes, sin usuarios ni eventos demo.
- `SEED_MODE=demo`: carga cuentas, clientes, facturas y escenarios ficticios; no está permitido con `APP_ENV=production`.

Producción recomendada:

```env
APP_ENV=production
AUTO_MIGRATE=true
SEED_MODE=reference
ENABLE_SIMULATION=false
```

Crear el primer administrador sin contraseña predeterminada:

```bash
cd api
source venv/bin/activate
python -m scripts.create_admin --email administrador@alesof.pe --name "Administrador Alesof"
```

Crear una nueva migración después de modificar modelos:

```bash
alembic revision --autogenerate -m "descripcion"
alembic upgrade head
```

## Agente on-premise

Configurar variables sin guardarlas en Git:

```bash
export ALESOF_BACKEND_URL=https://api.example.com
export ALESOF_AGENT_API_KEY='replace-with-secure-key'
export ALESOF_AGENT_NAME=ALESOF-AGENT-LIMA
python3 agent/alesof_agent.py
```

El agente envia heartbeat y observaciones TCP de servicios CORE, DMZ, ESXi y dispositivos fisicos.
Para operacion permanente en Ubuntu use `agent/install.sh`; instala la unidad `systemd` y lee secretos desde `/etc/alesof-agent.env`.

## VMware

Configurar solo en el entorno del backend:

```bash
export VMWARE_USERNAME='service-account'
export VMWARE_PASSWORD='secret'
export VMWARE_ESXI01_URL='https://host:port'
export VMWARE_ESXI02_URL='https://host:port'
export VMWARE_ESXI03_URL='https://host:port'
```

La accion `POST /api/hypervisors/{id}/sync` usa pyVmomi, actualiza metricas del host y devuelve diferencias entre VMs esperadas y descubiertas. El scheduler repite la consulta según `VMWARE_POLL_SECONDS`.

Las acciones de energia requieren permisos y `confirm=true`. Solo actualizan la base después de que VMware confirma el resultado.

## CloudWatch, Veeam y alertas

- `POST /api/integrations/aws/sync`: importa alarmas CloudWatch para Trujillo.
- `POST /api/integrations/veeam/sync`: consulta sesiones y registra fallos.
- `POST /api/alerts/{id}/notify`: escala por Telegram y llamada Twilio cuando están configurados.
- `GET /api/integrations/status`: indica qué conectores tienen credenciales runtime.

Las credenciales se definen únicamente mediante variables de entorno. La interfaz muestra `Pendiente` mientras no estén configuradas.

## WebSocket

NOC Live solicita primero un ticket efimero autenticado:

```text
POST /api/noc/ws-ticket
ws://BACKEND/ws/noc?ticket=TICKET_DE_UN_SOLO_USO
```

El JWT no se incluye en la URL. Si WebSocket falla, el frontend reintenta cada cinco segundos y mantiene polling configurable.

## Simulaciones

Las simulaciones son exclusivas de desarrollo y permanecen bloqueadas por defecto. Para habilitarlas en un entorno aislado use `ENABLE_SIMULATION=true`. Con usuario administrador o supervisor autorizado:

```text
POST /api/simulation/haproxy-down
POST /api/simulation/web-down
POST /api/simulation/mail-down
POST /api/simulation/dns-down
POST /api/simulation/app-down
POST /api/simulation/file-down
POST /api/simulation/vm-down
POST /api/simulation/vpn-down
POST /api/simulation/backup-failed
POST /api/simulation/high-cpu
POST /api/simulation/router-down
POST /api/simulation/switch-down
POST /api/simulation/ap-warning
POST /api/simulation/agent-offline
POST /api/simulation/reset
```

Una simulacion genera evento, alerta, WebSocket y, cuando aplica, ticket automatico sin duplicar alertas activas del mismo recurso.

## Distribucion objetivo

- `DB-LIMA-01`: `10.10.30.30`, MySQL en TCP `3306`.
- `APP-LIMA-01`: `10.10.30.50`, API FastAPI en TCP `8000`.

- ESXi-01 `172.17.25.23`: Router-Master, Router-Backup, Creador-ISP2, VC-LIMA-01, SW-LIMA-CORE-01 y SW-LIMA-CORE-02.
- ESXi-02 `172.17.25.19`: AD-LIMA-01, DB-LIMA-01, DHCP-LIMA-01, GLPI-LIMA-01, PBX-LIMA-01 y MON-LIMA-01.
- ESXi-03 `172.17.25.2`: APP-LIMA-01, FILE-LIMA-01, HAProxy, WEB-LIMA-01, MAIL-LIMA-01, DNS2-LIMA-01 y Veeam-Proxy.

La sincronizacion real debe revisarse antes de ejecutar cualquier accion porque el inventario actual puede diferir de esta distribucion objetivo.
