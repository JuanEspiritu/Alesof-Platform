import argparse
import getpass

import core.model_registry  # noqa: F401
from core.auth import hash_password
from core.database import SessionLocal
from core.migrations import run_migrations
from models.usuario import Usuario


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the first Alesof administrator")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", default="Administrador Alesof")
    args = parser.parse_args()
    password = getpass.getpass("Nueva contraseña: ")
    confirmation = getpass.getpass("Confirmar contraseña: ")
    if password != confirmation:
        raise SystemExit("Las contraseñas no coinciden")
    if len(password) < 12:
        raise SystemExit("La contraseña debe tener al menos 12 caracteres")

    run_migrations()
    db = SessionLocal()
    try:
        if db.query(Usuario).filter(Usuario.email == args.email).first():
            raise SystemExit("Ya existe un usuario con ese correo")
        db.add(Usuario(
            nombre=args.name,
            email=args.email,
            password_hash=hash_password(password),
            rol="administrador",
            activo=True,
        ))
        db.commit()
        print(f"Administrador creado: {args.email}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
