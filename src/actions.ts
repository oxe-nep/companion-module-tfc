import type { TfcRouteInstance } from './main.js'

export function UpdateActions(self: TfcRouteInstance) {
	self.setActionDefinitions({
		routeSourceToTarget: {
			name: 'Route Source to Target',
			options: [
				{
					type: 'textinput',
					label: 'Source Tag UUID',
					id: 'sourceTag',
					default: '',
				},
				{
					type: 'textinput',
					label: 'Target Tag UUID',
					id: 'targetTag',
					default: '',
				},
				{
					type: 'dropdown',
					label: 'Route Level',
					id: 'routeLevel',
					choices: [
						{ id: 'video', label: 'Video' },
						{ id: 'audio1', label: 'Audio 1' },
					],
					default: 'video',
				},
			],
			callback: async (event) => {
				if (event.options.sourceTag && event.options.targetTag && event.options.routeLevel) {
					if (event.options.routeLevel != 'video' && event.options.routeLevel != 'audio1') {
						self.log('error', 'route level must either be "video" or "audio1"')
						return
					}
					if (typeof event.options.targetTag != 'string' || typeof event.options.sourceTag != 'string') {
						self.log('error', 'source and target tag must be a string')
						return
					}
					self.tfcRoute(event.options.routeLevel, event.options.sourceTag, event.options.targetTag)
				} else {
					self.log('error', 'Invalid options')
				}
			},
		},
	})
}
