import React, { useState } from 'react'
import useGraphStore from '../../store/graphStore'
import useExecutePipeline from '../../hooks/useExecutePipeline'
import { savePipeline } from '../../api/api'
import LoadPipelineModal from '../panels/LoadPipelineModal'
import { validatePipeline } from '../../utils/validatePipeline'

function TopToolbar({ onRunSuccess, onHome, onStartTour }) {
  const {
    pipelineName, setPipelineName, serializeGraph, serializeGraphForSave,
    clearCanvas, newPipeline, nodes, edges, isRunning, openExportModal, autoLayout,
    openResults, executionResults
  } = useGraphStore()
  const { run, results, error } = useExecutePipeline()
  const [editingName, setEditingName] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])
  const [validationWarnings, setValidationWarnings] = useState([])
  const [showValidation, setShowValidation] = useState(false)
  const [awaitingWarningConfirm, setAwaitingWarningConfirm] = useState(false)

  const handleNewPipeline = () => {
    if (nodes.length > 0) {
      const confirmNew = window.confirm('Start a new pipeline? Any unsaved changes on the current canvas will be lost.')
      if (!confirmNew) return
    }
    newPipeline()
    setValidationErrors([])
    setValidationWarnings([])
    setShowValidation(false)
  }

  const handleRun = async () => {
    const { errors, warnings } = validatePipeline(nodes, edges)
    if (errors.length > 0) {
      // Hard errors — block execution and show errors
      setValidationErrors(errors)
      setValidationWarnings(warnings)
      setShowValidation(true)
      setAwaitingWarningConfirm(false)
      return
    }
    if (warnings.length > 0) {
      // Soft warnings — show banner and wait for user to click "Run Anyway"
      setValidationErrors([])
      setValidationWarnings(warnings)
      setShowValidation(true)
      setAwaitingWarningConfirm(true)
      return
    }
    // No issues at all — run immediately
    setShowValidation(false)
    setAwaitingWarningConfirm(false)
    await doRun()
  }

  const handleRunAnyway = async () => {
    setShowValidation(false)
    setAwaitingWarningConfirm(false)
    await doRun()
  }

  const doRun = async () => {
    const res = await run()
    if (res?.success) {
      openResults()
      if (onRunSuccess) onRunSuccess()
    }
  }

  const handleSave = async () => {
    try {
      const graph = serializeGraphForSave()
      await savePipeline({ pipelineName, ...graph })
      alert('Pipeline saved successfully!')
    } catch (e) {
      alert('Save failed: ' + e.message)
    }
  }

  return (
    <>
      <header className="top-toolbar">
        <div className="top-toolbar__left">
          <div className="toolbar-brand">
            <span className="brand-dot" /> NOVA
          </div>
          {editingName
            ? <input
                className="pipeline-name-input"
                value={pipelineName}
                autoFocus
                onChange={e => setPipelineName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
              />
            : <h1 className="pipeline-name" onClick={() => setEditingName(true)}
                  title="Click to rename">
                {pipelineName} ✏️
              </h1>
          }
        </div>

        <div className="top-toolbar__right">
          <div className="toolbar-group">
            {onHome && (
              <button className="btn btn--toolbar" onClick={onHome} id="btn-home" title="Back to Welcome">
                🏠 Home
              </button>
            )}
            <button className="btn btn--toolbar" onClick={handleNewPipeline} id="btn-new-pipeline" title="Start fresh empty pipeline">
              ✨ New
            </button>
            <button className="btn btn--toolbar" onClick={autoLayout} id="btn-auto-layout" title="Auto-arrange nodes in clean flow">
              🔀 Layout
            </button>
            {onStartTour && (
              <button className="btn btn--toolbar" onClick={onStartTour} id="btn-tour" title="Interactive Guided Tour">
                🎓 Tour
              </button>
            )}
          </div>

          <div className="toolbar-sep" />

          {error && <span className="toolbar-error" title={error}>⚠ Error</span>}

          <button
            className="btn btn--run"
            onClick={handleRun}
            disabled={isRunning}
            id="btn-run"
          >
            {isRunning ? '⏳ Running…' : '▶ Run Pipeline'}
          </button>

          {(results || executionResults) && !isRunning && (
            <button
              className="btn btn--toolbar"
              onClick={openResults}
              id="btn-view-results"
              title="View cached pipeline results without re-running"
              style={{
                borderColor: 'rgba(56, 189, 248, 0.45)',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>📊</span> View Results
            </button>
          )}

          <div className="toolbar-sep" />

          <div className="toolbar-group">
            <button className="btn btn--toolbar" onClick={handleSave} id="btn-save" title="Save pipeline">
              💾 Save
            </button>
            <button className="btn btn--toolbar" onClick={() => setShowLoadModal(true)} id="btn-load-pipeline" title="Load pipeline">
              📂 Load
            </button>
            <button
              className="btn btn--toolbar"
              onClick={openExportModal}
              id="btn-export"
              title="Export Trained Model & Python Scripts"
            >
              📦 Export
            </button>
            <button
              className="btn btn--danger-subtle"
              onClick={() => { if (window.confirm('Clear the canvas?')) clearCanvas() }}
              id="btn-clear"
              title="Clear canvas"
            >
              🗑 Clear
            </button>
          </div>
        </div>
      </header>

      {/* Validation banner */}
      {showValidation && (validationErrors.length > 0 || validationWarnings.length > 0) && (
        <div className={`validation-banner ${validationErrors.length > 0 ? 'validation-banner--error' : 'validation-banner--warn'}`}>
          <div className="validation-banner__content">
            {validationErrors.length > 0 && (
              <div className="validation-section">
                <strong>🚫 Fix before running:</strong>
                <ul>
                  {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            {validationWarnings.length > 0 && (
              <div className="validation-section">
                <strong>⚠️ Heads up:</strong>
                <ul>
                  {validationWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {awaitingWarningConfirm && (
              <button
                className="btn btn--run"
                style={{ fontSize: '12px', padding: '5px 14px' }}
                onClick={handleRunAnyway}
                disabled={isRunning}
              >
                {isRunning ? '⏳ Running…' : '▶ Run Anyway'}
              </button>
            )}
            <button
              className="validation-banner__close"
              onClick={() => { setShowValidation(false); setAwaitingWarningConfirm(false) }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {showLoadModal && (
        <LoadPipelineModal onClose={() => setShowLoadModal(false)} />
      )}
    </>
  )
}

export default TopToolbar
