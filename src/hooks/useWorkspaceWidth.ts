import { useContext } from 'react';
import { WorkspaceWidthContext, WorkspaceWidthMode } from '../contexts/WorkspaceWidthContext';

export function useWorkspaceWidth() {
	const ctx = useContext(WorkspaceWidthContext);
	if (!ctx) {
		throw new Error('useWorkspaceWidth must be used within a WorkspaceWidthProvider');
	}
	return ctx.setMode;
}

export function useWorkspaceWidthMode(): WorkspaceWidthMode {
	const ctx = useContext(WorkspaceWidthContext);
	if (!ctx) {
		throw new Error('useWorkspaceWidthMode must be used within a WorkspaceWidthProvider');
	}
	return ctx.mode;
}
