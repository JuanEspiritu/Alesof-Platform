import asyncio
import socket
import time
import urllib.error
import urllib.request


class NetworkMonitoringProvider:
    async def check_port(self, host: str, port: int, timeout: float = 2.0) -> dict:
        started = time.perf_counter()
        try:
            reader, writer = await asyncio.wait_for(asyncio.open_connection(host, port), timeout=timeout)
            writer.close()
            await writer.wait_closed()
            return {"status": "ONLINE", "latency_ms": round((time.perf_counter() - started) * 1000, 1)}
        except Exception as exc:
            return {"status": "OFFLINE", "latency_ms": None, "error": str(exc)}

    async def resolve_dns(self, hostname: str) -> dict:
        started = time.perf_counter()
        try:
            loop = asyncio.get_running_loop()
            addresses = await loop.run_in_executor(None, socket.gethostbyname_ex, hostname)
            return {
                "status": "ONLINE",
                "latency_ms": round((time.perf_counter() - started) * 1000, 1),
                "addresses": addresses[2],
            }
        except Exception as exc:
            return {"status": "OFFLINE", "latency_ms": None, "error": str(exc)}

    async def check_http(self, url: str, timeout: float = 3.0, verify_tls: bool = True) -> dict:
        def request():
            context = None
            if not verify_tls:
                import ssl
                context = ssl._create_unverified_context()
            req = urllib.request.Request(url, method="GET", headers={"User-Agent": "Alesof-Agent/1.0"})
            with urllib.request.urlopen(req, timeout=timeout, context=context) as response:
                return response.status

        started = time.perf_counter()
        try:
            code = await asyncio.get_running_loop().run_in_executor(None, request)
            return {"status": "ONLINE" if code < 500 else "WARNING", "status_code": code, "latency_ms": round((time.perf_counter() - started) * 1000, 1)}
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            return {"status": "OFFLINE", "status_code": None, "latency_ms": None, "error": str(exc)}
