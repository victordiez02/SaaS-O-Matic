"""Ayudas compartidas por los tests de integración de la API."""

from fastapi.testclient import TestClient

# Identificadores fiscales españoles válidos (verificados por el validador).
VALID_CIF = "B12345674"
VALID_DNI = "12345678Z"
VALID_CIF_2 = "A58818501"


def new_customer(client: TestClient, **overrides) -> dict:
    """Alta de cliente con valores por defecto válidos; devuelve el JSON creado."""
    payload = {
        "company_name": "Acme Ibérica S.L.",
        "tax_id": VALID_CIF,
        "email": "cfo@acme.es",
        "country": "ES",
        "plan": "pro",
    }
    payload.update(overrides)
    response = client.post("/api/v1/customers", json=payload)
    assert response.status_code == 201, response.text
    return response.json()
