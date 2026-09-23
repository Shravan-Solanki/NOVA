// src/components/GuidedTour.jsx
// Step-by-step spotlight tour for first-time users with real glowing cutouts
import React, { useState, useEffect, useCallback } from 'react'
import useGraphStore from '../store/graphStore'
import { createNodeDefaults } from '../utils/graphHelpers'

const TOUR_STEPS = [
  {
    id: 'palette',
    title: '👋 Welcome to NOVA!',
    badge: 'Step 1 of 5 • Node Palette',
    body: 'This is the Node Palette. Drag any node card from this sidebar onto the canvas to add it to your pipeline. Start with a Data Loader to load your dataset.',
    highlight: '.node-palette',
  },
  {
    id: 'canvas',
    title: '🖱️ Build on the Canvas',
    badge: 'Step 2 of 5 • Interactive Canvas',
    body: 'This is your pipeline canvas. Drop nodes here, then drag from one node\'s output handle to another\'s input handle to connect them. Each connected node passes data to the next.',
    highlight: '.react-flow',
    fallbackHighlight: '.canvas-area',
  },
  {
    id: 'config',
    title: '⚙️ Configure Each Node',
    badge: 'Step 3 of 5 • Parameter Settings',
    body: 'Click any node on the canvas to open its settings in the right panel. Set the Target Column on your Data Loader, choose your model type, and tune parameters — every field has a ℹ guide to help you.',
    highlight: '.config-panel',
    fallbackHighlight: '.canvas-area',
  },
  {
    id: 'run',
    title: '▶ Run Your Pipeline',
    badge: 'Step 4 of 5 • Validation & Execution',
    body: 'Click "▶ Run Pipeline" in the top toolbar to train your model end-to-end. NOVA validates your pipeline first and highlights any missing connections or fields before executing.',
    highlight: '#btn-run',
  },
  {
    id: 'export',
    title: '📦 Live Test & Export',
    badge: 'Step 5 of 5 • Results & Export',
    body: 'Once trained, see accuracy, confusion matrix, and feature importances. Use "🧪 Test Model" to test live inputs, or "📦 Export / Download" to get production Python scripts and trained model files.',
    highlight: '#btn-export',
  },
]

const STORAGE_KEY = 'nova_tour_done'

function GuidedTour({ onFinish }) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const { nodes, selectedNodeId, setSelectedNodeId, addNode } = useGraphStore()

  const current = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(STORAGE_KEY, 'true')
      onFinish()
    } else {
      setStep(s => s + 1)
    }
  }

  const handleBack = () => setStep(s => Math.max(0, s - 1))

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    onFinish()
  }

  // Update spotlight position
  const updateSpotlight = useCallback(() => {
    // If Step 3 (config), ensure a node is selected so .config-panel opens
    if (step === 2) {
      if (nodes.length > 0 && !selectedNodeId) {
        setSelectedNodeId(nodes[0].id)
      } else if (nodes.length === 0) {
        const sampleNode = createNodeDefaults('dataLoader', { x: 300, y: 150 })
        addNode(sampleNode)
        setSelectedNodeId(sampleNode.id)
      }
    }

    let el = current.highlight ? document.querySelector(current.highlight) : null
    if (!el && current.fallbackHighlight) {
      el = document.querySelector(current.fallbackHighlight)
    }

    if (el) {
      const rect = el.getBoundingClientRect()
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
      return
    }
    setTargetRect(null)
  }, [step, current.highlight, current.fallbackHighlight, nodes, selectedNodeId, setSelectedNodeId, addNode])

  useEffect(() => {
    updateSpotlight()
    const t1 = setTimeout(updateSpotlight, 40)
    const t2 = setTimeout(updateSpotlight, 120)
    const t3 = setTimeout(updateSpotlight, 300)
    window.addEventListener('resize', updateSpotlight)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      window.removeEventListener('resize', updateSpotlight)
    }
  }, [updateSpotlight])

  // Calculate card position relative to spotlight
  const getCardStyle = () => {
    const cardWidth = 360
    const cardHeight = 250

    if (!targetRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    let top = 100
    let left = 100

    switch (current.id) {
      case 'palette': {
        // Position directly to the right of the palette sidebar
        top = Math.max(80, Math.min(160, (window.innerHeight - cardHeight) / 2))
        left = targetRect.left + targetRect.width + 24
        break
      }

      case 'canvas': {
        // Position comfortably inside the canvas at the top, without pushing off-screen
        top = Math.max(76, targetRect.top + 24)
        left = Math.max(280, targetRect.left + 36)
        break
      }

      case 'config': {
        // Position directly to the left of the config panel
        top = Math.max(80, Math.min(160, (window.innerHeight - cardHeight) / 2))
        left = targetRect.left - cardWidth - 24
        break
      }

      case 'run': {
        // Position directly below the Run Pipeline button
        top = targetRect.top + targetRect.height + 16
        left = targetRect.left + (targetRect.width / 2) - (cardWidth / 2)
        break
      }

      case 'export': {
        // Position below the Export button, right-aligned to it
        top = targetRect.top + targetRect.height + 16
        left = targetRect.left + targetRect.width - cardWidth
        break
      }

      default: {
        top = targetRect.top + targetRect.height + 16
        left = targetRect.left
      }
    }

    // STRICT viewport boundary clamping:
    // Guarantees the card and its action buttons are 100% visible on screen at all times
    const maxTop = Math.max(20, window.innerHeight - cardHeight - 24)
    const maxLeft = Math.max(20, window.innerWidth - cardWidth - 24)
    const clampedTop = Math.max(20, Math.min(maxTop, top))
    const clampedLeft = Math.max(20, Math.min(maxLeft, left))

    return {
      position: 'fixed',
      top: `${clampedTop}px`,
      left: `${clampedLeft}px`,
    }
  }

  return (
    <div className="tour-overlay" onClick={e => e.stopPropagation()}>
      {/* Spotlight cutout */}
      {targetRect ? (
        <div
          className="tour-spotlight"
          style={{
            top: Math.max(0, targetRect.top - 6),
            left: Math.max(0, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      ) : (
        <div className="tour-backdrop" />
      )}

      {/* Floating Tour Card */}
      <div className="tour-card" style={getCardStyle()}>
        {/* Progress dots */}
        <div className="tour-dots">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={`tour-dot ${i === step ? 'tour-dot--active' : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <span className="tour-card__badge">{current.badge}</span>

        <div className="tour-card__header">
          <h3 className="tour-card__title">{current.title}</h3>
          <span className="tour-card__counter">{step + 1} / {TOUR_STEPS.length}</span>
        </div>

        <p className="tour-card__body">{current.body}</p>

        <div className="tour-card__actions">
          <button type="button" className="btn btn--ghost" onClick={handleSkip}>
            Skip Tour
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step > 0 && (
              <button type="button" className="btn btn--secondary" onClick={handleBack}>
                ← Back
              </button>
            )}
            <button type="button" className="btn btn--primary" onClick={handleNext}>
              {isLast ? '✓ Finish Tour' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { STORAGE_KEY }
export default GuidedTour
