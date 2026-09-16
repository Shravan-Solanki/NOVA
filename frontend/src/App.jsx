// src/App.jsx
// Root component — toggles between LandingPage and EditorPage

import React, { useState } from 'react'
import LandingPage from './pages/LandingPage'
import EditorPage  from './pages/EditorPage'
import './styles/index.css'

function App() {
  const [inEditor, setInEditor] = useState(false)

  if (!inEditor) {
    return <LandingPage onEnter={() => setInEditor(true)} />
  }
  return <EditorPage onHome={() => setInEditor(false)} />
}

export default App
