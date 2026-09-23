import React from 'react'
import BaseNode from './BaseNode'
import useGraphStore from '../../store/graphStore'

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

function EvaluatorNode({ id, data }) {
  const { nodes, edges } = useGraphStore()
  const results = data?.results

  let algoName = results?.modelName ? formatAlgoName(results.modelName) : ''
  if (!algoName) {
    const incoming = edges.filter(e => e.target === id)
    for (const edge of incoming) {
      const src = nodes.find(n => n.id === edge.source)
      if (src?.data?.nodeType === 'classifier') {
        algoName = formatAlgoName(src.data.params?.classifierType || 'DecisionTree')
        break
      } else if (src?.data?.nodeType === 'regressor') {
        algoName = formatAlgoName(src.data.params?.regressorType || 'LinearRegression')
        break
      }
    }
  }

  const title = algoName ? `Evaluator (${algoName})` : 'Evaluator'

  return (
    <BaseNode id={id} data={data} category="evaluate" label={title}>
      {algoName && (
        <p className="node-info" style={{ color: 'var(--color-accent, #38bdf8)', fontWeight: 600, marginBottom: '6px' }}>
          {algoName}
        </p>
      )}
      {results ? (
        <div className="node-metrics">
          {Object.entries(results)
            .filter(([k, v]) => !['type', 'taskType', 'modelName', 'feature_importances', 'train_score'].includes(k) && typeof v !== 'object' && v != null)
            .map(([k, v]) => (
              <p key={k} className="node-info">
                {k}: <strong>{typeof v === 'number' ? (['accuracy', 'f1', 'precision', 'recall'].includes(k) ? (v * 100).toFixed(1) + '%' : v.toFixed(3)) : String(v)}</strong>
              </p>
            ))}
        </div>
      ) : (
        <p className="node-placeholder">Run pipeline to see metrics</p>
      )}
    </BaseNode>
  )
}
export default EvaluatorNode
