// src/components/edges/RemovableEdge.jsx
// Interactive edge that displays a delete button (×) on hover or selection,
// allowing users to easily delete/undo connections between nodes.

import React from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import useGraphStore from '../../store/graphStore'

export default function RemovableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}) {
  const { deleteEdge } = useGraphStore()
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
        className={selected ? 'selected' : ''}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="edge-delete-container"
        >
          <button
            className="edge-delete-btn"
            onClick={(evt) => {
              evt.stopPropagation()
              deleteEdge(id)
            }}
            title="Click to remove connection"
            aria-label="Delete edge"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
