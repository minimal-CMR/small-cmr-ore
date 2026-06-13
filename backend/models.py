from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, Numeric, Boolean, Date, func
from database import Base


class User(Base):
    """Replica locale di users — gestita da small-cmr-base. Solo lettura per auth."""
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True)
    nome          = Column(String(100), nullable=False)
    cognome       = Column(String(100), nullable=False)
    email         = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    azienda       = Column(String(255), default="")
    ditta_id      = Column(Integer, nullable=True)
    ruolo         = Column(String(200), nullable=False, default="opts")
    created_at    = Column(TIMESTAMP, server_default=func.now())

    def get_ruoli(self) -> list:
        return [r.strip() for r in (self.ruolo or "opts").split(",") if r.strip()]

    def is_admin(self) -> bool:
        return "admin" in self.get_ruoli()

    def has_role(self, *roles: str) -> bool:
        if self.is_admin():
            return True
        return any(r in self.get_ruoli() for r in roles)


class Ditta(Base):
    """Replica locale di ditte — gestita da small-cmr-base. Solo lettura."""
    __tablename__ = "ditte"

    id   = Column(Integer, primary_key=True)
    nome = Column(String(255), nullable=False)


class Commessa(Base):
    __tablename__ = "commesse"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    nome        = Column(String(255), nullable=False)
    codice      = Column(String(100), nullable=True)
    budget_ore  = Column(Numeric(8, 2), nullable=True)
    budget_euro = Column(Numeric(12, 2), nullable=True)
    created_at  = Column(TIMESTAMP, server_default=func.now())


class SottoCommessa(Base):
    __tablename__ = "sottocommesse"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    commessa_id = Column(Integer, ForeignKey("commesse.id", ondelete="CASCADE"), nullable=False)
    nome        = Column(String(255), nullable=False)
    lettera     = Column(String(5), nullable=True)


class CommessaDitta(Base):
    __tablename__ = "commessa_ditte"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    commessa_id = Column(Integer, ForeignKey("commesse.id", ondelete="CASCADE"), nullable=False)
    ditta_id    = Column(Integer, nullable=False)


class CommessaReferente(Base):
    __tablename__ = "commessa_referenti"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    commessa_id = Column(Integer, ForeignKey("commesse.id", ondelete="CASCADE"), nullable=False)
    user_id     = Column(Integer, nullable=False)


class CommessaAssegnatario(Base):
    __tablename__ = "commessa_assegnatari"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    commessa_id      = Column(Integer, ForeignKey("commesse.id", ondelete="CASCADE"), nullable=False)
    user_id          = Column(Integer, nullable=False)
    sottocommessa_id = Column(Integer, ForeignKey("sottocommesse.id", ondelete="CASCADE"), nullable=True)


class RegistrazioneOre(Base):
    __tablename__ = "registrazioni_ore"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    user_id          = Column(Integer, nullable=False)
    commessa_id      = Column(Integer, ForeignKey("commesse.id", ondelete="CASCADE"), nullable=False)
    sottocommessa_id = Column(Integer, ForeignKey("sottocommesse.id", ondelete="SET NULL"), nullable=True)
    booking_id       = Column(Integer, nullable=True)  # ref logica a richieste-service, nessuna FK cross-service
    data             = Column(Date, nullable=False)
    ore              = Column(Numeric(4, 2), nullable=False)
    descrizione      = Column(String(500), nullable=False, default="")
    smartworking     = Column(Boolean, default=False, nullable=False)
    created_at       = Column(TIMESTAMP, server_default=func.now())
