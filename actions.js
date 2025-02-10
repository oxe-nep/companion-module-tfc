/**
 *
 * @param {import('./main')} self
 */


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

		/**
		 *
		 * @param {import('@companion-module/base').CompanionActionInfo} action
		 */
			callback: async (action) => {
				const requestId = `${Date.now()}`
				if (action.options.sourceTag && action.options.targetTag && action.options.routeLevel) {
						self.tfcRoute(requestId, action.options.routeLevel, action.options.sourceTag, action.options.targetTag)
				} else {
					self.log('error', 'Invalid options')
				}
			},
		},
		selectTarget: {
			name: 'Select Target Tag',
			options: [
				{
					type: 'textinput',
					label: 'Target Tag UUID',
					id: 'targetTag',
				}
			],
			callback: async (action) => {
				try {
					if (action.options.targetTag != undefined) {
						self.selectTarget(action, action.options.targetTag)
					}
				} catch (error) {
					self.log('error', 'Error selecting target: ' + error.message)
				}
			}
		},
		routeSourceToSelectedTarget: {
			name: 'Route Source to Selected Target',
			options: [
				{
					type: 'textinput',
					label: 'Source Tag UUID',
					id: 'sourceTag',
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

		/**
		 *
		 * @param {import('@companion-module/base').CompanionActionInfo} action
		 */
			callback: async (action) => {
				const requestId = `${Date.now()}`
				if (action.options.sourceTag && action.options.routeLevel) {
						self.tfcRoute(requestId, action.options.routeLevel, action.options.sourceTag, self.selectedTarget[action.surfaceId])
				} else {
					self.log('error', 'Invalid options')
				}

			},
		},	
	})
}
