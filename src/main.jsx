import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const el = document.getElementById('root');
if (!el) {
  // DEBUG visible en consola si algo raro pasa con #root
  console.error('No se encontró #root');
} else {
  createRoot(el).render(<App />);
  console.log('✅ App montada');
}
