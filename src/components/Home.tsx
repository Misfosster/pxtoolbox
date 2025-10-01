import React from 'react';
import { 
  Card, 
  H1, 
  H3, 
  H4,
  Classes,
  Button,
  Intent,
  Tag
} from '@blueprintjs/core';
import { getVisibleTools } from '../tools/registry';
import { useFavorites } from '../hooks/useFavorites';
import { getVersionInfo } from '../utils/version';

const getToolDescription = (toolId: string): string => {
  const descriptions: Record<string, string> = {
    base64: 'Encode and decode Base64 strings with real-time conversion between text and Base64 formats.',
    jwt: 'Decode and inspect JWT tokens with header, payload, and signature analysis.',
    url: 'Encode and decode URL components with proper percent-encoding for safe web transmission.',
    json: 'Format, validate, and edit JSON with a collapsible tree view and inline editing capabilities.',
    diff: 'Compare text files with side-by-side highlighting, unified preview, and smart alignment algorithms.'
  };
  return descriptions[toolId] || 'Developer utility tool for common tasks.';
};

const Home: React.FC = () => {
  const { version: currentVersion, releaseDate } = getVersionInfo();
  const allTools = getVisibleTools();
  const { isFavorite } = useFavorites();
  
  // Show only favorited tools
  const tools = allTools.filter(tool => isFavorite(tool.id));

  return (
    <div className="home-container">
      {/* Release Status Card */}
      <Card elevation={2} className="release-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <H1 style={{ margin: 0 }}>PX Toolbox</H1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tag intent={Intent.SUCCESS} large icon="tick">
              {currentVersion}
            </Tag>
            <span className={Classes.TEXT_MUTED}>Released {releaseDate}</span>
          </div>
        </div>
        <p className={Classes.TEXT_LARGE}>
          A collection of developer utilities for the Pernexus team.
        </p>
        <p>
          This toolbox is designed to provide quick, reliable access to common developer utilities
          without depending on external services. All processing happens locally in your browser
          for security and speed.
        </p>
      </Card>

      {/* Favorite Tools */}
      <Card elevation={1} className="tools-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <H3>⭐ Favorite Tools</H3>
          {tools.length > 0 && (
            <Tag intent={Intent.PRIMARY} minimal>
              {tools.length} favorite{tools.length !== 1 ? 's' : ''}
            </Tag>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 16 }}>
          {tools.map((tool) => (
            <Card key={tool.id} elevation={0} className="tool-preview-card" style={{ padding: 16, border: '1px solid var(--bp4-color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ marginRight: 8, fontSize: '16px' }}>🔧</span>
                <H4 style={{ margin: 0 }}>{tool.label}</H4>
              </div>
              <p style={{ margin: '8px 0', fontSize: '14px', color: 'var(--bp4-color-text-muted)' }}>
                {getToolDescription(tool.id)}
              </p>
              <Button 
                small 
                intent={Intent.PRIMARY}
                onClick={() => window.location.href = `#/tools/${tool.path}`}
              >
                Open Tool
              </Button>
            </Card>
          ))}
        </div>
        {tools.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--bp4-color-text-muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: 16, opacity: 0.5 }}>⭐</div>
            <p>No favorite tools selected yet.</p>
            <p>Use the star icons in the sidebar to add tools to your favorites.</p>
          </div>
        )}
      </Card>

      <Card elevation={1} className="status-card">
        <H3>✅ Production Status</H3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div>
            <H4 style={{ margin: '0 0 8px 0', color: 'var(--bp4-color-text-muted)' }}>Test Coverage</H4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--bp4-color-success)' }}>✅</span>
              <span>98 unit tests + 53 E2E tests</span>
            </div>
          </div>
          <div>
            <H4 style={{ margin: '0 0 8px 0', color: 'var(--bp4-color-text-muted)' }}>Security</H4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--bp4-color-success)' }}>🛡️</span>
              <span>All vulnerabilities resolved</span>
            </div>
          </div>
          <div>
            <H4 style={{ margin: '0 0 8px 0', color: 'var(--bp4-color-text-muted)' }}>Deployment</H4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--bp4-color-success)' }}>☁️</span>
              <span>Automated CI/CD pipeline</span>
            </div>
          </div>
        </div>
        
        <p>
          The PX Toolbox is now production-ready with comprehensive testing, security compliance, 
          and automated deployment. All core tools are fully functional and ready for team use.
        </p>
        
        <H4>Future Enhancements:</H4>
        <ul>
          <li>Hash Generators - MD5, SHA1, SHA256</li>
          <li>Case Converters - camelCase, snake_case, kebab-case</li>
          <li>Color Code Converters - HEX, RGB, HSL</li>
          <li>Regex Testers - Pattern matching and validation</li>
          <li>Mobile optimizations and responsive improvements</li>
        </ul>

        <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
          <Button 
            intent={Intent.PRIMARY} 
            icon="code"
            onClick={() => window.open('https://github.com/misfosster/pxtoolbox', '_blank')}
          >
            View Source
          </Button>
          <Button 
            intent={Intent.NONE} 
            icon="document"
            onClick={() => window.open('https://github.com/misfosster/pxtoolbox/releases', '_blank')}
          >
            Release Notes
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