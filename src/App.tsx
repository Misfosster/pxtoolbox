
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Classes } from '@blueprintjs/core';
import './App.css';
import Layout from './components/Layout';
import Home from './components/Home';

function App() {
  return (
    <div className={Classes.DARK}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </Layout>
      </Router>
    </div>
  );
}

export default App;