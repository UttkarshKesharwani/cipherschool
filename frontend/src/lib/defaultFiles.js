export const DEFAULT_FILES = {
  "/src/App.jsx": `import React from 'react'
export default function App(){
  return (
    <div style={{padding:20}}>
      <h1>Hello from CipherStudio</h1>
      <p>Edit files in the explorer to the left and see live preview on the right.</p>
    </div>
  )
}
`,
  "/src/index.jsx": `import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')).render(<App />)
`,
  "/package.json": `{
  "name": "cipher-sandbox",
  "version": "0.0.1",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
`,
  "/index.html": `<!DOCTYPE html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>CipherStudio Preview</title>
  </head>
  <body>
    <div id=\"root\"></div>
  </body>
</html>
`,
};

export default DEFAULT_FILES;
