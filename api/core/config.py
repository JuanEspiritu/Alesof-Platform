from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_ENV: str = "development"
    AUTO_MIGRATE: bool = True
    SEED_MODE: str = "none"
    ENABLE_SIMULATION: bool = False
    DATABASE_URL: str = "mysql+pymysql://app:1234@localhost:3306/app"
    SECRET_KEY: str = "alesof-secret-key-2026-muy-segura"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    AGENT_API_KEY: str = "change-me-agent-key"
    VMWARE_USERNAME: str = ""
    VMWARE_PASSWORD: str = ""
    VMWARE_ESXI01_URL: str = ""
    VMWARE_ESXI02_URL: str = ""
    VMWARE_ESXI03_URL: str = ""
    VMWARE_POLL_SECONDS: int = 60
    METRIC_RETENTION_DAYS: int = 30
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    TWILIO_TO_NUMBER: str = ""
    TWILIO_VOICE_URL: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    VEEAM_BASE_URL: str = ""
    VEEAM_USERNAME: str = ""
    VEEAM_PASSWORD: str = ""
    VEEAM_VERIFY_TLS: bool = True
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def validate_runtime(self) -> None:
        environment = self.APP_ENV.lower()
        seed_mode = self.SEED_MODE.lower()
        if seed_mode not in {"none", "reference", "demo"}:
            raise RuntimeError("SEED_MODE debe ser none, reference o demo")
        if environment == "production":
            if seed_mode == "demo":
                raise RuntimeError("SEED_MODE=demo no esta permitido en produccion")
            if self.SECRET_KEY in {"alesof-secret-key-2026-muy-segura", "change-me-with-a-long-random-secret"}:
                raise RuntimeError("Configure SECRET_KEY segura antes de iniciar produccion")
            if self.AGENT_API_KEY == "change-me-agent-key":
                raise RuntimeError("Configure AGENT_API_KEY segura antes de iniciar produccion")

    model_config = {"env_file": ".env"}


settings = Settings()
