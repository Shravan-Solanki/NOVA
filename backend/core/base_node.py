# backend/core/base_node.py
# Abstract base class for all ML pipeline nodes
# All node implementations (DataLoaderNode, ScalerNode, etc.) must inherit from this

# TODO: Import ABC, abstractmethod from abc
from abc import ABC, abstractmethod
# TODO: Import Dict, Any from typing
from typing import Dict, Any
import io
import base64

# ─── BaseNode ABSTRACT CLASS ──────────────────────────────────────────────────
# TODO: Define class BaseNode(ABC):
class BaseNode(ABC):
    def __init__(self,params:Dict[str,Any]):
        self.params=params
        self._result_metadata={}
        
    # __init__(self, params: Dict[str, Any]):
    #   self.params = params
    #   self._result_metadata = {}   ← populated by execute() with frontend-facing data
    
    @abstractmethod
    def execute(self,inputs:Dict[str,Any])->Dict[str,Any]:
        pass

    # ── ABSTRACT METHOD (must be implemented by each node class) ─────────────
    # @abstractmethod
    # def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
    #   - `inputs`: a dict of outputs from all parent nodes (keyed by parent node ID)
    #     e.g. { 'node-abc': { 'X_train': ..., 'X_test': ..., 'y_train': ..., 'y_test': ... } }
    #   - Returns a dict that becomes available as input to child nodes
    #     e.g. { 'X_scaled': scaled_dataframe }
    #   - Raise ValueError with a descriptive message if inputs are invalid or missing

    def get_result_metadata(self) -> Dict[str,Any]:
        return self._result_metadata

    # ── RESULT METADATA ───────────────────────────────────────────────────────
    # def get_result_metadata(self) -> Dict[str, Any]:
    #   Returns self._result_metadata (set during execute())
    #   The metadata should be serializable to JSON
    #   Examples of what nodes put here:
    #     Evaluator    → { "type": "metrics", "accuracy": 0.95, "f1": 0.93 }
    #     ConfusionMat → { "type": "image", "imageBase64": "..." }
    #     DataLoader   → { "type": "info", "shape": [150, 5], "columns": [...] }

    def _fig_to_base64(self,fig) -> str:
        import matplotlib.pyplot as plt
        # Create a bytesIO buffer to hold the figure
        buffer=io.BytesIO()
        fig.savefig(buffer,format='png',bbox_inches='tight',dpi=150)
        buffer.seek(0)
        image_b64=base64.b64encode(buffer.read()).decode('utf-8')
        plt.close(fig)
        return image_b64

    # ── HELPER: image_to_base64 ───────────────────────────────────────────────
    # def _fig_to_base64(self, fig) -> str:
    #   Helper method for visualization nodes (EvaluatorNode, ConfusionMatrixNode)
    #   Converts a matplotlib Figure to a base64-encoded PNG string
    #
    #   Steps:
    #   1. Import io
    #   2. Create a BytesIO buffer
    #   3. fig.savefig(buffer, format='png', bbox_inches='tight', dpi=150)
    #   4. buffer.seek(0)
    #   5. import base64; return base64.b64encode(buffer.read()).decode('utf-8')
    #   6. Close the figure with plt.close(fig) to free memory