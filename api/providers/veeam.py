import asyncio
import json
import ssl
import urllib.parse
import urllib.request

from core.config import settings


class VeeamProvider:
    def configured(self) -> bool:
        return bool(settings.VEEAM_BASE_URL and settings.VEEAM_USERNAME and settings.VEEAM_PASSWORD)

    def _context(self):
        return ssl.create_default_context() if settings.VEEAM_VERIFY_TLS else ssl._create_unverified_context()

    def _request(self, path: str, token: str | None = None, data: dict | None = None) -> dict:
        headers = {"Accept": "application/json", "x-api-version": "1.1-rev0"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        body = urllib.parse.urlencode(data).encode() if data else None
        request = urllib.request.Request(f"{settings.VEEAM_BASE_URL.rstrip('/')}{path}", data=body,
            headers=headers, method="POST" if data else "GET")
        with urllib.request.urlopen(request, timeout=20, context=self._context()) as response:
            return json.loads(response.read().decode())

    def _snapshot(self) -> dict:
        auth = self._request("/api/oauth2/token", data={"grant_type": "password",
            "username": settings.VEEAM_USERNAME, "password": settings.VEEAM_PASSWORD})
        sessions = self._request("/api/v1/sessions?limit=50", token=auth["access_token"])
        return {"sessions": sessions.get("data", sessions.get("items", []))}

    async def snapshot(self) -> dict:
        if not self.configured():
            return {"configured": False, "detail": "Configure Veeam runtime"}
        return {"configured": True, **await asyncio.to_thread(self._snapshot)}
