# backend/nodes/train_test_split.py
# TrainTestSplitNode — splits X and y into train and test sets

# TODO: Import from sklearn.model_selection: train_test_split
from sklearn.model_selection import train_test_split
# TODO: Import BaseNode from core.base_node
from core.base_node import BaseNode
# ─── TrainTestSplitNode CLASS ─────────────────────────────────────────────────
# TODO: Define class TrainTestSplitNode(BaseNode):
class TrainTestSplitNode(BaseNode):
    # No __init__ needed — BaseNode.__init__ already handles self.params and self._result_metadata
    # Expected params:
    #   testSize    : float — proportion for test set (e.g. 0.2 = 20%)
    #   randomState : int   — seed for reproducibility (e.g. 42)
    #   shuffle     : bool  — whether to shuffle before splitting
    def execute(self, inputs: dict) -> dict:
        merged_inputs = {}
        for parent_id, parent_output in inputs.items():
            merged_inputs.update(parent_output)
        X=merged_inputs.get("X")
        y=merged_inputs.get("y")
        if X is None or y is None:
            raise ValueError("Missing X or y")
        X_train,X_test,y_train,y_test=train_test_split(
            X,y,
            test_size=self.params.get("testSize",0.2),
            random_state=self.params.get("randomState",42),
            shuffle=self.params.get("shuffle",True)
        )
        self._result_metadata={
            "type":"info",
            "train_size":len(X_train),
            "test_size":len(X_test)
        }
        return {"X_train":X_train,"X_test":X_test,"y_train":y_train,"y_test":y_test}
    # def execute(self, inputs: dict) -> dict:
    #   Steps:
    #   1. Extract X and y from inputs:
    #      Look through all parent node outputs for keys 'X' and 'y'
    #      Tip: merge all parent output dicts then access X = merged['X'], y = merged['y']
    #
    #   2. Validate X and y are not None
    #
    #   3. Call sklearn's train_test_split:
    #      X_train, X_test, y_train, y_test = train_test_split(
    #        X, y,
    #        test_size    = params['testSize'],
    #        random_state = params['randomState'],
    #        shuffle      = params['shuffle']
    #      )
    #
    #   4. Set result metadata:
    #      self._result_metadata = {
    #        "type": "info",
    #        "train_size": len(X_train),
    #        "test_size": len(X_test)
    #      }
    #
    #   5. Return { "X_train": X_train, "X_test": X_test, "y_train": y_train, "y_test": y_test }
