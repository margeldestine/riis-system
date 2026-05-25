from fastapi import FastAPI
from routers import keybert_router, sbert_router

app = FastAPI(
    title="DASIG AI Microservice",
    description="AI inference engine for DASIG Research Information System",
    version="1.0.0"
)

app.include_router(keybert_router.router)
app.include_router(sbert_router.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "riis-ai"}

from routers import specter_router
app.include_router(specter_router.router)