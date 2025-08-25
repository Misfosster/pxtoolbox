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

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isToolsRoute = useMemo(() => pathname.startsWith('/tools'), [pathname]);
  const [toolsOpen, setToolsOpen] = useState<boolean>(isToolsRoute);

  useEffect(() => {
    if (isToolsRoute) setToolsOpen(true);
  }, [isToolsRoute]);

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
            onClick={() => setToolsOpen((v) => !v)}
          />
          <Collapse isOpen={toolsOpen} keepChildrenMounted>
            <Menu className="sidebar-submenu">
              {getVisibleTools().map((tool) => (
                <MenuItem
                  key={tool.id}
                  icon={tool.icon}
                  text={tool.label}
                  active={pathname === `/tools/${tool.path}`}
                  onClick={() => navigate(`/tools/${tool.path}`)}
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
        <div className="main-container">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;