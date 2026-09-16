# NOVA — Visual ML Pipeline Builder

A modern, node-based drag-and-drop machine learning pipeline builder. Design, train, evaluate, and test machine learning models visually without writing boilerplate code, and export production-ready standalone Python code and trained model bundles with a single click.

---

## 📋 Prerequisites

Before running the project, make sure you have the following installed on your system:

1. **Python 3.10+** (Python 3.10, 3.11, 3.12, or 3.13)  
   Check version: `python --version`
2. **Node.js 18+ & npm**  
   Check version: `node --version` and `npm --version`
3. **Git** (if cloning via Git)

---

## 🚀 Quick Start Guide

You will need **two terminal windows**: one for the **Backend** and one for the **Frontend**.

### 1️⃣ Backend Setup (FastAPI + ML Engine)

#### On Windows (PowerShell or Command Prompt):
```powershell
# Navigate to the project root
cd "path/to/project"

# 1. Create a Python virtual environment (if not already created)
python -m venv .venv

# 2. Activate the virtual environment
# In PowerShell:
.\.venv\Scripts\Activate.ps1
# Or in Command Prompt (cmd):
.\.venv\Scripts\activate.bat

# 3. Install Python dependencies
pip install -r backend/requirements.txt

# 4. Start the backend server
cd backend
python main.py
```
> The backend server will start at: **`http://localhost:8000`**  
> (API documentation available at `http://localhost:8000/docs`)

---

#### On macOS / Linux (Terminal):
```bash
# Navigate to the project root
cd path/to/project

# 1. Create a Python virtual environment
python3 -m venv .venv

# 2. Activate the virtual environment
source .venv/bin/activate

# 3. Install Python dependencies
pip install -r backend/requirements.txt

# 4. Start the backend server
cd backend
python3 main.py
```

---

### 2️⃣ Frontend Setup (React + Vite + React Flow)

Open a **new terminal window**:

```bash
# Navigate to the frontend directory
cd "path/to/project/frontend"

# 1. Install Node dependencies
npm install

# 2. Start the Vite dev server
npm run dev
```

> The frontend will start at: **`http://localhost:5173`** (or `http://localhost:5174` if 5173 is occupied).  
> Open that URL in any web browser!

---

## 🎯 How to Use the App

1. **Add Data**: Drag a **Dataset** node onto the canvas and select a sample CSV (e.g. `Iris.csv` or `housing.csv`) or upload your own dataset.
2. **Preprocess**:
   - Add **Imputer** to handle missing values (drop rows, mean, median, most frequent, etc.).
   - Add **Encoder** to encode categorical string columns (One-Hot or Label Encoding).
   - Add **Scaler** for numeric normalization (StandardScaler, MinMaxScaler, RobustScaler).
3. **Split Data**: Connect to **Train/Test Split** to set test ratio and random seed.
4. **Choose Model**:
   - **Classifiers**: Decision Tree, Random Forest, SVM, KNN, Logistic Regression.
   - **Regressors**: Linear Regression, Ridge, Lasso.
5. **Evaluate & Visualize**:
   - Connect to **Evaluator** (Accuracy, F1, Precision/Recall, RMSE, R² Score).
   - Connect to **Confusion Matrix** to view the confusion matrix heatmap.
6. **Test Predictions**: Click **🧪 Test Model** on any trained model node to input custom values and get real-time predictions.
7. **Export Pipeline**: Click **📦 Export / Download** in the top toolbar to download:
   - Standalone Python training script (`train_pipeline.py`)
   - Interactive prediction script (`test_prediction.py`)
   - Trained model bundle (`{Model}_trained.joblib`)
   - Or all files together in a `.zip` package!

---

## 📁 Project Structure

```text
├── backend/
│   ├── api/             # FastAPI REST endpoints (upload, execute, export, models)
│   ├── core/            # BaseNode, graph parser, execution engine
│   ├── nodes/           # Node implementations (dataset, imputer, encoder, models, etc.)
│   ├── storage/         # Uploaded datasets and saved pipelines
│   ├── utils/           # Code generation & script export utilities
│   ├── main.py          # FastAPI application entry point
│   └── requirements.txt # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/  # Canvas, custom nodes, modals, toolbar
│   │   ├── store/       # Zustand state management (graphStore)
│   │   ├── api/         # Axios API clients
│   │   └── App.jsx      # Main application component
│   ├── package.json     # Node dependencies & scripts
│   └── vite.config.js   # Vite configuration with API proxy
│
└── README.md
```

---

## ⚠️ Troubleshooting

- **PowerShell script execution policy error:**
  If you get `running scripts is disabled on this system` when activating `.venv`, run:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\.venv\Scripts\Activate.ps1
  ```
- **Port already in use:**
  - Backend uses port `8000`. If port 8000 is occupied, free the port or adjust `port=8000` in `backend/main.py`.
  - Frontend automatically switches to `5174` if `5173` is busy.
