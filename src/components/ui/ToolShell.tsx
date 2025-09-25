import React from 'react';
import { Card, H3, Classes, Button, Intent } from '@blueprintjs/core';
import { useFavorites } from '../../hooks/useFavorites';

export interface ToolShellProps {
	/** Main title shown in the header */
	title: string;
	/** Optional short description under the title */
	description?: string;
	/** Optional actions rendered on the right side of the header */
	actions?: React.ReactNode;
	/** Tool ID for favorite functionality */
	toolId?: string;
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
	toolId,
	children,
	footerLeft,
	footerRight,
	className,
	style,
}) => {
	const { toggleFavorite, isFavorite } = useFavorites();
	const containerClassName = ['tool-container', className].filter(Boolean).join(' ');

	return (
		<div className={containerClassName} style={style}>
			<Card elevation={2} className="tool-header" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' }}>
				<div style={{ flex: '1 1 auto', textAlign: 'center' }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
						{toolId && (
						<Button
							minimal
							small
							icon={isFavorite(toolId) ? "star" : "star-empty"}
							intent={isFavorite(toolId) ? Intent.WARNING : Intent.NONE}
							onClick={() => toggleFavorite(toolId)}
							title={isFavorite(toolId) ? "Remove from favorites" : "Add to favorites"}
							style={{ padding: '2px 4px' }}
							data-testid="favorite-star"
						/>
						)}
						<H3 style={{ marginTop: 0, marginBottom: 0 }}>{title}</H3>
					</div>
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


