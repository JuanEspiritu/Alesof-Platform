from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import Base, engine
from routers import auth, clientes, empleados, facturacion, inventario, reportes, soporte

app = FastAPI(title="Alesof Platform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clientes.router)
app.include_router(empleados.router)
app.include_router(inventario.router)
app.include_router(facturacion.router)
app.include_router(soporte.router)
app.include_router(reportes.router)


@app.on_event("startup")
def on_startup():
    import models.cliente  # noqa: F401
    import models.empleado  # noqa: F401
    import models.equipo  # noqa: F401
    import models.factura  # noqa: F401
    import models.ticket  # noqa: F401
    import models.usuario  # noqa: F401

    Base.metadata.create_all(bind=engine)

    from seed import run_seed
    run_seed()


@app.get("/")
def root():
    return {"message": "Alesof Platform API v1.0", "docs": "/docs"}
