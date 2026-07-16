"""Serializadores compartidos por los schemas de salida."""

from datetime import datetime


def iso_utc_z(value: datetime) -> str:
    """Timestamp (UTC por convención) en ISO 8601 con sufijo `Z`, tal como muestra
    la spec 02 ("2026-07-14T10:30:00Z") — F6 de la auditoría."""
    return value.replace(tzinfo=None).isoformat() + "Z"
