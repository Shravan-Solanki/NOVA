import React from 'react'
import useGraphStore from '../../store/graphStore'

function MetricCard({ label, value }) {
  const formatted = typeof value === 'number'
    ? (value <= 1 ? (value * 100).toFixed(1) + '%' : value.toFixed(3))
    : value
  return (
    <div className="metric-card">
      <span className="metric-card__value">{formatted}</span>
      <span className="metric-card__label">{label}</span>
    </div>
  )
}

function formatAlgoName(raw) {
  if (!raw) return ''
  const map = {
    DecisionTree: 'Decision Tree',
    DecisionTreeClassifier: 'Decision Tree',
    LogisticRegression: 'Logistic Regression',
    KNN: 'KNN',
    KNeighborsClassifier: 'KNN',
    SVM: 'SVM',
    SVC: 'SVM',
    LinearRegression: 'Linear Regression',
    Ridge: 'Ridge Regression',
    Lasso: 'Lasso Regression',
  }
  return map[raw] || raw
}

function ResultsPanel({ results, onClose }) {
  if (!results) return null

  const { nodes, edges, openTestModel, openExportModal } = useGraphStore()
  const nodeResults = results.node_results || {}
  const execOrder   = results.execution_order || []

  const getNodeLabel = (id) => {
    const found = nodes.find(n => n.id === id)
    return found?.data?.label || id
  }

  // Trace back through incoming edges to find the upstream classifier or regressor
  const getUpstreamAlgorithm = (targetId, visited = new Set()) => {
    if (visited.has(targetId)) return null
    visited.add(targetId)

    const incoming = edges.filter(e => e.target === targetId)
    for (const edge of incoming) {
      const sourceNode = nodes.find(n => n.id === edge.source)
      if (!sourceNode) continue

      const nodeType = sourceNode.data?.nodeType || sourceNode.type
      if (nodeType === 'classifier') {
        const rawType = sourceNode.data?.params?.classifierType || 'DecisionTree'
        return {
          type: formatAlgoName(rawType),
          rawType,
          nodeId: sourceNode.id,
          label: sourceNode.data?.label || 'Classifier'
        }
      }
      if (nodeType === 'regressor') {
        const rawType = sourceNode.data?.params?.regressorType || 'LinearRegression'
        return {
          type: formatAlgoName(rawType),
          rawType,
          nodeId: sourceNode.id,
          label: sourceNode.data?.label || 'Regressor'
        }
      }
      // If connected to an evaluator, traverse further upstream
      const upstream = getUpstreamAlgorithm(sourceNode.id, visited)
      if (upstream) return upstream
    }
    return null
  }

  const getAlgorithmDisplay = (nodeId, meta) => {
    const upstream = getUpstreamAlgorithm(nodeId)
    const backendModel = meta?.modelName ? formatAlgoName(meta.modelName) : null
    const algoName = backendModel || upstream?.type || 'Model'
    return {
      algoName,
      nodeId,
      nodeLabel: getNodeLabel(nodeId),
      upstreamLabel: upstream?.label
    }
  }

  // Find all evaluator and confusion matrix results
  const evaluatorEntries = Object.entries(nodeResults).filter(([_, r]) => r?.type === 'metrics')
  const imageEntries     = Object.entries(nodeResults).filter(([_, r]) => r?.type === 'image' && r?.imageBase64)
  const taskType         = evaluatorEntries[0]?.[1]?.taskType

  return (
    <div className="results-overlay">
      <div className="results-panel">
        {/* Header */}
        <div className="results-panel__header">
          <div>
            <h2>Pipeline Results</h2>
            {taskType && (
              <span className="results-task-type">{taskType}</span>
            )}
          </div>
          <button className="results-panel__close" onClick={onClose}>×</button>
        </div>

        {/* Action bar: Live Testing & Multi-Format Download Options */}
        <div style={{
          display: 'flex',
          gap: '10px',
          padding: '12px 18px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid var(--color-border, #334155)',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <button
            type="button"
            className="btn btn--primary"
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={openTestModel}
          >
            <span>🧪</span> Test Model with Custom Input
          </button>

          <button
            type="button"
            className="btn btn--secondary"
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={openExportModal}
          >
            <span>💾</span> Save &amp; Download Options (.joblib, Python code, ZIP)
          </button>
        </div>

        {/* Evaluator Metrics (Shows clear algorithm name and compares multiple models) */}
        {evaluatorEntries.map(([nodeId, meta], idx) => {
          const metrics = Object.entries(meta).filter(([k]) => !['type', 'taskType', 'modelName'].includes(k))
          const { algoName, nodeLabel } = getAlgorithmDisplay(nodeId, meta)

          return (
            <section key={nodeId} className="results-section">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Performance Metrics</span>
                  {evaluatorEntries.length > 1 && (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                      (Model #{idx + 1})
                    </span>
                  )}
                </h3>

                <span style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} />
                  {algoName}
                </span>
              </div>

              <div className="metrics-grid">
                {metrics.map(([k, v]) => (
                  <MetricCard key={k} label={k} value={v} />
                ))}
              </div>
            </section>
          )
        })}

        {/* Confusion Matrices (Shows clear algorithm name and compares multiple matrices) */}
        {imageEntries.map(([nodeId, meta], idx) => {
          const { algoName, nodeLabel } = getAlgorithmDisplay(nodeId, meta)

          return (
            <section key={nodeId} className="results-section">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Confusion Matrix</span>
                  {imageEntries.length > 1 && (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                      (Model #{idx + 1})
                    </span>
                  )}
                </h3>

                <span style={{
                  background: 'rgba(168, 85, 247, 0.12)',
                  color: '#c084fc',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c084fc' }} />
                  {algoName}
                </span>
              </div>

              <img
                src={`data:image/png;base64,${meta.imageBase64}`}
                alt={`Confusion Matrix - ${algoName}`}
                className="results-image"
              />
            </section>
          )
        })}

        {/* Execution Log */}
        <section className="results-section">
          <h3>Execution Log</h3>
          <div className="exec-log">
            {execOrder.map((nodeId, i) => {
              const meta = nodeResults[nodeId]
              const isError = meta?.error
              const { algoName } = getAlgorithmDisplay(nodeId, meta)
              const typeDesc = meta?.type
                ? (algoName && algoName !== 'Model' && !['dataLoader', 'trainTestSplit', 'scaler', 'encoder', 'imputer'].includes(meta.type)
                    ? `${meta.type} (${algoName})`
                    : meta.type)
                : ''

              return (
                <div key={nodeId} className={`exec-log__item ${isError ? 'exec-log__item--error' : ''}`}>
                  <span className="exec-log__icon">{isError ? '✗' : '✓'}</span>
                  <span className="exec-log__id">{nodeId}</span>
                  <span className="exec-log__type">{typeDesc}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ResultsPanel
