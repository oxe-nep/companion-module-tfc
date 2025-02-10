module.exports = function (self) {
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
						{id: 'video', label: 'Video'},
						{id: 'audio1', label: 'Audio 1'},
					],
					default: 'video',
				},
			],
			callback: async (event) => {
				const requestId = `${Date.now()}`
				if (event.options.sourceTag && event.options.targetTag && event.options.routeLevel) {
						self.tfcRoute(requestId, event.options.routeLevel, event.options.sourceTag, event.options.targetTag)
				} else {
					self.log('error', 'Invalid options')
				}
			},
		},
	})
}
