import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/tables.css'
import App from './App.tsx'
import { PeriodProvider } from './context/PeriodContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PeriodProvider>
      <App />
    </PeriodProvider>
  </StrictMode>,
)
