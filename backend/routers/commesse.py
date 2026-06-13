import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from collections import defaultdict
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal

from database import get_db
from models import (
    Commessa, SottoCommessa, CommessaDitta, CommessaReferente,
    CommessaAssegnatario, RegistrazioneOre, User, Ditta,
)
from schemas import (
    CommessaCreate, CommessaUpdate, CommessaOut,
    RegistrazioneOreCreate, RegistrazioneOreUpdate, RegistrazioneOreOut,
    BookingAssenzaRequest,
)
from auth import get_current_user

router = APIRouter(prefix="/api/commesse", tags=["commesse"])
ore_router = APIRouter(prefix="/api/ore", tags=["ore"])
internal_router = APIRouter(prefix="/api/ore/internal", tags=["internal"])

_AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
SERVICE_SECRET = os.getenv("SERVICE_SECRET", "")


def _lettera(i: int) -> str:
    return _AZ[i] if i < 26 else _AZ[i // 26 - 1] + _AZ[i % 26]


def _build_out(c: Commessa, db: Session) -> dict:
    subs = db.query(SottoCommessa).filter(SottoCommessa.commessa_id == c.id).all()
    ditte = db.query(CommessaDitta).filter(CommessaDitta.commessa_id == c.id).all()
    referenti = db.query(CommessaReferente).filter(CommessaReferente.commessa_id == c.id).all()
    ass = db.query(CommessaAssegnatario).filter(CommessaAssegnatario.commessa_id == c.id).all()

    ass_map: dict[int, list[int]] = defaultdict(list)
    for a in ass:
        if a.sottocommessa_id:
            ass_map[a.user_id].append(a.sottocommessa_id)
        else:
            ass_map.setdefault(a.user_id, [])

    return {
        "id": c.id, "nome": c.nome, "codice": c.codice,
        "budget_ore": c.budget_ore, "budget_euro": c.budget_euro, "created_at": c.created_at,
        "ditta_ids": [d.ditta_id for d in ditte],
        "referente_ids": [r.user_id for r in referenti],
        "sottocommesse": [
            {"id": s.id, "commessa_id": s.commessa_id, "nome": s.nome, "lettera": s.lettera}
            for s in subs
        ],
        "assegnatari": [
            {"user_id": uid, "sottocommessa_ids": sids} for uid, sids in ass_map.items()
        ],
        "ore_usate": float(
            db.query(func.sum(RegistrazioneOre.ore))
            .filter(RegistrazioneOre.commessa_id == c.id)
            .scalar() or 0
        ),
    }


# ── Commesse ──────────────────────────────────────────────────────

@router.get("", response_model=List[CommessaOut])
def list_commesse(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    if me.has_role("gestore_commesse"):
        commesse = db.query(Commessa).all()
    else:
        ids = {r.commessa_id for r in db.query(CommessaAssegnatario).filter(CommessaAssegnatario.user_id == me.id).all()}
        commesse = db.query(Commessa).filter(Commessa.id.in_(ids)).all()
    return [_build_out(c, db) for c in commesse]


@router.post("", response_model=CommessaOut, status_code=status.HTTP_201_CREATED)
def create_commessa(payload: CommessaCreate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    if not me.has_role("gestore_commesse"):
        raise HTTPException(status_code=403, detail="Solo admin o gestore commesse può creare commesse")
    c = Commessa(nome=payload.nome, codice=payload.codice, budget_ore=payload.budget_ore, budget_euro=payload.budget_euro)
    db.add(c)
    db.flush()
    sub_map: dict[str, SottoCommessa] = {}
    for i, nome in enumerate(payload.sottocommesse):
        sub = SottoCommessa(commessa_id=c.id, nome=nome, lettera=_lettera(i))
        db.add(sub)
        db.flush()
        sub_map[nome] = sub
    for did in payload.ditta_ids:
        db.add(CommessaDitta(commessa_id=c.id, ditta_id=did))
    for uid in payload.referente_ids:
        db.add(CommessaReferente(commessa_id=c.id, user_id=uid))
    for ass in payload.assegnatari:
        if not ass.sottocommesse_nomi:
            db.add(CommessaAssegnatario(commessa_id=c.id, user_id=ass.user_id, sottocommessa_id=None))
        else:
            for nome in ass.sottocommesse_nomi:
                sub = sub_map.get(nome)
                if sub:
                    db.add(CommessaAssegnatario(commessa_id=c.id, user_id=ass.user_id, sottocommessa_id=sub.id))
    db.commit()
    db.refresh(c)
    return _build_out(c, db)


@router.get("/{commessa_id}", response_model=CommessaOut)
def get_commessa(commessa_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    c = db.query(Commessa).filter(Commessa.id == commessa_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Commessa non trovata")
    if not me.has_role("gestore_commesse"):
        if not db.query(CommessaAssegnatario).filter(
            CommessaAssegnatario.commessa_id == commessa_id,
            CommessaAssegnatario.user_id == me.id,
        ).first():
            raise HTTPException(status_code=403, detail="Non autorizzato")
    return _build_out(c, db)


@router.put("/{commessa_id}", response_model=CommessaOut)
def update_commessa(commessa_id: int, payload: CommessaUpdate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    if not me.has_role("gestore_commesse"):
        raise HTTPException(status_code=403, detail="Solo admin o gestore commesse può modificare commesse")
    c = db.query(Commessa).filter(Commessa.id == commessa_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Commessa non trovata")
    if payload.nome is not None:        c.nome = payload.nome
    if payload.codice is not None:      c.codice = payload.codice
    if payload.budget_ore is not None:  c.budget_ore = payload.budget_ore
    if payload.budget_euro is not None: c.budget_euro = payload.budget_euro
    if payload.ditta_ids is not None:
        db.query(CommessaDitta).filter(CommessaDitta.commessa_id == c.id).delete()
        for did in payload.ditta_ids:
            db.add(CommessaDitta(commessa_id=c.id, ditta_id=did))
    if payload.referente_ids is not None:
        db.query(CommessaReferente).filter(CommessaReferente.commessa_id == c.id).delete()
        for uid in payload.referente_ids:
            db.add(CommessaReferente(commessa_id=c.id, user_id=uid))
    if payload.sottocommesse is not None:
        db.query(SottoCommessa).filter(SottoCommessa.commessa_id == c.id).delete()
        sub_map: dict[str, SottoCommessa] = {}
        for i, nome in enumerate(payload.sottocommesse):
            sub = SottoCommessa(commessa_id=c.id, nome=nome, lettera=_lettera(i))
            db.add(sub)
            db.flush()
            sub_map[nome] = sub
    else:
        sub_map = {s.nome: s for s in db.query(SottoCommessa).filter(SottoCommessa.commessa_id == c.id).all()}
    if payload.assegnatari is not None:
        db.query(CommessaAssegnatario).filter(CommessaAssegnatario.commessa_id == c.id).delete()
        for ass in payload.assegnatari:
            if not ass.sottocommesse_nomi:
                db.add(CommessaAssegnatario(commessa_id=c.id, user_id=ass.user_id, sottocommessa_id=None))
            else:
                for nome in ass.sottocommesse_nomi:
                    sub = sub_map.get(nome)
                    if sub:
                        db.add(CommessaAssegnatario(commessa_id=c.id, user_id=ass.user_id, sottocommessa_id=sub.id))
    db.commit()
    db.refresh(c)
    return _build_out(c, db)


@router.delete("/{commessa_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_commessa(commessa_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    if not me.has_role("gestore_commesse"):
        raise HTTPException(status_code=403, detail="Solo admin o gestore commesse può eliminare commesse")
    c = db.query(Commessa).filter(Commessa.id == commessa_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Commessa non trovata")
    db.delete(c)
    db.commit()


@router.get("/{commessa_id}/stats")
def get_commessa_stats(commessa_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    if not me.has_role("gestore_commesse"):
        raise HTTPException(status_code=403)
    c = db.query(Commessa).filter(Commessa.id == commessa_id).first()
    if not c:
        raise HTTPException(status_code=404)
    ore_rows = db.query(RegistrazioneOre).filter(RegistrazioneOre.commessa_id == commessa_id).all()
    ore_usate = float(sum(r.ore for r in ore_rows))
    ore_residue = float(c.budget_ore) - ore_usate if c.budget_ore is not None else None
    ditta_ore: dict[int, float] = defaultdict(float)
    persona_ore: dict[int, dict] = {}
    for r in ore_rows:
        u = db.query(User).filter(User.id == r.user_id).first()
        if not u:
            continue
        did = u.ditta_id or 0
        ditta_ore[did] += float(r.ore)
        if r.user_id not in persona_ore:
            persona_ore[r.user_id] = {"nome": f"{u.nome} {u.cognome}", "ore": 0.0, "ditta_id": did}
        persona_ore[r.user_id]["ore"] += float(r.ore)
    per_ditta = []
    for did, ore in ditta_ore.items():
        nome = "Senza ditta" if did == 0 else (
            (d := db.query(Ditta).filter(Ditta.id == did).first()) and d.nome or "?"
        )
        per_ditta.append({"ditta_id": did, "nome": nome, "ore": ore})
    return {
        "budget_ore": float(c.budget_ore) if c.budget_ore is not None else None,
        "ore_usate": ore_usate, "ore_residue": ore_residue,
        "per_ditta": per_ditta, "per_persona": list(persona_ore.values()),
    }


# ── Registrazione ore ─────────────────────────────────────────────

@ore_router.get("", response_model=List[RegistrazioneOreOut])
def list_ore(
    anno: Optional[int] = None, mese: Optional[int] = None,
    db: Session = Depends(get_db), me: User = Depends(get_current_user),
):
    q = db.query(RegistrazioneOre).filter(RegistrazioneOre.user_id == me.id)
    if anno and mese:
        primo = date(anno, mese, 1)
        ultimo = date(anno, mese, monthrange(anno, mese)[1])
        q = q.filter(RegistrazioneOre.data >= primo, RegistrazioneOre.data <= ultimo)
    rows = q.all()
    result = []
    for reg in rows:
        c = db.query(Commessa).filter(Commessa.id == reg.commessa_id).first()
        s = db.query(SottoCommessa).filter(SottoCommessa.id == reg.sottocommessa_id).first() if reg.sottocommessa_id else None
        out = RegistrazioneOreOut.model_validate(reg)
        out.commessa_nome = c.nome if c else None
        out.commessa_codice = c.codice if c else None
        out.sottocommessa_nome = s.nome if s else None
        result.append(out)
    return result


@ore_router.post("", response_model=RegistrazioneOreOut, status_code=status.HTTP_201_CREATED)
def create_ore(payload: RegistrazioneOreCreate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    ass = db.query(CommessaAssegnatario).filter(
        CommessaAssegnatario.commessa_id == payload.commessa_id,
        CommessaAssegnatario.user_id == me.id,
    ).first()
    if not ass and not me.is_admin():
        raise HTTPException(status_code=403, detail="Non sei assegnatario di questa commessa")
    reg = RegistrazioneOre(user_id=me.id, **payload.model_dump())
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return reg


@ore_router.put("/{ore_id}", response_model=RegistrazioneOreOut)
def update_ore(ore_id: int, payload: RegistrazioneOreUpdate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    reg = db.query(RegistrazioneOre).filter(RegistrazioneOre.id == ore_id).first()
    if not reg:
        raise HTTPException(status_code=404)
    if reg.user_id != me.id and not me.is_admin():
        raise HTTPException(status_code=403)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(reg, field, value)
    db.commit()
    db.refresh(reg)
    return reg


@ore_router.delete("/{ore_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ore(ore_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    reg = db.query(RegistrazioneOre).filter(RegistrazioneOre.id == ore_id).first()
    if not reg:
        raise HTTPException(status_code=404)
    if reg.user_id != me.id and not me.is_admin():
        raise HTTPException(status_code=403)
    db.delete(reg)
    db.commit()


# ── Endpoint interni (chiamati da richieste-service) ──────────────

def _check_service_secret(secret: Optional[str]):
    if not SERVICE_SECRET or secret != SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Service secret non valido")


@internal_router.post("/booking", status_code=201)
def crea_ore_assenza(
    payload: BookingAssenzaRequest,
    x_service_secret: Optional[str] = None,
    db: Session = Depends(get_db),
):
    from fastapi import Header
    _check_service_secret(payload.service_secret)
    assenze = db.query(Commessa).filter(Commessa.codice == "ASSENZE").first()
    if not assenze:
        raise HTTPException(status_code=503, detail="Commessa ASSENZE non trovata")
    sub_nome = "Ferie" if payload.tipo == "ferie" else "Permesso"
    sub = db.query(SottoCommessa).filter(
        SottoCommessa.commessa_id == assenze.id,
        SottoCommessa.nome == sub_nome,
    ).first()
    current = payload.data_inizio
    while current <= payload.data_fine:
        if current.weekday() < 5:
            if payload.tutto_il_giorno:
                ore = Decimal("8")
            elif payload.data_inizio == payload.data_fine and payload.ore:
                ore = Decimal(str(payload.ore))
            else:
                ore = Decimal("8")
            db.add(RegistrazioneOre(
                user_id=payload.user_id,
                commessa_id=assenze.id,
                sottocommessa_id=sub.id if sub else None,
                booking_id=payload.booking_id,
                data=current,
                ore=ore,
                descrizione=f"{payload.tipo.capitalize()} approvato",
            ))
        current += timedelta(days=1)
    db.commit()
    return {"ok": True}


@internal_router.delete("/booking/{booking_id}", status_code=204)
def elimina_ore_assenza(
    booking_id: int,
    service_secret: Optional[str] = None,
    db: Session = Depends(get_db),
):
    _check_service_secret(service_secret)
    db.query(RegistrazioneOre).filter(RegistrazioneOre.booking_id == booking_id).delete()
    db.commit()

