import React from 'react'
import BaseNode from './BaseNode'

function ScalerNode({ id, data }) {
  const scalerType = data?.params?.scalerType || 'StandardScaler'
  return (
    <BaseNode id={id} data={data} category="preprocess" label="Scaler">
      <p className="node-info">{scalerType}</p>
    </BaseNode>
  )
}
export default ScalerNode
