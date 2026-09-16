# backend/api/pipeline.py
# FastAPI router — save and load pipeline JSON files to/from disk

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import json

router = APIRouter()

# ─── STORAGE DIRECTORY ───────────────────────────────────────────────────────
PIPELINES_DIR = Path(__file__).resolve().parent.parent / "storage" / "pipelines"
PIPELINES_DIR.mkdir(parents=True, exist_ok=True)

# ─── REQUEST SCHEMAS ─────────────────────────────────────────────────────────
class SavePipelineRequest(BaseModel):
    pipelineName: str
    nodes:        list
    edges:        list

# ─── POST /api/pipelines/save ────────────────────────────────────────────────
@router.post("/pipelines/save")
async def save_pipeline(body: SavePipelineRequest):
    """Saves the current graph (nodes + edges) as a named JSON file."""
    safe_name = body.pipelineName.strip().replace(" ", "_")
    file_path = PIPELINES_DIR / f"{safe_name}.json"

    with open(file_path, "w") as f:
        json.dump(body.model_dump(), f, indent=2)

    return {"success": True, "filePath": str(file_path.resolve())}

# ─── GET /api/pipelines/load ─────────────────────────────────────────────────
@router.get("/pipelines/load")
async def load_pipeline(filePath: str):
    """Loads a saved pipeline JSON file and returns nodes + edges to the frontend."""
    path = Path(filePath)
    if not path.is_absolute():
        path = PIPELINES_DIR / filePath
    if not path.exists() and not str(path).endswith(".json"):
        path = PIPELINES_DIR / f"{filePath}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Pipeline not found: {filePath}")

    try:
        with open(path, "r") as f:
            pipeline = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to read pipeline: {str(e)}")

    return pipeline

# ─── GET /api/pipelines/list ─────────────────────────────────────────────────
@router.get("/pipelines/list")
async def list_pipelines():
    """Lists all saved pipeline files with metadata so the user can load them from the UI."""
    pipelines = []
    for f in PIPELINES_DIR.glob("*.json"):
        try:
            stat = f.stat()
            with open(f, "r") as fp:
                data = json.load(fp)
            pipelines.append({
                "filename": f.name,
                "pipelineName": data.get("pipelineName", f.stem.replace("_", " ")),
                "nodeCount": len(data.get("nodes", [])),
                "edgeCount": len(data.get("edges", [])),
                "filePath": str(f.resolve()),
                "lastModified": stat.st_mtime
            })
        except Exception:
            pipelines.append({
                "filename": f.name,
                "pipelineName": f.stem.replace("_", " "),
                "nodeCount": 0,
                "edgeCount": 0,
                "filePath": str(f.resolve()),
                "lastModified": f.stat().st_mtime
            })
    return {"pipelines": sorted(pipelines, key=lambda x: x["lastModified"], reverse=True)}

# ─── DELETE /api/pipelines/delete ────────────────────────────────────────────
@router.delete("/pipelines/delete")
async def delete_pipeline(filename: str):
    """Deletes a saved pipeline JSON file."""
    path = PIPELINES_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Pipeline not found: {filename}")
    path.unlink()
    return {"success": True, "message": f"Deleted {filename}"}
