// src/api/api.js
// Axios client — all HTTP calls to the FastAPI backend go through this file

import axios from 'axios'

const BASE_URL = 'http://localhost:8000/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

// ─── UPLOAD ──────────────────────────────────────────────────────────────────
// POST /api/upload — sends a CSV file, returns { filePath, columns, shape, preview }
export const uploadCSV = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// ─── EXECUTE ─────────────────────────────────────────────────────────────────
// POST /api/execute — sends serialized graph, returns per-node results
export const executePipeline = (graphPayload) =>
  api.post('/execute', graphPayload)

// ─── UPLOADS LIST & SELECT & DELETE & PREVIEW ────────────────────────────────
export const listUploads        = ()          => api.get('/uploads/list')
export const selectUpload       = (filename)  => api.get('/uploads/select', { params: { filename } })
export const deleteUpload       = (filename)  => api.delete('/uploads/delete', { params: { filename } })
export const getDatasetPreview  = (params)    => api.get('/uploads/preview', { params })

// ─── PIPELINE SAVE / LOAD / LIST / DELETE ────────────────────────────────────
export const savePipeline   = (payload)   => api.post('/pipelines/save', payload)
export const loadPipeline   = (filePath)  => api.get('/pipelines/load', { params: { filePath } })
export const listPipelines  = ()          => api.get('/pipelines/list')
export const deletePipeline = (filename)  => api.delete('/pipelines/delete', { params: { filename } })

// ─── EXPORT ──────────────────────────────────────────────────────────────────
// POST /api/export/python — returns { code, filename }
export const exportPython = (payload) => api.post('/export/python', payload)

// ─── TRAINED MODEL & LIVE PREDICTION ─────────────────────────────────────────
export const getModelSchema  = ()            => api.get('/models/schema')
export const predictModel    = (inputs)      => api.post('/models/predict', { inputs })
export const getModelDownloadUrl = (type)    => `${BASE_URL}/models/download/${type}`

export default api
