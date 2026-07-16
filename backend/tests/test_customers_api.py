"""Tests de integración de los endpoints de clientes + formato de error unificado.

Ejercita `POST /customers`, el buscador, el detalle y los errores unificados a
través de la app real (spec 02). La lógica fina (validador fiscal) se cubre en su
suite unitaria; aquí se comprueba que todo está bien conectado.
"""

from fastapi.testclient import TestClient

from tests.helpers import VALID_CIF, VALID_DNI, new_customer

# ---------------------------------------------------------------------------
# POST /customers
# ---------------------------------------------------------------------------


def test_create_customer_ok_normalizes_tax_id(client: TestClient) -> None:
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
    assert body["created_at"].endswith("Z")  # F6: ISO con sufijo Z


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
    new_customer(client)
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


def test_create_customer_rejects_non_iso_country(client: TestClient) -> None:
    """F3: `country` con dígitos/símbolos ya no se cuela (antes daba 201)."""
    response = client.post(
        "/api/v1/customers",
        json={
            "company_name": "Lax",
            "tax_id": "XYZ123",
            "email": "a@b.com",
            "country": "12",
            "plan": "basic",
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
# GET /customers?search=
# ---------------------------------------------------------------------------


def test_search_customers_by_name_and_tax_id(client: TestClient) -> None:
    new_customer(
        client, company_name="Acme Ibérica S.L.", tax_id=VALID_CIF, email="a@acme.es"
    )
    new_customer(client, company_name="Globex", tax_id=VALID_DNI, email="b@globex.es")

    all_resp = client.get("/api/v1/customers").json()
    assert all_resp["total"] == 2
    assert len(all_resp["items"]) == 2

    by_name = client.get("/api/v1/customers", params={"search": "acme"}).json()
    assert by_name["total"] == 1
    assert by_name["items"][0]["company_name"] == "Acme Ibérica S.L."

    by_tax = client.get("/api/v1/customers", params={"search": "12345678"}).json()
    assert by_tax["total"] == 1
    assert by_tax["items"][0]["tax_id"] == VALID_DNI

    none = client.get("/api/v1/customers", params={"search": "zzz"})
    assert none.status_code == 200
    assert none.json() == {"items": [], "total": 0}


def test_search_is_accent_insensitive(client: TestClient) -> None:
    """F13: "Ibérica" se encuentra escribiendo "iberica" (y al revés)."""
    new_customer(
        client, company_name="Acme Ibérica S.L.", tax_id=VALID_CIF, email="a@acme.es"
    )

    for term in ("iberica", "IBERICA", "Ibérica", "IBÉRICA"):
        result = client.get("/api/v1/customers", params={"search": term}).json()
        assert result["total"] == 1, f"«{term}» debería encontrar el cliente"
        assert result["items"][0]["company_name"] == "Acme Ibérica S.L."


def test_search_escapes_like_wildcards(client: TestClient) -> None:
    """F4: `%` se busca literal, no como comodín que devolvería todo."""
    new_customer(client)
    result = client.get("/api/v1/customers", params={"search": "%"}).json()
    assert result == {"items": [], "total": 0}


# ---------------------------------------------------------------------------
# GET /customers/{id}
# ---------------------------------------------------------------------------


def test_get_customer_detail(client: TestClient) -> None:
    created = new_customer(client)
    response = client.get(f"/api/v1/customers/{created['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_customer_not_found(client: TestClient) -> None:
    response = client.get("/api/v1/customers/999")
    assert response.status_code == 404
    assert response.json()["code"] == "CUSTOMER_NOT_FOUND"
