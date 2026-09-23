// src/App.jsx
// Root component — toggles between LandingPage and EditorPage

import React, { useState } from 'react'
import LandingPage from './pages/LandingPage'
import EditorPage  from './pages/EditorPage'
import useGraphStore from './store/graphStore'
import './styles/index.css'

import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const [inEditor, setInEditor] = useState(false)
  const loadTemplate = useGraphStore(s => s.loadTemplate)

  const handleTemplate = (templateData) => {
    loadTemplate(templateData)
    setInEditor(true)
  }

  return (
    <ErrorBoundary>
      {!inEditor ? (
        <LandingPage
          onEnter={() => setInEditor(true)}
          onTemplate={handleTemplate}
        />
      ) : (
        <EditorPage onHome={() => setInEditor(false)} />
      )}
    </ErrorBoundary>
  )
}

export default App
