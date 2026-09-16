// src/pages/LandingPage.jsx
// Welcome splash screen shown before entering the editor

import React from 'react'

const FEATURES = [
  { icon: '🖱️', title: 'Drag & Drop',      desc: 'Build ML pipelines visually — no code required.' },
  { icon: '⚡', title: 'Instant Results',  desc: 'Run your pipeline and see accuracy, F1, and charts in seconds.' },
  { icon: '🐍', title: 'Export to Python', desc: 'Download a ready-to-run scikit-learn script from your graph.' },
  { icon: '🛡️', title: 'Node Isolation',   desc: 'Errors are caught per-node so you know exactly what failed.' },
]

const PIPELINE_DEMO = [
  { label: 'Load CSV',    color: '#3b82f6' },
  { label: 'Split',       color: '#8b5cf6' },
  { label: 'Normalize',   color: '#8b5cf6' },
  { label: 'Train SVM',   color: '#ec4899' },
  { label: 'Evaluate',    color: '#14b8a6' },
]

function LandingPage({ onEnter }) {
  return (
    <div className="landing">
      {/* Hero */}
      <section className="landing__hero">
        <div className="landing__hero-glow" />
        <p className="landing__eyebrow">NOVA</p>
        <h1 className="landing__title">
          Build ML Pipelines<br />
          <span className="landing__title-accent">Visually</span>
        </h1>
        <p className="landing__subtitle">
          Node-based orchestration for visual AI — drag, connect, and run
          machine learning pipelines without writing a single line of code.
        </p>
        <button className="landing__cta" onClick={onEnter} id="btn-launch-editor">
          Launch Editor →
        </button>
      </section>

      {/* Demo pipeline preview */}
      <section className="landing__demo">
        <div className="demo-pipeline">
          {PIPELINE_DEMO.map((node, i) => (
            <React.Fragment key={node.label}>
              <div className="demo-node" style={{ borderColor: node.color }}>
                <span style={{ color: node.color }}>◆</span> {node.label}
              </div>
              {i < PIPELINE_DEMO.length - 1 && (
                <div className="demo-arrow">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="landing__features">
        {FEATURES.map(f => (
          <div key={f.title} className="feature-card">
            <span className="feature-card__icon">{f.icon}</span>
            <h3 className="feature-card__title">{f.title}</h3>
            <p className="feature-card__desc">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

export default LandingPage
