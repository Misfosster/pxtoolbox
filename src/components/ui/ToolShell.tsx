import React from 'react';
import { Card, H3, Classes } from '@blueprintjs/core';

export interface ToolShellProps {
	/** Main title shown in the header */
	title: string;
	/** Optional short description under the title */
	description?: string;
	/** Optional actions rendered on the right side of the header */
	actions?: React.ReactNode;
	/** Main tool content */
	children: React.ReactNode;
	/** Optional footer content aligned left */
	footerLeft?: React.ReactNode;
	/** Optional footer content aligned right */
	footerRight?: React.ReactNode;
	/** Optional extra class for the outer container */
	className?: string;
	/** Optional inline styles for the outer container */
	style?: React.CSSProperties;
}

const ToolShell: React.FC<ToolShellProps> = ({
	title,
	description,
	actions,
	children,
	footerLeft,
	footerRight,
	className,
	style,
}) => {
	const containerClassName = ['tool-container', className].filter(Boolean).join(' ');

	return (
		<div className={containerClassName} style={style}>
			<Card elevation={2} className="tool-header" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' }}>
				<div style={{ flex: '1 1 auto' }}>
					<H3 style={{ marginTop: 0, marginBottom: 4 }}>{title}</H3>
					{description && (
						<p className={Classes.TEXT_MUTED} style={{ margin: 0 }}>{description}</p>
					)}
				</div>
				{actions && (
					<div className="tool-actions" style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
						{actions}
					</div>
				)}
			</Card>

			<div className="tool-content">
				{children}
			</div>

			{(footerLeft || footerRight) && (
				<div className="tool-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
					<div style={{ display: 'flex', gap: 8 }}>
						{footerLeft}
					</div>
					<div style={{ display: 'flex', gap: 8 }}>
						{footerRight}
					</div>
				</div>
			)}
		</div>
	);
};

export default ToolShell;


