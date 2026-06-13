import os
import pathlib

_DB_FILE = pathlib.Path(__file__).parent / "test_ore.db"
if _DB_FILE.exists():
    _DB_FILE.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{_DB_FILE}"
os.environ["SECRET_KEY"]   = "test-only-secret-do-not-use-in-prod"
os.environ["SERVICE_SECRET"] = "test-secret"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from database import Base, get_db, engine
from main import app
from models import User, Commessa, SottoCommessa, CommessaAssegnatario
from auth import hash_password, create_access_token

engine_test = engine  # DATABASE_URL already points to SQLite
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@event.listens_for(engine_test, "connect")
def _fk_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)
    try:
        _DB_FILE.unlink(missing_ok=True)
    except PermissionError:
        pass


@pytest.fixture(scope="session")
def db_session():
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def db():
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def admin_user(db_session):
    u = User(
        nome="Admin", cognome="Sistema",
        email="admin@test.com",
        password_hash=hash_password("admin123"),
        ruolo="admin",
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture(scope="session")
def gestore_user(db_session):
    u = User(
        nome="Gestore", cognome="Commesse",
        email="gestore@test.com",
        password_hash=hash_password("pass123"),
        ruolo="gestore_commesse",
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture(scope="session")
def operatore_user(db_session):
    u = User(
        nome="Mario", cognome="Rossi",
        email="mario@test.com",
        password_hash=hash_password("pass123"),
        ruolo="opts",
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture(scope="session")
def admin_headers(admin_user):
    token = create_access_token({"sub": str(admin_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def gestore_headers(gestore_user):
    token = create_access_token({"sub": str(gestore_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def operatore_headers(operatore_user):
    token = create_access_token({"sub": str(operatore_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def commessa(db, gestore_user):
    c = Commessa(nome="Test Commessa", codice="TST-001")
    db.add(c)
    db.commit()
    cid = c.id
    yield c
    db.query(Commessa).filter(Commessa.id == cid).delete()
    db.commit()


@pytest.fixture
def commessa_con_assegnatario(db, operatore_user):
    c = Commessa(nome="Commessa Assegnata", codice="TST-002")
    db.add(c)
    db.flush()
    ass = CommessaAssegnatario(commessa_id=c.id, user_id=operatore_user.id)
    db.add(ass)
    db.commit()
    cid = c.id
    yield c
    db.query(CommessaAssegnatario).filter(CommessaAssegnatario.commessa_id == cid).delete()
    db.query(Commessa).filter(Commessa.id == cid).delete()
    db.commit()
