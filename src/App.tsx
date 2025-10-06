
import { BrowserRouter as Router, HashRouter as TestRouter, Routes, Route } from 'react-router-dom';
import { Classes } from '@blueprintjs/core';
import './App.css';
import Layout from './components/Layout';
import Home from './components/Home';
import ToolsHub from './components/ToolsHub';
import { toolsRegistry } from './tools/registry';

function App() {
  // Use HashRouter for tests running against the Vite preview server on port 4173.
  // Everywhere else (development, production, etc.) should use BrowserRouter so that
  // we get clean URLs that match the deployed GitHub Pages site structure.
  const isTestEnvironment =
    typeof window !== 'undefined' &&
    window.location?.port === '4173' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const RouterComponent = isTestEnvironment ? TestRouter : Router;
  
  return (
    <div className={Classes.DARK}>
      <RouterComponent>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tools" element={<ToolsHub />} />
            {toolsRegistry.map((tool) => (
              <Route key={tool.id} path={`/tools/${tool.path}`} element={<tool.component />} />
            ))}
          </Routes>
        </Layout>
      </RouterComponent>
    </div>
  );
}

export default App;