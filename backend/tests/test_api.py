"""Tests de integración de la API (endpoints + errores unificados).

Ejercita los 5 endpoints de la spec 02 a través de la app real y verifica el
contrato: códigos de estado, formato de error `{detail, code}`, desglose de coste
persistido y su coherencia. La lógica fina (tramos, validador) ya se cubre en sus
suites unitarias; aquí se comprueba que todo está bien conectado.
"""

from fastapi.testclient import TestClient

# Identificadores fiscales españoles válidos (verificados por el validador).
VALID_CIF = "B12345674"
VALID_DNI = "12345678Z"
VALID_CIF_2 = "A58818501"


def _new_customer(client: TestClient, **overrides) -> dict:
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
    return response.json() if response.status_code == 201 else {"_status": response.status_code, **response.json()}


# ---------------------------------------------------------------------------
# POST /customers
# ---------------------------------------------------------------------------


def test_create_customer_ok(client: TestClient) -> None:
    response = client.post(
        "/api/v1/customers",
        json={
            "company_name": "Acme Ibérica S.L.",
            "tax_id": "b12345674",  # minúsculas: debe normalizarse
            "email": "cfo@acme.es",
            "country": "ES",
            "plan": "pro",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["tax_id"] == "B12345674"  # normalizado
    assert body["country"] == "ES"
    assert "created_at" in body


def test_create_customer_invalid_tax_id(client: TestClient) -> None:
    response = client.post(
        "/api/v1/customers",
        json={
            "company_name": "Bad Corp",
            "tax_id": "12345678A",  # DNI con letra de control errónea
            "email": "x@bad.es",
            "country": "ES",
            "plan": "basic",
        },
    )
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_TAX_ID"


def test_create_customer_duplicate_tax_id(client: TestClient) -> None:
    _new_customer(client)
    response = client.post(
        "/api/v1/customers",
        json={
            "company_name": "Otra empresa",
            "tax_id": VALID_CIF,  # mismo identificador
            "email": "otro@empresa.es",
            "country": "ES",
            "plan": "basic",
        },
    )
    assert response.status_code == 409
    assert response.json()["code"] == "TAX_ID_ALREADY_EXISTS"


def test_create_customer_bad_email_is_unified_422(client: TestClient) -> None:
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


def test_create_customer_non_es_skips_strict_validation(client: TestClient) -> None:
    """Fuera de España solo se exige formato mínimo (spec 01 §3)."""
    response = client.post(
        "/api/v1/customers",
        json={
            "company_name": "Globex GmbH",
            "tax_id": "DE811907980",
            "email": "ops@globex.de",
            "country": "DE",
            "plan": "enterprise",
        },
    )
    assert response.status_code == 201


# ---------------------------------------------------------------------------
# POST /simulations
# ---------------------------------------------------------------------------


def test_create_simulation_persists_breakdown(client: TestClient) -> None:
    """15 usuarios ES → base 140.00, IVA 21 %, total 169.40 (ejemplo de la spec)."""
    customer = _new_customer(client)
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
    customer = _new_customer(client)
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
# GET /customers?search=
# ---------------------------------------------------------------------------


def test_search_customers_by_name_and_tax_id(client: TestClient) -> None:
    _new_customer(client, company_name="Acme Ibérica S.L.", tax_id=VALID_CIF, email="a@acme.es")
    _new_customer(client, company_name="Globex", tax_id=VALID_DNI, email="b@globex.es")

    # Sin búsqueda → todos, con sobre {items, total}.
    all_resp = client.get("/api/v1/customers").json()
    assert all_resp["total"] == 2
    assert len(all_resp["items"]) == 2

    # Por nombre, insensible a mayúsculas.
    by_name = client.get("/api/v1/customers", params={"search": "acme"}).json()
    assert by_name["total"] == 1
    assert by_name["items"][0]["company_name"] == "Acme Ibérica S.L."

    # Por identificador fiscal parcial.
    by_tax = client.get("/api/v1/customers", params={"search": "12345678"}).json()
    assert by_tax["total"] == 1
    assert by_tax["items"][0]["tax_id"] == VALID_DNI

    # Sin coincidencias → 200 con lista vacía (no 404).
    none = client.get("/api/v1/customers", params={"search": "zzz"})
    assert none.status_code == 200
    assert none.json() == {"items": [], "total": 0}


# ---------------------------------------------------------------------------
# GET /customers/{id}
# ---------------------------------------------------------------------------


def test_get_customer_detail(client: TestClient) -> None:
    created = _new_customer(client)
    response = client.get(f"/api/v1/customers/{created['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_customer_not_found(client: TestClient) -> None:
    response = client.get("/api/v1/customers/999")
    assert response.status_code == 404
    assert response.json()["code"] == "CUSTOMER_NOT_FOUND"


# ---------------------------------------------------------------------------
# GET /customers/{id}/simulations
# ---------------------------------------------------------------------------


def test_customer_simulation_history_ordered(client: TestClient) -> None:
    customer = _new_customer(client)
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
    customer = _new_customer(client)
    response = client.get(f"/api/v1/customers/{customer['id']}/simulations")
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


def test_customer_simulation_history_customer_not_found(client: TestClient) -> None:
    response = client.get("/api/v1/customers/999/simulations")
    assert response.status_code == 404
    assert response.json()["code"] == "CUSTOMER_NOT_FOUND"
