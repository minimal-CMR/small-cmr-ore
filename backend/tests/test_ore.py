from datetime import date
import os


def test_list_ore_empty(client, operatore_headers):
    resp = client.get("/api/ore", headers=operatore_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_create_ore_assegnatario(client, operatore_headers, commessa_con_assegnatario):
    payload = {
        "commessa_id": commessa_con_assegnatario.id,
        "data": str(date.today()),
        "ore": "8.00",
        "descrizione": "Test",
    }
    resp = client.post("/api/ore", json=payload, headers=operatore_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["ore"] == "8.00"
    return data["id"]


def test_create_ore_non_assegnatario_forbidden(client, operatore_headers, commessa):
    payload = {
        "commessa_id": commessa.id,
        "data": str(date.today()),
        "ore": "4.00",
        "descrizione": "Non autorizzato",
    }
    resp = client.post("/api/ore", json=payload, headers=operatore_headers)
    assert resp.status_code == 403


def test_create_ore_admin_bypass(client, admin_headers, commessa):
    payload = {
        "commessa_id": commessa.id,
        "data": str(date.today()),
        "ore": "4.00",
        "descrizione": "Admin bypass",
    }
    resp = client.post("/api/ore", json=payload, headers=admin_headers)
    assert resp.status_code == 201


def test_update_ore(client, operatore_headers, commessa_con_assegnatario):
    create_payload = {
        "commessa_id": commessa_con_assegnatario.id,
        "data": str(date.today()),
        "ore": "6.00",
        "descrizione": "Da aggiornare",
    }
    create_resp = client.post("/api/ore", json=create_payload, headers=operatore_headers)
    assert create_resp.status_code == 201
    ore_id = create_resp.json()["id"]

    update_resp = client.put(f"/api/ore/{ore_id}", json={"ore": "7.50"}, headers=operatore_headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["ore"] == "7.50"


def test_delete_ore(client, operatore_headers, commessa_con_assegnatario):
    create_payload = {
        "commessa_id": commessa_con_assegnatario.id,
        "data": str(date.today()),
        "ore": "2.00",
        "descrizione": "Da eliminare",
    }
    create_resp = client.post("/api/ore", json=create_payload, headers=operatore_headers)
    ore_id = create_resp.json()["id"]
    del_resp = client.delete(f"/api/ore/{ore_id}", headers=operatore_headers)
    assert del_resp.status_code == 204


def test_internal_booking_create(client, commessa_con_assegnatario):
    service_secret = os.getenv("SERVICE_SECRET", "test-secret")
    os.environ["SERVICE_SECRET"] = service_secret
    payload = {
        "service_secret": service_secret,
        "booking_id": 42,
        "user_id": 1,
        "tipo": "ferie",
        "data_inizio": "2026-07-01",
        "data_fine": "2026-07-03",
        "tutto_il_giorno": True,
    }
    resp = client.post("/api/ore/internal/booking", json=payload)
    assert resp.status_code in (201, 503)


def test_internal_booking_wrong_secret(client):
    import routers.commesse as cm
    cm.SERVICE_SECRET = "correct-secret"
    payload = {
        "service_secret": "wrong-secret",
        "booking_id": 99,
        "user_id": 1,
        "tipo": "ferie",
        "data_inizio": "2026-07-01",
        "data_fine": "2026-07-01",
        "tutto_il_giorno": True,
    }
    resp = client.post("/api/ore/internal/booking", json=payload)
    assert resp.status_code == 403


def test_unauthenticated_ore(client):
    resp = client.get("/api/ore")
    assert resp.status_code == 401
