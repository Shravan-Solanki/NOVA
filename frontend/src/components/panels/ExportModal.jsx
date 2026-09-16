// src/components/panels/ExportModal.jsx
// Modal dialog allowing user to choose what to download:
// 1. Trained Model (.joblib)
// 2. Training Code (train_pipeline.py)
// 3. Test / Inference Script (test_prediction.py)
// 4. Complete Package (All 3 files in a ZIP archive)

import React, { useState, useEffect } from 'react'
import { getModelDownloadUrl, getModelSchema } from '../../api/api'

function ExportCard({ icon, title, ext, description, downloadUrl, fileName, isPrimary }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = () => {
    setDownloading(true)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => setDownloading(false), 1200)
  }

  return (
    <div style={{
      background: isPrimary ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.03)',
      border: isPrimary ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--color-border, #334155)',
      borderRadius: '10px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '12px',
      transition: 'border-color 0.2s, background 0.2s'
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{icon}</span>
            <strong style={{ fontSize: '14px', color: '#fff' }}>{title}</strong>
          </span>
          <span style={{
            fontSize: '11px',
            background: isPrimary ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            color: isPrimary ? '#38bdf8' : 'var(--color-text-secondary)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 600,
            fontFamily: 'monospace'
          }}>
            {ext}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
          {description}
        </p>
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          width: '100%',
          padding: '8px 14px',
          background: isPrimary ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)' : 'rgba(255, 255, 255, 0.08)',
          color: isPrimary ? '#fff' : 'var(--color-text-primary)',
          border: isPrimary ? 'none' : '1px solid var(--color-border, #334155)',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: downloading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
      >
        <span>⬇</span> {downloading ? 'Downloading…' : `Download ${ext}`}
      </button>
    </div>
  )
}

function ExportModal({ onClose }) {
  const [modelName, setModelName] = useState('Model')
  const modelUrl = getModelDownloadUrl('model')
  const trainScriptUrl = getModelDownloadUrl('train-script')
  const testScriptUrl = getModelDownloadUrl('test-script')
  const allZipUrl = getModelDownloadUrl('all')

  useEffect(() => {
    getModelSchema().then(res => {
      if (res.data?.modelName) {
        setModelName(res.data.modelName)
      }
    }).catch(() => {})
  }, [])

  const cleanName = modelName.replace(/\s+/g, '_')
  const modelFileName = `${cleanName}_trained.joblib`
  const trainScriptFileName = `train_${cleanName.toLowerCase()}.py`

  const handleDownloadAll = () => {
    const link = document.createElement('a')
    link.href = allZipUrl
    link.download = `${cleanName}_package.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
              Choose individual files or download the full deployment package
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
          {/* Prominent All-In-One ZIP Banner */}
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
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                Includes <code>{modelFileName}</code>, <code>{trainScriptFileName}</code>, <code>test_prediction.py</code>, and a <code>README.md</code> quickstart guide in a single ZIP file.
              </p>
            </div>
            <button
              onClick={handleDownloadAll}
              style={{
                padding: '10px 18px',
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
              }}
            >
              <span>📦</span> Download All as ZIP
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border, #334155)' }} />
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Or Download Individual Files
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border, #334155)' }} />
          </div>

          {/* 3 Individual Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <ExportCard
              icon="📦"
              title="Trained Model"
              ext={modelFileName}
              description={`Serialized ${modelName} model weights and fitted transformers. Directly loadable by test_prediction.py.`}
              downloadUrl={modelUrl}
              fileName={modelFileName}
              isPrimary={true}
            />

            <ExportCard
              icon="🐍"
              title="Training Code"
              ext={trainScriptFileName}
              description="Complete, reproducible standalone script to train the model from scratch on Python."
              downloadUrl={trainScriptUrl}
              fileName={trainScriptFileName}
              isPrimary={false}
            />

            <ExportCard
              icon="🧪"
              title="Test Code"
              ext="test_prediction.py"
              description={`Ready-to-run inference script configured to automatically load ${modelFileName} and predict.`}
              downloadUrl={testScriptUrl}
              fileName="test_prediction.py"
              isPrimary={false}
            />
          </div>
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
