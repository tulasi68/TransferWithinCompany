import './lib/storage.js';   // must run before the app renders
import React from 'react';
import ReactDOM from 'react-dom/client';
import TransferExchange from './transfer-exchange.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TransferExchange />
  </React.StrictMode>
);
