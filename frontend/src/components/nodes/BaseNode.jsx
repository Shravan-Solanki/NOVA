// src/components/nodes/BaseNode.jsx
// Shared wrapper for all custom React Flow nodes
// Handles: status border color, connection handles, label, status badge

import React from 'react'
import { Handle, Position } from '@xyflow/react'

// Status → CSS class mapping
const STATUS_CLASS = {
  idle:    '',
  running: 'node--running',
  success: 'node--success',
  error:   'node--error',
}

// Node category → accent color class
const CATEGORY_CLASS = {
  data:       'node--data',
  preprocess: 'node--preprocess',
  model:      'node--model',
  evaluate:   'node--evaluate',
}

function BaseNode({
  id,
  data,
  category = 'data',
  label,
  hasInput  = true,
  hasOutput = true,
  children,
}) {
  const status    = data?.status || 'idle'
  const statusCls = STATUS_CLASS[status] || ''
  const catCls    = CATEGORY_CLASS[category] || ''

  return (
    <div className={`flow-node ${catCls} ${statusCls}`}>
      {/* Incoming connection handle (left side) */}
      {hasInput && (
        <Handle type="target" position={Position.Left} className="handle handle--input" />
      )}

      {/* Node header */}
      <div className="flow-node__header">
        <span className="flow-node__label">{label || data?.label}</span>
        {status !== 'idle' && (
          <span className={`flow-node__badge flow-node__badge--${status}`}>
            {status === 'running' ? '⏳' : status === 'success' ? '✓' : '✗'}
          </span>
        )}
      </div>

      {/* Node body — specific content passed from child component */}
      <div className="flow-node__body">
        {children}
      </div>

      {/* Outgoing connection handle (right side) */}
      {hasOutput && (
        <Handle type="source" position={Position.Right} className="handle handle--output" />
      )}
    </div>
  )
}

export default BaseNode
