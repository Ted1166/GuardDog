// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import './config/walletconnect.ts'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <App />
)
