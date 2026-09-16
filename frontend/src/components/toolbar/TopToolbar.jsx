import React, { useState } from 'react'
import useGraphStore from '../../store/graphStore'
import useExecutePipeline from '../../hooks/useExecutePipeline'
import { savePipeline, exportPython } from '../../api/api'
import LoadPipelineModal from '../panels/LoadPipelineModal'

function TopToolbar({ onRunSuccess, onHome }) {
  const { pipelineName, setPipelineName, serializeGraph, serializeGraphForSave, clearCanvas, newPipeline, nodes, isRunning, openExportModal } = useGraphStore()
  const { run, results, error } = useExecutePipeline()
  const [editingName, setEditingName] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)

  // Start fresh new pipeline
  const handleNewPipeline = () => {
    if (nodes.length > 0) {
      const confirmNew = window.confirm('Start a new pipeline? Any unsaved changes on the current canvas will be lost.')
      if (!confirmNew) return
    }
    newPipeline()
  }

  // Show ResultsPanel after successful run
  const handleRun = async () => {
    const res = await run()
    if (res?.success && onRunSuccess) {
      onRunSuccess()
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
          {/* Editable pipeline name */}
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
          {onHome && (
            <button className="btn btn--secondary" onClick={onHome} id="btn-home" title="Back to Welcome">
              🏠 Home
            </button>
          )}

          <button className="btn btn--secondary" onClick={handleNewPipeline} id="btn-new-pipeline" title="Start a fresh empty pipeline">
            ✨ New Pipeline
          </button>

          {error && <span className="toolbar-error" title={error}>⚠ Error</span>}

          <button
            className="btn btn--primary"
            onClick={handleRun}
            disabled={isRunning}
            id="btn-run"
          >
            {isRunning ? '⏳ Running…' : '▶ Run Pipeline'}
          </button>

          <button className="btn btn--secondary" onClick={handleSave} id="btn-save">
            💾 Save
          </button>

          <button className="btn btn--secondary" onClick={() => setShowLoadModal(true)} id="btn-load-pipeline">
            📂 Load Pipeline
          </button>

          <button
            className="btn btn--secondary"
            onClick={openExportModal}
            id="btn-export"
            title="Export Trained Model, Scripts & Packages"
          >
            📦 Export / Download
          </button>

          <button className="btn btn--danger" onClick={() => { if (window.confirm('Clear the canvas?')) clearCanvas() }} id="btn-clear">
            🗑 Clear
          </button>
        </div>
      </header>

      {showLoadModal && (
        <LoadPipelineModal onClose={() => setShowLoadModal(false)} />
      )}
    </>
  )
}

export default TopToolbar
