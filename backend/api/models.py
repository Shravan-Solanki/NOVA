# backend/api/models.py
# FastAPI router for interactive live predictions and multi-format model/code downloads

import io
import zipfile
import joblib
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional

from core.model_store import (
    get_model_bundle,
    clear_model_bundle,
    predict_from_input,
    generate_test_script,
    generate_readme
)
from utils.code_exporter import PythonExporter

router = APIRouter()


@router.post("/clear")
def clear_current_model():
    """Clears the currently cached trained model bundle."""
    clear_model_bundle()
    return {"status": "ok", "message": "Trained model cleared"}


class PredictRequest(BaseModel):
    inputs: Dict[str, Any]


@router.get("/schema")
def get_model_schema():
    """
    Returns metadata about the active trained model, its feature columns,
    sample records from the dataset, and target column name.
    """
    bundle = get_model_bundle()
    if not bundle:
        raise HTTPException(
            status_code=404,
            detail="No trained model available. Please run your pipeline first."
        )

    feature_names = bundle.get("feature_names", [])
    feature_types = bundle.get("feature_types", {})
    sample_records = bundle.get("sample_records", [])

    features = []
    first_sample = sample_records[0] if sample_records else {}
    for col in feature_names:
        features.append({
            "name": col,
            "dtype": feature_types.get(col, "unknown"),
            "defaultValue": first_sample.get(col, "")
        })

    return {
        "modelName": bundle.get("model_name", "Model"),
        "modelType": bundle.get("model_type", "model"),
        "taskType": bundle.get("task_type", "classification"),
        "targetColumn": bundle.get("target_column", "Target"),
        "features": features,
        "sampleRecords": sample_records
    }


@router.post("/predict")
def run_live_prediction(request: PredictRequest):
    """
    Runs live inference for custom user input through the fitted preprocessing pipeline
    and trained model.
    """
    try:
        result = predict_from_input(request.inputs)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@router.get("/download/model")
def download_trained_model():
    """
    Serializes and downloads the trained model bundle as a .joblib file.
    """
    bundle = get_model_bundle()
    if not bundle or "model" not in bundle:
        raise HTTPException(status_code=404, detail="No trained model found to download.")

    model_name = bundle.get("model_name", "model").replace(" ", "_")
    filename = f"{model_name}_trained.joblib"

    # Clean bundle for export (exclude non-serializable graph nodes/edges if any)
    export_bundle = {
        "model": bundle["model"],
        "model_name": bundle.get("model_name"),
        "task_type": bundle.get("task_type"),
        "target_column": bundle.get("target_column"),
        "feature_names": bundle.get("feature_names"),
        "transformers": bundle.get("transformers", [])
    }

    buffer = io.BytesIO()
    joblib.dump(export_bundle, buffer)
    buffer.seek(0)

    return Response(
        content=buffer.getvalue(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/download/train-script")
def download_train_script():
    """
    Generates and downloads the complete standalone Python training code script.
    """
    bundle = get_model_bundle()
    if not bundle:
        raise HTTPException(status_code=404, detail="No trained pipeline found.")

    nodes = bundle.get("nodes", [])
    edges = bundle.get("edges", [])

    exporter = PythonExporter(nodes, edges)
    code = exporter.generate()

    # Append model save snippet to the end of training script
    model_name = bundle.get("model_name", "pipeline").replace(" ", "_")
    trained_filename = f"{model_name}_trained.joblib"
    code += "\n\n# Save trained model to disk\n"
    code += "import joblib\n"
    code += f"joblib.dump({{'model': model, 'feature_names': list(X.columns)}}, '{trained_filename}')\n"
    code += f"print('Trained model successfully saved to {trained_filename}!')\n"

    filename = f"train_{model_name.lower()}.py"

    return Response(
        content=code,
        media_type="text/x-python",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/download/test-script")
def download_test_script():
    """
    Generates and downloads a standalone inference script (test_prediction.py).
    """
    bundle = get_model_bundle()
    if not bundle:
        raise HTTPException(status_code=404, detail="No trained pipeline found.")

    code = generate_test_script(bundle)
    filename = "test_prediction.py"

    return Response(
        content=code,
        media_type="text/x-python",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/download/all")
def download_all_bundle():
    """
    Bundles trained model (.joblib), training script, test prediction script,
    and README.md into a single .zip archive for complete offline deployment.
    """
    bundle = get_model_bundle()
    if not bundle or "model" not in bundle:
        raise HTTPException(status_code=404, detail="No trained model found.")

    model_name = bundle.get("model_name", "model").replace(" ", "_")
    zip_filename = f"{model_name}_package.zip"
    trained_filename = f"{model_name}_trained.joblib"

    # 1. model file
    export_bundle = {
        "model": bundle["model"],
        "model_name": bundle.get("model_name"),
        "task_type": bundle.get("task_type"),
        "target_column": bundle.get("target_column"),
        "feature_names": bundle.get("feature_names"),
        "transformers": bundle.get("transformers", [])
    }
    model_buffer = io.BytesIO()
    joblib.dump(export_bundle, model_buffer)
    model_buffer.seek(0)

    # 2. train_pipeline.py
    nodes = bundle.get("nodes", [])
    edges = bundle.get("edges", [])
    exporter = PythonExporter(nodes, edges)
    train_code = exporter.generate()
    train_code += f"\n\n# Save trained model to disk\nimport joblib\njoblib.dump({{'model': model, 'feature_names': list(X.columns)}}, '{trained_filename}')\nprint('Saved to {trained_filename}!')\n"

    # 3. test_prediction.py
    test_code = generate_test_script(bundle)

    # 4. README.md
    readme_content = generate_readme(bundle)

    # Build ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(trained_filename, model_buffer.getvalue())
        zf.writestr("train_pipeline.py", train_code)
        zf.writestr("test_prediction.py", test_code)
        zf.writestr("README.md", readme_content)

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'}
    )
