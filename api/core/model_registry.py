"""Import every SQLAlchemy model so Alembic sees the complete metadata."""

import models.cliente  # noqa: F401
import models.empleado  # noqa: F401
import models.equipo  # noqa: F401
import models.factura  # noqa: F401
import models.monitoring  # noqa: F401
import models.ticket  # noqa: F401
import models.usuario  # noqa: F401
