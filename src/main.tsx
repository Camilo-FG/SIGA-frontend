import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './toast.css'
import './dark-mode.css'
import './theme-control.css'
import './dark-login-admin.css'
import './landing-dark-controls.css'
import './dark-metrics.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
