import React from 'react'
import BaseNode from './BaseNode'
import useGraphStore from '../../store/graphStore'

function DataLoaderNode({ id, data, selected }) {
  const { openDataViewer } = useGraphStore()
  const filePath = data?.params?.filePath
  const fileName = filePath ? filePath.split(/[\\/]/).pop() : null
  const target   = data?.params?.targetColumn
  const shape    = data?.params?.shape || data?.results?.shape
  const dropCols = data?.params?.dropColumns || data?.results?.droppedColumns || []

  const handleOpenViewer = (e) => {
    e.stopPropagation()
    openDataViewer({ filePath, filename: fileName, targetColumn: target })
  }

  return (
    <BaseNode id={id} data={data} category="data" label="Data Loader" hasInput={false} hasOutput={true}>
      {fileName ? (
        <>
          <p className="node-info" style={{ fontWeight: 600 }}>📄 {fileName}</p>
          {target && <p className="node-info">Target: <strong>{target}</strong></p>}
          {dropCols.length > 0 && (
            <p className="node-info" style={{ color: '#f59e0b', fontSize: '11px' }}>
              Excluded: <strong>{dropCols.length <= 2 ? dropCols.join(', ') : `${dropCols.length} cols`}</strong>
            </p>
          )}
          {shape && (
            <p className="node-info">{shape[0]} rows × {shape[1]} cols</p>
          )}
          <button
            onClick={handleOpenViewer}
            style={{
              marginTop: '6px',
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
          >
            <span>👁️</span> View Data
          </button>
        </>
      ) : (
        <p className="node-placeholder">No CSV uploaded</p>
      )}
    </BaseNode>
  )
}

export default DataLoaderNode
