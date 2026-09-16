// src/components/panels/LoadPipelineModal.jsx
// Modal dialog to view, load, delete saved pipelines or import a pipeline JSON file

import React, { useState, useEffect } from 'react'
import { listPipelines, loadPipeline, deletePipeline } from '../../api/api'
import useGraphStore from '../../store/graphStore'

function LoadPipelineModal({ onClose }) {
  const { loadGraph, nodes } = useGraphStore()
  const [pipelines, setPipelines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  const fetchPipelines = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await listPipelines()
      setPipelines(data.pipelines || [])
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to list pipelines')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPipelines()
  }, [])

  const handleSelectPipeline = async (filename) => {
    if (nodes.length > 0) {
      const confirmLoad = window.confirm('Loading a pipeline will replace the current canvas. Continue?')
      if (!confirmLoad) return
    }

    try {
      setActionLoading(filename)
      const { data } = await loadPipeline(filename)
      loadGraph(data)
      onClose()
    } catch (err) {
      alert('Failed to load pipeline: ' + (err.response?.data?.detail || err.message))
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (e, filename) => {
    e.stopPropagation()
    const confirmDelete = window.confirm(`Are you sure you want to delete "${filename}"?`)
    if (!confirmDelete) return

    try {
      await deletePipeline(filename)
      setPipelines(prev => prev.filter(p => p.filename !== filename))
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result)
        if (!json.nodes || !Array.isArray(json.nodes)) {
          throw new Error('Invalid pipeline file format (missing nodes array)')
        }
        if (nodes.length > 0) {
          const confirmLoad = window.confirm('Importing this file will replace the current canvas. Continue?')
          if (!confirmLoad) return
        }
        loadGraph(json)
        onClose()
      } catch (err) {
        alert('Invalid JSON file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const d = new Date(timestamp * 1000)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="results-overlay" onClick={onClose}>
      <div className="results-panel" style={{ width: 580 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="results-panel__header">
          <div>
            <h2>📂 Saved Pipelines</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              Load a previously saved workflow or import from a JSON file
            </p>
          </div>
          <button className="results-panel__close" onClick={onClose}>×</button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          {loading && (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '24px 0' }}>
              ⏳ Loading saved pipelines…
            </p>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              ⚠ {error}
            </div>
          )}

          {!loading && !error && pipelines.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>📁</span>
              <p style={{ fontWeight: 600, marginBottom: '6px' }}>No saved pipelines yet</p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                Build a graph and click <strong>💾 Save</strong> in the top toolbar to save your workflow.
              </p>
            </div>
          )}

          {!loading && pipelines.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
              {pipelines.map(p => (
                <div
                  key={p.filename}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    transition: 'border-color 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{p.pipelineName}</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', background: 'var(--color-bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                        {p.filename}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      <span>🔷 {p.nodeCount} nodes</span>
                      <span>🔗 {p.edgeCount} edges</span>
                      {p.lastModified && <span>🕒 {formatDate(p.lastModified)}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn--primary"
                      style={{ padding: '6px 14px', fontSize: '13px' }}
                      disabled={actionLoading === p.filename}
                      onClick={() => handleSelectPipeline(p.filename)}
                    >
                      {actionLoading === p.filename ? '⏳ Loading…' : 'Load'}
                    </button>
                    <button
                      className="btn btn--danger"
                      style={{ padding: '6px 10px', fontSize: '13px' }}
                      onClick={(e) => handleDelete(e, p.filename)}
                      title="Delete pipeline"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Import JSON file footer */}
          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Or import from your computer:
            </span>
            <label className="btn btn--secondary" style={{ padding: '6px 14px', fontSize: '13px', cursor: 'pointer' }}>
              📁 Import JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadPipelineModal
