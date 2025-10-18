// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// If you cleared index.css, this import can stay for base styles:
import './index.css'; 
// CRITICAL: This is where your new UI styles are loaded:
import './App.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);