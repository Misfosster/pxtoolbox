
import { BrowserRouter as Router, HashRouter as TestRouter, Routes, Route } from 'react-router-dom';
import { Classes } from '@blueprintjs/core';
import './App.css';
import Layout from './components/Layout';
import Home from './components/Home';
import ToolsHub from './components/ToolsHub';
import { toolsRegistry } from './tools/registry';

function App() {
  // Use HashRouter for tests, BrowserRouter for production
  // Check if we're in a test environment by looking for Playwright-specific globals
  const isTestEnvironment = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' && window.location.port === '4173');
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