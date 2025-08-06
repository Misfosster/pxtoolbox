import React from 'react';
import { 
  Navbar, 
  NavbarGroup, 
  NavbarHeading, 
  Alignment
} from '@blueprintjs/core';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div>
      <Navbar>
        <NavbarGroup align={Alignment.LEFT}>
          <NavbarHeading>
            🔧 PX Toolbox
          </NavbarHeading>
        </NavbarGroup>
      </Navbar>
      
      <div className="main-container">
        {children}
      </div>
    </div>
  );
};

export default Layout;