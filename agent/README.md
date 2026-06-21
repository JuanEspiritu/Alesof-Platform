# ALESOF-AGENT-LIMA

Colector TCP ligero para recursos que solo son accesibles desde la red interna. Envia heartbeat y observaciones al backend, que almacena historico y publica cambios por WebSocket.

## Instalacion en Ubuntu

```bash
cd agent
sudo bash install.sh
sudo nano /etc/alesof-agent.env
sudo systemctl start alesof-agent
sudo systemctl status alesof-agent
```

`ALESOF_AGENT_API_KEY` debe coincidir con `AGENT_API_KEY` del backend. No guarde ninguna clave real en el repositorio.

Logs:

```bash
sudo journalctl -u alesof-agent -f
```
