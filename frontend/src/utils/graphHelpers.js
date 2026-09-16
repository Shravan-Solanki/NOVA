// src/utils/graphHelpers.js
// Pure utility functions for working with the pipeline graph

// ─── Node ID Generator ───────────────────────────────────────────────────────
export function generateNodeId(type) {
  return `${type}-${Date.now()}`
}

// ─── Default Params per Node Type ───────────────────────────────────────────
const NODE_DEFAULTS = {
  dataLoader:     { label: 'Data Loader',      nodeType: 'dataLoader',     params: { filePath: '', targetColumn: '', dropColumns: [] } },
  trainTestSplit: { label: 'Train/Test Split',  nodeType: 'trainTestSplit', params: { testSize: 0.2, randomState: 42, shuffle: true } },
  imputer:        { label: 'Imputer',           nodeType: 'imputer',        params: { strategy: 'mean', fillValue: 0, columns: [] } },
  scaler:         { label: 'Scaler',            nodeType: 'scaler',         params: { scalerType: 'StandardScaler' } },
  encoder:        { label: 'Encoder',           nodeType: 'encoder',        params: { encoderType: 'OneHotEncoder', columns: [] } },
  classifier:     { label: 'Classifier',        nodeType: 'classifier',     params: { classifierType: 'DecisionTree', max_depth: null, criterion: 'gini', randomState: 42 } },
  regressor:      { label: 'Regressor',         nodeType: 'regressor',      params: { regressorType: 'LinearRegression' } },
  evaluator:      { label: 'Evaluator',         nodeType: 'evaluator',      params: { metrics: ['accuracy', 'f1'] } },
  confusionMatrix:{ label: 'Confusion Matrix',  nodeType: 'confusionMatrix', params: {} },
}

// Creates a full React Flow node object with sensible defaults
export function createNodeDefaults(type, position = { x: 0, y: 0 }) {
  const defaults = NODE_DEFAULTS[type] || { label: type, nodeType: type, params: {} }
  return {
    id:       generateNodeId(type),
    type:     type,          // must match key in EditorPage's nodeTypes registry
    position,
    data: {
      ...defaults,
      status:  'idle',
      results: null,
    },
  }
}

// ─── Serialize Graph for API ─────────────────────────────────────────────────
// Strips React Flow UI fields — backend only needs id, type, params, and edges
export function serializeGraphForAPI(nodes, edges) {
  return {
    nodes: nodes.map(n => ({
      id:     n.id,
      type:   n.data?.nodeType || n.type,
      params: n.data?.params || {},
    })),
    edges: edges.map(e => ({
      source:       e.source,
      target:       e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
    })),
  }
}

// ─── Graph Validation ────────────────────────────────────────────────────────
export function validateGraph(nodes, edges) {
  const errors = []

  if (nodes.length === 0) {
    return { valid: false, errors: ['Canvas is empty. Add at least one node.'] }
  }

  // Check 1: Must have at least one DataLoader
  const hasLoader = nodes.some(n => (n.data?.nodeType || n.type) === 'dataLoader')
  if (!hasLoader) errors.push('Missing a Data Loader node. Every pipeline must start with one.')

  // Check 2: Every non-DataLoader node must have at least one incoming edge
  const nodesWithIncoming = new Set(edges.map(e => e.target))
  nodes.forEach(n => {
    const nType = n.data?.nodeType || n.type
    if (nType !== 'dataLoader' && !nodesWithIncoming.has(n.id)) {
      errors.push(`Node "${n.data?.label || nType}" has no incoming connection.`)
    }
  })

  return { valid: errors.length === 0, errors }
}

// ─── File Download Helper ────────────────────────────────────────────────────
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
