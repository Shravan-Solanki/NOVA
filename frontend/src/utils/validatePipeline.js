// src/utils/validatePipeline.js
// Pre-run pipeline validator — returns { errors, warnings } arrays
// Errors block execution; warnings are advisory only.

/**
 * validatePipeline(nodes, edges)
 * Returns { errors: string[], warnings: string[] }
 */
export function validatePipeline(nodes, edges) {
  const errors = []
  const warnings = []

  if (!nodes || nodes.length === 0) {
    errors.push('The canvas is empty. Drag at least one node from the sidebar to get started.')
    return { errors, warnings }
  }

  const getType = (n) => n.data?.nodeType || n.type
  const getLabel = (n) => n.data?.label || getType(n)
  const targetIds = new Set(edges.map(e => e.target))
  const sourceIds = new Set(edges.map(e => e.source))

  // ── ERRORS (block run) ────────────────────────────────────────────────────
  // Must have a DataLoader
  const loaders = nodes.filter(n => getType(n) === 'dataLoader')
  if (loaders.length === 0) {
    errors.push('Add a Data Loader node. Every pipeline must start with one.')
  }

  // DataLoader must have a CSV uploaded and a target column set
  loaders.forEach(n => {
    const filePath = n.data?.params?.filePath
    const tc = n.data?.params?.targetColumn
    if (!filePath || filePath.trim() === '') {
      errors.push(`"${getLabel(n)}": No CSV dataset uploaded yet. Click the node to upload or select a CSV file.`)
    } else if (!tc || tc.trim() === '') {
      errors.push(`"${getLabel(n)}": Target Column is not set. Click the node and choose the column to predict.`)
    }
  })

  // Every non-DataLoader node must have at least one incoming edge
  nodes.forEach(n => {
    const t = getType(n)
    if (t !== 'dataLoader' && !targetIds.has(n.id)) {
      errors.push(`"${getLabel(n)}" is not connected. Draw an edge from an upstream node to it.`)
    }
  })

  // Model nodes must be reachable from a TrainTestSplit (directly or via preprocessing)
  const modelNodes = nodes.filter(n => ['classifier', 'regressor'].includes(getType(n)))
  const hasSplit = nodes.some(n => getType(n) === 'trainTestSplit')
  if (modelNodes.length > 0 && !hasSplit) {
    errors.push('Add a Train/Test Split node. Models require split training and testing data.')
  }

  // ── WARNINGS (advisory) ───────────────────────────────────────────────────
  // Encoder with no columns selected
  nodes.filter(n => getType(n) === 'encoder').forEach(n => {
    const cols = n.data?.params?.columns
    if (!cols || cols.length === 0) {
      warnings.push(`"${getLabel(n)}": No columns selected — will encode ALL text/category columns automatically.`)
    }
  })

  // Imputer with no columns selected
  nodes.filter(n => getType(n) === 'imputer').forEach(n => {
    const cols = n.data?.params?.columns
    if (!cols || cols.length === 0) {
      warnings.push(`"${getLabel(n)}": No columns selected — will impute ALL columns with missing values.`)
    }
  })

  // ConfusionMatrix should have an evaluator or classifier as parent
  nodes.filter(n => getType(n) === 'confusionMatrix').forEach(n => {
    const parentIds = edges.filter(e => e.target === n.id).map(e => e.source)
    const parentTypes = parentIds.map(id => {
      const pn = nodes.find(x => x.id === id)
      return pn ? getType(pn) : null
    })
    if (!parentTypes.includes('evaluator') && !parentTypes.includes('classifier')) {
      warnings.push(`"${getLabel(n)}" works best when connected after an Evaluator node.`)
    }
  })

  // No model nodes
  if (modelNodes.length === 0) {
    warnings.push('No Classifier or Regressor in the pipeline — add a model node to train and evaluate.')
  }

  return { errors, warnings }
}
