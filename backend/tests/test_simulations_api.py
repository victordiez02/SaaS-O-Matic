"""Tests de integración de los endpoints de simulaciones (spec 02).

Verifica el cálculo y persistencia del desglose, los errores unificados y el
historial ordenado, a través de la app real.
"""

from fastapi.testclient import TestClient

from tests.helpers import new_customer

# ---------------------------------------------------------------------------
# POST /simulations
# ---------------------------------------------------------------------------


def test_create_simulation_persists_breakdown(client: TestClient) -> None:
    """15 usuarios ES → base 140.00, IVA 21 %, total 169.40 (ejemplo de la spec)."""
    customer = new_customer(client)
    response = client.post(
        "/api/v1/simulations",
        json={
            "customer_id": customer["id"],
            "active_users": 15,
            "storage_gb": 500,
            "api_calls": 100000,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["base_cost"] == "140.00"
    assert body["tax_rate"] == "0.21"
    assert body["tax_amount"] == "29.40"
    assert body["total_cost"] == "169.40"
    assert body["currency"] == "EUR"
    assert body["created_at"].endswith("Z")  # F6
    # Coherencia del desglose (spec 03): total = base + impuesto.
    assert float(body["total_cost"]) == float(body["base_cost"]) + float(body["tax_amount"])


def test_create_simulation_customer_not_found(client: TestClient) -> None:
    response = client.post(
        "/api/v1/simulations",
        json={"customer_id": 999, "active_users": 10, "storage_gb": 0, "api_calls": 0},
    )
    assert response.status_code == 404
    assert response.json()["code"] == "CUSTOMER_NOT_FOUND"


def test_create_simulation_negative_users_is_422(client: TestClient) -> None:
    customer = new_customer(client)
    response = client.post(
        "/api/v1/simulations",
        json={
            "customer_id": customer["id"],
            "active_users": -1,
            "storage_gb": 0,
            "api_calls": 0,
        },
    )
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# GET /customers/{id}/simulations
# ---------------------------------------------------------------------------


def test_customer_simulation_history_ordered(client: TestClient) -> None:
    customer = new_customer(client)
    cid = customer["id"]
    first = client.post(
        "/api/v1/simulations",
        json={"customer_id": cid, "active_users": 5, "storage_gb": 0, "api_calls": 0},
    ).json()
    second = client.post(
        "/api/v1/simulations",
        json={"customer_id": cid, "active_users": 50, "storage_gb": 0, "api_calls": 0},
    ).json()

    response = client.get(f"/api/v1/customers/{cid}/simulations")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    # Orden: de más reciente a más antigua.
    assert [s["id"] for s in body["items"]] == [second["id"], first["id"]]


def test_customer_simulation_history_empty(client: TestClient) -> None:
    customer = new_customer(client)
    response = client.get(f"/api/v1/customers/{customer['id']}/simulations")
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


def test_customer_simulation_history_customer_not_found(client: TestClient) -> None:
    response = client.get("/api/v1/customers/999/simulations")
    assert response.status_code == 404
    assert response.json()["code"] == "CUSTOMER_NOT_FOUND"
