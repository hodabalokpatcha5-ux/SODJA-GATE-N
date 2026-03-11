console.log("SODJA GATE: main.tsx starting...");
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log("SODJA GATE: initializing root...");
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("SODJA GATE: Root element not found!");
} else {
  createRoot(rootElement).render(
    <App />
  );
  console.log("SODJA GATE: App rendered.");
}
