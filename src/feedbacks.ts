import { combineRgb } from '@companion-module/base'
import type { TfcRouteInstance } from './main.js'

export function UpdateFeedbacks(self: TfcRouteInstance): void {
	self.setFeedbackDefinitions({
		selectedTarget: {
			name: 'Selected Target',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(0, 0, 0),
			},
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
			callback: async (feedback) => {
				const targetId = feedback.options.target as string
				const routingDomain = feedback.options.routingDomain as number
				const selectedTarget = self.selector.getTarget(routingDomain)

				if (targetId == 'undefined' || selectedTarget == undefined) return false

				return selectedTarget.id == targetId
			},
		},
		routedSource: {
			name: 'Routed source of selected target',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 200, 30),
				color: combineRgb(255, 255, 255),
			},
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
					type: 'number',
					label: 'Routing Domain',
					id: 'routingDomain',
					default: 0,
					min: 0,
					max: 999,
				},
			],
			callback: async (feedback) => {
				const sourceId = feedback.options.source as string
				const routingDomain = feedback.options.routingDomain as number

				if (sourceId == 'undefined') return false

				return self.selector.hasSource(routingDomain, sourceId)
			},
		},
	})
}
