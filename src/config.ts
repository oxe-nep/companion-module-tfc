import { type SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	url: string
	panel: string
	username: string
	password: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'Configure connection to TFC Instance',
		},
		{
			type: 'textinput',
			id: 'url',
			label: 'TFC QFDN',
			width: 12,
			default: 'xxxx.nepgroup.io',
			required: true,
		},
		{
			type: 'textinput',
			id: 'panel',
			label: 'Panel Slug Name (All Panels -> Edit -> slug)',
			width: 12,
			default: 'companion',
			required: true,
		},
		{
			type: 'textinput',
			id: 'username',
			label: 'Username',
			width: 12,
			required: true,
		},
		{
			type: 'textinput',
			id: 'password',
			label: 'Password',
			width: 12,
			required: true,
		},
	]
}
