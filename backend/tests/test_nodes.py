# backend/tests/test_nodes.py
# Unit tests for individual ML node classes

import pytest
import numpy as np
import pandas as pd
from sklearn.datasets import load_iris, load_diabetes
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LinearRegression

from nodes.data_loader import DataLoaderNode
from nodes.scaler import ScalerNode
from nodes.classifier import ClassifierNode
from nodes.evaluator import EvaluatorNode
from nodes.confusion_matrix import ConfusionMatrixNode

# ─── SHARED FIXTURE ───────────────────────────────────────────────────────────
@pytest.fixture
def iris_split():
    """
    Loads the Iris dataset, splits it into train/test, and returns inputs dictionary.
    """
    iris = load_iris(as_frame=True)
    X = iris.data
    y = iris.target
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    return {
        "parent-1": {
            "X_train": X_train,
            "X_test": X_test,
            "y_train": y_train,
            "y_test": y_test
        }
    }

# ─── DataLoaderNode TESTS ─────────────────────────────────────────────────────
def test_data_loader_valid_csv(tmp_path):
    """Create a simple CSV in tmp_path, run DataLoaderNode, assert X and y are returned."""
    df = pd.DataFrame({
        "feature1": [1.0, 2.0, 3.0, 4.0],
        "feature2": [10, 20, 30, 40],
        "target": [0, 1, 0, 1]
    })
    csv_path = tmp_path / "sample.csv"
    df.to_csv(csv_path, index=False)

    node = DataLoaderNode(params={"filePath": str(csv_path), "targetColumn": "target"})
    output = node.execute(inputs={})

    assert "X" in output
    assert "y" in output
    assert len(output["X"]) == 4
    assert list(output["X"].columns) == ["feature1", "feature2"]
    assert list(output["y"]) == [0, 1, 0, 1]
    assert node.get_result_metadata()["shape"] == [4, 3]


def test_data_loader_missing_file():
    """Pass a non-existent file path, assert ValueError is raised."""
    node = DataLoaderNode(params={"filePath": "non_existent_file.csv", "targetColumn": "target"})
    with pytest.raises(ValueError, match="not found"):
        node.execute(inputs={})


def test_data_loader_invalid_target_column(tmp_path):
    """Pass a CSV but a column name that doesn't exist, assert ValueError."""
    df = pd.DataFrame({"colA": [1, 2], "colB": [3, 4]})
    csv_path = tmp_path / "test.csv"
    df.to_csv(csv_path, index=False)

    node = DataLoaderNode(params={"filePath": str(csv_path), "targetColumn": "invalid_column"})
    with pytest.raises(ValueError, match="not found in CSV"):
        node.execute(inputs={})

# ─── ScalerNode TESTS ────────────────────────────────────────────────────────
def test_standard_scaler(iris_split):
    """Run ScalerNode with StandardScaler, check shape and mean ≈ 0, std ≈ 1 on X_train."""
    node = ScalerNode(params={"scalerType": "StandardScaler"})
    output = node.execute(inputs=iris_split)

    assert "X_train" in output
    assert "X_test" in output
    X_train_scaled = output["X_train"]
    assert X_train_scaled.shape == iris_split["parent-1"]["X_train"].shape
    # Check mean is close to 0 and std is close to 1
    assert np.allclose(np.mean(X_train_scaled, axis=0), 0, atol=1e-2)
    assert np.allclose(np.std(X_train_scaled, axis=0), 1, atol=1e-2)


def test_minmax_scaler(iris_split):
    """Assert all values in X_train_scaled are in range [0, 1]."""
    node = ScalerNode(params={"scalerType": "MinMaxScaler"})
    output = node.execute(inputs=iris_split)

    X_train_scaled = output["X_train"]
    assert np.all(X_train_scaled >= -1e-6)
    assert np.all(X_train_scaled <= 1.0 + 1e-6)

# ─── ClassifierNode TESTS ────────────────────────────────────────────────────
def test_decision_tree_classifier(iris_split):
    """Assert model is returned and model.predict(X_test) works without error."""
    node = ClassifierNode(params={"classifierType": "DecisionTree", "randomState": 42})
    output = node.execute(inputs=iris_split)

    assert "model" in output
    model = output["model"]
    X_test = output["X_test"]
    predictions = model.predict(X_test)
    assert len(predictions) == len(X_test)


def test_svm_classifier(iris_split):
    """Assert SVC trains successfully and returns a model."""
    node = ClassifierNode(params={"classifierType": "SVM", "C": 1.0, "kernel": "rbf"})
    output = node.execute(inputs=iris_split)

    assert "model" in output
    model = output["model"]
    predictions = model.predict(output["X_test"])
    assert len(predictions) == len(output["X_test"])


def test_unknown_classifier_raises(iris_split):
    """Pass classifierType='XYZRandomClassifier', assert ValueError is raised."""
    node = ClassifierNode(params={"classifierType": "XYZRandomClassifier"})
    with pytest.raises(ValueError, match="Unknown classifier type"):
        node.execute(inputs=iris_split)

# ─── EvaluatorNode TESTS ─────────────────────────────────────────────────────
def test_evaluator_classification(iris_split):
    """Train a DecisionTreeClassifier, pass model + X_test + y_test to EvaluatorNode."""
    clf = DecisionTreeClassifier(random_state=42)
    clf.fit(iris_split["parent-1"]["X_train"], iris_split["parent-1"]["y_train"])

    eval_inputs = {
        "clf-node": {
            "model": clf,
            "X_test": iris_split["parent-1"]["X_test"],
            "y_test": iris_split["parent-1"]["y_test"]
        }
    }
    node = EvaluatorNode(params={"metrics": ["accuracy", "f1"]})
    output = node.execute(inputs=eval_inputs)

    metadata = node.get_result_metadata()
    assert metadata["type"] == "metrics"
    assert "accuracy" in metadata
    assert 0.0 <= metadata["accuracy"] <= 1.0
    assert "f1" in metadata


def test_evaluator_regression():
    """Use load_diabetes(), train LinearRegression, run EvaluatorNode with 'rmse' and 'r2'."""
    diabetes = load_diabetes(as_frame=True)
    X = diabetes.data
    y = diabetes.target
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    reg = LinearRegression()
    reg.fit(X_train, y_train)

    eval_inputs = {
        "reg-node": {
            "model": reg,
            "X_test": X_test,
            "y_test": y_test
        }
    }
    node = EvaluatorNode(params={"metrics": ["rmse", "r2"]})
    output = node.execute(inputs=eval_inputs)

    metadata = node.get_result_metadata()
    assert metadata["type"] == "metrics"
    assert "r2" in metadata
    assert metadata["r2"] > 0
    assert "rmse" in metadata

# ─── ConfusionMatrixNode TESTS ────────────────────────────────────────────────
def test_confusion_matrix_returns_base64(iris_split):
    """Train a classifier, run ConfusionMatrixNode, assert base64 string."""
    clf = DecisionTreeClassifier(random_state=42)
    clf.fit(iris_split["parent-1"]["X_train"], iris_split["parent-1"]["y_train"])

    cm_inputs = {
        "clf-node": {
            "model": clf,
            "X_test": iris_split["parent-1"]["X_test"],
            "y_test": iris_split["parent-1"]["y_test"]
        }
    }
    node = ConfusionMatrixNode(params={})
    output = node.execute(inputs=cm_inputs)

    assert "imageBase64" in output
    b64_str = output["imageBase64"]
    assert isinstance(b64_str, str)
    assert len(b64_str) > 50  # Valid non-empty PNG base64 string
    assert node.get_result_metadata()["imageBase64"] == b64_str
