from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


class SottoCommessaOut(BaseModel):
    id: int
    commessa_id: int
    nome: str
    lettera: Optional[str] = None
    model_config = {"from_attributes": True}


class AssegnatarioIn(BaseModel):
    user_id: int
    sottocommesse_nomi: List[str] = []


class AssegnatarioOut(BaseModel):
    user_id: int
    sottocommessa_ids: List[int] = []


class CommessaCreate(BaseModel):
    nome: str
    codice: Optional[str] = None
    ditta_ids: List[int] = []
    budget_ore: Optional[Decimal] = None
    budget_euro: Optional[Decimal] = None
    referente_ids: List[int] = []
    sottocommesse: List[str] = []
    assegnatari: List[AssegnatarioIn] = []


class CommessaUpdate(BaseModel):
    nome: Optional[str] = None
    codice: Optional[str] = None
    ditta_ids: Optional[List[int]] = None
    budget_ore: Optional[Decimal] = None
    budget_euro: Optional[Decimal] = None
    referente_ids: Optional[List[int]] = None
    sottocommesse: Optional[List[str]] = None
    assegnatari: Optional[List[AssegnatarioIn]] = None


class CommessaOut(BaseModel):
    id: int
    nome: str
    codice: Optional[str] = None
    ditta_ids: List[int] = []
    budget_ore: Optional[Decimal] = None
    budget_euro: Optional[Decimal] = None
    referente_ids: List[int] = []
    sottocommesse: List[SottoCommessaOut] = []
    assegnatari: List[AssegnatarioOut] = []
    created_at: Optional[datetime] = None
    ore_usate: Optional[float] = None
    model_config = {"from_attributes": True}


class RegistrazioneOreCreate(BaseModel):
    commessa_id: int
    sottocommessa_id: Optional[int] = None
    data: date
    ore: Decimal
    descrizione: str = ""
    smartworking: bool = False


class RegistrazioneOreUpdate(BaseModel):
    commessa_id: Optional[int] = None
    sottocommessa_id: Optional[int] = None
    ore: Optional[Decimal] = None
    descrizione: Optional[str] = None
    smartworking: Optional[bool] = None


class RegistrazioneOreOut(BaseModel):
    id: int
    user_id: int
    commessa_id: int
    sottocommessa_id: Optional[int] = None
    booking_id: Optional[int] = None
    data: date
    ore: Decimal
    descrizione: str
    smartworking: bool = False
    commessa_nome: Optional[str] = None
    commessa_codice: Optional[str] = None
    sottocommessa_nome: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class BookingAssenzaRequest(BaseModel):
    """Payload inviato da richieste-service per creare/eliminare ore di assenza."""
    service_secret: str
    booking_id: int
    user_id: int
    tipo: str
    data_inizio: date
    data_fine: date
    ore: Optional[Decimal] = None
    tutto_il_giorno: bool = False
