// src/components/panels/ModelTestModal.jsx
// Interactive testing playground — test trained model with custom inputs and view live predictions

import React, { useState, useEffect } from 'react'
import { getModelSchema, predictModel } from '../../api/api'
import useGraphStore from '../../store/graphStore'

function ModelTestModal({ onClose }) {
  const { nodes } = useGraphStore()
  const modelNodes = nodes.filter(n => {
    const type = n.data?.nodeType || n.type
    return type === 'classifier' || type === 'regressor'
  })
  const hasModelNode = modelNodes.length > 0
  const hasTrainedModel = modelNodes.some(n => n.data?.status === 'success')

  const [loadingSchema, setLoadingSchema] = useState(hasTrainedModel)
  const [schemaError, setSchemaError] = useState(null)
  const [modelInfo, setModelInfo] = useState(null)
  const [formInputs, setFormInputs] = useState({})
  const [sampleIndex, setSampleIndex] = useState(0)

  const [predicting, setPredicting] = useState(false)
  const [predictError, setPredictError] = useState(null)
  const [predictionResult, setPredictionResult] = useState(null)

  useEffect(() => {
    if (hasTrainedModel) {
      fetchSchema()
    } else {
      setLoadingSchema(false)
      setModelInfo(null)
    }
  }, [hasTrainedModel])

  const fetchSchema = async () => {
    try {
      setLoadingSchema(true)
      setSchemaError(null)
      const { data } = await getModelSchema()
      setModelInfo(data)

      // Initialize form inputs with first sample record or defaults
      const initial = {}
      const firstSample = data.sampleRecords?.[0] || {}
      data.features.forEach(f => {
        initial[f.name] = firstSample[f.name] !== undefined ? firstSample[f.name] : ''
      })
      setFormInputs(initial)
    } catch (err) {
      setSchemaError(err.response?.data?.detail || err.message || 'Failed to load model schema. Please run the pipeline first.')
    } finally {
      setLoadingSchema(false)
    }
  }

  const handleInputChange = (col, value) => {
    setFormInputs(prev => ({ ...prev, [col]: value }))
  }

  const handleLoadSample = () => {
    if (!modelInfo?.sampleRecords?.length) return
    const nextIdx = (sampleIndex + 1) % modelInfo.sampleRecords.length
    setSampleIndex(nextIdx)
    const sample = modelInfo.sampleRecords[nextIdx]
    const nextInputs = {}
    modelInfo.features.forEach(f => {
      nextInputs[f.name] = sample[f.name] !== undefined ? sample[f.name] : ''
    })
    setFormInputs(nextInputs)
    setPredictionResult(null)
  }

  const handlePredict = async (e) => {
    e.preventDefault()
    try {
      setPredicting(true)
      setPredictError(null)
      const { data } = await predictModel(formInputs)
      setPredictionResult(data)
    } catch (err) {
      setPredictError(err.response?.data?.detail || err.message || 'Prediction failed')
    } finally {
      setPredicting(false)
    }
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
        borderRadius: '12px',
        width: '100%',
        maxWidth: '680px',
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
              <span>🧪</span> Test Model with Custom Input
            </h2>
            {modelInfo && hasTrainedModel ? (
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px', display: 'block' }}>
                Model: <strong>{modelInfo.modelName}</strong> • Target: <strong>{modelInfo.targetColumn}</strong> ({modelInfo.taskType})
              </span>
            ) : !hasModelNode ? (
              <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                No model node in current pipeline
              </span>
            ) : (
              <span style={{ fontSize: '12px', color: '#f59e0b', marginTop: '2px', display: 'block' }}>
                Model training required
              </span>
            )}
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

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {!hasModelNode && (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧩</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                No Model in Current Pipeline
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                Your current pipeline only contains preprocessing steps and no machine learning model.
                <br /><br />
                To train and test predictions, drag a <strong>Classifier</strong> or <strong>Regressor</strong> node from the left palette onto the canvas, connect it to your split data, and click <strong>"▶ Run Pipeline"</strong>!
              </p>
              <button
                type="button"
                className="btn btn--primary"
                style={{ padding: '8px 22px', fontSize: '13px' }}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          )}

          {hasModelNode && !hasTrainedModel && (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                Model Not Trained Yet
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                Your pipeline has a model node (<strong>{modelNodes.map(m => m.data?.label || m.data?.nodeType).join(', ')}</strong>), but it hasn't been trained yet.
                <br /><br />
                Click <strong>"▶ Run Pipeline"</strong> in the top toolbar to train your model before testing predictions.
              </p>
              <button
                type="button"
                className="btn btn--primary"
                style={{ padding: '8px 22px', fontSize: '13px' }}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          )}

          {hasTrainedModel && loadingSchema && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
              ⏳ Loading model schema and test features…
            </div>
          )}

          {hasTrainedModel && schemaError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '14px',
              color: '#f87171',
              fontSize: '13px',
              lineHeight: 1.5
            }}>
              <strong>Cannot Test Model:</strong> {schemaError}
            </div>
          )}

          {hasTrainedModel && modelInfo && (
            <form onSubmit={handlePredict}>
              {/* Sample loader toolbar */}
              {modelInfo.sampleRecords?.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border, #334155)'
                }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Sample Row #{sampleIndex + 1} of {modelInfo.sampleRecords.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🎲 Load Next Sample Row
                  </button>
                </div>
              )}

              {/* Feature Input Fields Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
              }}>
                {modelInfo.features.map(f => {
                  const isNumber = f.dtype.includes('int') || f.dtype.includes('float')
                  return (
                    <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {f.name}
                        <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: '6px' }}>
                          ({f.dtype})
                        </span>
                      </label>
                      <input
                        type={isNumber ? 'number' : 'text'}
                        step={isNumber ? 'any' : undefined}
                        value={formInputs[f.name] !== undefined ? formInputs[f.name] : ''}
                        onChange={e => handleInputChange(f.name, e.target.value)}
                        placeholder={`Enter ${f.name}`}
                        style={{
                          background: 'rgba(15, 23, 42, 0.7)',
                          border: '1px solid var(--color-border, #334155)',
                          borderRadius: '6px',
                          color: '#fff',
                          padding: '8px 10px',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Predict Button */}
              <button
                type="submit"
                disabled={predicting}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: predicting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                }}
              >
                {predicting ? '⏳ Computing Live Prediction…' : '⚡ Run Prediction'}
              </button>
            </form>
          )}

          {predictError && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '12px'
            }}>
              ⚠ {predictError}
            </div>
          )}

          {/* Prediction Result Display */}
          {predictionResult && (
            <div style={{
              marginTop: '20px',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#38bdf8', fontWeight: 600 }}>
                🎯 Prediction Output
              </span>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                  {predictionResult.targetColumn}:
                </span>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>
                  {typeof predictionResult.prediction === 'number'
                    ? predictionResult.prediction.toLocaleString(undefined, { maximumFractionDigits: 4 })
                    : String(predictionResult.prediction)}
                </span>
              </div>

              {/* Class Probabilities Bar for Classifiers */}
              {predictionResult.probabilities && (
                <div style={{ marginTop: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '8px' }}>
                    Class Confidence:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {Object.entries(predictionResult.probabilities).map(([cls, pct]) => (
                      <div key={cls}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                          <span style={{ color: cls === String(predictionResult.prediction) ? '#38bdf8' : 'inherit', fontWeight: cls === String(predictionResult.prediction) ? 600 : 400 }}>
                            {cls}
                          </span>
                          <span style={{ fontWeight: 600 }}>{pct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: cls === String(predictionResult.prediction) ? '#38bdf8' : 'rgba(255, 255, 255, 0.4)',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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

export default ModelTestModal
