"""Test per stats commessa + internal endpoint delete booking."""
from datetime import date
from decimal import Decimal

import pytest

from models import (
    Commessa, SottoCommessa, CommessaAssegnatario,
    CommessaDitta, RegistrazioneOre, Ditta, User,
)
from auth import hash_password


# ── Stats commessa ──────────────────────────────────────────────

@pytest.fixture
def stats_commessa(db, gestore_user, operatore_user):
    c = Commessa(nome="Stats Test", codice="STAT-1", budget_ore=Decimal("100"))
    db.add(c); db.flush()
    db.add(CommessaAssegnatario(commessa_id=c.id, user_id=operatore_user.id))
    db.add_all([
        RegistrazioneOre(user_id=operatore_user.id, commessa_id=c.id,
                          data=date(2026, 6, 1), ore=Decimal("8"), descrizione="d1"),
        RegistrazioneOre(user_id=operatore_user.id, commessa_id=c.id,
                          data=date(2026, 6, 2), ore=Decimal("6"), descrizione="d2"),
    ])
    db.commit()
    cid = c.id
    yield c
    db.query(RegistrazioneOre).filter(RegistrazioneOre.commessa_id == cid).delete()
    db.query(CommessaAssegnatario).filter(CommessaAssegnatario.commessa_id == cid).delete()
    db.query(Commessa).filter(Commessa.id == cid).delete()
    db.commit()


def test_stats_commessa_admin(client, admin_headers, stats_commessa):
    r = client.get(f"/api/commesse/{stats_commessa.id}/stats", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["budget_ore"] == 100.0
    assert body["ore_usate"] == 14.0
    assert body["ore_residue"] == 86.0
    assert isinstance(body["per_ditta"], list)
    assert isinstance(body["per_persona"], list)
    assert len(body["per_persona"]) == 1
    assert body["per_persona"][0]["ore"] == 14.0


def test_stats_commessa_gestore(client, gestore_headers, stats_commessa):
    r = client.get(f"/api/commesse/{stats_commessa.id}/stats", headers=gestore_headers)
    assert r.status_code == 200


def test_stats_commessa_opts_forbidden(client, operatore_headers, stats_commessa):
    r = client.get(f"/api/commesse/{stats_commessa.id}/stats", headers=operatore_headers)
    assert r.status_code == 403


def test_stats_commessa_not_found(client, admin_headers):
    r = client.get("/api/commesse/999999/stats", headers=admin_headers)
    assert r.status_code == 404


def test_stats_commessa_no_budget(client, admin_headers, db):
    c = Commessa(nome="No Budget", codice="NB-1")
    db.add(c); db.commit()
    try:
        r = client.get(f"/api/commesse/{c.id}/stats", headers=admin_headers)
        assert r.status_code == 200
        body = r.json()
        assert body["budget_ore"] is None
        assert body["ore_residue"] is None
        assert body["ore_usate"] == 0.0
    finally:
        db.query(Commessa).filter(Commessa.id == c.id).delete()
        db.commit()


# ── Internal: DELETE booking ────────────────────────────────────

@pytest.fixture
def booking_with_ore(db, operatore_user):
    # Crea ASSENZE commessa se manca + registrazioni con booking_id
    assenze = db.query(Commessa).filter(Commessa.codice == "ASSENZE").first()
    if not assenze:
        assenze = Commessa(nome="Assenze", codice="ASSENZE")
        db.add(assenze); db.flush()
        db.add(SottoCommessa(commessa_id=assenze.id, nome="Ferie", lettera="A"))
        db.commit()
        db.refresh(assenze)

    booking_id = 9999
    db.add_all([
        RegistrazioneOre(user_id=operatore_user.id, commessa_id=assenze.id,
                          booking_id=booking_id, data=date(2026, 7, 1),
                          ore=Decimal("8"), descrizione="ferie 1"),
        RegistrazioneOre(user_id=operatore_user.id, commessa_id=assenze.id,
                          booking_id=booking_id, data=date(2026, 7, 2),
                          ore=Decimal("8"), descrizione="ferie 2"),
    ])
    db.commit()
    yield booking_id
    db.query(RegistrazioneOre).filter(RegistrazioneOre.booking_id == booking_id).delete()
    db.commit()


@pytest.fixture(autouse=True)
def _pin_service_secret():
    """test_ore.py modifica cm.SERVICE_SECRET in-place; ripinnandolo evita ordering bug."""
    import routers.commesse as cm
    cm.SERVICE_SECRET = "test-secret"


def test_internal_delete_booking_correct_secret(client, booking_with_ore, db):
    pre = db.query(RegistrazioneOre).filter(RegistrazioneOre.booking_id == booking_with_ore).count()
    assert pre == 2

    r = client.request("DELETE", f"/api/ore/internal/booking/{booking_with_ore}",
                        params={"service_secret": "test-secret"})
    assert r.status_code == 204

    post = db.query(RegistrazioneOre).filter(RegistrazioneOre.booking_id == booking_with_ore).count()
    assert post == 0


def test_internal_delete_booking_wrong_secret(client, booking_with_ore):
    r = client.request("DELETE", f"/api/ore/internal/booking/{booking_with_ore}",
                        params={"service_secret": "wrong"})
    assert r.status_code == 403


def test_internal_delete_booking_no_secret(client):
    r = client.request("DELETE", "/api/ore/internal/booking/12345")
    assert r.status_code == 403
