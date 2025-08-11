import React from 'react';
import ToolTemplate from './ToolTemplate';
import type { ToolTemplateProps } from './ToolTemplate';

type ToolTabProps = ToolTemplateProps;

const ToolTab: React.FC<ToolTabProps> = (props) => {
  return <ToolTemplate {...props} />;
};

export default ToolTab;


