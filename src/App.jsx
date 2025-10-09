import React from 'react'

export default function App() {
  return (
    <div style={{
      padding: '32px',
      margin: '48px auto',
      maxWidth: 720,
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, "Helvetica Neue", Arial'
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Factor Victoria</h1>
      <p style={{ color: '#374151' }}>Render mínimo OK. Luego volvemos a la app completa.</p>
      <img src="/hero-players.png" alt="Hero" style={{ marginTop: 16, width: '100%', borderRadius: 12 }}/>
    </div>
  )
}
