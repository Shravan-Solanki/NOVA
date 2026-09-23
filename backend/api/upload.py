# backend/api/upload.py
# FastAPI router — handles CSV file upload from the frontend

from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
from pathlib import Path
import aiofiles
import pandas as pd
import os

router = APIRouter()

# ─── UPLOAD DIRECTORY ────────────────────────────────────────────────────────
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "storage" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ─── POST /api/upload ────────────────────────────────────────────────────────
@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    """
    Accepts a CSV file from the React frontend drag-and-drop or file picker.
    Saves it to disk and returns column names + a preview for the ConfigPanel.
    """
    # Step 1: Validate file extension
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    # Step 2: Build a safe destination path
    dest_path = UPLOAD_DIR / file.filename

    # Step 3: Save the file to disk asynchronously
    content = await file.read()
    async with aiofiles.open(dest_path, "wb") as out_file:
        await out_file.write(content)

    # Step 4: Read back with pandas to extract column info and preview
    try:
        df = pd.read_csv(dest_path)
    except Exception as e:
        os.remove(dest_path)
        raise HTTPException(status_code=422, detail=f"Could not parse CSV: {str(e)}")

    return {
        "filePath": str(dest_path.resolve()),   # Absolute path — passed to DataLoaderNode params
        "columns":  df.columns.tolist(),
        "shape":    list(df.shape),             # [n_rows, n_cols]
        "preview":  df.head(5).to_dict(orient="records")  # First 5 rows for display
    }

# ─── GET /api/uploads/list ───────────────────────────────────────────────────
@router.get("/uploads/list")
async def list_uploads():
    """Lists all previously uploaded CSV datasets with basic metadata."""
    files = []
    for p in UPLOAD_DIR.glob("*.csv"):
        try:
            stat = p.stat()
            df = pd.read_csv(p, nrows=2)
            with open(p, 'rb') as f:
                row_count = sum(1 for _ in f) - 1
            files.append({
                "filename": p.name,
                "filePath": str(p.resolve()),
                "sizeBytes": stat.st_size,
                "rows": max(0, row_count),
                "cols": len(df.columns),
                "columns": df.columns.tolist()
            })
        except Exception:
            files.append({
                "filename": p.name,
                "filePath": str(p.resolve()),
                "sizeBytes": p.stat().st_size,
                "rows": None,
                "cols": None,
                "columns": []
            })
    return {"datasets": sorted(files, key=lambda x: x["filename"].lower())}

# ─── GET /api/uploads/select ─────────────────────────────────────────────────
@router.get("/uploads/select")
async def select_uploaded_csv(filename: str):
    """Loads a previously uploaded CSV file by name and returns full info and preview."""
    path = Path(filename)
    if not path.is_absolute():
        path = UPLOAD_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"File not found in uploads: {filename}")

    try:
        df = pd.read_csv(path)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse CSV: {str(e)}")

    return {
        "filePath": str(path.resolve()),
        "columns":  df.columns.tolist(),
        "shape":    list(df.shape),
        "preview":  df.head(5).to_dict(orient="records")
    }

# ─── DELETE /api/uploads/delete ──────────────────────────────────────────────
@router.delete("/uploads/delete")
async def delete_uploaded_csv(filename: str):
    """Deletes an uploaded CSV dataset file from storage/uploads."""
    clean_name = Path(filename).name
    if not clean_name.endswith(".csv"):
        clean_name += ".csv"
    path = UPLOAD_DIR / clean_name
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {clean_name}")

    try:
        path.unlink()
        return {"success": True, "message": f"Deleted {clean_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

# ─── GET /api/uploads/preview ────────────────────────────────────────────────
@router.get("/uploads/preview")
async def preview_uploaded_csv(
    filePath: Optional[str] = None,
    filename: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """
    Returns paginated rows, data types, and summary statistics of a CSV dataset
    so the user can inspect the data directly in the browser.
    """
    if filePath:
        path = Path(filePath)
    elif filename:
        path = UPLOAD_DIR / filename
    else:
        raise HTTPException(status_code=400, detail="Must provide filePath or filename")

    if not path.is_absolute():
        path = UPLOAD_DIR / path
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {path}")

    try:
        df = pd.read_csv(path)
        total_rows, total_cols = df.shape

        # Compute column-level statistics
        col_stats = []
        for col in df.columns:
            series = df[col]
            null_count = int(series.isnull().sum())
            is_numeric = pd.api.types.is_numeric_dtype(series)
            stat = {
                "name": col,
                "type": str(series.dtype),
                "nullCount": null_count,
                "nullPct": round((null_count / total_rows * 100), 1) if total_rows > 0 else 0,
                "uniqueCount": int(series.nunique()),
            }
            if is_numeric:
                clean_s = series.dropna()
                if len(clean_s) > 0:
                    stat["min"] = round(float(clean_s.min()), 3)
                    stat["max"] = round(float(clean_s.max()), 3)
                    stat["mean"] = round(float(clean_s.mean()), 3)
                # For low-cardinality numeric (e.g. target classes as numbers), include value counts
                if series.nunique() <= 20:
                    vc = series.value_counts().head(20).to_dict()
                    stat["valueCounts"] = {str(k): int(v) for k, v in vc.items()}
            else:
                top_vals = series.value_counts().head(3).to_dict()
                stat["topValues"] = [f"{k} ({v})" for k, v in top_vals.items()]
                # Include full value counts for analytics tab (up to 20 unique values)
                if series.nunique() <= 20:
                    vc = series.value_counts().head(20).to_dict()
                    stat["valueCounts"] = {str(k): int(v) for k, v in vc.items()}
            col_stats.append(stat)

        # Pagination for rows
        page = max(1, page)
        limit = max(1, min(100, limit))
        start = (page - 1) * limit
        end = start + limit
        paged_df = df.iloc[start:end]

        # Replace NaN / inf with None or "" for clean JSON serialization
        clean_records = paged_df.fillna("").to_dict(orient="records")

        return {
            "filename": path.name,
            "filePath": str(path.resolve()),
            "totalRows": total_rows,
            "totalCols": total_cols,
            "columns": df.columns.tolist(),
            "colStats": col_stats,
            "rows": clean_records,
            "page": page,
            "limit": limit,
            "totalPages": max(1, (total_rows + limit - 1) // limit)
        }
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to read CSV: {str(e)}")



