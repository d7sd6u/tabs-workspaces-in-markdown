import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';
import './style.css';

const root = document.getElementById('root');
if (!root) throw new Error('No root!');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
