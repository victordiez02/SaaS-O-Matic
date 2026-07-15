"""Errores unificados de la API.

Formato único de error de CLAUDE.md: `{"detail": ..., "code": ...}`. `AppError`
es la excepción de dominio; los handlers de `main.py` la traducen a JSON, y
normalizan también los errores de validación de Pydantic (422) al mismo formato.
"""


class AppError(Exception):
    """Error de dominio con código HTTP y `code` de máquina para la respuesta."""

    def __init__(self, status_code: int, code: str, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.code = code
        self.detail = detail
