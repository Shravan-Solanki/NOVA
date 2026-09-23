# backend/core/model_store.py
# In-memory store and pipeline inference runner for the latest trained model

import os
import io
import zipfile
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional

# Holds the latest trained model bundle from the most recent successful pipeline execution
CURRENT_MODEL_BUNDLE: Optional[Dict[str, Any]] = None


def set_model_bundle(bundle: Optional[Dict[str, Any]]):
    global CURRENT_MODEL_BUNDLE
    CURRENT_MODEL_BUNDLE = bundle


def clear_model_bundle():
    global CURRENT_MODEL_BUNDLE
    CURRENT_MODEL_BUNDLE = None


def get_model_bundle() -> Optional[Dict[str, Any]]:
    return CURRENT_MODEL_BUNDLE


def transform_custom_input(input_dict: Dict[str, Any], bundle: Dict[str, Any]) -> pd.DataFrame:
    """
    Transforms a single user input dictionary through the fitted preprocessing
    pipeline (imputer -> encoder -> scaler) so it can be passed to model.predict().
    """
    feature_names = bundle.get("feature_names", [])
    transformers = bundle.get("transformers", [])

    # Build initial single-row DataFrame using expected feature names
    row_data = {}
    for col in feature_names:
        val = input_dict.get(col)
        # Attempt numeric conversion if possible
        if val is not None and val != "":
            try:
                # If it looks like a number, parse it
                if isinstance(val, (int, float)):
                    row_data[col] = val
                else:
                    float_val = float(val)
                    row_data[col] = int(float_val) if float_val.is_integer() else float_val
            except (ValueError, TypeError):
                row_data[col] = val
        else:
            row_data[col] = np.nan

    df = pd.DataFrame([row_data], columns=feature_names)

    # Sequentially apply each transformer
    for step in transformers:
        stype = step.get("type")
        instance = step.get("instance")
        cols = step.get("columns") or []

        if stype == "imputer" and instance is not None:
            # Impute specified or auto columns
            imp_cols = [c for c in cols if c in df.columns] if cols else [c for c in df.columns if df[c].isnull().any() or c in getattr(instance, 'feature_names_in_', [])]
            if imp_cols:
                try:
                    df[imp_cols] = instance.transform(df[imp_cols])
                except Exception as e:
                    print(f"[ModelStore] Warning during imputer transform: {e}")

        elif stype == "encoder" and (instance is not None or step.get("label_encoders")):
            enc_type = step.get("encoderType", "OneHotEncoder")
            enc_cols = [c for c in cols if c in df.columns] if cols else list(getattr(instance, 'feature_names_in_', []))
            if not enc_cols:
                enc_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
            enc_cols = [c for c in enc_cols if c in df.columns]

            if enc_cols:
                if enc_type == "OneHotEncoder" and instance is not None:
                    try:
                        encoded_arr = instance.transform(df[enc_cols])
                        new_col_names = instance.get_feature_names_out(enc_cols)
                        df = df.drop(columns=enc_cols).reset_index(drop=True)
                        df = pd.concat([df, pd.DataFrame(encoded_arr, columns=new_col_names)], axis=1)
                    except Exception as e:
                        print(f"[ModelStore] Warning during OneHotEncoder transform: {e}")
                elif enc_type == "LabelEncoder":
                    le_map = step.get("label_encoders", {})
                    for col in enc_cols:
                        le = le_map.get(col)
                        if le is not None:
                            df[col] = df[col].astype(str).map(lambda x: le.transform([x])[0] if x in le.classes_ else -1)

        elif stype == "scaler" and instance is not None:
            try:
                scale_cols = cols or getattr(instance, 'feature_names_in_', None)
                if scale_cols is not None:
                    cols_to_scale = [c for c in scale_cols if c in df.columns]
                else:
                    cols_to_scale = df.select_dtypes(include=[np.number]).columns.tolist()
                if cols_to_scale:
                    df[cols_to_scale] = instance.transform(df[cols_to_scale])
            except Exception as e:
                print(f"[ModelStore] Warning during scaler transform: {e}")

    return df


def predict_from_input(input_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Runs live prediction for a custom input using the latest trained model bundle.
    """
    bundle = get_model_bundle()
    if not bundle or "model" not in bundle:
        raise ValueError("No trained model available. Please run your pipeline first.")

    model = bundle["model"]
    task_type = bundle.get("task_type", "classification")

    # Preprocess the input
    X_pred = transform_custom_input(input_dict, bundle)

    # Predict
    raw_pred = model.predict(X_pred)[0]

    # Format prediction value
    if isinstance(raw_pred, (np.floating, float)):
        prediction_val = round(float(raw_pred), 4)
    elif isinstance(raw_pred, (np.integer, int)):
        prediction_val = int(raw_pred)
    else:
        prediction_val = str(raw_pred)

    result = {
        "prediction": prediction_val,
        "taskType": task_type,
        "modelName": bundle.get("model_name", "Model"),
        "targetColumn": bundle.get("target_column", "Target")
    }

    # If classification and model supports probabilities
    if task_type == "classification" and hasattr(model, "predict_proba"):
        try:
            probs = model.predict_proba(X_pred)[0]
            classes = getattr(model, "classes_", [f"Class {i}" for i in range(len(probs))])
            prob_map = {}
            for cls_name, prob in zip(classes, probs):
                prob_map[str(cls_name)] = round(float(prob) * 100, 2)
            result["probabilities"] = prob_map
        except Exception:
            pass

    return result


def generate_test_script(bundle: Dict[str, Any]) -> str:
    """Generates a standalone test / inference python script."""
    raw_model_name = bundle.get("model_name", "TrainedModel")
    clean_model_name = raw_model_name.replace(" ", "_")
    model_filename = f"{clean_model_name}_trained.joblib"
    feature_names = bundle.get("feature_names", [])
    target = bundle.get("target_column", "prediction")
    task_type = bundle.get("task_type", "classification")
    sample_record = bundle.get("sample_records", [{}])[0] if bundle.get("sample_records") else {}

    formatted_sample = ",\n    ".join([f"'{k}': {repr(v)}" for k, v in sample_record.items()])

    return f'''# test_prediction.py
# Standalone inference script for {raw_model_name}
# Automatically generated by FlowML

import os
import glob
import joblib
import pandas as pd
import numpy as np

# 1. Locate and load the trained model bundle
target_file = "{model_filename}"
model_path = None

if os.path.exists(target_file):
    model_path = target_file
elif os.path.exists("model.joblib"):
    model_path = "model.joblib"
else:
    joblib_files = glob.glob("*.joblib")
    if joblib_files:
        model_path = joblib_files[0]

if not model_path:
    raise FileNotFoundError(f"Trained model bundle not found. Looked for '{{target_file}}' and 'model.joblib'. Please ensure the model file is in the current directory.")

print(f"Loading model bundle from {{model_path}}...")
bundle = joblib.load(model_path)
model = bundle["model"]
transformers = bundle.get("transformers", [])
feature_names = bundle.get("feature_names", {repr(feature_names)})
target_name = bundle.get("target_column", "{target}")
task_type = bundle.get("task_type", "{task_type}")

print(f"Loaded {{bundle.get('model_name', '{raw_model_name}')}} successfully.")

# 2. Example test input
test_data = {{
    {formatted_sample}
}}

print("\\nTesting with input:")
for k, v in test_data.items():
    print(f"  {{k}}: {{v}}")

# 3. Preprocess the input
df = pd.DataFrame([test_data], columns=feature_names)

for step in transformers:
    stype = step.get("type")
    instance = step.get("instance")
    cols = step.get("columns") or []

    if stype == "imputer" and instance is not None:
        imp_cols = [c for c in cols if c in df.columns] if cols else [c for c in df.columns if df[c].isnull().any() or c in getattr(instance, 'feature_names_in_', [])]
        if imp_cols:
            try:
                df[imp_cols] = instance.transform(df[imp_cols])
            except Exception as e:
                print(f"Warning during imputer transform: {{e}}")

    elif stype == "encoder" and (instance is not None or step.get("label_encoders")):
        enc_type = step.get("encoderType", "OneHotEncoder")
        enc_cols = [c for c in cols if c in df.columns] if cols else list(getattr(instance, 'feature_names_in_', []))
        if not enc_cols:
            enc_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        enc_cols = [c for c in enc_cols if c in df.columns]

        if enc_cols:
            if enc_type == "OneHotEncoder" and instance is not None:
                try:
                    encoded_arr = instance.transform(df[enc_cols])
                    new_cols = instance.get_feature_names_out(enc_cols)
                    df = df.drop(columns=enc_cols).reset_index(drop=True)
                    df = pd.concat([df, pd.DataFrame(encoded_arr, columns=new_cols)], axis=1)
                except Exception as e:
                    print(f"Warning during OneHotEncoder transform: {{e}}")
            elif enc_type == "LabelEncoder":
                le_map = step.get("label_encoders", {{}})
                for col in enc_cols:
                    le = le_map.get(col)
                    if le is not None:
                        df[col] = df[col].astype(str).map(lambda x: le.transform([x])[0] if x in le.classes_ else -1)

    elif stype == "scaler" and instance is not None:
        try:
            scale_cols = cols or getattr(instance, 'feature_names_in_', None)
            if scale_cols is not None:
                cols_to_scale = [c for c in scale_cols if c in df.columns]
            else:
                cols_to_scale = df.select_dtypes(include=[np.number]).columns.tolist()
            if cols_to_scale:
                df[cols_to_scale] = instance.transform(df[cols_to_scale])
        except Exception as e:
            print(f"Warning during scaler transform: {{e}}")

# 4. Predict
prediction = model.predict(df)[0]
print(f"\\nPrediction for '{{target_name}}': {{prediction}}")

if task_type == "classification" and hasattr(model, "predict_proba"):
    probs = model.predict_proba(df)[0]
    classes = getattr(model, "classes_", [f"Class {{i}}" for i in range(len(probs))])
    print("\\nClass Probabilities:")
    for cls, prob in zip(classes, probs):
        print(f"  {{cls}}: {{prob*100:.2f}}%")
'''


def generate_readme(bundle: Dict[str, Any]) -> str:
    raw_model_name = bundle.get("model_name", "ML Model")
    clean_model_name = raw_model_name.replace(" ", "_")
    model_filename = f"{clean_model_name}_trained.joblib"
    target = bundle.get("target_column", "target")
    task_type = bundle.get("task_type", "classification")

    return f"""# {raw_model_name} Deployment Package
Generated by FlowML Studio.

## Package Contents
1. **`{model_filename}`**: The serialized trained scikit-learn model, including fitted transformers (imputer, encoder, scaler).
2. **`train_pipeline.py`**: Complete Python script to reproduce data loading, preprocessing, and model training from scratch.
3. **`test_prediction.py`**: Ready-to-run inference script showing how to load `{model_filename}` and predict on new samples.

## Requirements
```bash
pip install scikit-learn pandas numpy joblib
```

## Quick Start
To test predictions with the trained model:
```bash
python test_prediction.py
```

To re-train the pipeline from scratch:
```bash
python train_pipeline.py
```
"""
