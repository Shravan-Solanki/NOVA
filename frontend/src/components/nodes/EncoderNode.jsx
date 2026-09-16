import React from 'react'
import BaseNode from './BaseNode'

function EncoderNode({ id, data }) {
  const encoderType = data?.params?.encoderType || 'OneHotEncoder'
  const cols = data?.params?.columns
  const hasCustomCols = Array.isArray(cols) && cols.length > 0

  return (
    <BaseNode id={id} data={data} category="preprocess" label="Encoder">
      <p className="node-info">{encoderType}</p>
      {hasCustomCols ? (
        <p className="node-info" style={{ fontSize: '11px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cols.join(', ')}>
          Cols: {cols.join(', ')}
        </p>
      ) : (
        <p className="node-info" style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
          Cols: Auto (Categorical)
        </p>
      )}
      {data?.results?.encodedColumns && (
        <p className="node-info" style={{ fontSize: '10px', color: '#10b981' }}>
          Encoded: {data.results.encodedColumns.join(', ')}
        </p>
      )}
    </BaseNode>
  )
}
export default EncoderNode
