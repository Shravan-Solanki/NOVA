// src/components/nodes/ImputerNode.jsx
// Visual React Flow card for Imputer / Missing Value Handling node

import React from 'react'
import BaseNode from './BaseNode'

function ImputerNode({ id, data }) {
  const strategy = data?.params?.strategy || 'mean'
  const cols = data?.params?.columns
  const hasCustomCols = Array.isArray(cols) && cols.length > 0

  return (
    <BaseNode id={id} data={data} category="preprocess" label="Imputer">
      <p className="node-info" style={{ fontWeight: 600 }}>Strategy: {strategy}</p>
      {hasCustomCols ? (
        <p className="node-info" style={{ fontSize: '11px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cols.join(', ')}>
          Cols: {cols.join(', ')}
        </p>
      ) : (
        <p className="node-info" style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
          Cols: Auto (Missing)
        </p>
      )}
      {data?.results?.missingCountBefore !== undefined && (
        <p className="node-info" style={{ fontSize: '10px', color: '#10b981' }}>
          Fixed: {data.results.missingCountBefore} nulls
        </p>
      )}
    </BaseNode>
  )
}

export default ImputerNode
