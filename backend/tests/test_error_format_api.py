"""Tests del formato de error unificado, transversal a todos los endpoints.

Vive aparte de las suites por recurso porque `{detail, code}` (+ `errors` en los
422 de validación) es un contrato de toda la API, no de los clientes: se ejercita
a través del endpoint que resulte más cómodo, pero lo que se fija aquí es el
formato, no el recurso. Ver correcciones-y-auditoria.md (F1, F2, F14).
"""

from fastapi.testclient import TestClient

from tests.helpers import VALID_DNI

# ---------------------------------------------------------------------------
# 422 de validación: {detail, code, errors}
# ---------------------------------------------------------------------------


def test_bad_email_is_unified_422(client: TestClient) -> None:
    response = client.post(
        "/api/v1/customers",
        json={
            "company_name": "X",
            "tax_id": VALID_DNI,
            "email": "no-es-email",
            "country": "ES",
            "plan": "pro",
        },
    )
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_validation_error_reports_field_errors(client: TestClient) -> None:
    """F14: el 422 de Pydantic trae `errors` de {field, message} para que el
    frontend pinte el mensaje junto al input, sin parsear el texto de `detail`."""
    response = client.post(
        "/api/v1/customers",
        json={
            "company_name": "X",
            "tax_id": VALID_DNI,
            "email": "no-es-email",
            "country": "ES",
            "plan": "gold",  # plan fuera del enum: segundo campo con error
        },
    )
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "VALIDATION_ERROR"
    fields = [error["field"] for error in body["errors"]]
    assert fields == ["email", "plan"]
    assert all(error["message"] for error in body["errors"])


def test_validation_error_field_omits_request_location(client: TestClient) -> None:
    """El `field` es el nombre que conoce el cliente: sin el prefijo `path`/`body`."""
    response = client.get("/api/v1/customers/abc")
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "customer_id"


# ---------------------------------------------------------------------------
# Formato unificado en rutas/métodos no manejados (F1)
# ---------------------------------------------------------------------------


def test_unknown_route_uses_unified_error_format(client: TestClient) -> None:
    response = client.get("/api/v1/nope")
    assert response.status_code == 404
    assert response.json() == {"detail": "Not Found", "code": "HTTP_404"}


def test_method_not_allowed_uses_unified_error_format(client: TestClient) -> None:
    response = client.delete("/api/v1/customers/1")
    assert response.status_code == 405
    assert response.json()["code"] == "HTTP_405"
