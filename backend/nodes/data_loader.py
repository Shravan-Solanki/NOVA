# backend/nodes/data_loader.py
# DataLoaderNode — reads a CSV file from disk and separates features (X) from target (y)

# TODO: Import pandas as pd
import pandas as pd
# TODO: Import BaseNode from core.base_node
from core.base_node import BaseNode
# TODO: Import os for checking file existence
import os

# ─── DataLoaderNode CLASS ─────────────────────────────────────────────────────
# TODO: Define class DataLoaderNode(BaseNode):

class DataLoaderNode(BaseNode):
    # No __init__ needed — BaseNode.__init__ already handles self.params and self._result_metadata

    # Expected params:
    #   filePath     : str — absolute path to the uploaded CSV file (from /api/upload)
    #   targetColumn : str — name of the column to use as labels (y)

    def execute(self, inputs: dict) -> dict:
        file_path = self.params.get("filePath")
        target_col = self.params.get("targetColumn")

        if not file_path:
            raise ValueError("No CSV file specified")

        if not os.path.exists(file_path):
            # Check in storage/uploads directory (case-insensitive for portable template support)
            uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "uploads")
            base_name = os.path.basename(file_path).lower()
            found = None
            if os.path.exists(uploads_dir):
                for f in os.listdir(uploads_dir):
                    if f.lower() == base_name:
                        found = os.path.join(uploads_dir, f)
                        break
            if found:
                file_path = found
            else:
                raise ValueError(f"CSV file not found: {file_path}")

        try:
            df = pd.read_csv(file_path)
        except Exception as e:
            raise ValueError(f"Error loading CSV file: {str(e)}")

        if not target_col or target_col not in df.columns:
            raise ValueError(f"Column '{target_col}' not found in CSV")

        # Automatically drop rows where targetColumn is null
        if df[target_col].isnull().any():
            df = df.dropna(subset=[target_col]).reset_index(drop=True)

        # Parse dropColumns parameter (or auto-detect ID/index columns if not specified)
        drop_param = self.params.get("dropColumns")
        if drop_param is None:
            # Auto-detect common ID / index columns if dropColumns wasn't explicitly configured
            common_id_names = {"id", "unnamed: 0", "index", "idx", "row_id", "rowid"}
            drop_cols = [c for c in df.columns if c != target_col and c.strip().lower() in common_id_names]
        elif isinstance(drop_param, str):
            drop_cols = [c.strip() for c in drop_param.split(",") if c.strip()]
        elif isinstance(drop_param, (list, tuple)):
            drop_cols = list(drop_param)
        else:
            drop_cols = []

        # Exclude target and all specified dropped columns from feature matrix X
        valid_drop_cols = [c for c in drop_cols if c in df.columns and c != target_col]
        columns_to_drop = [target_col] + valid_drop_cols
        X = df.drop(columns=columns_to_drop)
        y = df[target_col]

        self._result_metadata = {
            "type": "info",
            "shape": list(df.shape),
            "feature_shape": list(X.shape),
            "columns": list(X.columns),
            "droppedColumns": valid_drop_cols,
            "allColumns": df.columns.tolist(),
            "target": target_col
        }
        return { "X": X, "y": y, "df": df, "dropped_columns": valid_drop_cols }
            
    # def execute(self, inputs: dict) -> dict:
    #   (DataLoader has no parent nodes, so `inputs` will be empty — ignore it)
    #
    #   Steps:
    #   1. Validate that params['filePath'] exists on disk
    #      If not: raise ValueError(f"CSV file not found: {filePath}")
    #
    #   2. Read CSV: df = pd.read_csv(params['filePath'])
    #
    #   3. Validate that params['targetColumn'] is a column in df
    #      If not: raise ValueError(f"Column '{targetColumn}' not found in CSV")
    #
    #   4. Separate features and target:
    #      X = df.drop(columns=[targetColumn])
    #      y = df[targetColumn]
    #
    #   5. Set result metadata:
    #      self._result_metadata = {
    #        "type": "info",
    #        "shape": list(df.shape),
    #        "columns": df.columns.tolist(),
    #        "target": targetColumn
    #      }
    #
    #   6. Return { "X": X, "y": y, "df": df }
    #      (Pass the full df too — downstream nodes may need column names)
