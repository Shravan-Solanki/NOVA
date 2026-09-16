# backend/main.py
# FastAPI application entry point — creates the app, registers routers, sets up CORS

# TODO: Import FastAPI from fastapi
from fastapi import FastAPI
# TODO: Import CORSMiddleware from fastapi.middleware.cors
from fastapi.middleware.cors import CORSMiddleware
# TODO: Import your route routers:
from api.upload   import router as upload_router
from api.execute  import router as execute_router
from api.pipeline import router as pipeline_router
from api.export   import router as export_router
from api.models   import router as models_router

# ─── APP CREATION ─────────────────────────────────────────────────────────────
# TODO: Create the FastAPI app:
app = FastAPI(
    title="NOVA",
    description="Backend execution engine for the Visual ML Pipeline Builder",
    version="1.0.0"
)

# ─── CORS MIDDLEWARE ──────────────────────────────────────────────────────────
# TODO: Add CORSMiddleware to app:
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
#   This is needed so the browser doesn't block cross-origin requests to the API

# ─── REGISTER ROUTERS ─────────────────────────────────────────────────────────
# TODO: Mount each router with its prefix:
app.include_router(upload_router,   prefix="/api")
app.include_router(execute_router,  prefix="/api")
app.include_router(pipeline_router, prefix="/api")
app.include_router(export_router,   prefix="/api")
app.include_router(models_router,   prefix="/api/models")

# ─── ROOT HEALTH CHECK ────────────────────────────────────────────────────────
# TODO: Add a GET "/" route that returns { "status": "ok", "message": "FlowML API is running" }
#   Useful to quickly verify the server is up

@app.get("/")
async def root():
    return { "status": "ok", "message": "NOVA API is running" }

# ─── ENTRY POINT ──────────────────────────────────────────────────────────────
# TODO: Add the standard Python __main__ block:
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)
