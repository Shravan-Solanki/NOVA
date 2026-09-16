import React from 'react'
import BaseNode from './BaseNode'
import useGraphStore from '../../store/graphStore'

function ClassifierNode({ id, data }) {
  const { openTestModel } = useGraphStore()
  const clfType = data?.params?.classifierType || 'DecisionTree'
  const classes = data?.results?.classes
  const isTrained = data?.status === 'success'

  return (
    <BaseNode id={id} data={data} category="model" label={`Classifier (${clfType})`}>
      <p className="node-info" style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{clfType}</p>
      {classes && <p className="node-info">Classes: {classes.join(', ')}</p>}

      {isTrained && (
        <div style={{ marginTop: '6px' }}>
          <button
            type="button"
            style={{
              width: '100%',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
            onClick={(e) => { e.stopPropagation(); openTestModel(); }}
          >
            <span>🧪</span> Test Model
          </button>
        </div>
      )}
    </BaseNode>
  )
}
export default ClassifierNode
