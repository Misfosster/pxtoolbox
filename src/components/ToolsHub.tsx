import React from 'react';
import { Card, H3, Classes, Button } from '@blueprintjs/core';
import { useNavigate } from 'react-router-dom';
import ToolTab from './ToolTab';
import { getVisibleTools } from '../tools/registry';

const ToolsHub: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ToolTab title="Tools" description="Browse and launch available tools">
      <Card elevation={1}>
        <H3>Tool index</H3>
        <ul>
          {getVisibleTools().map((tool, idx) => (
            <li key={tool.id} style={{ marginTop: idx === 0 ? 0 : 8 }}>
              <Button icon={tool.icon} onClick={() => navigate(`/tools/${tool.path}`)}>
                {tool.label}
              </Button>
              <span className={Classes.TEXT_MUTED} style={{ marginLeft: 8 }}>
                {/* Descriptions can be added to registry later */}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </ToolTab>
  );
};

export default ToolsHub;


