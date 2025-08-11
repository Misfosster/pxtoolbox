import React from 'react';
import { 
  Card, 
  H1, 
  H3, 
  H4,
  Classes,
  Button,
  Intent
} from '@blueprintjs/core';

const Home: React.FC = () => {
  return (
    <div className="home-container">
      <Card elevation={2} className="welcome-card">
        <H1>Welcome to PX Toolbox</H1>
        <p className={Classes.TEXT_LARGE}>
          A collection of developer utilities for the Pernexus team.
        </p>
        <p>
          This toolbox is designed to provide quick, reliable access to common developer utilities
          without depending on external services. All processing happens locally in your browser
          for security and speed.
        </p>
      </Card>

      <Card elevation={1} className="status-card">
        <H3>🚧 Development Status</H3>
        <p>
          This project is currently under development during William's internship at Pernexus.
          Tools will be added incrementally based on team needs and feedback.
        </p>
        
        <H4>Planned Tools:</H4>
        <ul>
          <li>JWT Token Decoder - Decode and inspect JWT tokens</li>
          <li>Text Transformations - Base64, URL encoding, JSON formatting</li>
          <li>Hash Generators - MD5, SHA1, SHA256</li>
          <li>Case Converters - camelCase, snake_case, kebab-case</li>
          <li>API Testing Tools - Quick HTTP requests and response formatting</li>
        </ul>

        <div style={{ marginTop: 20 }}>
          <Button 
            intent={Intent.PRIMARY} 
            icon="code"
            onClick={() => window.open('https://misfosster.github.io/pxtoolbox/', '_blank')}
          >
            View on GitHub
          </Button>
        </div>
      </Card>

      <Card elevation={1} className="tech-card">
        <H4>🛠 Built With</H4>
        <ul>
          <li><strong>React 18</strong> with TypeScript</li>
          <li><strong>Blueprint JS</strong> for UI components</li>
          <li><strong>Vite</strong> for fast development</li>
          <li><strong>Playwright</strong> for testing</li>
          <li><strong>GitHub Actions</strong> for CI/CD</li>
        </ul>
      </Card>
    </div>
  );
};

export default Home;