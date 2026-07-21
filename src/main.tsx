import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UsageProvider } from './UsageContext'
import { ViewModeProvider } from './ViewModeContext'
import { AudienceProvider } from './AudienceContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ViewModeProvider>
      <AudienceProvider>
        <UsageProvider>
          <App />
        </UsageProvider>
      </AudienceProvider>
    </ViewModeProvider>
  </StrictMode>,
)
