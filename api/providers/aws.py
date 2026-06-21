import asyncio

from core.config import settings


class CloudWatchProvider:
    def configured(self) -> bool:
        return bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY and settings.AWS_REGION)

    def _snapshot(self) -> dict:
        import boto3

        client = boto3.client("cloudwatch", region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
        alarms = client.describe_alarms(StateValue="ALARM", MaxRecords=50).get("MetricAlarms", [])
        return {"region": settings.AWS_REGION, "active_alarms": [{
            "name": item.get("AlarmName"), "reason": item.get("StateReason"),
            "metric": item.get("MetricName"), "namespace": item.get("Namespace"),
            "updated_at": item.get("StateUpdatedTimestamp"),
        } for item in alarms]}

    async def snapshot(self) -> dict:
        if not self.configured():
            return {"configured": False, "detail": "Configure credenciales AWS runtime"}
        return {"configured": True, **await asyncio.to_thread(self._snapshot)}
