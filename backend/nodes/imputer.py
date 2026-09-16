# backend/nodes/imputer.py
# ImputerNode — handles missing / null values in feature sets
# Supports SimpleImputer (mean, median, most_frequent, constant) and drop_rows

import pandas as pd
import numpy as np
from sklearn.impute import SimpleImputer
from core.base_node import BaseNode


class ImputerNode(BaseNode):
    # Expected params:
    #   strategy  : str  — 'mean', 'median', 'most_frequent', 'constant', 'drop_rows'
    #   fillValue : any  — value to use when strategy == 'constant' (default: 0)
    #   columns   : list — list of column names to impute (default: [] -> auto-detect columns with NaNs)

    def execute(self, inputs: dict) -> dict:
        merged_inputs = {}
        for parent_id, parent_output in inputs.items():
            merged_inputs.update(parent_output)

        X_train = merged_inputs.get("X_train")
        X_test  = merged_inputs.get("X_test")
        y_train = merged_inputs.get("y_train")
        y_test  = merged_inputs.get("y_test")

        # Support being placed before train_test_split (on X and y)
        is_pre_split = False
        if X_train is None:
            if "X" in merged_inputs:
                X_train = merged_inputs["X"]
                y_train = merged_inputs.get("y")
                is_pre_split = True
            else:
                raise ValueError("ImputerNode requires X_train (or X) in inputs")

        if not isinstance(X_train, pd.DataFrame):
            X_train = pd.DataFrame(X_train)
        else:
            X_train = X_train.copy()

        if X_test is not None:
            if not isinstance(X_test, pd.DataFrame):
                X_test = pd.DataFrame(X_test)
            else:
                X_test = X_test.copy()

        strategy  = self.params.get("strategy", "mean")
        fill_val  = self.params.get("fillValue", 0)
        try:
            fill_val = float(fill_val)
        except (ValueError, TypeError):
            pass

        # Parse user columns if provided
        cols = self.params.get("columns") or []
        if isinstance(cols, str):
            cols = [c.strip() for c in cols.split(",") if c.strip()]
        if cols:
            cols = [c for c in cols if c in X_train.columns]

        # Calculate initial missing counts
        total_missing = int(X_train.isnull().sum().sum())
        if X_test is not None:
            total_missing += int(X_test.isnull().sum().sum())

        # If strategy is drop_rows
        if strategy == "drop_rows":
            # Check rows with nulls in X_train
            if cols:
                valid_train_idx = X_train[cols].dropna().index
            else:
                valid_train_idx = X_train.dropna().index

            X_train = X_train.loc[valid_train_idx].reset_index(drop=True)
            if y_train is not None:
                if isinstance(y_train, (pd.Series, pd.DataFrame)):
                    y_train = y_train.loc[valid_train_idx].reset_index(drop=True)
                elif hasattr(y_train, "__getitem__"):
                    y_train = pd.Series(y_train).loc[valid_train_idx].reset_index(drop=True)

            if X_test is not None:
                if cols:
                    valid_test_idx = X_test[cols].dropna().index
                else:
                    valid_test_idx = X_test.dropna().index

                X_test = X_test.loc[valid_test_idx].reset_index(drop=True)
                if y_test is not None:
                    if isinstance(y_test, (pd.Series, pd.DataFrame)):
                        y_test = y_test.loc[valid_test_idx].reset_index(drop=True)
                    elif hasattr(y_test, "__getitem__"):
                        y_test = pd.Series(y_test).loc[valid_test_idx].reset_index(drop=True)

            self._result_metadata = {
                "type": "info",
                "strategy": strategy,
                "missingCountBefore": total_missing,
                "missingCountAfter": int(X_train.isnull().sum().sum() + (X_test.isnull().sum().sum() if X_test is not None else 0)),
                "imputedColumns": list(cols) if cols else list(X_train.columns)
            }

            if is_pre_split:
                return {"X": X_train, "y": y_train, "df": pd.concat([X_train, y_train], axis=1) if y_train is not None else X_train}
            return {"X_train": X_train, "X_test": X_test, "y_train": y_train, "y_test": y_test}

        # Otherwise use SimpleImputer
        # If columns not specified, auto-detect columns with nulls
        if not cols:
            # Detect columns that have null values
            cols = [c for c in X_train.columns if X_train[c].isnull().any()]
            if X_test is not None:
                for c in X_test.columns:
                    if X_test[c].isnull().any() and c not in cols:
                        cols.append(c)

            # If strategy is mean or median, restrict auto-detected columns to numeric
            if strategy in ["mean", "median"]:
                num_cols = set(X_train.select_dtypes(include=[np.number]).columns)
                cols = [c for c in cols if c in num_cols]

        if not cols:
            # No missing values or columns to impute
            self._result_metadata = {
                "type": "info",
                "strategy": strategy,
                "missingCountBefore": total_missing,
                "missingCountAfter": total_missing,
                "imputedColumns": []
            }
            if is_pre_split:
                return {"X": X_train, "y": y_train, "df": pd.concat([X_train, y_train], axis=1) if y_train is not None else X_train}
            return {"X_train": X_train, "X_test": X_test, "y_train": y_train, "y_test": y_test}

        # Apply SimpleImputer
        imputer_kwargs = {"strategy": strategy}
        if strategy == "constant":
            imputer_kwargs["fill_value"] = fill_val

        imputer = SimpleImputer(**imputer_kwargs)

        X_train[cols] = imputer.fit_transform(X_train[cols])
        if X_test is not None:
            X_test[cols] = imputer.transform(X_test[cols])

        after_missing = int(X_train.isnull().sum().sum())
        if X_test is not None:
            after_missing += int(X_test.isnull().sum().sum())

        self._result_metadata = {
            "type": "info",
            "strategy": strategy,
            "missingCountBefore": total_missing,
            "missingCountAfter": after_missing,
            "imputedColumns": list(cols)
        }

        if is_pre_split:
            return {
                "X": X_train,
                "y": y_train,
                "df": pd.concat([X_train, y_train], axis=1) if y_train is not None else X_train,
                "imputer": imputer
            }

        return {
            "X_train": X_train,
            "X_test": X_test,
            "y_train": y_train,
            "y_test": y_test,
            "imputer": imputer
        }
