// src/pages/LandingPage.jsx
// Welcome splash screen — shows hero, starter templates, and features

import React from 'react'
import { TEMPLATES } from '../data/templates'

function LandingPage({ onEnter, onTemplate }) {
  return (
    <div className="landing">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="landing__hero">
        <div className="landing__hero-glow" />
        <p className="landing__eyebrow">NOVA</p>
        <h1 className="landing__title">
          Build ML Pipelines<br />
          <span className="landing__title-accent">Visually</span>
        </h1>
        <p className="landing__subtitle">
          Drag, connect, and run machine learning pipelines — no coding required.
          Train models, visualize results, and export production-ready Python code in minutes.
        </p>
        <div className="landing__hero-actions">
          <button className="landing__cta" onClick={onEnter} id="btn-launch-editor">
            🚀 Launch Editor →
          </button>
          <span className="landing__cta-note">or start from a template below ↓</span>
        </div>
      </section>

      {/* ── Starter Templates ─────────────────────────────────────────── */}
      <section className="landing__templates">
        <div className="landing__section-header">
          <h2 className="landing__section-title">⚡ Starter Templates</h2>
          <p className="landing__section-sub">One click to pre-wire a full pipeline — just add your data and run.</p>
        </div>

        <div className="template-grid">
          {TEMPLATES.map(tpl => (
            <div key={tpl.id} className="template-card" style={{ '--tpl-color': tpl.color }}>
              <div className="template-card__icon">{tpl.icon}</div>
              <div className="template-card__body">
                <h3 className="template-card__name">{tpl.name}</h3>
                <p className="template-card__desc">{tpl.desc}</p>

                {/* Mini flow preview */}
                <div className="template-card__flow">
                  {tpl.flow.map((step, i) => (
                    <React.Fragment key={i}>
                      <span className="tpl-step">{step}</span>
                      {i < tpl.flow.length - 1 && <span className="tpl-arrow">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <button
                className="template-card__btn"
                onClick={() => onTemplate(tpl.data)}
                id={`btn-template-${tpl.id}`}
              >
                Use Template →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="landing__features">
        <div className="landing__section-header">
          <h2 className="landing__section-title">✨ What You Can Do</h2>
        </div>
        <div className="landing__feature-grid">
          {[
            { icon: '🖱️', title: 'Drag & Drop',       desc: 'Build ML pipelines visually — no code required.' },
            { icon: '⚡', title: 'Instant Results',    desc: 'Run your pipeline and see accuracy, F1, and charts in seconds.' },
            { icon: '💡', title: 'Learn as You Build', desc: 'Every parameter has a plain-English explanation. Tooltips guide you.' },
            { icon: '✅', title: 'Validated Runs',     desc: 'Smart checks catch common mistakes before you hit Run.' },
            { icon: '🧪', title: 'Live Predictions',   desc: 'Test your trained model with custom inputs — instantly.' },
            { icon: '🐍', title: 'Export to Python',   desc: 'Download a ready-to-run scikit-learn script from your graph.' },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <span className="feature-card__icon">{f.icon}</span>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

export default LandingPage
