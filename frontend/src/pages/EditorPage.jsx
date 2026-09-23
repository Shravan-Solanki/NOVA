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
import GuidedTour, { STORAGE_KEY as TOUR_KEY } from '../components/GuidedTour'
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
    isExportModalOpen, closeExportModal,
    isResultsOpen, openResults, closeResults, executionResults
  } = useGraphStore()

  const [selectedNode, setSelectedNode]     = useState(null)
  const [showResults,  setShowResults]      = useState(false)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [showTour, setShowTour] = useState(() => !localStorage.getItem(TOUR_KEY))
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
      {/* Top Header Bar spanning full width across the app */}
      <TopToolbar
        onRunSuccess={() => setShowResults(true)}
        onHome={onHome}
        onStartTour={() => setShowTour(true)}
      />

      <div className="editor-body">
        {/* Left sidebar — draggable node palette */}
        <NodePalette />

        {/* Center — canvas */}
        <div className="canvas-area" ref={reactFlowWrapper}>
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

          {/* Floating quick-access badge for cached results */}
          {(results || executionResults) && !(showResults || isResultsOpen) && (
            <button
              onClick={openResults}
              id="canvas-view-results-btn"
              title="View latest pipeline results without re-running"
              style={{
                position: 'absolute',
                bottom: '24px',
                right: '24px',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                color: '#38bdf8',
                backdropFilter: 'blur(10px)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '14px' }}>📊</span>
              <span>View Results (Cached)</span>
            </button>
          )}
        </div>

        {/* Right panel — node config */}
        {currentSelectedNode && (
          <ConfigPanel
            node={currentSelectedNode}
            onClose={() => { setSelectedNode(null); setSelectedNodeId(null) }}
          />
        )}
      </div>

      {/* Results overlay — shown after successful run or via View Results */}
      {(results || executionResults) && (showResults || isResultsOpen) && (
        <ResultsPanel
          results={results || executionResults}
          onClose={() => {
            setShowResults(false)
            closeResults()
          }}
        />
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

      {/* Guided Tour overlay */}
      {showTour && (
        <GuidedTour onFinish={() => setShowTour(false)} />
      )}
    </div>
  )
}

export default EditorPage
