import React from 'react';
import { Button, NavbarGroup, Alignment } from '@blueprintjs/core';
import { useLocation, useNavigate } from 'react-router-dom';

export interface NavTabItem {
  label: string;
  to: string;
  icon?: string; // Blueprint icon name
}

interface NavTabsProps {
  tabs: NavTabItem[];
  align?: 'left' | 'right';
  gapPx?: number; // spacing between buttons in px
}

const NavTabs: React.FC<NavTabsProps> = ({ tabs, align = 'right', gapPx = 8 }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <NavbarGroup
      align={align === 'left' ? Alignment.START : Alignment.END}
      style={{ display: 'flex', gap: `${gapPx}px` }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.to || pathname.startsWith(tab.to + '/');
        return (
          <Button
            key={tab.to}
            icon={tab.icon}
            active={isActive}
            onClick={() => navigate(tab.to)}
          >
            {tab.label}
          </Button>
        );
      })}
    </NavbarGroup>
  );
};

export default NavTabs;


