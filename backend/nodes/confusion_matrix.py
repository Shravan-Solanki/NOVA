# backend/nodes/confusion_matrix.py
# ConfusionMatrixNode — generates a confusion matrix heatmap as a base64 PNG

# TODO: Import from sklearn.metrics: confusion_matrix, ConfusionMatrixDisplay
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from core.base_node import BaseNode

# ─── ConfusionMatrixNode CLASS ────────────────────────────────────────────────
# TODO: Define class ConfusionMatrixNode(BaseNode):
class ConfusionMatrixNode(BaseNode):
    def execute(self, inputs: dict) -> dict:
        merged_inputs = {}
        for parent_id, parent_output in inputs.items():
            merged_inputs.update(parent_output)
        model  = merged_inputs.get("model")
        X_test = merged_inputs.get("X_test")
        y_test = merged_inputs.get("y_test")
        y_pred = merged_inputs.get("y_pred")
        if model is None or X_test is None or y_test is None:
            raise ValueError("Missing model, X_test or y_test")

        if not hasattr(model, 'classes_'):
            raise ValueError("Confusion matrix requires a classification model with classes_")

        if y_pred is None:
            y_pred = model.predict(X_test)

        model_name = merged_inputs.get("model_name")
        if not model_name and model is not None:
            raw_name = getattr(model, '__class__', type(model)).__name__
            if raw_name == "CalibratedClassifierCV":
                model_name = "SVM"
            elif raw_name.endswith("Classifier"):
                model_name = raw_name[:-10]
            else:
                model_name = raw_name

        cm = confusion_matrix(y_test, y_pred)
        fig, ax = plt.subplots(figsize=(6, 5))  # BUG FIX: was plt.subplot() — must be plt.subplots()
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=model.classes_, yticklabels=model.classes_)
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        title = f"Confusion Matrix ({model_name})" if model_name else "Confusion Matrix"
        ax.set_title(title)
        
        imageBase64 = self._fig_to_base64(fig)
        self._result_metadata = {
            "type": "image",
            "imageBase64": imageBase64,
            "modelName": model_name or "Model",
            "title": title
        }
        return {"imageBase64": imageBase64, "model_name": model_name}

    # Expected params: none (uses model, X_test, y_test from parent node)

    # def execute(self, inputs: dict) -> dict:
    #   Steps:
    #   1. Extract model, X_test, y_test from merged inputs
    #      Also try to get y_pred from a parent EvaluatorNode (avoid double prediction)
    #      If y_pred not available: y_pred = model.predict(X_test)
    #
    #   2. Compute confusion matrix:
    #      cm = confusion_matrix(y_test, y_pred)
    #
    #   3. Generate the heatmap figure:
    #      Option A (sklearn built-in):
    #        disp = ConfusionMatrixDisplay(cm, display_labels=model.classes_)
    #        fig, ax = plt.subplots(figsize=(6, 5))
    #        disp.plot(ax=ax, colorbar=False, cmap='Blues')
    #        ax.set_title("Confusion Matrix")
    #
    #      Option B (seaborn heatmap — prettier):
    #        fig, ax = plt.subplots(figsize=(6, 5))
    #        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
    #                    xticklabels=model.classes_, yticklabels=model.classes_)
    #        ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
    #        ax.set_title("Confusion Matrix")
    #
    #   4. Convert figure to base64 PNG:
    #      imageBase64 = self._fig_to_base64(fig)
    #      (Use the helper method defined in BaseNode)
    #
    #   5. Set result metadata:
    #      self._result_metadata = {
    #        "type": "image",
    #        "imageBase64": imageBase64,
    #        "title": "Confusion Matrix"
    #      }
    #
    #   6. Return: { "imageBase64": imageBase64 }
