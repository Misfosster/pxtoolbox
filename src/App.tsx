
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Classes } from '@blueprintjs/core';
import './App.css';
import Layout from './components/Layout';
import Home from './components/Home';
import ToolsHub from './components/ToolsHub';
import Base64Tool from './tools/Base64Tool';

function App() {
  return (
    <div className={Classes.DARK}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tools" element={<ToolsHub />} />
            <Route path="/tools/base64" element={<Base64Tool />} />
          </Routes>
        </Layout>
      </Router>
    </div>
  );
}

export default App;