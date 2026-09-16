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
  }
  return map[raw] || raw
}

function ConfusionMatrixNode({ id, data }) {
  const { nodes, edges } = useGraphStore()
  const imageBase64 = data?.results?.imageBase64
  let algoName = data?.results?.modelName ? formatAlgoName(data.results.modelName) : ''

  if (!algoName) {
    const traceUpstream = (targetId, visited = new Set()) => {
      if (visited.has(targetId)) return ''
      visited.add(targetId)
      const incoming = edges.filter(e => e.target === targetId)
      for (const edge of incoming) {
        const src = nodes.find(n => n.id === edge.source)
        if (src?.data?.nodeType === 'classifier') {
          return formatAlgoName(src.data.params?.classifierType || 'DecisionTree')
        }
        const parentAlgo = traceUpstream(edge.source, visited)
        if (parentAlgo) return parentAlgo
      }
      return ''
    }
    algoName = traceUpstream(id)
  }

  const title = algoName ? `Confusion Matrix (${algoName})` : 'Confusion Matrix'

  return (
    <BaseNode id={id} data={data} category="evaluate" label={title} hasOutput={false}>
      {algoName && (
        <p className="node-info" style={{ color: '#c084fc', fontWeight: 600, textAlign: 'center', marginBottom: '6px' }}>
          {algoName}
        </p>
      )}
      {imageBase64
        ? <img
            src={`data:image/png;base64,${imageBase64}`}
            alt={title}
            className="node-image"
          />
        : <p className="node-placeholder">Run pipeline to see chart</p>
      }
    </BaseNode>
  )
}
export default ConfusionMatrixNode
