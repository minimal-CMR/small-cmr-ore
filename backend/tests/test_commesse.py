from datetime import date


def test_list_commesse_admin(client, admin_headers):
    resp = client.get("/api/commesse", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_list_commesse_unauthenticated(client):
    resp = client.get("/api/commesse")
    assert resp.status_code == 401


def test_create_commessa_gestore(client, gestore_headers):
    payload = {"nome": "Nuova Commessa", "codice": "NC-001", "sottocommesse": ["Alpha", "Beta"]}
    resp = client.post("/api/commesse", json=payload, headers=gestore_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["nome"] == "Nuova Commessa"
    assert data["codice"] == "NC-001"
    assert len(data["sottocommesse"]) == 2
    assert data["sottocommesse"][0]["lettera"] == "A"
    return data["id"]


def test_create_commessa_operatore_forbidden(client, operatore_headers):
    payload = {"nome": "Non Autorizzato", "codice": "NA-001"}
    resp = client.post("/api/commesse", json=payload, headers=operatore_headers)
    assert resp.status_code == 403


def test_get_commessa(client, admin_headers, commessa):
    resp = client.get(f"/api/commesse/{commessa.id}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == commessa.id


def test_get_commessa_not_found(client, admin_headers):
    resp = client.get("/api/commesse/99999", headers=admin_headers)
    assert resp.status_code == 404


def test_update_commessa(client, gestore_headers, commessa):
    resp = client.put(
        f"/api/commesse/{commessa.id}",
        json={"nome": "Commessa Aggiornata"},
        headers=gestore_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["nome"] == "Commessa Aggiornata"


def test_delete_commessa(client, gestore_headers, db):
    from models import Commessa
    c = Commessa(nome="Da Eliminare", codice="DEL-001")
    db.add(c)
    db.commit()
    db.refresh(c)
    resp = client.delete(f"/api/commesse/{c.id}", headers=gestore_headers)
    assert resp.status_code == 204


def test_assenze_commessa_seeded(client, admin_headers):
    resp = client.get("/api/commesse", headers=admin_headers)
    assert resp.status_code == 200
    codici = [c["codice"] for c in resp.json()]
    assert "ASSENZE" in codici
