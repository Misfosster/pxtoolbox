
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

  // Ensure routes work correctly when the app is served from a sub-path
  // (e.g. GitHub Pages project sites). Vite exposes the configured base via
  // import.meta.env.BASE_URL, which includes a trailing slash. BrowserRouter
  // expects the basename without the trailing slash, while HashRouter ignores
  // it, so we trim it to support both routers.
  const baseName = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  // HashRouter ignores basename; only pass basename when using BrowserRouter
  const routerProps = isTestEnvironment ? {} : { basename: baseName };
  
  return (
    <div className={Classes.DARK}>
      <RouterComponent {...(routerProps as any)}>
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