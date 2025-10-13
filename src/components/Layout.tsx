import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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
  const [autoFull, setAutoFull] = useState<boolean>(false);
  const autoFullRef = useRef<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isToolsRoute) setToolsOpen(true);
  }, [isToolsRoute]);

  useEffect(() => {
    // Reset to default width on route change
    setWorkspaceMode('default');
    setAutoFull(false);
    autoFullRef.current = false;
  }, [pathname]);

  const evaluateOverflow = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const wrapper = wrapperRef.current;
    const main = mainRef.current;
    const container = wrapper?.parentElement;
    if (!main || !container || !wrapper) {
      setAutoFull(false);
      return;
    }

    // Compare the main content's scroll width to the actual wrapper width.
    // If content exceeds wrapper capacity, enable full width; otherwise stay at default.
    const scrollWidth = main.scrollWidth;
    const containerWidth = container.clientWidth || 0;
    const baseWidth = containerWidth * 0.75;

    // Hysteresis to avoid rapid toggling: expand later, shrink earlier for stability
    const expandTriggerPx = baseWidth + 128; // expand only when content significantly exceeds base
    const shrinkTriggerPx = baseWidth - 32;  // shrink when near base again

    let next = autoFullRef.current;
    if (!next && scrollWidth > expandTriggerPx) next = true;
    if (next && scrollWidth < shrinkTriggerPx) next = false;

    autoFullRef.current = next;
    setAutoFull(next);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    evaluateOverflow();

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(evaluateOverflow);
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    const mutationObserver = typeof MutationObserver !== 'undefined' ? new MutationObserver(schedule) : null;

    const main = mainRef.current;
    if (main) {
      resizeObserver?.observe(main);
      mutationObserver?.observe(main, { childList: true, subtree: true, attributes: true });
    }

    const container = wrapperRef.current?.parentElement;
    if (container) {
      resizeObserver?.observe(container);
    }
    const wrapper = wrapperRef.current;
    if (wrapper) {
      resizeObserver?.observe(wrapper);
    }

    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [evaluateOverflow]);

  useEffect(() => {
    evaluateOverflow();
  }, [workspaceMode, pathname, evaluateOverflow]);

  const effectiveMode: WorkspaceWidthMode =
    autoFull || workspaceMode === 'full' ? 'full' : 'default';

  const widthWrapperClassName = [
    'content-width-wrapper',
    effectiveMode === 'full' ? 'content-width-wrapper--full' : undefined,
  ].filter(Boolean).join(' ');

  const providerValue = useMemo(() => ({
    mode: effectiveMode,
    setMode: setWorkspaceMode,
  }), [effectiveMode]);

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
        <div className={widthWrapperClassName} ref={wrapperRef}>
          <WorkspaceWidthProvider value={providerValue}>
            <div className="main-container" ref={mainRef}>
              {children}
            </div>
          </WorkspaceWidthProvider>
        </div>
      </main>
    </div>
  );
};

export default Layout;
