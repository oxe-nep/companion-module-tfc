import type { TfcRouteInstance } from './main.js'

export function UpdateActions(self: TfcRouteInstance) {
	self.setActionDefinitions({
		selectTarget: {
			name: 'Select Target',
			options: [
				{
					type: 'dropdown',
					label: 'Target',
					id: 'target',
					choices: self.panel.targets
						.filter((target) => target != undefined)
						.map((target) => {
							return { id: target.id, label: target.name }
						}),
					default: 'undefined',
				},
				{
					type: 'number',
					label: 'Routing Domain',
					id: 'routingDomain',
					default: 0,
					min: 0,
					max: 999,
				},
			],
			callback: async (event) => {
				const routingDomain = event.options.routingDomain as number
				const targetId = event.options.target as string
				const currentSelected = self.selector.getTarget(routingDomain)

				if (targetId === currentSelected?.id) {
					// deselect target
					self.selector.deleteTarget(routingDomain)
				} else {
					// select target
					const target = self.panel.targets.find((target) => target?.id === targetId)
					if (target !== undefined) {
						self.selector.setTarget(routingDomain, target)
					}
				}

				self.checkFeedbacks('selectedTarget', 'routedSource')
			},
		},
		routeSelectedToTarget: {
			name: 'Route Source to Selected Target',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					choices: self.panel.sources
						.filter((source) => source != undefined)
						.map((source) => {
							return { id: source.id, label: source.name }
						}),
					default: 'undefined',
				},
				{
					type: 'checkbox',
					label: 'Video',
					id: 'video',
					default: true,
				},
				{
					type: 'checkbox',
					label: 'Audio',
					id: 'audio',
					default: true,
				},
				{
					type: 'checkbox',
					label: 'Meta',
					id: 'meta',
					default: false,
				},
				{
					type: 'number',
					label: 'Routing Domain',
					id: 'routingDomain',
					default: 0,
					min: 0,
					max: 999,
				},
			],
			callback: async (event) => {
				const routingDomain = event.options.routingDomain as number
				const source = event.options.source as string
				const selectedTarget = self.selector.getTarget(routingDomain)

				if (selectedTarget == undefined || source == 'undefined') {
					return
				}

				const routeLevels: ('video' | 'audio1' | 'meta')[] = []
				if (event.options.video) routeLevels.push('video')
				if (event.options.audio) routeLevels.push('audio1')
				if (event.options.meta) routeLevels.push('meta')

				self.tfcRoute(routeLevels, source, selectedTarget.id)
			},
		},
		routeSourceToTarget: {
			name: 'Route Source to Target',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					choices: self.panel.sources
						.filter((source) => source != undefined)
						.map((source) => {
							return { id: source.id, label: source.name }
						}),
					default: 'undefined',
				},
				{
					type: 'dropdown',
					label: 'Target',
					id: 'target',
					choices: self.panel.targets
						.filter((target) => target != undefined)
						.map((target) => {
							return { id: target.id, label: target.name }
						}),
					default: 'undefined',
				},
				{
					type: 'checkbox',
					label: 'Video',
					id: 'video',
					default: true,
				},
				{
					type: 'checkbox',
					label: 'Audio',
					id: 'audio',
					default: true,
				},
				{
					type: 'checkbox',
					label: 'Meta',
					id: 'meta',
					default: false,
				},
			],
			callback: async (event) => {
				const routeLevels: ('video' | 'audio1' | 'meta')[] = []
				if (event.options.video) routeLevels.push('video')
				if (event.options.audio) routeLevels.push('audio1')
				if (event.options.meta) routeLevels.push('meta')

				const selectedSource = event.options.source as string
				const selectedTarget = event.options.target as string
				if (selectedTarget != 'undefined' && selectedSource != 'undefined')
					self.tfcRoute(routeLevels, selectedSource, selectedTarget)
			},
		},
	})
}
