# backend/utils/code_exporter.py
# PythonExporter — generates a standalone Python script from the visual pipeline graph

from collections import defaultdict, deque
from datetime import datetime


# ─── PythonExporter CLASS ────────────────────────────────────────────────────
class PythonExporter:

    def __init__(self, nodes: list, edges: list):
        self.nodes          = nodes
        self.edges          = edges
        self.nodes_dict     = {node["id"]: node for node in nodes}
        self.model_var_map  = {}
        self.pred_var_map   = {}

    def _topological_sort(self) -> list:
        """Kahn's algorithm to determine topological execution order."""
        graph     = defaultdict(list)
        in_degree = {node["id"]: 0 for node in self.nodes}
        for edge in self.edges:
            graph[edge["source"]].append(edge["target"])
            in_degree[edge["target"]] += 1
        queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
        order = []
        while queue:
            nid = queue.popleft()
            order.append(nid)
            for neighbor in graph[nid]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        return order

    def _collect_imports(self) -> list:
        """Dynamically inspects nodes in the graph and returns ONLY necessary imports."""
        has_pandas = False
        has_numpy = False
        has_plt = False
        has_sns = False

        sk_model_selection = set()
        sk_preprocessing   = set()
        sk_impute          = set()
        sk_tree            = set()
        sk_svm             = set()
        sk_neighbors       = set()
        sk_linear_model    = set()
        sk_metrics         = set()

        for node in self.nodes:
            ntype  = node.get("type")
            params = node.get("params", {})

            if ntype == "dataLoader":
                has_pandas = True

            elif ntype == "trainTestSplit":
                sk_model_selection.add("train_test_split")

            elif ntype == "scaler":
                scaler_type = params.get("scalerType", "StandardScaler")
                sk_preprocessing.add(scaler_type)

            elif ntype == "imputer":
                strategy = params.get("strategy", "mean")
                if strategy != "drop_rows":
                    sk_impute.add("SimpleImputer")
                has_pandas = True

            elif ntype == "encoder":
                enc_type = params.get("encoderType", "OneHotEncoder")
                sk_preprocessing.add(enc_type)
                has_pandas = True

            elif ntype == "classifier":
                clf_type = params.get("classifierType", "DecisionTree")
                if clf_type == "DecisionTree":
                    sk_tree.add("DecisionTreeClassifier")
                elif clf_type == "SVM":
                    sk_svm.add("SVC")
                elif clf_type == "KNN":
                    sk_neighbors.add("KNeighborsClassifier")
                elif clf_type == "LogisticRegression":
                    sk_linear_model.add("LogisticRegression")

            elif ntype == "regressor":
                reg_type = params.get("regressorType", "LinearRegression")
                if reg_type in ("Ridge", "Lasso", "LinearRegression"):
                    sk_linear_model.add(reg_type)

            elif ntype == "evaluator":
                has_reg = any(n.get("type") == "regressor" for n in self.nodes)
                has_clf = any(n.get("type") == "classifier" for n in self.nodes)
                if has_clf or not has_reg:
                    sk_metrics.update(["accuracy_score", "f1_score", "classification_report"])
                if has_reg:
                    sk_metrics.update(["mean_squared_error", "r2_score"])
                    has_numpy = True

            elif ntype == "confusionMatrix":
                has_plt = True
                has_sns = True
                sk_metrics.add("confusion_matrix")

        imports = []
        if has_pandas:
            imports.append("import pandas as pd")
        if has_numpy:
            imports.append("import numpy as np")
        if has_plt:
            imports.append("import matplotlib")
            imports.append("matplotlib.use('Agg')  # Non-interactive backend to prevent Tkinter/Tcl GUI errors")
            imports.append("import matplotlib.pyplot as plt")
        if has_sns:
            imports.append("import seaborn as sns")

        if sk_model_selection:
            imports.append(f"from sklearn.model_selection import {', '.join(sorted(sk_model_selection))}")
        if sk_preprocessing:
            imports.append(f"from sklearn.preprocessing import {', '.join(sorted(sk_preprocessing))}")
        if sk_impute:
            imports.append(f"from sklearn.impute import {', '.join(sorted(sk_impute))}")
        if sk_tree:
            imports.append(f"from sklearn.tree import {', '.join(sorted(sk_tree))}")
        if sk_svm:
            imports.append(f"from sklearn.svm import {', '.join(sorted(sk_svm))}")
        if sk_neighbors:
            imports.append(f"from sklearn.neighbors import {', '.join(sorted(sk_neighbors))}")
        if sk_linear_model:
            imports.append(f"from sklearn.linear_model import {', '.join(sorted(sk_linear_model))}")
        if sk_metrics:
            imports.append(f"from sklearn.metrics import {', '.join(sorted(sk_metrics))}")

        return imports

    def _node_to_code(self, node_id: str, node_type: str, params: dict, is_multi_model: bool, has_split: bool = True) -> str:
        """Maps a node type and its params to a Python code snippet."""

        if node_type == "dataLoader":
            target_col = params.get('targetColumn', 'target')
            drop_param = params.get("dropColumns")
            drop_cols = []
            if isinstance(drop_param, str):
                drop_cols = [c.strip() for c in drop_param.split(",") if c.strip()]
            elif isinstance(drop_param, (list, tuple)):
                drop_cols = list(drop_param)

            all_drops = [target_col] + [c for c in drop_cols if c != target_col]
            if drop_cols:
                return (
                    f"df = pd.read_csv(r'{params.get('filePath', 'data.csv')}')\n"
                    f"# Exclude target and non-predictive/ID columns: {drop_cols}\n"
                    f"drop_cols = [c for c in {repr(all_drops)} if c in df.columns]\n"
                    f"X  = df.drop(columns=drop_cols)\n"
                    f"y  = df['{target_col}']"
                )
            return (
                f"df = pd.read_csv(r'{params.get('filePath', 'data.csv')}')\n"
                f"X  = df.drop(columns=['{target_col}'])\n"
                f"y  = df['{target_col}']"
            )

        elif node_type == "trainTestSplit":
            return (
                f"X_train, X_test, y_train, y_test = train_test_split(\n"
                f"    X, y,\n"
                f"    test_size={params.get('testSize', 0.2)},\n"
                f"    random_state={params.get('randomState', 42)},\n"
                f"    shuffle={params.get('shuffle', True)}\n"
                f")"
            )

        elif node_type == "scaler":
            scaler = params.get("scalerType", "StandardScaler")
            if not has_split:
                return (
                    f"# Scale numeric features only\n"
                    f"num_cols = X.select_dtypes(include=['number']).columns\n"
                    f"scaler  = {scaler}()\n"
                    f"if len(num_cols) > 0:\n"
                    f"    X[num_cols] = scaler.fit_transform(X[num_cols])"
                )
            else:
                return (
                    f"# Scale numeric features only\n"
                    f"num_cols = X_train.select_dtypes(include=['number']).columns\n"
                    f"scaler  = {scaler}()\n"
                    f"if len(num_cols) > 0:\n"
                    f"    X_train[num_cols] = scaler.fit_transform(X_train[num_cols])\n"
                    f"    X_test[num_cols]  = scaler.transform(X_test[num_cols])"
                )

        elif node_type == "imputer":
            strategy = params.get("strategy", "mean")
            fill_val = params.get("fillValue", 0)
            cols = params.get("columns") or []
            if isinstance(cols, str):
                cols = [c.strip() for c in cols.split(",") if c.strip()]

            if strategy == "drop_rows":
                if not has_split:
                    if cols:
                        return (
                            f"# Drop rows with missing values in specified columns\n"
                            f"mask = X[{repr(list(cols))}].notnull().all(axis=1)\n"
                            f"X = X.loc[mask].reset_index(drop=True)\n"
                            f"y = y.loc[mask].reset_index(drop=True)"
                        )
                    else:
                        return (
                            f"# Drop rows with any missing values\n"
                            f"mask = X.notnull().all(axis=1)\n"
                            f"X = X.loc[mask].reset_index(drop=True)\n"
                            f"y = y.loc[mask].reset_index(drop=True)"
                        )
                else:
                    if cols:
                        return (
                            f"# Drop rows with missing values in specified columns\n"
                            f"train_mask = X_train[{repr(list(cols))}].notnull().all(axis=1)\n"
                            f"X_train = X_train.loc[train_mask].reset_index(drop=True)\n"
                            f"y_train = y_train.loc[train_mask].reset_index(drop=True)\n"
                            f"test_mask = X_test[{repr(list(cols))}].notnull().all(axis=1)\n"
                            f"X_test  = X_test.loc[test_mask].reset_index(drop=True)\n"
                            f"y_test  = y_test.loc[test_mask].reset_index(drop=True)"
                        )
                    else:
                        return (
                            f"# Drop rows with any missing values\n"
                            f"train_mask = X_train.notnull().all(axis=1)\n"
                            f"X_train = X_train.loc[train_mask].reset_index(drop=True)\n"
                            f"y_train = y_train.loc[train_mask].reset_index(drop=True)\n"
                            f"test_mask = X_test.notnull().all(axis=1)\n"
                            f"X_test  = X_test.loc[test_mask].reset_index(drop=True)\n"
                            f"y_test  = y_test.loc[test_mask].reset_index(drop=True)"
                        )
            else:
                x_ref = "X" if not has_split else "X_train"
                if cols:
                    cols_expr = repr(list(cols))
                elif strategy in ("mean", "median"):
                    cols_expr = f"[c for c in {x_ref}.select_dtypes(include=['number']).columns if {x_ref}[c].isnull().any()]"
                else:
                    cols_expr = f"[c for c in {x_ref}.columns if {x_ref}[c].isnull().any()]"

                imputer_init = f"SimpleImputer(strategy='{strategy}', fill_value={repr(fill_val)})" if strategy == "constant" else f"SimpleImputer(strategy='{strategy}')"

                if not has_split:
                    return (
                        f"imp_cols = {cols_expr}\n"
                        f"if imp_cols:\n"
                        f"    imputer = {imputer_init}\n"
                        f"    X[imp_cols] = imputer.fit_transform(X[imp_cols])"
                    )
                else:
                    return (
                        f"imp_cols = {cols_expr}\n"
                        f"if imp_cols:\n"
                        f"    imputer = {imputer_init}\n"
                        f"    X_train[imp_cols] = imputer.fit_transform(X_train[imp_cols])\n"
                        f"    X_test[imp_cols]  = imputer.transform(X_test[imp_cols])"
                    )

        elif node_type == "encoder":
            encoder = params.get("encoderType", "OneHotEncoder")
            cols = params.get("columns") or []
            if isinstance(cols, str):
                cols = [c.strip() for c in cols.split(",") if c.strip()]

            x_ref = "X" if not has_split else "X_train"
            if cols:
                cols_expr = repr(list(cols))
            else:
                cols_expr = f"{x_ref}.select_dtypes(include=['object', 'category']).columns.tolist()"

            if not has_split:
                if encoder == "OneHotEncoder":
                    return (
                        f"enc_cols = {cols_expr}\n"
                        f"if enc_cols:\n"
                        f"    encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')\n"
                        f"    X_cat = pd.DataFrame(encoder.fit_transform(X[enc_cols]), columns=encoder.get_feature_names_out(enc_cols))\n"
                        f"    X = pd.concat([X.drop(columns=enc_cols).reset_index(drop=True), X_cat], axis=1)"
                    )
                else:
                    return (
                        f"enc_cols = {cols_expr}\n"
                        f"for col in enc_cols:\n"
                        f"    le = LabelEncoder()\n"
                        f"    X[col] = le.fit_transform(X[col].astype(str))"
                    )
            else:
                if encoder == "OneHotEncoder":
                    return (
                        f"enc_cols = {cols_expr}\n"
                        f"if enc_cols:\n"
                        f"    encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')\n"
                        f"    X_tr_cat = pd.DataFrame(encoder.fit_transform(X_train[enc_cols]), columns=encoder.get_feature_names_out(enc_cols))\n"
                        f"    X_te_cat = pd.DataFrame(encoder.transform(X_test[enc_cols]), columns=encoder.get_feature_names_out(enc_cols))\n"
                        f"    X_train = pd.concat([X_train.drop(columns=enc_cols).reset_index(drop=True), X_tr_cat], axis=1)\n"
                        f"    X_test  = pd.concat([X_test.drop(columns=enc_cols).reset_index(drop=True),  X_te_cat], axis=1)"
                    )
                else:
                    return (
                        f"enc_cols = {cols_expr}\n"
                        f"for col in enc_cols:\n"
                        f"    le = LabelEncoder()\n"
                        f"    X_train[col] = le.fit_transform(X_train[col].astype(str))\n"
                        f"    X_test[col]  = X_test[col].astype(str).map(lambda x: le.transform([x])[0] if x in le.classes_ else -1)"
                    )

        elif node_type == "classifier":
            clf_type  = params.get("classifierType", "DecisionTree")
            model_var = self.model_var_map[node_id]

            if clf_type == "DecisionTree":
                return (
                    f"{model_var} = DecisionTreeClassifier(\n"
                    f"    max_depth={params.get('max_depth', None)},\n"
                    f"    criterion='{params.get('criterion', 'gini')}',\n"
                    f"    random_state={params.get('randomState', 42)}\n"
                    f")\n"
                    f"{model_var}.fit(X_train, y_train)"
                )
            elif clf_type == "SVM":
                return (
                    f"{model_var} = SVC(C={params.get('C', 1.0)}, kernel='{params.get('kernel', 'rbf')}')\n"
                    f"{model_var}.fit(X_train, y_train)"
                )
            elif clf_type == "KNN":
                return (
                    f"{model_var} = KNeighborsClassifier(n_neighbors={params.get('n_neighbors', 5)})\n"
                    f"{model_var}.fit(X_train, y_train)"
                )
            else:  # LogisticRegression
                return (
                    f"{model_var} = LogisticRegression(\n"
                    f"    C={params.get('C', 1.0)},\n"
                    f"    max_iter={params.get('max_iter', 200)},\n"
                    f"    random_state={params.get('randomState', 42)}\n"
                    f")\n"
                    f"{model_var}.fit(X_train, y_train)"
                )

        elif node_type == "regressor":
            reg_type  = params.get("regressorType", "LinearRegression")
            model_var = self.model_var_map[node_id]

            if reg_type == "Ridge":
                return f"{model_var} = Ridge(alpha={params.get('alpha', 1.0)})\n{model_var}.fit(X_train, y_train)"
            elif reg_type == "Lasso":
                return f"{model_var} = Lasso(alpha={params.get('alpha', 1.0)})\n{model_var}.fit(X_train, y_train)"
            else:
                return f"{model_var} = LinearRegression()\n{model_var}.fit(X_train, y_train)"

        elif node_type == "evaluator":
            parent_ids = [e["source"] for e in self.edges if e["target"] == node_id]
            m_var = "model"
            for pid in parent_ids:
                if pid in self.model_var_map:
                    m_var = self.model_var_map[pid]
                    break

            p_var = f"y_pred_{m_var}" if is_multi_model else "y_pred"
            self.pred_var_map[node_id] = p_var

            # Check if this model is a regressor or classifier
            parent_node = next((self.nodes_dict[pid] for pid in parent_ids if pid in self.nodes_dict), None)
            is_reg = parent_node and parent_node.get("type") == "regressor"

            if is_reg:
                return (
                    f"{p_var} = {m_var}.predict(X_test)\n"
                    f"print('\\n--- Evaluation ({m_var}) ---')\n"
                    f"print('RMSE :', np.sqrt(mean_squared_error(y_test, {p_var})))\n"
                    f"print('R2 Score :', r2_score(y_test, {p_var}))"
                )
            else:
                return (
                    f"{p_var} = {m_var}.predict(X_test)\n"
                    f"print('\\n--- Evaluation ({m_var}) ---')\n"
                    f"print('Accuracy :', accuracy_score(y_test, {p_var}))\n"
                    f"print('F1 Score :', f1_score(y_test, {p_var}, average='weighted'))\n"
                    f"print(classification_report(y_test, {p_var}))"
                )

        elif node_type == "confusionMatrix":
            parent_ids = [e["source"] for e in self.edges if e["target"] == node_id]
            p_var = "y_pred"
            m_var = "model"
            label = "Confusion Matrix"
            needs_predict = True
            for pid in parent_ids:
                if pid in self.pred_var_map:
                    p_var = self.pred_var_map[pid]
                    needs_predict = False
                    break
                elif pid in self.model_var_map:
                    m_var = self.model_var_map[pid]
                    p_var = f"y_pred_{m_var}" if is_multi_model else "y_pred"
                    label = f"Confusion Matrix ({m_var})"
                    break

            predict_step = f"{p_var} = {m_var}.predict(X_test)\n" if needs_predict else ""
            return (
                f"{predict_step}"
                f"cm = confusion_matrix(y_test, {p_var})\n"
                f"print('\\n--- {label} ---')\n"
                f"print(cm)\n"
                f"try:\n"
                f"    plt.figure(figsize=(6, 5))\n"
                f"    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')\n"
                f"    plt.title('{label}')\n"
                f"    plt.xlabel('Predicted')\n"
                f"    plt.ylabel('Actual')\n"
                f"    plt.tight_layout()\n"
                f"    plt.savefig('confusion_matrix.png')\n"
                f"    plt.close()\n"
                f"    print('Plot saved to confusion_matrix.png')\n"
                f"except Exception as e:\n"
                "    print(f'Warning: Could not save confusion matrix plot: {e}')"
            )

        return f"# TODO: code for node type '{node_type}'"

    def generate(self) -> str:
        """Generates the complete standalone Python script as a string."""
        order = self._topological_sort()

        # Check for multiple models to assign clean variables
        model_nodes = [n for n in self.nodes if n.get("type") in ("classifier", "regressor")]
        is_multi_model = len(model_nodes) > 1

        used_names = defaultdict(int)
        for node in model_nodes:
            nid = node["id"]
            ntype = node.get("type")
            params = node.get("params", {})
            if is_multi_model:
                base_name = params.get("classifierType") or params.get("regressorType") or ntype
                clean_name = base_name.lower()
                used_names[clean_name] += 1
                suffix = f"_{used_names[clean_name]}" if used_names[clean_name] > 1 else ""
                self.model_var_map[nid] = f"model_{clean_name}{suffix}"
            else:
                self.model_var_map[nid] = "model"

        # Dynamic, minimal imports
        imports = self._collect_imports()

        header = (
            f"# Auto-generated by NOVA — Visual ML Pipeline Builder\n"
            f"# Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"# Run this file directly: python pipeline.py\n\n"
        )

        body_lines = []
        has_split = False
        for node_id in order:
            node_data = self.nodes_dict[node_id]
            node_type = node_data.get("type", "")
            params    = node_data.get("params", {})
            code      = self._node_to_code(node_id, node_type, params, is_multi_model, has_split=has_split)

            if node_type == "trainTestSplit":
                has_split = True

            # Node label banner
            label = params.get("classifierType") or params.get("regressorType") or node_type
            body_lines.append(f"# --- {node_type}: {label} ---")
            body_lines.append(code)
            body_lines.append("")  # blank line between sections

        return header + "\n".join(imports) + "\n\n" + "\n".join(body_lines)
