import React from 'react';
import Editor from './components/Editor'; 
import './index.css'; 

function App() {
  return (
    // We remove all outer divs/headers because Editor.js now handles the full screen layout
    <Editor />
  );
}

export default App;