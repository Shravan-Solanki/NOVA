# backend/nodes/evaluator.py
# EvaluatorNode — computes performance metrics for classification or regression models

# TODO: Import from sklearn.metrics:
#   accuracy_score, f1_score, precision_score, recall_score   ← classification
#   mean_squared_error, r2_score, mean_absolute_error          ← regression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, mean_squared_error, r2_score, mean_absolute_error
# TODO: Import numpy as np
import numpy as np
# TODO: Import BaseNode from core.base_node
from core.base_node import BaseNode
# ─── EvaluatorNode CLASS ──────────────────────────────────────────────────────
# TODO: Define class EvaluatorNode(BaseNode):
class EvaluatorNode(BaseNode):
    def execute(self, inputs: dict) -> dict:
        merged_inputs = {}
        for parent_id, parent_output in inputs.items():
            merged_inputs.update(parent_output)
        model  = merged_inputs.get("model")
        X_test = merged_inputs.get("X_test")
        y_test = merged_inputs.get("y_test")

        # BUG FIX 1: use 'is None' — using 'not X_test' crashes on NumPy arrays/DataFrames
        if model is None or X_test is None or y_test is None:
            raise ValueError("Missing model, X_test or y_test")

        y_pred = model.predict(X_test)

        # Detect task type automatically based on whether the model has 'classes_'
        if hasattr(model, 'classes_'):
            taskType = "classification"
        else:
            taskType = "regression"

        metrics = {}
        requested_metrics = self.params.get('metrics') or (
            ['accuracy', 'f1', 'precision', 'recall'] if taskType == "classification" else ['rmse', 'r2', 'mae']
        )

        if taskType == "classification":
            for metric in requested_metrics:
                if metric == 'accuracy':
                    metrics[metric] = accuracy_score(y_test, y_pred)
                elif metric == 'f1':
                    metrics[metric] = f1_score(y_test, y_pred, average='weighted')
                elif metric == 'precision':
                    metrics[metric] = precision_score(y_test, y_pred, average='weighted')
                elif metric == 'recall':
                    metrics[metric] = recall_score(y_test, y_pred, average='weighted')
        else:
            for metric in requested_metrics:
                if metric == 'rmse':
                    metrics[metric] = np.sqrt(mean_squared_error(y_test, y_pred))
                elif metric == 'mae':
                    metrics[metric] = mean_absolute_error(y_test, y_pred)
                elif metric == 'r2':
                    metrics[metric] = r2_score(y_test, y_pred)

        metrics = {k: round(float(v), 4) for k, v in metrics.items()}

        # Extract or infer model name
        model_name = merged_inputs.get("model_name")
        if not model_name and model is not None:
            raw_name = getattr(model, '__class__', type(model)).__name__
            if raw_name == "CalibratedClassifierCV":
                model_name = "SVM"
            elif raw_name.endswith("Classifier"):
                model_name = raw_name[:-10]
            elif raw_name.endswith("Regressor"):
                model_name = raw_name[:-9]
            else:
                model_name = raw_name

        self._result_metadata = {
            "type": "metrics",
            "taskType": taskType,
            "modelName": model_name or "Model",
            **metrics
        }
        return {"metrics": metrics, "y_pred": y_pred, "model": model, "model_name": model_name,
                "X_test": X_test, "y_test": y_test}

    # Expected params:
    #   metrics : list[str] — e.g. ['accuracy', 'f1', 'precision', 'recall'] or ['rmse', 'r2']

    # def execute(self, inputs: dict) -> dict:
    #   Steps:
    #   1. Extract model, X_test, y_test from merged inputs
    #      Raise ValueError if any are missing
    #
    #   2. Generate predictions: y_pred = model.predict(X_test)
    #
    #   3. Detect task type automatically:
    #      - If model has attribute 'classes_': it's a classifier
    #      - Else: it's a regressor
    #
    #   4. Compute requested metrics:
    #      For classifiers (check if metric in params['metrics']):
    #        'accuracy'  → accuracy_score(y_test, y_pred)
    #        'f1'        → f1_score(y_test, y_pred, average='weighted')
    #        'precision' → precision_score(y_test, y_pred, average='weighted')
    #        'recall'    → recall_score(y_test, y_pred, average='weighted')
    #
    #      For regressors:
    #        'rmse' → np.sqrt(mean_squared_error(y_test, y_pred))
    #        'mae'  → mean_absolute_error(y_test, y_pred)
    #        'r2'   → r2_score(y_test, y_pred)
    #
    #   5. Round all metric values to 4 decimal places
    #
    #   6. Set result metadata:
    #      self._result_metadata = {
    #        "type": "metrics",
    #        "taskType": "classification" or "regression",
    #        **computed_metrics_dict   ← e.g. accuracy: 0.95, f1: 0.93
    #      }
    #
    #   7. Return: { "metrics": computed_metrics_dict, "y_pred": y_pred, "model": model,
    #               "X_test": X_test, "y_test": y_test }
    #      (Pass model, X_test, y_test, y_pred through for the ConfusionMatrix node)
