import os
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from jose import JWTError, jwt

from database import engine, SessionLocal
from models import Base, Commessa, SottoCommessa
from auth import SECRET_KEY, ALGORITHM
from audit import init_audit_logging, log_access, log_app
from routers.commesse import router as commesse_router, ore_router, internal_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_audit_logging()
    log_app("ore startup")
    Base.metadata.create_all(bind=engine)
    _seed_assenze()
    yield
    log_app("ore shutdown")


def _seed_assenze():
    db = SessionLocal()
    try:
        if db.query(Commessa).filter(Commessa.codice == "ASSENZE").first():
            return
        c = Commessa(nome="ASSENZE", codice="ASSENZE")
        db.add(c)
        db.flush()
        for i, nome in enumerate(["Ferie", "Permesso", "Malattia"]):
            db.add(SottoCommessa(commessa_id=c.id, nome=nome, lettera="ABC"[i]))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


app = FastAPI(title="Small CMR — Ore API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _user_id_from_request(request: Request) -> int | None:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (JWTError, ValueError):
        return None


@app.middleware("http")
async def access_log_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    log_access(
        method=request.method, path=request.url.path,
        status_code=response.status_code, duration_ms=duration_ms,
        user_id=_user_id_from_request(request), request=request,
    )
    return response


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "ore"}


app.include_router(commesse_router)
app.include_router(ore_router)
app.include_router(internal_router)
