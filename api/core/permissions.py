from fastapi import Depends, HTTPException, status

from core.auth import get_current_user
from models.usuario import Usuario


ROLE_PERMISSIONS = {
    "administrador": {"*"},
    "supervisor": {
        "can_view_noc", "can_create_ticket", "can_assign_ticket", "can_view_sla",
        "can_acknowledge_alert", "can_resolve_alert", "can_view_reports",
        "can_run_network_tests", "can_manage_services", "can_manage_devices",
        "can_manage_vms", "can_power_on_vm", "can_restart_vm", "can_manage_inventory",
    },
    "tecnico": {
        "can_view_noc", "can_create_ticket", "can_view_sla", "can_acknowledge_alert",
        "can_run_network_tests", "can_power_on_vm", "can_restart_vm",
    },
    "cliente": {"can_create_ticket", "can_view_sla"},
}


def has_permission(user: Usuario, permission: str) -> bool:
    permissions = ROLE_PERMISSIONS.get(user.rol, set())
    return "*" in permissions or permission in permissions


def require_permissions(*required: str):
    def permission_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        missing = [permission for permission in required if not has_permission(current_user, permission)]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "No tiene permisos para esta accion", "missing": missing},
            )
        return current_user

    return permission_checker


def permissions_for_role(role: str) -> list[str]:
    permissions = ROLE_PERMISSIONS.get(role, set())
    if "*" in permissions:
        return [
            "can_view_noc", "can_manage_vms", "can_power_on_vm", "can_power_off_vm",
            "can_restart_vm", "can_create_ticket", "can_assign_ticket", "can_manage_inventory",
            "can_view_sla", "can_manage_security", "can_acknowledge_alert", "can_resolve_alert",
            "can_view_reports", "can_run_network_tests", "can_manage_services", "can_manage_devices",
        ]
    return sorted(permissions)
