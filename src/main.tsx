import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// We may replace the above code with the following code in the future:

// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import './index.css';
// import App from './App.tsx';

// const RootComponent: React.FC = () => {
//   return (
//     <App />
//   );
// };

// const root = ReactDOM.createRoot(
//   document.getElementById('root') as HTMLElement
// );

// root.render(
//   <React.StrictMode>
//     <RootComponent />
//   </React.StrictMode>
// );
