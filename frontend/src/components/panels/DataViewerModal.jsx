// src/components/panels/DataViewerModal.jsx
// Interactive modal to inspect, explore, paginate, and view summary stats of CSV datasets

import React, { useState, useEffect } from 'react'
import { getDatasetPreview } from '../../api/api'

function DataViewerModal({ dataInfo, onClose }) {
  const [activeTab, setActiveTab] = useState('table') // 'table' | 'stats' | 'analytics'
  const [page, setPage]           = useState(1)
  const [limit, setLimit]         = useState(20)
  const [dataset, setDataset]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filePath     = dataInfo?.filePath
  const filename     = dataInfo?.filename || (filePath ? filePath.split(/[\\/]/).pop() : 'Dataset')
  const targetColumn = dataInfo?.targetColumn

  const loadData = async (targetPage = page, targetLimit = limit) => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await getDatasetPreview({
        filePath,
        filename,
        page: targetPage,
        limit: targetLimit,
      })
      setDataset(data)
      setPage(data.page)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load dataset preview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(1, limit)
  }, [filePath, filename, limit])

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (dataset && newPage > dataset.totalPages)) return
    loadData(newPage, limit)
  }

  // Filter rows by search query
  const filteredRows = dataset?.rows ? dataset.rows.filter(row => {
    if (!searchQuery) return true
    return Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    )
  }) : []

  return (
    <div className="results-overlay" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="results-panel"
        style={{
          width: '920px',
          maxWidth: '96vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="results-panel__header" style={{ flexShrink: 0, paddingBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📊 Dataset Explorer</span>
              </h2>
              <span style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}>
                📄 {filename}
              </span>
              {dataset && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  ({dataset.totalRows.toLocaleString()} rows × {dataset.totalCols} columns)
                </span>
              )}
            </div>

            {/* Tab switchers */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                style={{
                  background: activeTab === 'table' ? 'var(--color-accent)' : 'var(--color-bg-surface)',
                  color: activeTab === 'table' ? '#fff' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  padding: '5px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={() => setActiveTab('table')}
              >
                📋 Table Data
              </button>
              <button
                style={{
                  background: activeTab === 'stats' ? 'var(--color-accent)' : 'var(--color-bg-surface)',
                  color: activeTab === 'stats' ? '#fff' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  padding: '5px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={() => setActiveTab('stats')}
              >
                📈 Column Statistics ({dataset?.columns?.length || 0})
              </button>
              <button
                style={{
                  background: activeTab === 'analytics' ? 'var(--color-accent)' : 'var(--color-bg-surface)',
                  color: activeTab === 'analytics' ? '#fff' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  padding: '5px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={() => setActiveTab('analytics')}
              >
                🔬 Analytics
              </button>
            </div>
          </div>
          <button className="results-panel__close" onClick={onClose}>×</button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column' }}>
          {loading && (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '40px 0' }}>
              ⏳ Loading dataset…
            </p>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              padding: '14px 18px',
              borderRadius: '8px',
              fontSize: '13px'
            }}>
              ⚠ {error}
            </div>
          )}

          {/* TAB 1: TABLE PREVIEW */}
          {!loading && !error && dataset && activeTab === 'table' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Search bar & Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Search visible rows..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    padding: '7px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    width: '260px'
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  <span>Rows per page:</span>
                  <select
                    value={limit}
                    onChange={e => setLimit(Number(e.target.value))}
                    style={{
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Scrollable Data Table */}
              <div style={{
                overflowX: 'auto',
                overflowY: 'auto',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                maxHeight: '440px'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-surface)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', width: '45px' }}>#</th>
                      {dataset.columns.map(col => {
                        const isTarget = col === targetColumn
                        const stat = dataset.colStats?.find(s => s.name === col)
                        return (
                          <th
                            key={col}
                            style={{
                              padding: '10px 14px',
                              borderBottom: '1px solid var(--color-border)',
                              background: isTarget ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
                              color: isTarget ? '#c084fc' : 'var(--color-text-primary)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span>{col} {isTarget && '🎯'}</span>
                              {stat && (
                                <span style={{ fontSize: '10px', color: isTarget ? '#c084fc' : 'var(--color-text-secondary)', fontWeight: 'normal' }}>
                                  {stat.type}
                                </span>
                              )}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, idx) => {
                      const rowNum = (dataset.page - 1) * dataset.limit + idx + 1
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--color-border)',
                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'}
                        >
                          <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>{rowNum}</td>
                          {dataset.columns.map(col => {
                            const isTarget = col === targetColumn
                            return (
                              <td
                                key={col}
                                style={{
                                  padding: '8px 14px',
                                  whiteSpace: 'nowrap',
                                  color: isTarget ? '#c084fc' : 'var(--color-text-primary)',
                                  fontWeight: isTarget ? 600 : 'normal',
                                  background: isTarget ? 'rgba(168, 85, 247, 0.05)' : 'transparent'
                                }}
                              >
                                {String(row[col] !== undefined ? row[col] : '')}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '14px',
                marginTop: 'auto',
                fontSize: '12px',
                color: 'var(--color-text-secondary)'
              }}>
                <span>
                  Showing rows {((dataset.page - 1) * dataset.limit) + 1}–{Math.min(dataset.page * dataset.limit, dataset.totalRows)} of {dataset.totalRows}
                </span>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn btn--secondary"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    disabled={dataset.page <= 1}
                    onClick={() => handlePageChange(dataset.page - 1)}
                  >
                    ◀ Prev
                  </button>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Page {dataset.page} of {dataset.totalPages}
                  </span>
                  <button
                    className="btn btn--secondary"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    disabled={dataset.page >= dataset.totalPages}
                    onClick={() => handlePageChange(dataset.page + 1)}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COLUMN STATISTICS */}
          {!loading && !error && dataset && activeTab === 'stats' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-surface)' }}>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>Column</th>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>Type</th>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>Missing / Nulls</th>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>Unique Values</th>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>Distribution / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.colStats?.map((col) => {
                    const isTarget = col.name === targetColumn
                    return (
                      <tr
                        key={col.name}
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: isTarget ? '#c084fc' : 'var(--color-text-primary)' }}>
                          {col.name} {isTarget && <span style={{ fontSize: '11px', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>Target</span>}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>
                          {col.type}
                        </td>
                        <td style={{ padding: '10px 14px', color: col.nullCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          {col.nullCount} ({col.nullPct}%)
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {col.uniqueCount} unique
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {col.min !== undefined && col.max !== undefined ? (
                            <span>
                              Min: <strong>{col.min}</strong> | Max: <strong>{col.max}</strong> | Mean: <strong>{col.mean}</strong>
                            </span>
                          ) : col.topValues ? (
                            <span>Top: {col.topValues.join(', ')}</span>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: ANALYTICS */}
          {!loading && !error && dataset && activeTab === 'analytics' && (() => {
            const stats = dataset.colStats || []
            const nullyCols = stats.filter(c => c.nullCount > 0)
            const catCols = stats.filter(c => c.topValues && c.topValues.length > 0)
            const numCols = stats.filter(c => c.min !== undefined)
            const targetStat = stats.find(c => c.name === targetColumn)

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '20px' }}>

                {/* Class Distribution (for target or categorical) */}
                {targetStat?.valueCounts && (
                  <div className="analytics-card">
                    <h4 className="analytics-card__title">🎯 Target Column Distribution: <em>{targetColumn}</em></h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {Object.entries(targetStat.valueCounts)
                        .sort(([,a],[,b]) => b - a)
                        .map(([cls, count]) => {
                          const pct = ((count / dataset.totalRows) * 100).toFixed(1)
                          return (
                            <div key={cls} className="feat-imp__row">
                              <span className="feat-imp__label" style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{cls}</span>
                              <div className="feat-imp__bar-track">
                                <div className="feat-imp__bar-fill" style={{ width: `${pct}%`, background: '#a78bfa' }} />
                              </div>
                              <span className="feat-imp__value">{count} ({pct}%)</span>
                            </div>
                          )
                        })
                      }
                    </div>
                  </div>
                )}

                {/* Missing Values */}
                <div className="analytics-card">
                  <h4 className="analytics-card__title">🕳 Missing Values</h4>
                  {nullyCols.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--color-success)' }}>✅ No missing values found!</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {nullyCols.map(col => (
                        <div key={col.name} className="feat-imp__row">
                          <span className="feat-imp__label" style={{ color: 'var(--color-warning)' }}>{col.name}</span>
                          <div className="feat-imp__bar-track">
                            <div className="feat-imp__bar-fill" style={{ width: `${col.nullPct}%`, background: '#f59e0b' }} />
                          </div>
                          <span className="feat-imp__value">{col.nullCount} ({col.nullPct}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Numeric Column Ranges */}
                {numCols.length > 0 && (
                  <div className="analytics-card">
                    <h4 className="analytics-card__title">📐 Numeric Column Ranges</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                      {numCols.map(col => (
                        <div key={col.name} style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          padding: '10px 12px'
                        }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: col.name === targetColumn ? '#c084fc' : 'var(--color-text-primary)' }}>
                            {col.name} {col.name === targetColumn && <em style={{ fontWeight: 400, fontSize: '10px' }}>(target)</em>}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            <span>Min: <strong style={{ color: '#38bdf8' }}>{col.min}</strong></span>
                            <span>Mean: <strong style={{ color: '#a78bfa' }}>{col.mean}</strong></span>
                            <span>Max: <strong style={{ color: '#f97316' }}>{col.max}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categorical column top values */}
                {catCols.length > 0 && (
                  <div className="analytics-card">
                    <h4 className="analytics-card__title">🏷 Categorical Columns</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {catCols.map(col => (
                        <div key={col.name} style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          minWidth: '160px'
                        }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{col.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            Top: {col.topValues.slice(0, 4).join(', ')} …
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )
          })()}

        </div>
      </div>
    </div>
  )
}

export default DataViewerModal
