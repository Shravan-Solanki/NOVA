# backend/api/export.py
# FastAPI router — generates a Python script from the visual pipeline graph
# This is the "killer feature" that bridges no-code and real ML engineering

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.code_exporter import PythonExporter

router = APIRouter()

# ─── REQUEST SCHEMA ──────────────────────────────────────────────────────────
class ExportRequest(BaseModel):
    nodes:        list
    edges:        list
    pipelineName: str = "pipeline"

# ─── POST /api/export/python ─────────────────────────────────────────────────
@router.post("/export/python")
async def export_python(body: ExportRequest):
    """
    Generates a standalone, executable scikit-learn Python script from the graph.
    The frontend receives the code string and triggers a .py file download.
    """
    try:
        exporter = PythonExporter(nodes=body.nodes, edges=body.edges)
        code     = exporter.generate()
        return {
            "code":     code,
            "filename": f"{body.pipelineName.replace(' ', '_')}.py"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
