// src/main.jsx (FINAL CORRECTED IMPORTS)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom';
// 💥 FIX 1: Import the AuthProvider from the correct context location
import { AuthProvider } from './context/AuthContext.jsx'; // ⬅️ Corrected Import location

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    {/* 💥 FIX 2: Wrapping Order is CORRECT! */}
    <AuthProvider> 
      <App />
    </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)