// src/store/graphStore.js
// Global Zustand store — single source of truth for the pipeline graph state

import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'

// ─── STORE ────────────────────────────────────────────────────────────────────
const useGraphStore = create((set, get) => ({

  // ── STATE ──────────────────────────────────────────────────────────────────
  nodes:          [],
  edges:          [],
  selectedNodeId: null,
  isRunning:      false,   // true while waiting for /api/execute response
  pipelineName:   'Untitled Pipeline',
  executionResults: null,  // full backend execution response
  executionError:   null,  // error message if run fails
  viewDataModal:    null,  // { filePath, filename, targetColumn } when modal is open
  isTestModelOpen:  false, // true when model testing modal is open
  isExportModalOpen: false, // true when download/export choices modal is open

  // ── REACT FLOW HANDLERS ───────────────────────────────────────────────────
  // These two must use applyNodeChanges/applyEdgeChanges to support
  // React Flow's built-in drag, select, and delete interactions
  onNodesChange: (changes) =>
    set(state => ({ nodes: applyNodeChanges(changes, state.nodes) })),

  onEdgesChange: (changes) =>
    set(state => ({ edges: applyEdgeChanges(changes, state.edges) })),

  onConnect: (connection) =>
    set(state => ({
      edges: [...state.edges, { ...connection, id: `e-${Date.now()}`, type: 'removable' }]
    })),

  deleteEdge: (edgeId) =>
    set(state => ({
      edges: state.edges.filter(e => e.id !== edgeId)
    })),

  // ── NODE ACTIONS ──────────────────────────────────────────────────────────
  addNode: (node) =>
    set(state => ({ nodes: [...state.nodes, node] })),

  // Updates the params dict stored in node.data (called from ConfigPanel)
  updateNodeParams: (nodeId, params) =>
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, params } } : n
      )
    })),

  // Updates the execution status badge on each node card ('idle'|'running'|'success'|'error')
  updateNodeStatus: (nodeId, status) =>
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, status } } : n
      )
    })),

  // Stores metrics/images returned from the backend onto the node's data
  updateNodeResults: (nodeId, results) =>
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, results } } : n
      )
    })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  // ── PIPELINE ACTIONS ──────────────────────────────────────────────────────
  setIsRunning:         (val)  => set({ isRunning: val }),
  setPipelineName:      (name) => set({ pipelineName: name }),
  setExecutionResults:  (res)  => set({ executionResults: res }),
  setExecutionError:    (err)  => set({ executionError: err }),
  openDataViewer:       (dataInfo) => set({ viewDataModal: dataInfo }),
  closeDataViewer:      ()         => set({ viewDataModal: null }),

  clearCanvas: () =>
    set({ nodes: [], edges: [], selectedNodeId: null, executionResults: null, executionError: null, pipelineName: 'Untitled Pipeline' }),

  newPipeline: () =>
    set({
      nodes:            [],
      edges:            [],
      selectedNodeId:   null,
      executionResults: null,
      executionError:   null,
      pipelineName:     'Untitled Pipeline',
    }),

  // Serializes current graph to plain JSON for backend execution / export
  serializeGraph: () => {
    const { nodes, edges, pipelineName } = get()
    // Extract only what the backend needs: id, type, params
    const backendNodes = nodes.map(n => ({
      id:     n.id,
      type:   n.data?.nodeType || n.type,   // e.g. 'dataLoader', 'classifier'
      params: n.data?.params || {}
    }))
    const backendEdges = edges.map(e => ({
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null
    }))
    return { pipelineName, nodes: backendNodes, edges: backendEdges }
  },

  // Serializes full canvas state (including node positions, labels, styles) for saving to disk
  serializeGraphForSave: () => {
    const { nodes, edges, pipelineName } = get()
    return {
      pipelineName,
      nodes: nodes.map(n => ({
        id:       n.id,
        type:     n.type || n.data?.nodeType,
        position: n.position,
        data:     n.data,
      })),
      edges: edges.map(e => ({
        id:           e.id,
        source:       e.source,
        target:       e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
        type:         e.type || 'removable',
      }))
    }
  },

  // Restores graph from a saved JSON (supports both full and compact formats)
  loadGraph: (graphJSON) => {
    const rawNodes = graphJSON.nodes || []
    const rawEdges = graphJSON.edges || []

    const normalizedNodes = rawNodes.map((n, i) => {
      const nodeType = n.data?.nodeType || n.type || 'dataLoader'
      const pos = n.position && (n.position.x !== undefined)
        ? n.position
        : { x: 80 + (i % 3) * 320, y: 100 + Math.floor(i / 3) * 200 }

      const params = n.data?.params || n.params || {}
      const label  = n.data?.label || (nodeType.charAt(0).toUpperCase() + nodeType.slice(1))

      return {
        id:       n.id,
        type:     nodeType,
        position: pos,
        data: {
          label,
          nodeType,
          params,
          status:  'idle',
          results: null,
          ...(n.data || {}),
        }
      }
    })

    const normalizedEdges = rawEdges.map((e, i) => ({
      id:           e.id || `e-${Date.now()}-${i}`,
      source:       e.source,
      target:       e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
      type:         'removable',
    }))

    set({
      nodes:            normalizedNodes,
      edges:            normalizedEdges,
      pipelineName:     graphJSON.pipelineName || 'Untitled Pipeline',
      selectedNodeId:   null,
      executionResults: null,
      executionError:   null,
    })
  },

  openTestModel:    () => set({ isTestModelOpen: true }),
  closeTestModel:   () => set({ isTestModelOpen: false }),
  openExportModal:  () => set({ isExportModalOpen: true }),
  closeExportModal: () => set({ isExportModalOpen: false }),
}))

export default useGraphStore
