import AOS from 'aos'
import 'aos/dist/aos.css'
import 'lenis/dist/lenis.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ConsoleProvider from './context/ConsoleProvider.jsx'
import './index.css'

AOS.init({
  duration: 800,
  easing: 'ease-out-cubic',
  offset: 60,
  once: false,
  disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ConsoleProvider>
        <App />
      </ConsoleProvider>
    </BrowserRouter>
  </StrictMode>,
)
