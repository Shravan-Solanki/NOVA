# backend/nodes/classifier.py
# ClassifierNode — trains a classification model on X_train, y_train

# TODO: Import from sklearn.tree: DecisionTreeClassifier
from sklearn.tree import DecisionTreeClassifier
# TODO: Import from sklearn.svm: SVC
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV  # needed for SVM probability scores
# TODO: Import from sklearn.neighbors: KNeighborsClassifier
from sklearn.neighbors import KNeighborsClassifier
# TODO: Import from sklearn.linear_model: LogisticRegression
from sklearn.linear_model import LogisticRegression
# TODO: Import BaseNode from core.base_node
from core.base_node import BaseNode

# ─── CLASSIFIER FACTORY ───────────────────────────────────────────────────────
# TODO: Define a helper function _build_classifier(classifierType: str, params: dict):
#   Returns an initialized sklearn classifier object based on classifierType:
#
def _build_classifier(classifierType: str, params: dict):
    if classifierType == "DecisionTree":
        return DecisionTreeClassifier(
            max_depth    = params.get('max_depth', None),
            criterion    = params.get('criterion', 'gini'),
            random_state = params.get('randomState', 42)
        )
    elif classifierType == "SVM":
        # CalibratedClassifierCV wraps SVC to provide predict_proba()
        # (sklearn 1.9+ deprecated probability=True directly on SVC)
        base_svc = SVC(
            C      = params.get('C', 1.0),
            kernel = params.get('kernel', 'rbf'),
        )
        return CalibratedClassifierCV(base_svc, ensemble=False)
    elif classifierType == "KNN":
        return KNeighborsClassifier(
            n_neighbors = params.get('n_neighbors', 5),
            metric      = params.get('metric', 'minkowski')
        )
    elif classifierType == "LogisticRegression":
        return LogisticRegression(
            C        = params.get('C', 1.0),
            max_iter = params.get('max_iter', 200),
            random_state = params.get('randomState', 42)
        )
    else:
        raise ValueError(f"Unknown classifier type: {classifierType}")
#   'DecisionTree':
#     DecisionTreeClassifier(
#       max_depth  = params.get('max_depth', None),
#       criterion  = params.get('criterion', 'gini'),
#       random_state = params.get('randomState', 42)
#     )
#
#   'SVM':
#     SVC(
#       C      = params.get('C', 1.0),
#       kernel = params.get('kernel', 'rbf'),
#       probability = True    ← needed if you want predict_proba later
#     )
#
#   'KNN':
#     KNeighborsClassifier(
#       n_neighbors = params.get('n_neighbors', 5),
#       metric      = params.get('metric', 'minkowski')
#     )
#
#   'LogisticRegression':
#     LogisticRegression(
#       C        = params.get('C', 1.0),
#       max_iter = params.get('max_iter', 200),
#       random_state = params.get('randomState', 42)
#     )
#
#   else: raise ValueError(f"Unknown classifier type: {classifierType}")

# ─── ClassifierNode CLASS ─────────────────────────────────────────────────────
# TODO: Define class ClassifierNode(BaseNode):

class ClassifierNode(BaseNode):
    
    def execute(self, inputs: dict) -> dict:
        merged_inputs = {}
        for parent_id, parent_output in inputs.items():
            merged_inputs.update(parent_output)
        
        X_train = merged_inputs.get("X_train")
        X_test = merged_inputs.get("X_test")
        y_train = merged_inputs.get("y_train")
        y_test = merged_inputs.get("y_test")

        if X_train is None or y_train is None:
            raise ValueError("ClassifierNode requires X_train and y_train in inputs")

        clf_type = self.params.get("classifierType", "DecisionTree")
        clf = _build_classifier(clf_type, self.params)

        clf.fit(X_train, y_train)

        self._result_metadata = {
            "type": "info",
            "classifierType": clf_type,
            "modelName": clf_type,
            "classes": clf.classes_.tolist()
        }

        return {"model": clf, "model_name": clf_type, "X_test": X_test, "y_test": y_test}

    # Expected params:
    #   classifierType : str — 'DecisionTree' | 'SVM' | 'KNN' | 'LogisticRegression'
    #   + algorithm-specific params (max_depth, C, kernel, n_neighbors, etc.)

    # def execute(self, inputs: dict) -> dict:
    #   Steps:
    #   1. Extract X_train, X_test, y_train, y_test from merged inputs
    #
    #   2. Build the classifier: clf = _build_classifier(params['classifierType'], params)
    #
    #   3. Train: clf.fit(X_train, y_train)
    #
    #   4. Set result metadata:
    #      self._result_metadata = {
    #        "type": "info",
    #        "classifierType": params['classifierType'],
    #        "classes": clf.classes_.tolist()
    #      }
    #
    #   5. Return:
    #      { "model": clf, "X_test": X_test, "y_test": y_test }
    #      (Pass X_test and y_test through for the Evaluator node)
