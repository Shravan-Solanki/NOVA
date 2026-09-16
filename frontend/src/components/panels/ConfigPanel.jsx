// src/components/panels/ConfigPanel.jsx
// Right-side configuration panel — shows editable parameters for the selected node

import React, { useState, useEffect } from 'react'
import useGraphStore from '../../store/graphStore'
import { uploadCSV, listUploads, selectUpload, deleteUpload } from '../../api/api'

// ─── NODE PARAMETER SCHEMAS ──────────────────────────────────────────────────
// Defines what input fields appear in the panel for each node type
const CLASSIFIER_PARAMS = {
  DecisionTree: [
    { key: 'max_depth', label: 'Max Depth', type: 'number', min: 1, default: null },
    { key: 'criterion', label: 'Criterion', type: 'select',
      options: ['gini', 'entropy', 'log_loss'], default: 'gini' },
    { key: 'randomState', label: 'Random State', type: 'number', min: 0, default: 42 },
  ],
  SVM: [
    { key: 'C', label: 'C (Regularization)', type: 'number', min: 0.01, step: 0.1, default: 1.0 },
    { key: 'kernel', label: 'Kernel', type: 'select',
      options: ['rbf', 'linear', 'poly', 'sigmoid'], default: 'rbf' },
  ],
  KNN: [
    { key: 'n_neighbors', label: 'K Neighbors', type: 'number', min: 1, default: 5 },
    { key: 'metric', label: 'Distance Metric', type: 'select',
      options: ['minkowski', 'euclidean', 'manhattan'], default: 'minkowski' },
  ],
  LogisticRegression: [
    { key: 'C', label: 'C (Inverse Regularization)', type: 'number', min: 0.01, step: 0.1, default: 1.0 },
    { key: 'max_iter', label: 'Max Iterations', type: 'number', min: 100, step: 50, default: 200 },
    { key: 'randomState', label: 'Random State', type: 'number', min: 0, default: 42 },
  ],
}

const REGRESSOR_PARAMS = {
  LinearRegression: [],
  Ridge: [
    { key: 'alpha', label: 'Alpha (Regularization)', type: 'number', min: 0.01, step: 0.1, default: 1.0 },
  ],
  Lasso: [
    { key: 'alpha', label: 'Alpha (L1 Regularization)', type: 'number', min: 0.01, step: 0.1, default: 1.0 },
  ],
}

const NODE_SCHEMAS = {
  dataLoader: [
    { key: 'targetColumn', label: 'Target Column', type: 'text', default: '' },
    { key: 'dropColumns', label: 'Exclude / Drop Columns', type: 'columns', default: [] },
  ],
  trainTestSplit: [
    { key: 'testSize',    label: 'Test Size',    type: 'slider', min: 0.1, max: 0.5, step: 0.05, default: 0.2 },
    { key: 'randomState', label: 'Random State', type: 'number', min: 0,   default: 42 },
    { key: 'shuffle',     label: 'Shuffle',      type: 'toggle', default: true },
  ],
  imputer: [
    { key: 'strategy', label: 'Imputation Strategy', type: 'select',
      options: ['mean', 'median', 'most_frequent', 'constant', 'drop_rows'], default: 'mean' },
    { key: 'fillValue', label: 'Fill Value (for Constant)', type: 'text', default: '0' },
    { key: 'columns', label: 'Columns to Impute', type: 'columns', default: [] },
  ],
  scaler: [
    { key: 'scalerType', label: 'Scaler Type', type: 'select',
      options: ['StandardScaler', 'MinMaxScaler'], default: 'StandardScaler' },
  ],
  encoder: [
    { key: 'encoderType', label: 'Encoder Type', type: 'select',
      options: ['OneHotEncoder', 'LabelEncoder'], default: 'OneHotEncoder' },
    { key: 'columns', label: 'Columns to Encode', type: 'columns', default: [] },
  ],
  evaluator: [
    { key: 'metrics', label: 'Metrics', type: 'multicheck',
      options: ['accuracy', 'f1', 'precision', 'recall', 'rmse', 'mae', 'r2'],
      default: ['accuracy', 'f1'] },
  ],
  confusionMatrix: [],   // No params needed
}

const NODE_DESCRIPTIONS = {
  dataLoader:     'Loads a CSV file and separates features (X) from the target column (y).',
  trainTestSplit: 'Splits X and y into training and test sets.',
  imputer:        'Fills or removes missing/null values in features using mean, median, mode, constant, or row dropping.',
  scaler:         'Scales numeric features. Fits on training data only to prevent data leakage.',
  encoder:        'Encodes categorical columns into numeric values.',
  classifier:     'Trains a classification model on X_train and y_train.',
  regressor:      'Trains a regression model on X_train and y_train.',
  evaluator:      'Computes performance metrics by comparing y_test to model predictions.',
  confusionMatrix:'Generates a confusion matrix heatmap. Connect after the Evaluator node.',
}

// ─── ParamField ───────────────────────────────────────────────────────────────
function ParamField({ field, value, onChange }) {
  const val = value !== undefined ? value : field.default

  if (field.type === 'text') {
    return (
      <div className="param-row">
        <label>{field.label}</label>
        <input type="text" value={val || ''} onChange={e => onChange(field.key, e.target.value)} />
      </div>
    )
  }

  if (field.type === 'number') {
    return (
      <div className="param-row">
        <label>{field.label}</label>
        <input
          type="number"
          value={val ?? ''}
          placeholder={field.placeholder || (field.default === null ? 'None (unlimited)' : '')}
          min={field.min}
          step={field.step || 1}
          onChange={e => onChange(field.key, e.target.value === '' ? null : Number(e.target.value))}
        />
      </div>
    )
  }

  if (field.type === 'slider') {
    return (
      <div className="param-row">
        <label>{field.label} <span className="param-value">{val}</span></label>
        <input
          type="range"
          min={field.min} max={field.max} step={field.step}
          value={val}
          onChange={e => onChange(field.key, Number(e.target.value))}
        />
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div className="param-row">
        <label>{field.label}</label>
        <select value={val} onChange={e => onChange(field.key, e.target.value)}>
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    )
  }

  if (field.type === 'toggle') {
    return (
      <div className="param-row param-row--toggle">
        <label>{field.label}</label>
        <input
          type="checkbox"
          checked={!!val}
          onChange={e => onChange(field.key, e.target.checked)}
        />
      </div>
    )
  }

  if (field.type === 'multicheck') {
    const selected = Array.isArray(val) ? val : field.default
    return (
      <div className="param-row param-row--multi">
        <label>{field.label}</label>
        <div className="multi-check">
          {field.options.map(opt => (
            <label key={opt} className="check-item">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={e => {
                  const next = e.target.checked
                    ? [...selected, opt]
                    : selected.filter(x => x !== opt)
                  onChange(field.key, next)
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>
    )
  }

  return null
}

const COMMON_ID_NAMES = ['id', 'unnamed: 0', 'index', 'idx', 'row_id', 'rowid']
function detectIdColumns(cols, target) {
  if (!Array.isArray(cols)) return []
  return cols.filter(c => c !== target && COMMON_ID_NAMES.includes(c.trim().toLowerCase()))
}

// ─── ConfigPanel ──────────────────────────────────────────────────────────────
function ConfigPanel({ node, onClose }) {
  const { updateNodeParams, openDataViewer, nodes, edges } = useGraphStore()
  const [params, setParams] = useState({})
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const [availableDatasets, setAvailableDatasets] = useState([])

  // Reset local params whenever the selected node changes
  useEffect(() => {
    if (node) {
      setParams({ ...(node.data?.params || {}) })
      setUploadError(null)
      if (node.data?.nodeType === 'dataLoader' || node.type === 'dataLoader') {
        fetchUploadedDatasets()
      }
    }
  }, [node?.id])

  const fetchUploadedDatasets = async () => {
    try {
      const { data } = await listUploads()
      setAvailableDatasets(data.datasets || [])
    } catch (err) {
      console.error('Failed to load datasets list', err)
    }
  }

  const handleSelectExistingDataset = async (filename) => {
    if (!filename) return
    try {
      setUploading(true)
      setUploadError(null)
      const { data } = await selectUpload(filename)
      const targetCol = data.columns[data.columns.length - 1] || ''
      const autoDrop = detectIdColumns(data.columns, targetCol)
      const nextParams = {
        ...params,
        filePath: data.filePath,
        targetColumn: targetCol,
        dropColumns: (params.dropColumns && params.dropColumns.length > 0) ? params.dropColumns : autoDrop,
        availableColumns: data.columns,
        shape: data.shape,
      }
      setParams(nextParams)
      updateNodeParams(node.id, nextParams)
    } catch (err) {
      setUploadError(err.response?.data?.detail || err.message || 'Failed to load dataset')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteUploadedDataset = async (filename) => {
    if (!filename) return
    const confirmDelete = window.confirm(`Are you sure you want to delete "${filename}" from saved uploads?`)
    if (!confirmDelete) return

    try {
      await deleteUpload(filename)
      if (fileName === filename) {
        const nextParams = {
          ...params,
          filePath: '',
          targetColumn: '',
          availableColumns: [],
          shape: null,
        }
        setParams(nextParams)
        updateNodeParams(node.id, nextParams)
      }
      fetchUploadedDatasets()
    } catch (err) {
      alert('Failed to delete dataset: ' + (err.response?.data?.detail || err.message))
    }
  }

  if (!node) {
    return (
      <aside className="config-panel config-panel--empty">
        <p>Click a node on the canvas to configure it.</p>
      </aside>
    )
  }

  const nodeType = node.data?.nodeType || node.type
  let schema = []
  if (nodeType === 'classifier') {
    const currentAlgo = params.classifierType || 'DecisionTree'
    schema = [
      {
        key: 'classifierType',
        label: 'Algorithm',
        type: 'select',
        options: ['DecisionTree', 'SVM', 'KNN', 'LogisticRegression'],
        default: 'DecisionTree',
      },
      ...(CLASSIFIER_PARAMS[currentAlgo] || []),
    ]
  } else if (nodeType === 'regressor') {
    const currentAlgo = params.regressorType || 'LinearRegression'
    schema = [
      {
        key: 'regressorType',
        label: 'Algorithm',
        type: 'select',
        options: ['LinearRegression', 'Ridge', 'Lasso'],
        default: 'LinearRegression',
      },
      ...(REGRESSOR_PARAMS[currentAlgo] || []),
    ]
  } else {
    schema = NODE_SCHEMAS[nodeType] || []
  }

  const handleChange = (key, value) => {
    setParams(prev => {
      const next = { ...prev, [key]: value }
      updateNodeParams(node.id, next)
      return next
    })
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setUploadError(null)
      const { data } = await uploadCSV(file)
      // data: { filePath, columns, shape, preview }
      const targetCol = params.targetColumn || data.columns[data.columns.length - 1] || ''
      const autoDrop = detectIdColumns(data.columns, targetCol)
      const nextParams = {
        ...params,
        filePath: data.filePath,
        targetColumn: targetCol,
        dropColumns: (params.dropColumns && params.dropColumns.length > 0) ? params.dropColumns : autoDrop,
        availableColumns: data.columns,
        shape: data.shape,
      }
      setParams(nextParams)
      updateNodeParams(node.id, nextParams)
      fetchUploadedDatasets()
    } catch (err) {
      setUploadError(err.response?.data?.detail || err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const fileName = params.filePath ? params.filePath.split(/[\\/]/).pop() : null
  const availableCols = params.availableColumns || []

  // Resolve dataset columns from the DataLoader node in the graph
  const dataLoaderNode = nodes?.find(n => n.type === 'dataLoader' || n.data?.nodeType === 'dataLoader')
  const datasetCols = dataLoaderNode?.data?.params?.availableColumns || params.availableColumns || []
  const dataLoaderTarget = dataLoaderNode?.data?.params?.targetColumn || params.targetColumn || ''
  const dataLoaderDrops = dataLoaderNode?.data?.params?.dropColumns || (nodeType === 'dataLoader' ? (params.dropColumns || []) : [])
  const encoderCandidateCols = datasetCols.filter(col => col !== dataLoaderTarget && !dataLoaderDrops.includes(col))

  // Determine upstream task type for Evaluator (classification vs regression)
  const getUpstreamModelType = (targetId, visited = new Set()) => {
    if (!targetId || visited.has(targetId)) return null
    visited.add(targetId)
    const incoming = edges?.filter(e => e.target === targetId) || []
    for (const edge of incoming) {
      const src = nodes?.find(n => n.id === edge.source)
      if (!src) continue
      const type = src.data?.nodeType || src.type
      if (type === 'classifier') return 'classification'
      if (type === 'regressor')  return 'regression'
      const up = getUpstreamModelType(src.id, visited)
      if (up) return up
    }
    return null
  }

  const upstreamTask = getUpstreamModelType(node?.id) ||
    (nodes?.some(n => (n.data?.nodeType || n.type) === 'regressor') ? 'regression' :
     nodes?.some(n => (n.data?.nodeType || n.type) === 'classifier') ? 'classification' : null)

  return (
    <aside className="config-panel">
      <div className="config-panel__header">
        <span>{node.data?.label || nodeType}</span>
        <button className="config-panel__close" onClick={onClose}>×</button>
      </div>

      <p className="config-panel__description">
        {NODE_DESCRIPTIONS[nodeType] || ''}
      </p>

      <div className="config-panel__fields">
        {/* Special file upload / selection section for dataLoader */}
        {nodeType === 'dataLoader' && (
          <div className="param-row">
            <label>Dataset</label>

            {/* Choose from saved uploads dropdown */}
            {availableDatasets.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  📁 Saved Uploads:
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <select
                    value={fileName || ''}
                    onChange={e => handleSelectExistingDataset(e.target.value)}
                    disabled={uploading}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Choose from saved uploads --</option>
                    {availableDatasets.map(d => (
                      <option key={d.filename} value={d.filename}>
                        {d.filename} {d.rows ? `(${d.rows} rows × ${d.cols} cols)` : ''}
                      </option>
                    ))}
                  </select>
                  {fileName && availableDatasets.some(d => d.filename === fileName) && (
                    <button
                      className="btn btn--danger"
                      style={{ padding: '6px 10px', fontSize: '13px', whiteSpace: 'nowrap' }}
                      title={`Delete ${fileName} from server`}
                      onClick={() => handleDeleteUploadedDataset(fileName)}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            )}

            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                {availableDatasets.length > 0 ? 'Or upload a new CSV file:' : 'Upload CSV file:'}
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="file-input"
              />
            </div>

            {uploading && <span className="upload-status">⏳ Loading & parsing CSV…</span>}
            {uploadError && <span className="upload-error">⚠ {uploadError}</span>}
            {fileName && (
              <div className="dataset-badge" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>📄 {fileName}</span>
                  {params.shape && (
                    <small style={{ display: 'block', color: 'var(--color-text-secondary)' }}>
                      {params.shape[0]} rows × {params.shape[1]} cols
                    </small>
                  )}
                </div>
                {availableDatasets.some(d => d.filename === fileName) && (
                  <button
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                    title={`Delete ${fileName} from server`}
                    onClick={() => handleDeleteUploadedDataset(fileName)}
                  >
                    🗑 Delete CSV
                  </button>
                )}
              </div>
            )}

            {fileName && (
              <button
                type="button"
                className="btn btn--primary"
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={() => openDataViewer({
                  filePath: params.filePath,
                  filename: fileName,
                  targetColumn: params.targetColumn
                })}
              >
                <span>📊</span> View & Explore Dataset
              </button>
            )}
          </div>
        )}

        {/* Render fields */}
        {schema.map(field => {
          // If this is targetColumn on DataLoader and columns are known, show select dropdown
          if (nodeType === 'dataLoader' && field.key === 'targetColumn' && availableCols.length > 0) {
            return (
              <div key={field.key} className="param-row">
                <label>{field.label}</label>
                <select
                  value={params.targetColumn || ''}
                  onChange={e => {
                    const newTarget = e.target.value
                    const currentDrops = Array.isArray(params.dropColumns) ? params.dropColumns : []
                    const updatedDrops = currentDrops.filter(c => c !== newTarget)
                    setParams(prev => {
                      const next = { ...prev, targetColumn: newTarget, dropColumns: updatedDrops }
                      updateNodeParams(node.id, next)
                      return next
                    })
                  }}
                >
                  <option value="">-- Select Target Column --</option>
                  {availableCols.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            )
          }

          // If this is dropColumns on DataLoader and columns are known
          if (nodeType === 'dataLoader' && field.key === 'dropColumns') {
            if (!availableCols || availableCols.length === 0) return null
            const candidateDropCols = availableCols.filter(c => c !== params.targetColumn)
            const dropped = Array.isArray(params.dropColumns) ? params.dropColumns : []

            return (
              <div key={field.key} className="param-row">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>
                    {field.label}
                    {dropped.length > 0 && (
                      <span style={{ fontSize: '11px', color: '#f59e0b', marginLeft: '6px', fontWeight: 600 }}>
                        ({dropped.length} excluded)
                      </span>
                    )}
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                      onClick={() => {
                        const autoIds = detectIdColumns(candidateDropCols, params.targetColumn)
                        handleChange('dropColumns', autoIds)
                      }}
                    >
                      Auto ID
                    </button>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-secondary)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                      onClick={() => handleChange('dropColumns', [])}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  background: 'rgba(15, 23, 42, 0.45)',
                  border: '1px solid var(--color-border, #334155)',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {candidateDropCols.map(col => {
                    const isChecked = dropped.includes(col)
                    const isAutoId = COMMON_ID_NAMES.includes(col.trim().toLowerCase())
                    return (
                      <label
                        key={col}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          background: isChecked ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                          color: isChecked ? '#fca5a5' : 'inherit'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...dropped, col]
                              : dropped.filter(c => c !== col)
                            handleChange('dropColumns', next)
                          }}
                        />
                        <span style={{ flex: 1, fontFamily: 'monospace' }}>{col}</span>
                        {isAutoId && (
                          <span style={{
                            fontSize: '10px',
                            background: 'rgba(245, 158, 11, 0.2)',
                            color: '#f59e0b',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontWeight: 600
                          }}>
                            ID
                          </span>
                        )}
                        {isChecked && (
                          <span style={{ fontSize: '10px', color: '#ef4444', fontStyle: 'italic' }}>
                            drop
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
                <small style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Excluded columns will not be trained on and won't appear as inputs in testing.
                </small>
              </div>
            )
          }

          // If fillValue on Imputer and strategy != 'constant', hide it
          if (nodeType === 'imputer' && field.key === 'fillValue' && params.strategy !== 'constant') {
            return null
          }

          // If this is columns on Encoder or Imputer node
          if ((nodeType === 'encoder' || nodeType === 'imputer') && field.key === 'columns') {
            const isImputer = nodeType === 'imputer'
            const selectedCols = Array.isArray(params.columns)
              ? params.columns
              : (typeof params.columns === 'string' && params.columns.trim()
                  ? params.columns.split(',').map(s => s.trim()).filter(Boolean)
                  : [])

            if (encoderCandidateCols.length > 0) {
              return (
                <div key={field.key} className="param-row">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>{field.label}</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                        onClick={() => handleChange('columns', [...encoderCandidateCols])}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-secondary)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                        onClick={() => handleChange('columns', [])}
                      >
                        Auto (None)
                      </button>
                    </div>
                  </div>

                  <div style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    background: 'rgba(15, 23, 42, 0.45)',
                    border: '1px solid var(--color-border, #334155)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    {encoderCandidateCols.map(col => {
                      const isChecked = selectedCols.includes(col)
                      return (
                        <label
                          key={col}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            background: isChecked ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                            color: isChecked ? '#38bdf8' : 'inherit',
                            transition: 'background 0.15s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const next = e.target.checked
                                ? [...selectedCols, col]
                                : selectedCols.filter(c => c !== col)
                              handleChange('columns', next)
                            }}
                          />
                          <span style={{ flex: 1, fontWeight: isChecked ? 600 : 400 }}>{col}</span>
                        </label>
                      )
                    })}
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '5px', display: 'block' }}>
                    {selectedCols.length === 0
                      ? (isImputer
                          ? '✨ Auto mode: Automatically detects & imputes all columns with missing values.'
                          : '✨ Auto mode: Automatically encodes all categorical (object/text) columns.')
                      : `Selected ${selectedCols.length} of ${encoderCandidateCols.length} feature columns.`
                    }
                  </span>
                  {dataLoaderTarget && (
                    <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                      (Target column &quot;{dataLoaderTarget}&quot; is excluded)
                    </span>
                  )}
                </div>
              )
            }

            return (
              <div key={field.key} className="param-row">
                <label>{field.label}</label>
                <input
                  type="text"
                  placeholder={isImputer ? 'e.g. total_bedrooms (leave blank for auto)' : 'e.g. Sex, Embarked (leave blank for auto)'}
                  value={Array.isArray(params.columns) ? params.columns.join(', ') : (params.columns || '')}
                  onChange={e => {
                    const raw = e.target.value
                    const list = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : []
                    handleChange('columns', list)
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
                  {isImputer
                    ? '💡 Leave empty to auto-detect columns with missing values, or upload a dataset in Data Loader to pick columns visually.'
                    : '💡 Leave empty to auto-detect categorical columns, or upload a dataset in Data Loader to pick columns visually.'}
                </span>
              </div>
            )
          }

          // If this is metrics on Evaluator node
          if (nodeType === 'evaluator' && field.key === 'metrics') {
            const selectedMetrics = Array.isArray(params.metrics) ? params.metrics : (field.default || ['accuracy', 'f1'])

            const classificationMetrics = [
              { key: 'accuracy',  name: 'Accuracy',  desc: 'Overall % of correct predictions' },
              { key: 'f1',        name: 'F1 Score',  desc: 'Harmonic mean of precision & recall' },
              { key: 'precision', name: 'Precision', desc: 'Ratio of true positives to all predicted positives' },
              { key: 'recall',    name: 'Recall',    desc: 'Ratio of true positives to actual positives' },
            ]

            const regressionMetrics = [
              { key: 'rmse', name: 'RMSE',     desc: 'Root Mean Squared Error (in target units)' },
              { key: 'mae',  name: 'MAE',      desc: 'Mean Absolute Error (average magnitude)' },
              { key: 'r2',   name: 'R² Score', desc: 'Variance explained by model (max 1.0)' },
            ]

            const isClassification = upstreamTask === 'classification'
            const isRegression     = upstreamTask === 'regression'

            const toggleMetric = (key) => {
              const next = selectedMetrics.includes(key)
                ? selectedMetrics.filter(k => k !== key)
                : [...selectedMetrics, key]
              handleChange('metrics', next)
            }

            const setOnlyGroup = (group) => {
              const keys = group.map(m => m.key)
              handleChange('metrics', keys)
            }

            const selectAllGroup = (group) => {
              const keys = group.map(m => m.key)
              const next = Array.from(new Set([...selectedMetrics, ...keys]))
              handleChange('metrics', next)
            }

            const clearGroup = (group) => {
              const keys = group.map(m => m.key)
              const next = selectedMetrics.filter(k => !keys.includes(k))
              handleChange('metrics', next)
            }

            return (
              <div key={field.key} className="param-row" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>{field.label}</label>

                {/* Model context badge and quick preset */}
                {upstreamTask && (
                  <div style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isClassification ? 'rgba(56, 189, 248, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                    border: `1px solid ${isClassification ? 'rgba(56, 189, 248, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '11px', color: isClassification ? '#38bdf8' : '#c084fc', fontWeight: 600 }}>
                      {isClassification ? '🏷️ Classifier Connected' : '📈 Regressor Connected'}
                    </span>
                    <button
                      type="button"
                      style={{
                        background: isClassification ? '#0284c7' : '#9333ea',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                      onClick={() => setOnlyGroup(isClassification ? classificationMetrics : regressionMetrics)}
                    >
                      ⚡ Apply Recommended {isClassification ? 'Classification' : 'Regression'} Metrics
                    </button>
                  </div>
                )}

                {/* 1. Classification Metrics Group */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.45)',
                  border: '1px solid var(--color-border, #334155)',
                  borderRadius: '8px',
                  padding: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        🏷️ Classification Metrics
                      </span>
                      {isClassification && (
                        <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px' }}>
                          Recommended
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                        onClick={() => selectAllGroup(classificationMetrics)}
                      >
                        All
                      </button>
                      <span style={{ color: 'var(--color-border)', fontSize: '11px' }}>|</span>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                        onClick={() => clearGroup(classificationMetrics)}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {classificationMetrics.map(m => {
                      const isChecked = selectedMetrics.includes(m.key)
                      return (
                        <label
                          key={m.key}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            background: isChecked ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                        >
                          <input
                            type="checkbox"
                            style={{ marginTop: '3px' }}
                            checked={isChecked}
                            onChange={() => toggleMetric(m.key)}
                          />
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: isChecked ? 600 : 400, color: isChecked ? '#38bdf8' : 'inherit' }}>
                              {m.name}
                            </span>
                            <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                              {m.desc}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Regression Metrics Group */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.45)',
                  border: '1px solid var(--color-border, #334155)',
                  borderRadius: '8px',
                  padding: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        📈 Regression Metrics
                      </span>
                      {isRegression && (
                        <span style={{ fontSize: '10px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '1px 5px', borderRadius: '4px' }}>
                          Recommended
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#c084fc', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                        onClick={() => selectAllGroup(regressionMetrics)}
                      >
                        All
                      </button>
                      <span style={{ color: 'var(--color-border)', fontSize: '11px' }}>|</span>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                        onClick={() => clearGroup(regressionMetrics)}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {regressionMetrics.map(m => {
                      const isChecked = selectedMetrics.includes(m.key)
                      return (
                        <label
                          key={m.key}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            background: isChecked ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                        >
                          <input
                            type="checkbox"
                            style={{ marginTop: '3px' }}
                            checked={isChecked}
                            onChange={() => toggleMetric(m.key)}
                          />
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: isChecked ? 600 : 400, color: isChecked ? '#c084fc' : 'inherit' }}>
                              {m.name}
                            </span>
                            <span style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                              {m.desc}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  Selected: {selectedMetrics.length > 0 ? selectedMetrics.join(', ') : 'None'}
                </span>
              </div>
            )
          }

          return (
            <ParamField
              key={field.key}
              field={field}
              value={params[field.key]}
              onChange={handleChange}
            />
          )
        })}

        {schema.length === 0 && nodeType !== 'dataLoader' && (
          <p className="config-panel__no-params">No parameters to configure.</p>
        )}
      </div>

      {/* Show execution result if available */}
      {node.data?.results && (
        <div className="config-panel__results">
          <h4>Last Result</h4>
          {node.data.results.imageBase64 ? (
            <div className="result-image-box">
              <img
                src={`data:image/png;base64,${node.data.results.imageBase64}`}
                alt="Confusion Matrix"
                className="result-image-thumb"
              />
              <span className="result-success-tag">✓ Matrix Generated</span>
            </div>
          ) : node.data.results.error ? (
            <div className="upload-error">
              ⚠ {node.data.results.error}
            </div>
          ) : (
            <div className="result-metrics-list">
              {Object.entries(node.data.results)
                .filter(([k]) => k !== 'imageBase64' && k !== 'type')
                .map(([k, v]) => (
                  <div key={k} className="result-metric-row">
                    <span className="metric-name">{k}:</span>
                    <strong className="metric-val">
                      {typeof v === 'number'
                        ? (v <= 1 && v >= 0 && !Number.isInteger(v) ? `${(v * 100).toFixed(1)}%` : v)
                        : (Array.isArray(v) ? v.join(', ') : String(v))}
                    </strong>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

export default ConfigPanel
