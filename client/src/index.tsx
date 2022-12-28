import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { setupStore } from 'app/store';
import { Provider } from 'react-redux';
import { ToastProvider } from 'components/Toast';

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <Provider store={setupStore()}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </Provider>
  </React.StrictMode>
);
