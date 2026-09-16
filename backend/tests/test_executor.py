# backend/tests/test_executor.py
# Unit tests for the GraphExecutor — tests topological sort and node execution

import pytest
from sklearn.datasets import load_iris
import pandas as pd
from core.executor import GraphExecutor, NodeExecutionError

# ─── HELPERS ──────────────────────────────────────────────────────────────────
def make_node(node_id: str, node_type: str, params: dict = None) -> dict:
    """Returns a dict matching the node structure used by GraphExecutor."""
    return {
        "id": node_id,
        "type": node_type,
        "params": params or {}
    }

def make_edge(source: str, target: str) -> dict:
    """Returns a dict representing an edge from source node to target node."""
    return {
        "source": source,
        "target": target
    }

# ─── TESTS ────────────────────────────────────────────────────────────────────

def test_topological_sort_linear():
    """Graph: A → B → C (simple linear chain)"""
    nodes = [
        make_node("A", "dummy"),
        make_node("B", "dummy"),
        make_node("C", "dummy")
    ]
    edges = [
        make_edge("A", "B"),
        make_edge("B", "C")
    ]
    executor = GraphExecutor(nodes, edges)
    order = executor._topological_sort()
    assert order == ["A", "B", "C"]


def test_topological_sort_cycle_raises():
    """Graph: A → B → A (cycle — should raise ValueError)"""
    nodes = [
        make_node("A", "dummy"),
        make_node("B", "dummy")
    ]
    edges = [
        make_edge("A", "B"),
        make_edge("B", "A")
    ]
    executor = GraphExecutor(nodes, edges)
    with pytest.raises(ValueError, match="cycle"):
        executor._topological_sort()


def test_topological_sort_branching():
    """Graph: A → B, A → C, B → D, C → D"""
    nodes = [
        make_node("A", "dummy"),
        make_node("B", "dummy"),
        make_node("C", "dummy"),
        make_node("D", "dummy")
    ]
    edges = [
        make_edge("A", "B"),
        make_edge("A", "C"),
        make_edge("B", "D"),
        make_edge("C", "D")
    ]
    executor = GraphExecutor(nodes, edges)
    order = executor._topological_sort()
    assert order[0] == "A"
    assert order[-1] == "D"
    assert set(order[1:3]) == {"B", "C"}


def test_full_pipeline_iris(tmp_path):
    """
    Integration test: run a complete pipeline on the Iris dataset.
    Pipeline: DataLoader → TrainTestSplit → Scaler → Classifier(DecisionTree) → Evaluator
    """
    # Create temporary CSV file for Iris
    iris = load_iris(as_frame=True)
    df = iris.frame
    csv_file = tmp_path / "iris.csv"
    df.to_csv(csv_file, index=False)

    nodes = [
        make_node("n1", "dataLoader", {"filePath": str(csv_file), "targetColumn": "target"}),
        make_node("n2", "trainTestSplit", {"testSize": 0.2, "randomState": 42}),
        make_node("n3", "scaler", {"scalerType": "StandardScaler"}),
        make_node("n4", "classifier", {"classifierType": "DecisionTree", "randomState": 42}),
        make_node("n5", "evaluator", {"metrics": ["accuracy", "f1"]})
    ]
    edges = [
        make_edge("n1", "n2"),
        make_edge("n2", "n3"),
        make_edge("n3", "n4"),
        make_edge("n4", "n5")
    ]

    executor = GraphExecutor(nodes, edges)
    results = executor.run()

    assert "n5" in results
    evaluator_res = results["n5"]
    assert "accuracy" in evaluator_res
    assert evaluator_res["accuracy"] > 0.85


def test_executor_error_on_missing_input():
    """Try running a Classifier node with no parent DataLoader node."""
    nodes = [
        make_node("clf1", "classifier", {"classifierType": "DecisionTree"})
    ]
    edges = []
    executor = GraphExecutor(nodes, edges)
    with pytest.raises(NodeExecutionError) as exc_info:
        executor.run()

    assert exc_info.value.node_id == "clf1"
    assert exc_info.value.node_type == "classifier"
    assert "ClassifierNode requires X_train and y_train" in str(exc_info.value)
