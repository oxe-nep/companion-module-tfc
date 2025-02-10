import { type SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	url: string
	panel: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'Configure Websocket connection to TFC Instance',
		},
		{
			type: 'textinput',
			id: 'url',
			label: 'Router WebSocket URL',
			width: 12,
			default: 'wss://localhost:8080',
			required: true,
		},
		{
			type: 'textinput',
			id: 'panel',
			label: 'Panel Name',
			width: 12,
			default: 'Companion Panel',
		},
	]
}
