# DASIG – Research Information System

Web system where HEI staff submit research papers and DOST Region 7 admins review them. It extracts keywords, checks similarity, and runs an AI quality review.

**Live system:** https://dasig-ris.vercel.app/

**Demo accounts** (for evaluation only)

| Role | Email | Password |
|---|---|---|
| HEI Staff | `karylle.amad@cit.edu` | `karylle.amad@cit.edu` |
| DOST Admin | `admin@ro7.dost.gov.ph` | `DASIG123!RIIS` |

---

## What's in this repo

| Folder | Purpose | Tech | Local port |
|---|---|---|---|
| `riis-frontend/` | Web app | React, Vite | 5173 |
| `riis-backend/` | REST API | Java 17, Spring Boot | 8080 |
| `riis-ai/` | AI service | Python, FastAPI | 8000 |

Database: PostgreSQL on Supabase. File storage: AWS S3.

---

## Run locally

### 1. Install
- Git, **Java 17**, **Node.js 20.19+ (or 22.12+)**, **Python 3.10+**
- A **PostgreSQL 14+ database with the `pgvector` extension** (a free Supabase project works)
- An **AWS S3 bucket** with access keys
- A **Gmail App Password** (for sending emails)
- An **Anthropic API key** (for the AI quality review)

```bash
git clone https://github.com/margeldestine/riis-system.git
cd riis-system
```

### 2. Start the AI service (port 8000)

Open a terminal in the project root folder (`riis-system`).

**Windows (PowerShell):**
```powershell
cd riis-ai
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:INTERNAL_SERVICE_TOKEN="any-long-random-string"
$env:ANTHROPIC_API_KEY="your-anthropic-key"
uvicorn main:app --reload --port 8000
```

**Mac / Linux:**
```bash
cd riis-ai
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export INTERNAL_SERVICE_TOKEN="any-long-random-string"
export ANTHROPIC_API_KEY="your-anthropic-key"
uvicorn main:app --reload --port 8000
```

- Set the two variables **before** running `uvicorn`.
- `INTERNAL_SERVICE_TOKEN` can be any long random string, but the backend must use the **same** value.
- Check: http://localhost:8000/health shows `"status":"ok"`.
- The first request downloads the AI models, so it can take a few minutes.

### 3. Start the backend (port 8080)

```bash
cd riis-backend
```

Set these variables:

| Variable | Value |
|---|---|
| `DB_URL` | `jdbc:postgresql://<host>:<port>/<database>` |
| `DB_USERNAME` / `DB_PASSWORD` | database login |
| `JWT_SECRET` | any random string, 32+ characters |
| `INTERNAL_SERVICE_TOKEN` | same value as the AI service |
| `AI_SERVICE_URL` | `http://127.0.0.1:8000` (default) |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | Gmail address / Gmail App Password |
| `S3_BUCKET`, `S3_REGION` | your bucket name and region |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | your AWS keys |
| `S3_ENDPOINT` | leave empty for AWS |

Then run:

```bash
./mvnw spring-boot:run            # Windows: .\mvnw.cmd spring-boot:run
```

The database tables are created automatically on first start (Flyway). No manual SQL needed.

### 4. Start the frontend (port 5173)

```bash
cd riis-frontend
npm install
npm run dev
```

Open http://localhost:5173. It connects to the backend at `http://localhost:8080/api/v1` by default.

### Setting variables
The backend and AI service do not read `.env` files. Set them in your terminal before running:
- Mac/Linux: `export NAME="value"`
- Windows PowerShell: `$env:NAME="value"`
- Or add them to your IDE's run configuration.

### Run tests
```bash
cd riis-backend && ./mvnw test
```

---

## Deployment

Pushing to the `main` branch **automatically deploys** the live system.

| Part | Host | Root directory |
|---|---|---|
| Frontend | Vercel | `riis-frontend` |
| Backend | Railway | `riis-backend` |
| AI service | Railway | `riis-ai` |
| Database | Supabase | – |
| Files | AWS S3 | – |

**Frontend (Vercel):** Framework Vite, build command `npm run build`, output `dist`.
Set `VITE_API_BASE_URL` = `https://riis-backend-production.up.railway.app/api/v1`. This is applied at build time, so redeploy after changing it.

**Backend (Railway):** Set the same variables as in the local setup, using the Supabase database details, plus:
- `AI_SERVICE_URL` = the Railway AI service address
- `FRONTEND_BASE_URL` = `https://dasig-ris.vercel.app`
- `FRONTEND_ALLOWED_ORIGINS` = `https://dasig-ris.vercel.app`

**AI service (Railway):** Set `INTERNAL_SERVICE_TOKEN` and `ANTHROPIC_API_KEY`. Start command is already in `riis-ai/railway.json`.

**Database changes:** add a new Flyway file in `riis-backend/src/main/resources/db/migration/` (next number after `V11`). It runs on the next backend start.

**Check a deployment:** open https://dasig-ris.vercel.app and log in with a demo account.

---
