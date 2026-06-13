import React from 'react';
import ReactDOM from 'react-dom/client';
import InserimentoOre from './pages/InserimentoOre';
import './index.css';

// Minimal standalone entry — solo per sviluppo isolato.
// In produzione questo modulo viene caricato come remote dal host (small-cmr-base).
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <InserimentoOre />
  </React.StrictMode>
);
