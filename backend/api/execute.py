# backend/api/execute.py
# FastAPI router — receives a graph JSON and executes the ML pipeline

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from core.executor import GraphExecutor, NodeExecutionError

router = APIRouter()

# ─── REQUEST SCHEMAS (Pydantic validates the incoming JSON automatically) ─────
class NodeSchema(BaseModel):
    id:     str
    type:   str
    params: Dict[str, Any] = {}

class EdgeSchema(BaseModel):
    source:       str
    target:       str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None

class GraphSchema(BaseModel):
    nodes: List[NodeSchema]
    edges: List[EdgeSchema]

# ─── POST /api/execute ────────────────────────────────────────────────────────
@router.post("/execute")
async def execute_pipeline(graph: GraphSchema):
    """
    Receives a serialized graph from the React frontend and executes it.
    Returns per-node result metadata (metrics, images, info) keyed by node ID.
    """
    # Convert Pydantic models to plain dicts for the executor
    nodes = [node.model_dump() for node in graph.nodes]
    edges = [edge.model_dump() for edge in graph.edges]

    executor = GraphExecutor(nodes=nodes, edges=edges)

    try:
        results = executor.run()
        return {
            "success":         True,
            "node_results":    results,
            "execution_order": executor._topological_sort()
        }

    except NodeExecutionError as e:
        # A specific node failed — tell the frontend exactly which one
        return {
            "success":     False,
            "failed_node": e.node_id,
            "node_type":   e.node_type,
            "error":       e.message,
        }

    except ValueError as e:
        # Graph-level error (e.g. cycle detected)
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
