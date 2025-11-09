import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/reset.css';
import './css/main.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);

serviceWorker.unregister();