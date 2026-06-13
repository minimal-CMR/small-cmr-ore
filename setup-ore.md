# small-cmr-ore — Guida al servizio

Modulo opzionale. Gestisce commesse, sottocommesse e registrazione ore.

## Porte

| Servizio | Porta |
|----------|-------|
| Backend  | 8002  |
| Frontend | 5174  |

## Setup iniziale

**Prima di avviare il backend è obbligatorio creare il file `.env`:**

```bash
cd backend
cp .env.example .env
```

Variabili da personalizzare in `backend/.env`:

| Variabile | Descrizione |
|-----------|-------------|
| `DATABASE_URL` | Stringa di connessione MySQL (porta 3307 in locale) |
| `SECRET_KEY` | Chiave JWT — deve essere uguale in tutti i servizi |
| `SERVICE_SECRET` | Segreto condiviso con `small-cmr-richieste` — deve essere uguale nei due servizi |

## Avvio locale

```bash
cd backend
python -m uvicorn main:app --reload --port 8002

cd frontend
npm install
npm run dev   # http://localhost:5174 (remote standalone)
```

## API Routes

| Metodo | Path | Auth |
|--------|------|------|
| GET/POST/PUT/DELETE | `/api/commesse/` | JWT |
| GET/POST/PUT/DELETE | `/api/ore/` | JWT |
| POST | `/api/ore/internal/booking` | SERVICE_SECRET |
| DELETE | `/api/ore/internal/booking/{id}` | SERVICE_SECRET |
| GET | `/health` | — |

## Comunicazione inter-servizio

`richieste-service` chiama gli endpoint `/api/ore/internal/*` con il header `service_secret` nel body per creare/eliminare ore di assenza quando un booking cambia stato.

`booking_id` in `registrazioni_ore` è un `Integer` senza FK cross-service.

## Seed automatico

All'avvio viene creata la commessa `ASSENZE` con sottocommesse Ferie, Permesso, Malattia (solo se non esiste già).

## Test

```bash
cd backend
pytest tests/ -v
```

## Migrazioni DB

```bash
cd backend
alembic upgrade head
```

Gestisce le tabelle: `commesse`, `sottocommesse`, `commessa_ditte`, `commessa_referenti`, `commessa_assegnatari`, `registrazioni_ore`.
