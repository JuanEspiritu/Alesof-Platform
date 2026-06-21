import asyncio
import base64
import json
import urllib.parse
import urllib.request
from abc import ABC, abstractmethod

from core.config import settings


def post_form(url: str, values: dict, headers: dict | None = None) -> dict:
    request = urllib.request.Request(url, data=urllib.parse.urlencode(values).encode(), headers=headers or {}, method="POST")
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode())


class NotificationProvider(ABC):
    @abstractmethod
    async def send(self, title: str, message: str, metadata: dict | None = None) -> dict:
        raise NotImplementedError


class BrowserNotificationProvider(NotificationProvider):
    async def send(self, title: str, message: str, metadata: dict | None = None) -> dict:
        return {"provider": "browser", "queued": True, "title": title, "message": message, "metadata": metadata or {}}


class TelegramNotificationProvider(NotificationProvider):
    async def send(self, title: str, message: str, metadata: dict | None = None) -> dict:
        if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
            return {"provider": "telegram", "configured": False, "detail": "Configure bot token y chat ID"}
        result = await asyncio.to_thread(post_form,
            f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
            {"chat_id": settings.TELEGRAM_CHAT_ID, "text": f"{title}\n\n{message}"})
        return {"provider": "telegram", "configured": True, "sent": bool(result.get("ok")), "message_id": result.get("result", {}).get("message_id")}


class FirebaseNotificationProvider(NotificationProvider):
    async def send(self, title: str, message: str, metadata: dict | None = None) -> dict:
        return {"provider": "firebase", "configured": False, "detail": "Configure credenciales FCM"}


class TwilioNotificationProvider(NotificationProvider):
    async def send(self, title: str, message: str, metadata: dict | None = None) -> dict:
        required = [settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_FROM_NUMBER,
            settings.TWILIO_TO_NUMBER, settings.TWILIO_VOICE_URL]
        if not all(required):
            return {"provider": "twilio", "configured": False, "detail": "Configure SID, token, numeros y Voice URL"}
        auth = base64.b64encode(f"{settings.TWILIO_ACCOUNT_SID}:{settings.TWILIO_AUTH_TOKEN}".encode()).decode()
        result = await asyncio.to_thread(post_form,
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Calls.json",
            {"To": settings.TWILIO_TO_NUMBER, "From": settings.TWILIO_FROM_NUMBER, "Url": settings.TWILIO_VOICE_URL},
            {"Authorization": f"Basic {auth}"})
        return {"provider": "twilio", "configured": True, "sent": bool(result.get("sid")), "call_sid": result.get("sid"), "status": result.get("status")}
