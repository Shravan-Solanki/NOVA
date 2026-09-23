// src/store/graphStore.js
// Global Zustand store — single source of truth for the pipeline graph state

import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import { clearModelBundle } from '../api/api'

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
  isResultsOpen:    false, // true when full pipeline results modal is open

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

  clearCanvas: () => {
    clearModelBundle().catch(() => {})
    set({ nodes: [], edges: [], selectedNodeId: null, executionResults: null, executionError: null, isResultsOpen: false, pipelineName: 'Untitled Pipeline' })
  },

  newPipeline: () => {
    clearModelBundle().catch(() => {})
    set({
      nodes:            [],
      edges:            [],
      selectedNodeId:   null,
      executionResults: null,
      executionError:   null,
      isResultsOpen:    false,
      pipelineName:     'Untitled Pipeline',
    })
  },

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

    clearModelBundle().catch(() => {})
    set({
      nodes:            normalizedNodes,
      edges:            normalizedEdges,
      pipelineName:     graphJSON.pipelineName || 'Untitled Pipeline',
      selectedNodeId:   null,
      executionResults: null,
      executionError:   null,
      isResultsOpen:    false,
    })
  },

  openTestModel:    () => set({ isTestModelOpen: true }),
  closeTestModel:   () => set({ isTestModelOpen: false }),
  openExportModal:  () => set({ isExportModalOpen: true }),
  closeExportModal: () => set({ isExportModalOpen: false }),
  openResults:      () => set({ isResultsOpen: true }),
  closeResults:     () => set({ isResultsOpen: false }),

  // ── AUTO LAYOUT ───────────────────────────────────────────────────────────────────
  // Arranges nodes in a clean left-to-right topological flow with zero overlap
  autoLayout: () => {
    const { nodes, edges } = get()
    if (nodes.length === 0) return

    // Build adjacency and in-degree maps
    const graph = {}
    const inDegree = {}
    nodes.forEach(n => { graph[n.id] = []; inDegree[n.id] = 0 })
    edges.forEach(e => {
      if (graph[e.source]) graph[e.source].push(e.target)
      if (inDegree[e.target] !== undefined) inDegree[e.target]++
    })

    // Kahn's BFS topological sort — assigns each node a column depth
    const depth = {}
    const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id)
    queue.forEach(id => { depth[id] = 0 })
    const qList = [...queue]
    let qIndex = 0

    while (qIndex < qList.length) {
      const cur = qList[qIndex++]
      const curDepth = depth[cur] ?? 0
      ;(graph[cur] || []).forEach(nxt => {
        depth[nxt] = Math.max(depth[nxt] ?? 0, curDepth + 1)
        inDegree[nxt]--
        if (inDegree[nxt] === 0) {
          qList.push(nxt)
        }
      })
    }

    // Assign any remaining unreached nodes (cycles or disconnected nodes)
    let fallbackCol = (Object.keys(depth).length > 0 ? Math.max(...Object.values(depth)) : 0) + 1
    nodes.forEach(n => {
      if (depth[n.id] === undefined) {
        depth[n.id] = fallbackCol++
      }
    })

    // Group nodes by depth column
    const COLS = {}
    nodes.forEach(n => {
      const col = depth[n.id] ?? 0
      if (!COLS[col]) COLS[col] = []
      COLS[col].push(n.id)
    })

    const COL_GAP = 320
    const ROW_GAP = 220
    const START_X = 80
    const START_Y = 80

    // Compute max height to center columns vertically relative to each other
    const maxRowCount = Math.max(...Object.values(COLS).map(arr => arr.length), 1)
    const totalMaxHeight = (maxRowCount - 1) * ROW_GAP

    const posMap = {}
    Object.keys(COLS).sort((a, b) => Number(a) - Number(b)).forEach(col => {
      const ids = COLS[col]
      const colHeight = (ids.length - 1) * ROW_GAP
      const offsetY = (totalMaxHeight - colHeight) / 2

      ids.forEach((id, row) => {
        posMap[id] = {
          x: START_X + Number(col) * COL_GAP,
          y: Math.round(START_Y + offsetY + row * ROW_GAP),
        }
      })
    })

    set(state => ({
      nodes: state.nodes.map(n => ({ ...n, position: posMap[n.id] || n.position }))
    }))
  },

  // ── LOAD TEMPLATE ─────────────────────────────────────────────────────────────────
  // Replaces the canvas with a pre-wired starter template graph
  loadTemplate: (templateData) => {
    set({
      nodes:            templateData.nodes,
      edges:            templateData.edges,
      pipelineName:     templateData.name,
      selectedNodeId:   null,
      executionResults: null,
      executionError:   null,
    })
  },
}))

export default useGraphStore
