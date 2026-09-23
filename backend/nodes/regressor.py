# backend/nodes/regressor.py
# RegressorNode — trains a regression model on X_train, y_train

# TODO: Import from sklearn.linear_model: LinearRegression, Ridge
from sklearn.linear_model import LinearRegression, Ridge, Lasso
# TODO: Import BaseNode from core.base_node
from core.base_node import BaseNode
# ─── REGRESSOR FACTORY ────────────────────────────────────────────────────────
# TODO: Define helper function _build_regressor(regressorType: str, params: dict):
def _build_regressor(regressorType: str, params: dict):
    if regressorType == 'LinearRegression':
        return LinearRegression()
    elif regressorType == 'Ridge':
        return Ridge(alpha=params.get('alpha', 1.0))
    elif regressorType == 'Lasso':
        return Lasso(alpha=params.get('alpha', 1.0))
    else:
        raise ValueError(f"Unknown regressor type: {regressorType}")
#   'LinearRegression':
#     LinearRegression()   ← no hyperparameters needed
#
#   'Ridge':
#     Ridge(alpha=params.get('alpha', 1.0))
#
#   else: raise ValueError(f"Unknown regressor type: {regressorType}")

# ─── RegressorNode CLASS ──────────────────────────────────────────────────────
# TODO: Define class RegressorNode(BaseNode):
class RegressorNode(BaseNode):
    def execute(self,inputs: dict) -> dict:
        merged_inputs = {}
        for parent_id, parent_output in inputs.items():
            merged_inputs.update(parent_output)
        X_train = merged_inputs.get("X_train")
        X_test = merged_inputs.get("X_test")
        y_train = merged_inputs.get("y_train")
        y_test = merged_inputs.get("y_test")

        if X_train is None or y_train is None:
            raise ValueError("RegressorNode requires X_train and y_train in inputs")

        reg_type = self.params.get('regressorType', 'LinearRegression')
        reg = _build_regressor(reg_type, self.params)
        reg.fit(X_train, y_train)
        self._result_metadata = {
            "type": "info",
            "regressorType": reg_type,
            "modelName": reg_type
        }
        return {"model": reg, "model_name": reg_type, "X_train": X_train, "y_train": y_train, "X_test": X_test, "y_test": y_test}
    # Expected params:
    #   regressorType : str   — 'LinearRegression' or 'Ridge'
    #   alpha         : float — regularization strength (Ridge only)

    # def execute(self, inputs: dict) -> dict:
    #   Steps:
    #   1. Extract X_train, X_test, y_train, y_test from merged inputs
    #
    #   2. Build the regressor: reg = _build_regressor(params['regressorType'], params)
    #
    #   3. Train: reg.fit(X_train, y_train)
    #
    #   4. Set result metadata:
    #      self._result_metadata = {
    #        "type": "info",
    #        "regressorType": params['regressorType']
    #      }
    #
    #   5. Return:
    #      { "model": reg, "X_test": X_test, "y_test": y_test }
