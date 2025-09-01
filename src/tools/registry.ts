import type { ComponentType } from 'react';

export interface ToolDefinition {
	id: string;
	label: string;
	icon?: string; // Blueprint icon name
	path: string; // route path under /tools
	component: ComponentType<object>;
	showInMenu?: boolean; // defaults to true
	order?: number; // optional ordering hint
}

// Consumers should import this registry to render navigation and routes.
import Base64Tool from '../tools/Base64Tool';
import JWTDecoderTool from '../tools/JWTDecoderTool';
import URLEncodeTool from '../tools/URLEncodeTool';

export const toolsRegistry: ToolDefinition[] = [
	{
		id: 'base64',
		label: 'Base64 Encoder/Decoder',
		icon: 'exchange',
		path: 'base64',
		component: Base64Tool,
		showInMenu: true,
		order: 10,
	},
	{
		id: 'url',
		label: 'URL Encoder/Decoder',
		icon: 'link',
		path: 'url',
		component: URLEncodeTool,
		showInMenu: true,
		order: 15,
	},
	{
		id: 'jwt',
		label: 'JWT Decoder',
		icon: 'key',
		path: 'jwt',
		component: JWTDecoderTool,
		showInMenu: true,
		order: 20,
	},
];

export function getVisibleTools(): ToolDefinition[] {
	return toolsRegistry
		.filter((t) => t.showInMenu !== false)
		.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}


