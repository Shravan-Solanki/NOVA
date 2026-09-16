// src/hooks/useExecutePipeline.js
// Custom React hook — sends graph to backend, updates node statuses and results

import { useState, useCallback } from 'react'
import useGraphStore from '../store/graphStore'
import { executePipeline } from '../api/api'

export function useExecutePipeline() {
  const {
    nodes, edges,
    setIsRunning,
    updateNodeStatus,
    updateNodeResults,
    serializeGraph,
    executionResults: results,
    executionError: error,
    setExecutionResults,
    setExecutionError,
  } = useGraphStore()

  const run = useCallback(async () => {
    // 1. Basic validation
    if (nodes.length === 0) {
      const msg = 'Canvas is empty. Add at least one node before running.'
      setExecutionError(msg)
      return { success: false, error: msg }
    }

    setExecutionError(null)
    setExecutionResults(null)

    // 2. Mark all nodes as 'running'
    setIsRunning(true)
    nodes.forEach(n => updateNodeStatus(n.id, 'running'))

    // 3. Serialize graph into backend format
    const graphPayload = serializeGraph()

    // 4. Call API
    let response
    try {
      const { data } = await executePipeline(graphPayload)
      response = data
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Network error'
      setExecutionError(msg)
      setIsRunning(false)
      nodes.forEach(n => updateNodeStatus(n.id, 'idle'))
      return { success: false, error: msg }
    }

    // 5. Update each node with its result
    if (response.success) {
      const nodeResults = response.node_results || {}
      Object.entries(nodeResults).forEach(([nodeId, meta]) => {
        updateNodeStatus(nodeId, 'success')
        updateNodeResults(nodeId, meta)
      })
      setExecutionError(null)
    } else {
      // A specific node failed — mark it red, rest go back to idle
      const failedId = response.failed_node
      nodes.forEach(n => {
        if (n.id === failedId) {
          updateNodeStatus(n.id, 'error')
          updateNodeResults(n.id, { error: response.error })
        } else {
          updateNodeStatus(n.id, 'idle')
        }
      })
      setExecutionError(`Node "${response.node_type}" failed: ${response.error}`)
    }

    // 6. Store full response and finish
    setExecutionResults(response)
    setIsRunning(false)
    return response

  }, [nodes, edges, serializeGraph, setIsRunning, updateNodeStatus, updateNodeResults, setExecutionResults, setExecutionError])

  return {
    run,
    results,
    error,
    clearResults: () => { setExecutionResults(null); setExecutionError(null) }
  }
}

export default useExecutePipeline
