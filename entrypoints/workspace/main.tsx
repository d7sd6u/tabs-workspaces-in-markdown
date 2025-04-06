import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';

document.title = location.hash.slice(1) || 'Workspace';

const root = document.getElementById('root');
if (!root) throw new Error('No root!');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
