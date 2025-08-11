import React from 'react';
import { 
  Navbar, 
  NavbarGroup, 
  NavbarHeading, 
  Alignment
} from '@blueprintjs/core';
import NavTabs from './NavTabs';
import type { NavTabItem } from './NavTabs';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Add tabs to the navbar
  const tabs: NavTabItem[] = [
    { label: 'Home', to: '/', icon: 'home' },
    { label: 'Tools', to: '/tools', icon: 'layout-grid' },
  ];
  return (
    <div>
      <Navbar>
        <NavbarGroup align={Alignment.END}>
          <NavbarHeading>
          🔧 PX Toolbox 
          </NavbarHeading>
        </NavbarGroup>
        <NavTabs tabs={tabs} align="left" gapPx={12} />
      </Navbar>
      
      <div className="main-container">
        {children}
      </div>
    </div>
  );
};

export default Layout;