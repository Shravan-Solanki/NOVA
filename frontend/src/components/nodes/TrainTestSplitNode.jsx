import React from 'react'
import BaseNode from './BaseNode'

function TrainTestSplitNode({ id, data }) {
  const testSize = data?.params?.testSize ?? 0.2
  return (
    <BaseNode id={id} data={data} category="preprocess" label="Train/Test Split">
      <p className="node-info">Test size: <strong>{Math.round(testSize * 100)}%</strong></p>
      {data?.results && (
        <p className="node-info">Train: {data.results.train_size} | Test: {data.results.test_size}</p>
      )}
    </BaseNode>
  )
}
export default TrainTestSplitNode
