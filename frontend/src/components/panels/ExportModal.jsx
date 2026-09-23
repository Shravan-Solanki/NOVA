// src/components/panels/ExportModal.jsx
// Modal dialog allowing user to choose what to download:
// 1. Pipeline Code (Python script for current canvas) — always exportable
// 2. Trained Model (.joblib) — available ONLY when a model has been trained
// 3. Test / Inference Script (test_prediction.py) — available ONLY when a model has been trained
// 4. Complete Deployment Package (ZIP) — available ONLY when a model has been trained

import React, { useState, useEffect } from 'react'
import { getModelDownloadUrl, getModelSchema, exportPython } from '../../api/api'
import useGraphStore from '../../store/graphStore'

function ExportCard({
  icon,
  title,
  ext,
  badgeText,
  description,
  onDownload,
  downloading,
  btnText,
  isDisabled,
  disabledReason,
  isPrimary
}) {
  const displayBadge = badgeText || ext
  return (
    <div style={{
      background: isPrimary ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.03)',
      border: isPrimary ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--color-border, #334155)',
      borderRadius: '10px',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '10px',
      opacity: isDisabled ? 0.78 : 1,
      transition: 'border-color 0.2s, background 0.2s',
      minWidth: 0   /* allow flex children to shrink */
    }}>
      <div style={{ minWidth: 0 }}>
        {/* Title row: icon + title only — no badge here */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>{icon}</span>
          <strong style={{ fontSize: '14px', color: '#fff', lineHeight: 1.2 }}>{title}</strong>
        </div>

        {/* Filename badge — on its own line, truncated with ellipsis */}
        <div style={{
          fontSize: '11px',
          fontFamily: 'monospace',
          fontWeight: 600,
          background: isDisabled
            ? 'rgba(239, 68, 68, 0.12)'
            : (isPrimary ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.07)'),
          color: isDisabled
            ? '#f87171'
            : (isPrimary ? '#38bdf8' : 'var(--color-text-secondary)'),
          padding: '3px 8px',
          borderRadius: '4px',
          marginBottom: '8px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          display: 'block',
          cursor: 'default'
        }}
        title={displayBadge}
        >
          {displayBadge}
        </div>

        <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          {description}
        </p>
        {isDisabled && disabledReason && (
          <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#f59e0b',
            background: 'rgba(245, 158, 11, 0.1)',
            padding: '5px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            lineHeight: 1.4
          }}>
            ℹ️ {disabledReason}
          </div>
        )}
      </div>

      <button
        onClick={isDisabled ? undefined : onDownload}
        disabled={isDisabled || downloading}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: isDisabled
            ? 'rgba(255, 255, 255, 0.04)'
            : (isPrimary ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)' : 'rgba(255, 255, 255, 0.08)'),
          color: isDisabled ? 'var(--color-text-muted, #64748b)' : (isPrimary ? '#fff' : 'var(--color-text-primary)'),
          border: isDisabled ? '1px dashed rgba(255, 255, 255, 0.1)' : (isPrimary ? 'none' : '1px solid var(--color-border, #334155)'),
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: isDisabled ? 'not-allowed' : (downloading ? 'wait' : 'pointer'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {isDisabled ? (
          <span>🔒 {btnText}</span>
        ) : (
          <>
            <span>⬇</span> {downloading ? 'Downloading…' : btnText}
          </>
        )}

      </button>
    </div>
  )
}

function ExportModal({ onClose }) {
  const { nodes, edges, pipelineName, serializeGraph } = useGraphStore()

  // Inspect canvas state
  const hasNodes = nodes.length > 0
  const modelNodes = nodes.filter(n => {
    const type = n.data?.nodeType || n.type
    return type === 'classifier' || type === 'regressor'
  })
  const hasModelNode = modelNodes.length > 0
  const hasTrainedNode = modelNodes.some(n => n.data?.status === 'success')

  const [modelInfo, setModelInfo] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const [exportingPython, setExportingPython] = useState(false)
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [downloadingModel, setDownloadingModel] = useState(false)
  const [downloadingTest, setDownloadingTest] = useState(false)

  // Verify backend model status
  useEffect(() => {
    let isMounted = true
    if (hasModelNode && hasTrainedNode) {
      getModelSchema()
        .then(res => {
          if (isMounted && res.data?.modelName) {
            setModelInfo(res.data)
          }
        })
        .catch(() => {
          if (isMounted) setModelInfo(null)
        })
        .finally(() => {
          if (isMounted) setLoadingStatus(false)
        })
    } else {
      setModelInfo(null)
      setLoadingStatus(false)
    }
    return () => { isMounted = false }
  }, [hasModelNode, hasTrainedNode])

  const isModelTrained = Boolean(hasModelNode && hasTrainedNode && modelInfo)

  const rawModelName = modelInfo?.modelName || (
    hasModelNode
      ? (modelNodes[0]?.data?.params?.classifierType || modelNodes[0]?.data?.params?.regressorType || 'Model')
      : 'Model'
  )
  const cleanModelName = rawModelName.replace(/\s+/g, '_')
  const modelFileName = `${cleanModelName}_trained.joblib`
  const safePipelineName = (pipelineName || 'pipeline').trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'pipeline'
  const pythonFileName = `${safePipelineName}.py`

  // Download Handlers
  const handleDownloadPython = async () => {
    try {
      setExportingPython(true)
      const graph = serializeGraph()
      const { data } = await exportPython({
        nodes: graph.nodes,
        edges: graph.edges,
        pipelineName: safePipelineName
      })
      const blob = new Blob([data.code], { type: 'text/x-python;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = data.filename || `${safePipelineName}.py`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Python export failed: ' + (err.response?.data?.detail || err.message))
    } finally {
      setExportingPython(false)
    }
  }

  const handleDownloadModel = () => {
    if (!isModelTrained) return
    setDownloadingModel(true)
    const link = document.createElement('a')
    link.href = getModelDownloadUrl('model')
    link.download = modelFileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => setDownloadingModel(false), 1200)
  }

  const handleDownloadTestScript = () => {
    if (!isModelTrained) return
    setDownloadingTest(true)
    const link = document.createElement('a')
    link.href = getModelDownloadUrl('test-script')
    link.download = 'test_prediction.py'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => setDownloadingTest(false), 1200)
  }

  const handleDownloadAllZip = () => {
    if (!isModelTrained) return
    setDownloadingZip(true)
    const link = document.createElement('a')
    link.href = getModelDownloadUrl('all')
    link.download = `${cleanModelName}_package.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => setDownloadingZip(false), 1200)
  }

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--color-bg-secondary, #0f172a)',
        border: '1px solid var(--color-border, #334155)',
        borderRadius: '14px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💾</span> Export &amp; Download Options
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px', display: 'block' }}>
              {isModelTrained
                ? 'Choose individual files or download the full deployment package'
                : 'Export visual pipeline code to Python or train a model to unlock serialized weights'}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '22px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!hasNodes && (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                Canvas is Empty
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                There are no nodes on your canvas yet. Drag nodes from the left palette to build your pipeline, then return here to export code or trained models.
              </p>
              <button
                type="button"
                className="btn btn--primary"
                style={{ padding: '8px 24px', fontSize: '13px' }}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          )}

          {hasNodes && (
            <>
              {/* Contextual Top Banner */}
              {isModelTrained ? (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '20px' }}>🗂️</span>
                      <strong style={{ fontSize: '15px', color: '#fff' }}>Complete Package (All 3 Files + README)</strong>
                      <span style={{
                        fontSize: '11px',
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 600
                      }}>
                        Ready
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      Includes <code>{modelFileName}</code>, <code>train_{cleanModelName.toLowerCase()}.py</code>, <code>test_prediction.py</code>, and a <code>README.md</code> quickstart guide in a single ZIP file.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadAllZip}
                    disabled={downloadingZip}
                    style={{
                      padding: '10px 18px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: downloadingZip ? 'wait' : 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
                    }}
                  >
                    <span>📦</span> {downloadingZip ? 'Downloading…' : 'Download All as ZIP'}
                  </button>
                </div>
              ) : !hasModelNode ? (
                <div style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                  <span style={{ fontSize: '24px' }}>ℹ️</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '14px', color: '#38bdf8', display: 'block', marginBottom: '2px' }}>
                      Preprocessing Pipeline — Python Code Ready to Export
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5, display: 'block' }}>
                      Your current pipeline contains data preparation steps. You can download the complete generated Python script below. Serialized model weights (<code>.joblib</code>) and prediction test packages require adding a <strong>Classifier</strong> or <strong>Regressor</strong> node and running the pipeline.
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                  <span style={{ fontSize: '24px' }}>⏳</span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '14px', color: '#fbbf24', display: 'block', marginBottom: '2px' }}>
                      Model Training Required for Exporting Weights
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5, display: 'block' }}>
                      Your pipeline contains a model node (<strong>{modelNodes.map(m => m.data?.label || m.data?.nodeType).join(', ')}</strong>), but it hasn't been executed yet. Click <strong>"▶ Run Pipeline"</strong> in the top toolbar to train your model and unlock <code>.joblib</code> weights and inference code.
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border, #334155)' }} />
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isModelTrained ? 'Or Download Individual Files' : 'Available Export Files'}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--color-border, #334155)' }} />
              </div>

              {/* 3 Individual Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {/* 1. Pipeline Python Code — Always exportable */}
                <ExportCard
                  icon="🐍"
                  title="Pipeline Code"
                  ext=".py"
                  badgeText={pythonFileName}
                  description={`Standalone, executable scikit-learn Python script generated directly from your canvas.`}
                  onDownload={handleDownloadPython}
                  downloading={exportingPython}
                  btnText="Download Python Script"
                  isDisabled={false}
                  isPrimary={false}
                />

                {/* 2. Trained Model Binary (.joblib) */}
                <ExportCard
                  icon="📦"
                  title="Trained Model"
                  ext=".joblib"
                  badgeText={isModelTrained ? modelFileName : (!hasModelNode ? 'No Model Node' : 'Not Trained')}
                  description={
                    isModelTrained
                      ? `Serialized ${rawModelName} model weights and fitted transformers. Directly loadable for offline inference.`
                      : (!hasModelNode
                          ? 'Serialized weights are only generated after adding a Classifier or Regressor node to the pipeline.'
                          : `Serialized weights for ${rawModelName} will be generated after running the pipeline.`)
                  }
                  onDownload={handleDownloadModel}
                  downloading={downloadingModel}
                  btnText={
                    isModelTrained
                      ? 'Download .joblib'
                      : (!hasModelNode ? 'Model Not in Pipeline' : 'Train Model First')
                  }
                  isDisabled={!isModelTrained}
                  disabledReason={
                    !hasModelNode
                      ? 'Add a Classifier or Regressor node to the canvas.'
                      : 'Click "▶ Run Pipeline" in the top toolbar to train this model first.'
                  }
                  isPrimary={false}
                />

                {/* 3. Test Prediction Script (test_prediction.py) */}
                <ExportCard
                  icon="🧪"
                  title="Inference Script"
                  ext="test_prediction.py"
                  badgeText={isModelTrained ? 'test_prediction.py' : 'Requires Model'}
                  description={
                    isModelTrained
                      ? `Ready-to-run test script configured to automatically load ${modelFileName} and predict.`
                      : 'Python test script for testing offline custom inputs against the trained model.'
                  }
                  onDownload={handleDownloadTestScript}
                  downloading={downloadingTest}
                  btnText={isModelTrained ? 'Download test script' : 'Requires Trained Model'}
                  isDisabled={!isModelTrained}
                  disabledReason={
                    !hasModelNode
                      ? 'Inference testing requires a trained model.'
                      : 'Train the model first to generate test prediction code.'
                  }
                  isPrimary={false}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--color-border, #334155)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            className="btn btn--secondary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
