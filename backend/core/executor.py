# backend/core/executor.py
# The heart of the backend — parses the graph and executes nodes in topological order
# This is the most complex and important file in the entire project

from nodes import NODE_REGISTRY
from collections import defaultdict, deque
from typing import List, Dict, Any
import pandas as pd
from core.model_store import set_model_bundle, clear_model_bundle


# ─── Custom Exception ─────────────────────────────────────────────────────────
class NodeExecutionError(Exception):
    """Raised when a specific node fails during execution."""
    def __init__(self, node_id: str, node_type: str, message: str):
        self.node_id   = node_id
        self.node_type = node_type
        self.message   = message
        super().__init__(f"Node '{node_id}' ({node_type}) failed: {message}")


# ─── GraphExecutor CLASS ──────────────────────────────────────────────────────
class GraphExecutor:

    def __init__(self, nodes: list, edges: list):
        # nodes → list of dicts: [{ "id": "node-1", "type": "dataLoader", "params": {...} }, ...]
        # edges → list of dicts: [{ "source": "node-1", "target": "node-2" }, ...]
        self.nodes      = nodes
        self.edges      = edges
        # O(1) lookup by node ID
        self.nodes_dict = {node["id"]: node for node in nodes}

    # ── TOPOLOGICAL SORT (Kahn's Algorithm) ──────────────────────────────────
    def _topological_sort(self) -> List[str]:
        """Returns node IDs in safe execution order (all parents before their children)."""

        # Step 1: Build adjacency list and in-degree count
        graph     = defaultdict(list)           # graph["node-1"] = ["node-2", "node-3"]
        in_degree = {node["id"]: 0 for node in self.nodes}

        for edge in self.edges:
            src = edge["source"]
            tgt = edge["target"]
            graph[src].append(tgt)
            in_degree[tgt] += 1                 # tgt has one more incoming edge

        # Step 2: Start with all nodes that have no incoming edges (root nodes)
        queue = deque([nid for nid, deg in in_degree.items() if deg == 0])

        order = []
        while queue:
            node_id = queue.popleft()
            order.append(node_id)

            # Reduce in-degree of all downstream neighbors
            for neighbor in graph[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)      # This neighbor is now ready to execute

        # Cycle detection — if we didn't process all nodes, there is a cycle in the graph
        if len(order) != len(self.nodes):
            raise ValueError("Graph contains a cycle — pipeline cannot be executed.")

        return order

    # ── MAIN EXECUTION METHOD ─────────────────────────────────────────────────
    def run(self) -> Dict[str, Any]:
        """
        Executes all nodes in topological order.
        Returns a dict keyed by node ID containing each node's result metadata.
        This is what gets serialized and sent back to the React frontend.
        """
        # Step 1: Get the safe execution order using Kahn's algorithm
        execution_order = self._topological_sort()

        # If this pipeline does not contain any model node, clear any stale cached model
        has_model = any(n.get("type") in ("classifier", "regressor") for n in self.nodes)
        if not has_model:
            clear_model_bundle()

        node_outputs = {}   # { "node-1": { "X": ..., "y": ... } }  — passed between nodes
        node_results = {}   # { "node-1": { "type": "info", ... } }  — returned to frontend

        # Step 2: Execute each node in order
        for node_id in execution_order:
            node_data = self.nodes_dict[node_id]
            node_type = node_data.get("type")
            params    = node_data.get("params", {})

            # Step 2a: Gather outputs from all parent nodes as inputs to this node
            # inputs = { "parent-id": { parent's output dict } }
            inputs = {}
            for edge in self.edges:
                if edge["target"] == node_id:
                    parent_id = edge["source"]
                    if parent_id in node_outputs:
                        inputs[parent_id] = node_outputs[parent_id]

            # Step 2b: Look up the correct Python class in the registry
            if node_type not in NODE_REGISTRY:
                raise NodeExecutionError(node_id, node_type, f"Unknown node type '{node_type}'")

            NodeClass     = NODE_REGISTRY[node_type]
            node_instance = NodeClass(params=params)

            # Step 2c: Execute — catch any error and wrap it with the failing node's info
            try:
                output = node_instance.execute(inputs)
                node_outputs[node_id] = output
                node_results[node_id] = node_instance.get_result_metadata()

            except NodeExecutionError:
                raise   # Re-raise without double-wrapping
            except Exception as e:
                raise NodeExecutionError(node_id, node_type, str(e))

        # Cache trained model bundle for live predictions and downloads
        self._cache_model_bundle(node_outputs)

        return node_results

    def _cache_model_bundle(self, node_outputs: dict):
        """Extracts and stores the latest trained model bundle along with its preprocessing transformers."""
        try:
            model_node = None
            for n in self.nodes:
                if n.get("type") in ("classifier", "regressor") and n["id"] in node_outputs and "model" in node_outputs[n["id"]]:
                    model_node = n
                    break

            if not model_node:
                clear_model_bundle()
                return

            model_id = model_node["id"]
            model = node_outputs[model_id]["model"]
            model_name = node_outputs[model_id].get("model_name") or model_node.get("params", {}).get("classifierType") or model_node.get("params", {}).get("regressorType") or "Model"
            task_type = "classification" if hasattr(model, "classes_") else "regression"

            data_loader_node = next((n for n in self.nodes if n.get("type") == "dataLoader"), None)
            feature_names = []
            feature_types = {}
            sample_records = []
            target_column = ""

            if data_loader_node and data_loader_node["id"] in node_outputs:
                dl_out = node_outputs[data_loader_node["id"]]
                X = dl_out.get("X")
                if isinstance(X, pd.DataFrame):
                    feature_names = list(X.columns)
                    feature_types = {col: str(dtype) for col, dtype in X.dtypes.items()}
                    sample_records = X.head(10).to_dict(orient="records")
                target_column = data_loader_node.get("params", {}).get("targetColumn", "")

            transformers = []
            for nid in self._topological_sort():
                if nid == model_id:
                    break
                ntype = self.nodes_dict[nid].get("type")
                params = self.nodes_dict[nid].get("params", {})
                out = node_outputs.get(nid, {})

                if ntype == "imputer" and "imputer" in out:
                    transformers.append({
                        "type": "imputer",
                        "strategy": params.get("strategy", "mean"),
                        "columns": params.get("columns", []),
                        "instance": out["imputer"]
                    })
                elif ntype == "encoder":
                    enc_inst = out.get("encoder")
                    transformers.append({
                        "type": "encoder",
                        "encoderType": params.get("encoderType", "OneHotEncoder"),
                        "columns": out.get("columns") or params.get("columns", []),
                        "instance": enc_inst,
                        "label_encoders": out.get("label_encoders", {})
                    })
                elif ntype == "scaler" and "scaler" in out:
                    transformers.append({
                        "type": "scaler",
                        "scalerType": params.get("scalerType", "StandardScaler"),
                        "columns": out.get("columns", []),
                        "instance": out["scaler"]
                    })

            bundle = {
                "model": model,
                "model_name": model_name,
                "model_type": model_node.get("type"),
                "task_type": task_type,
                "target_column": target_column,
                "feature_names": feature_names,
                "feature_types": feature_types,
                "sample_records": sample_records,
                "transformers": transformers,
                "nodes": self.nodes,
                "edges": self.edges
            }

            set_model_bundle(bundle)
        except Exception as e:
            print(f"[GraphExecutor] Error caching model bundle: {e}")
