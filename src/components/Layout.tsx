import React, { useMemo, useState, useEffect } from 'react';
import { 
  Card,
  H3,
  Menu,
  MenuItem,
  Collapse
} from '@blueprintjs/core';
import { useLocation, useNavigate } from 'react-router-dom';
import { getVisibleTools } from '../tools/registry';
import { WorkspaceWidthProvider } from '../contexts/WorkspaceWidthContext';
import type { WorkspaceWidthMode } from '../contexts/WorkspaceWidthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isToolsRoute = useMemo(() => pathname.startsWith('/tools'), [pathname]);
  const [toolsOpen, setToolsOpen] = useState<boolean>(true);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceWidthMode>('default');

  useEffect(() => {
    if (isToolsRoute) setToolsOpen(true);
  }, [isToolsRoute]);

  useEffect(() => {
    setWorkspaceMode('default');
  }, [pathname]);

  const widthWrapperClassName = [
    'content-width-wrapper',
    workspaceMode === 'full' ? 'content-width-wrapper--full' : undefined,
  ].filter(Boolean).join(' ');

  const providerValue = useMemo(() => ({
    mode: workspaceMode,
    setMode: setWorkspaceMode,
  }), [workspaceMode]);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Card elevation={2} className="sidebar-header">
          <H3 style={{ margin: 0 }}>🔧 PX Toolbox</H3>
        </Card>
        <Menu className="sidebar-menu">
          <MenuItem
            icon="home"
            text="Home"
            active={pathname === '/'}
            onClick={() => navigate('/')}
          />
          <MenuItem
            className="menu-tools-toggle"
            icon="wrench"
            text="Tools"
            aria-expanded={toolsOpen}
            data-testid="sidebar-tools-toggle"
            onClick={() => setToolsOpen((v) => !v)}
          />
          <Collapse isOpen={toolsOpen} keepChildrenMounted>
            <Menu className="sidebar-submenu" data-testid="sidebar-tools-submenu">
              {getVisibleTools().map((tool) => (
                <MenuItem
                  key={tool.id}
                  icon={tool.icon}
                  text={tool.label}
                  active={pathname === `/tools/${tool.path}`}
                  onClick={() => navigate(`/tools/${tool.path}`)}
                  style={{ marginBottom: 6 }}
                />
              ))}
              <MenuItem
                icon="list"
                text="All tools…"
                active={pathname === '/tools'}
                onClick={() => navigate('/tools')}
              />
            </Menu>
          </Collapse>
        </Menu>
      </aside>

      <main className="content-container">
        <div className={widthWrapperClassName}>
          <WorkspaceWidthProvider value={providerValue}>
            <div className="main-container">
              {children}
            </div>
          </WorkspaceWidthProvider>
        </div>
      </main>
    </div>
  );
};

export default Layout;
