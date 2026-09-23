# backend/nodes/encoder.py
# EncoderNode — encodes categorical columns to numeric values
# Must be applied to both X_train and X_test consistently

# TODO: Import from sklearn.preprocessing: OneHotEncoder, LabelEncoder
from sklearn.preprocessing import OneHotEncoder, LabelEncoder
# TODO: Import pandas as pd
import pandas as pd
# TODO: Import BaseNode from core.base_node
from core.base_node import BaseNode

# ─── EncoderNode CLASS ────────────────────────────────────────────────────────
# TODO: Define class EncoderNode(BaseNode):
class EncoderNode(BaseNode):
    # Expected params:
    #   encoderType : str  — 'OneHotEncoder' or 'LabelEncoder'
    #   columns     : list — list of column names to encode (empty list = all object/category columns)
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
                raise ValueError("X_train (or X) must be provided as inputs to EncoderNode")

        if not isinstance(X_train, pd.DataFrame):
            X_train = pd.DataFrame(X_train)
        if not is_pre_split and not isinstance(X_test, pd.DataFrame):
            X_test = pd.DataFrame(X_test)

        encoderType = self.params.get("encoderType", "OneHotEncoder")

        # Determine which columns to encode
        # If user specified columns, use those; otherwise auto-detect categorical columns
        columns = self.params.get("columns") or []
        if isinstance(columns, str):
            columns = [c.strip() for c in columns.split(",") if c.strip()]
        if columns:
            columns = [c for c in columns if c in X_train.columns]
        if not columns:
            columns = X_train.select_dtypes(include=['object', 'category']).columns.tolist()

        if not columns:
            self._result_metadata = {"type": "info", "encoderType": encoderType, "encodedColumns": []}
            if is_pre_split:
                return {"X": X_train, "y": y_train, "columns": []}
            return {"X_train": X_train, "X_test": X_test, "y_train": y_train, "y_test": y_test, "columns": []}

        if encoderType == "OneHotEncoder":
            # BUG FIX 1: encode only the detected/specified columns, not the whole DataFrame
            encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
            if is_pre_split:
                X_train_cat = encoder.fit_transform(X_train[columns])
                new_column_names = encoder.get_feature_names_out(columns)
                X_train_encoded = X_train.drop(columns=columns).reset_index(drop=True)
                X_train_encoded = pd.concat([X_train_encoded, pd.DataFrame(X_train_cat, columns=new_column_names)], axis=1)
                self._result_metadata = {"type": "info", "encoderType": encoderType, "encodedColumns": list(columns)}
                return {
                    "X": X_train_encoded,
                    "y": y_train,
                    "encoder": encoder,
                    "columns": list(columns)
                }
            else:
                X_train_cat = encoder.fit_transform(X_train[columns])
                X_test_cat  = encoder.transform(X_test[columns])
                new_column_names = encoder.get_feature_names_out(columns)
                # Drop original categorical columns, add the new one-hot columns
                X_train_encoded = X_train.drop(columns=columns).reset_index(drop=True)
                X_test_encoded  = X_test.drop(columns=columns).reset_index(drop=True)
                X_train_encoded = pd.concat([X_train_encoded, pd.DataFrame(X_train_cat, columns=new_column_names)], axis=1)
                X_test_encoded  = pd.concat([X_test_encoded,  pd.DataFrame(X_test_cat,  columns=new_column_names)], axis=1)
                self._result_metadata = {"type": "info", "encoderType": encoderType, "encodedColumns": list(columns)}
                return {
                    "X_train": X_train_encoded,
                    "X_test": X_test_encoded,
                    "y_train": y_train,
                    "y_test": y_test,
                    "encoder": encoder,
                    "columns": list(columns)
                }

        elif encoderType == "LabelEncoder":
            # BUG FIX 2: LabelEncoder only works on 1 column at a time — loop over each column
            if is_pre_split:
                X_train_encoded = X_train.copy()
                le_dict = {}
                for col in columns:
                    le = LabelEncoder()
                    X_train_encoded[col] = le.fit_transform(X_train[col].astype(str))
                    le_dict[col] = le
                self._result_metadata = {"type": "info", "encoderType": encoderType, "encodedColumns": list(columns)}
                return {
                    "X": X_train_encoded,
                    "y": y_train,
                    "label_encoders": le_dict,
                    "columns": list(columns)
                }
            else:
                X_train_encoded = X_train.copy()
                X_test_encoded  = X_test.copy()
                le_dict = {}
                for col in columns:
                    le = LabelEncoder()
                    X_train_encoded[col] = le.fit_transform(X_train[col].astype(str))
                    # handle_unknown: use -1 for unseen labels in test set
                    X_test_encoded[col]  = X_test[col].astype(str).map(lambda x: le.transform([x])[0] if x in le.classes_ else -1)
                    le_dict[col] = le
                self._result_metadata = {"type": "info", "encoderType": encoderType, "encodedColumns": list(columns)}
                return {
                    "X_train": X_train_encoded,
                    "X_test": X_test_encoded,
                    "y_train": y_train,
                    "y_test": y_test,
                    "label_encoders": le_dict,
                    "columns": list(columns)
                }

        else:
            raise ValueError(f"Unknown encoder type: {encoderType}")
    # def execute(self, inputs: dict) -> dict:
    #   Steps:
    #   1. Extract X_train, X_test, y_train, y_test from merged inputs
    #
    #   2. Determine which columns to encode:
    #      If params['columns'] is empty: detect automatically (df.select_dtypes(['object', 'category']))
    #      Else: use the specified column list
    #
    #   3. For OneHotEncoder:
    #      - Fit on X_train[cols], transform both X_train and X_test
    #      - Use sparse_output=False and handle_unknown='ignore' in sklearn
    #      - Replace the original columns with the new one-hot columns
    #        (pd.DataFrame with get_feature_names_out() for column names)
    #
    #   4. For LabelEncoder:
    #      - NOTE: sklearn's LabelEncoder only handles 1D arrays (one column at a time)
    #      - Loop over each target column, fit on X_train[col], transform both
    #      - Assign back: X_train[col] = encoder.transform(X_train[col])
    #
    #   5. Set result metadata: { "type": "info", "encoderType": ..., "encodedColumns": cols }
    #
    #   6. Return: { "X_train": X_train, "X_test": X_test, "y_train": y_train, "y_test": y_test }
