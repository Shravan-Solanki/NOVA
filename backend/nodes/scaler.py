# backend/nodes/scaler.py
# ScalerNode — applies feature scaling to X_train and X_test
# Fits ONLY on training data (to prevent data leakage), then transforms both sets

import pandas as pd
import numpy as np
# TODO: Import from sklearn.preprocessing: StandardScaler, MinMaxScaler
from sklearn.preprocessing import StandardScaler, MinMaxScaler
# TODO: Import BaseNode from core.base_node
from core.base_node import BaseNode

# ─── ScalerNode CLASS ─────────────────────────────────────────────────────────
class ScalerNode(BaseNode):
    # Expected params:
    #   scalerType : str — 'StandardScaler' or 'MinMaxScaler'

    def execute(self, inputs: dict) -> dict:
        merged_inputs = {}
        for parent_id, parent_output in inputs.items():
            merged_inputs.update(parent_output)
        X_train = merged_inputs.get("X_train")
        X_test = merged_inputs.get("X_test")
        y_train = merged_inputs.get("y_train")
        y_test = merged_inputs.get("y_test")

        if X_train is None:
            if "X" in merged_inputs:
                X_train = merged_inputs["X"]
            else:
                raise ValueError("Missing X_train or X in ScalerNode inputs")

        scalerType = self.params.get("scalerType", "StandardScaler")
        if scalerType == "StandardScaler":
            scaler = StandardScaler()
        elif scalerType == "MinMaxScaler":
            scaler = MinMaxScaler()
        else:
            raise ValueError(f"Unknown scaler type: {scalerType}")

        # Ensure inputs are DataFrames to preserve feature names and allow type filtering
        if not isinstance(X_train, pd.DataFrame):
            X_train = pd.DataFrame(X_train)
        if X_test is not None and not isinstance(X_test, pd.DataFrame):
            X_test = pd.DataFrame(X_test, columns=X_train.columns)

        # Scale only numeric columns to prevent string conversion errors with categoricals
        num_cols = X_train.select_dtypes(include=[np.number]).columns.tolist()
        if num_cols:
            scaler.fit(X_train[num_cols])
            X_train_scaled = X_train.copy()
            X_train_scaled[num_cols] = scaler.transform(X_train[num_cols])

            if X_test is not None:
                X_test_scaled = X_test.copy()
                X_test_scaled[num_cols] = scaler.transform(X_test[num_cols])
            else:
                X_test_scaled = None
        else:
            X_train_scaled = X_train
            X_test_scaled = X_test

        self._result_metadata = {
            "type": "info",
            "scalerType": scalerType,
            "scaledColumns": num_cols
        }
        return {
            "X_train": X_train_scaled,
            "X_test": X_test_scaled,
            "y_train": y_train,
            "y_test": y_test,
            "scaler": scaler,
            "columns": num_cols
        }
    # def execute(self, inputs: dict) -> dict:
    #   Steps:
    #   1. Merge all parent outputs into a single dict (same pattern as TrainTestSplit)
    #      Extract: X_train, X_test, y_train, y_test
    #
    #   2. Select the scaler class based on params['scalerType']:
    #      if scalerType == 'StandardScaler': scaler = StandardScaler()
    #      elif scalerType == 'MinMaxScaler': scaler = MinMaxScaler()
    #      else: raise ValueError(f"Unknown scaler type: {scalerType}")
    #
    #   3. Fit on training data ONLY, then transform both:
    #      X_train_scaled = scaler.fit_transform(X_train)
    #      X_test_scaled  = scaler.transform(X_test)
    #      ← CRITICAL: never fit on X_test — that would be data leakage!
    #
    #   4. Set result metadata:
    #      self._result_metadata = { "type": "info", "scalerType": scalerType }
    #
    #   5. Return:
    #      { "X_train": X_train_scaled, "X_test": X_test_scaled,
    #        "y_train": y_train, "y_test": y_test, "scaler": scaler }
    #      (Pass y_train and y_test through unchanged; store scaler for potential inverse_transform)
