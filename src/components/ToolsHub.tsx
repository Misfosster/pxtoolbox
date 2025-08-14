import React from 'react';
import { Card, H3, Classes, Button } from '@blueprintjs/core';
import { useNavigate } from 'react-router-dom';
import ToolTab from './ToolTab';

const ToolsHub: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ToolTab title="Tools" description="Browse and launch available tools">
      <Card elevation={1}>
        <H3>Tool index</H3>
        <ul>
          <li>
            <Button icon="exchange" onClick={() => navigate('/tools/base64')}>
              Base64 Encoder/Decoder
            </Button>
            <span className={Classes.TEXT_MUTED} style={{ marginLeft: 8 }}>
              Convert text to/from Base64
            </span>
          </li>
          <li style={{ marginTop: 8 }}>
            <Button icon="key" onClick={() => navigate('/tools/jwt')}>
              JWT Decoder
            </Button>
            <span className={Classes.TEXT_MUTED} style={{ marginLeft: 8 }}>
              Decode JWT header/payload locally
            </span>
          </li>
        </ul>
      </Card>
    </ToolTab>
  );
};

export default ToolsHub;


