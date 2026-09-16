// src/pages/EditorPage.jsx
// The main canvas page — the full pipeline editor

import React, { useState, useCallback, useRef } from 'react'
import '../styles/nodes.css'
import '../styles/sidebar.css'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// Custom node components
import DataLoaderNode     from '../components/nodes/DataLoaderNode'
import TrainTestSplitNode from '../components/nodes/TrainTestSplitNode'
import ScalerNode         from '../components/nodes/ScalerNode'
import EncoderNode        from '../components/nodes/EncoderNode'
import ImputerNode        from '../components/nodes/ImputerNode'
import ClassifierNode     from '../components/nodes/ClassifierNode'
import RegressorNode      from '../components/nodes/RegressorNode'
import EvaluatorNode      from '../components/nodes/EvaluatorNode'
import ConfusionMatrixNode from '../components/nodes/ConfusionMatrixNode'

// UI panels
import NodePalette   from '../components/sidebar/NodePalette'
import ConfigPanel   from '../components/panels/ConfigPanel'
import TopToolbar    from '../components/toolbar/TopToolbar'
import ResultsPanel  from '../components/panels/ResultsPanel'
import DataViewerModal from '../components/panels/DataViewerModal'
import ModelTestModal from '../components/panels/ModelTestModal'
import ExportModal from '../components/panels/ExportModal'
import { createNodeDefaults } from '../utils/graphHelpers'
import useExecutePipeline from '../hooks/useExecutePipeline'

// Zustand store
import useGraphStore from '../store/graphStore'

import RemovableEdge from '../components/edges/RemovableEdge'

// ─── React Flow node type registry ───────────────────────────────────────────
// Must be defined OUTSIDE the component to prevent re-renders
const nodeTypes = {
  dataLoader:     DataLoaderNode,
  trainTestSplit: TrainTestSplitNode,
  imputer:        ImputerNode,
  scaler:         ScalerNode,
  encoder:        EncoderNode,
  classifier:     ClassifierNode,
  regressor:      RegressorNode,
  evaluator:      EvaluatorNode,
  confusionMatrix: ConfusionMatrixNode,
}

const edgeTypes = {
  removable: RemovableEdge,
}

// ─── EditorPage ──────────────────────────────────────────────────────────────
function EditorPage({ onHome }) {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, deleteEdge, setSelectedNodeId, selectedNodeId,
    viewDataModal, closeDataViewer,
    isTestModelOpen, closeTestModel,
    isExportModalOpen, closeExportModal
  } = useGraphStore()

  const [selectedNode, setSelectedNode]     = useState(null)
  const [showResults,  setShowResults]      = useState(false)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const reactFlowWrapper = useRef(null)
  const { run, results, error } = useExecutePipeline()

  // ── Node click → show ConfigPanel ───────────────────────────────────────
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node)
    setSelectedNodeId(node.id)
  }, [setSelectedNodeId])

  // ── Pane click → deselect ────────────────────────────────────────────────
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setSelectedNodeId(null)
  }, [setSelectedNodeId])

  // ── Drag over — allow the drop ───────────────────────────────────────────
  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // ── Drop — create new node at cursor position ────────────────────────────
  const onDrop = useCallback((event) => {
    event.preventDefault()

    const type  = event.dataTransfer.getData('application/reactflow/type')
    const label = event.dataTransfer.getData('application/reactflow/label')
    if (!type || !reactFlowInstance) return

    // Convert screen position to React Flow canvas position
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    // Build new node with proper default params for its type
    const newNode = {
      ...createNodeDefaults(type, position),
      data: {
        ...createNodeDefaults(type, position).data,
        label,
      },
    }

    addNode(newNode)
  }, [reactFlowInstance, addNode])

  // ── Sync selectedNode from store when nodes change ───────────────────────
  // (so ConfigPanel reflects latest data after params are updated)
  const currentSelectedNode = selectedNodeId
    ? nodes.find(n => n.id === selectedNodeId) || null
    : null

  return (
    <div className="editor-layout">
      {/* Left sidebar — draggable node palette */}
      <NodePalette />

      {/* Center — toolbar + canvas */}
      <div className="canvas-area" ref={reactFlowWrapper}>
        <TopToolbar onRunSuccess={() => setShowResults(true)} onHome={onHome} />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'removable' }}
          onEdgeContextMenu={(event, edge) => {
            event.preventDefault()
            deleteEdge(edge.id)
          }}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background variant="dots" gap={16} size={1} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
        </ReactFlow>
      </div>

      {/* Right panel — node config */}
      {currentSelectedNode && (
        <ConfigPanel
          node={currentSelectedNode}
          onClose={() => { setSelectedNode(null); setSelectedNodeId(null) }}
        />
      )}

      {/* Results overlay — shown after successful run */}
      {results && showResults && (
        <ResultsPanel results={results} onClose={() => setShowResults(false)} />
      )}

      {/* Dataset explorer overlay */}
      {viewDataModal && (
        <DataViewerModal
          dataInfo={viewDataModal}
          onClose={closeDataViewer}
        />
      )}

      {/* Live Model Testing modal */}
      {isTestModelOpen && (
        <ModelTestModal onClose={closeTestModel} />
      )}

      {/* Save & Download Options modal */}
      {isExportModalOpen && (
        <ExportModal onClose={closeExportModal} />
      )}
    </div>
  )
}

export default EditorPage
