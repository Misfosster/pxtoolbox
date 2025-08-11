import React from 'react';
import { Card, H3, Classes } from '@blueprintjs/core';

export interface ToolTemplateProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

/**
 * Template component for new tools
 * Use this as a starting point when creating new developer utilities
 */
const ToolTemplate: React.FC<ToolTemplateProps> = ({ title, description, children }) => {
  return (
    <div className="tool-container">
      <Card elevation={2} className="tool-header">
        <H3>{title}</H3>
        <p className={Classes.TEXT_MUTED}>{description}</p>
      </Card>
      
      <div className="tool-content">
        {children}
      </div>
    </div>
  );
};

export default ToolTemplate;