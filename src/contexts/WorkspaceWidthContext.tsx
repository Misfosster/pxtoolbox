import React from 'react';

export type WorkspaceWidthMode = 'default' | 'full';

export interface WorkspaceWidthContextValue {
	mode: WorkspaceWidthMode;
	setMode: (mode: WorkspaceWidthMode) => void;
}

export const WorkspaceWidthContext = React.createContext<WorkspaceWidthContextValue | null>(null);

export const WorkspaceWidthProvider = WorkspaceWidthContext.Provider;
