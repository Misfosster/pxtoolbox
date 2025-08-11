import React from 'react';
import { Card, H3, Classes } from '@blueprintjs/core';
import ToolTab from './ToolTab';

const ToolsHub: React.FC = () => {
  return (
    <ToolTab title="Tools" description="Browse and launch available tools">
      <Card elevation={1}>
        <H3>Tool index</H3>
        <p className={Classes.TEXT_MUTED}>No tools published yet. Coming soon.</p>
      </Card>
    </ToolTab>
  );
};

export default ToolsHub;


