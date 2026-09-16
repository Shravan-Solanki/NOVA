// src/components/sidebar/NodePalette.jsx
// Left sidebar — draggable node cards the user drags onto the canvas

import React from 'react'

// All available node types, grouped by category
const NODE_GROUPS = [
  {
    label: 'Data',
    color: 'group--data',
    nodes: [
      { type: 'dataLoader', label: 'Data Loader', description: 'Load a CSV file' },
    ]
  },
  {
    label: 'Preprocessing',
    color: 'group--preprocess',
    nodes: [
      { type: 'trainTestSplit', label: 'Train/Test Split', description: 'Split dataset' },
      { type: 'imputer',        label: 'Imputer',          description: 'Handle missing / null values' },
      { type: 'scaler',         label: 'Scaler',           description: 'Normalize features' },
      { type: 'encoder',        label: 'Encoder',          description: 'Encode categorical cols' },
    ]
  },
  {
    label: 'Models',
    color: 'group--model',
    nodes: [
      { type: 'classifier', label: 'Classifier', description: 'Train a classifier' },
      { type: 'regressor',  label: 'Regressor',  description: 'Train a regressor' },
    ]
  },
  {
    label: 'Evaluation',
    color: 'group--evaluate',
    nodes: [
      { type: 'evaluator',      label: 'Evaluator',       description: 'Compute metrics' },
      { type: 'confusionMatrix', label: 'Confusion Matrix', description: 'Visualize predictions' },
    ]
  },
]

// Each draggable card — sets dataTransfer so EditorPage's onDrop can read the type
function PaletteCard({ type, label, description }) {
  const onDragStart = (e) => {
    e.dataTransfer.setData('application/reactflow/type',  type)
    e.dataTransfer.setData('application/reactflow/label', label)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className="palette-card"
      draggable
      onDragStart={onDragStart}
      title={description}
    >
      <span className="palette-card__label">{label}</span>
      <span className="palette-card__desc">{description}</span>
    </div>
  )
}

function NodePalette() {
  return (
    <aside className="node-palette">
      <div className="node-palette__header">
        <h2>Nodes</h2>
        <p>Drag onto canvas</p>
      </div>

      {NODE_GROUPS.map(group => (
        <div key={group.label} className={`palette-group ${group.color}`}>
          <h3 className="palette-group__label">{group.label}</h3>
          {group.nodes.map(node => (
            <PaletteCard key={node.type} {...node} />
          ))}
        </div>
      ))}
    </aside>
  )
}

export default NodePalette
