import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from routers import auth, clientes, empleados, empresa, facturacion, inventario, monitoring, reportes, soporte

app = FastAPI(title="Alesof Platform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clientes.router)
app.include_router(empleados.router)
app.include_router(empresa.router)
app.include_router(inventario.router)
app.include_router(facturacion.router)
app.include_router(soporte.router)
app.include_router(reportes.router)
app.include_router(monitoring.router)


@app.on_event("startup")
def on_startup():
    settings.validate_runtime()
    if settings.AUTO_MIGRATE:
        from core.migrations import run_migrations
        run_migrations()

    seed_mode = settings.SEED_MODE.lower()
    if seed_mode == "demo":
        from seed import run_seed
        run_seed()
    if seed_mode in {"demo", "reference"}:
        from monitoring_seed import run_monitoring_seed
        run_monitoring_seed(include_demo=seed_mode == "demo")

    from services.scheduler import monitoring_scheduler
    app.state.monitoring_task = asyncio.create_task(monitoring_scheduler())


@app.on_event("shutdown")
async def on_shutdown():
    task = getattr(app.state, "monitoring_task", None)
    if task:
        task.cancel()


@app.get("/")
def root():
    return {"message": "Alesof Platform API v1.0", "docs": "/docs"}
