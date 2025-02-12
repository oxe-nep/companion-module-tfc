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
			],
			callback: async (event) => {
				// if the target is selected we deselect it:
				if (self.selectedControlTarget.get(event.controlId) == event.options.target) {
					self.log(
						'debug',
						`De-Select Target: ${event.options.target} from ControlId ${event.controlId ?? 'undefined'}`,
					)
					if (event.surfaceId) {
						self.selectedSurfaceTarget.delete(event.surfaceId)
					}
					self.selectedControlTarget.delete(event.controlId)
				} else {
					self.log(
						'debug',
						`Select Target: ${event.options.target} from ControlId ${event.controlId} SurfaceId ${event.surfaceId}`,
					)
					self.selectedControlTarget.set(event.controlId ?? 'undefined', String(event.options.target))
					self.selectedSurfaceTarget.set(event.surfaceId ?? 'undefined', String(event.options.target))
				}
				self.checkFeedbacks('ChannelState')
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
			],
			callback: async (event) => {
				const routeLevels: ('video' | 'audio1' | 'meta' | '')[] = [
					event.options.video ? 'video' : '',
					event.options.audio ? 'audio1' : '',
					event.options.meta ? 'meta' : '',
				]

				const selectedTarget = self.selectedSurfaceTarget.get(event.surfaceId ?? 'undefined')
				if (
					selectedTarget != undefined &&
					selectedTarget != 'undefined' &&
					event.options.source != undefined &&
					event.options.source != 'undefined'
				)
					self.tfcRoute(
						routeLevels.filter((level) => level != ''),
						`${event.options.source}`,
						selectedTarget,
					)
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
				const routeLevels: ('video' | 'audio1' | 'meta' | '')[] = [
					event.options.video ? 'video' : '',
					event.options.audio ? 'audio1' : '',
					event.options.meta ? 'meta' : '',
				]

				const selectedSource = `${event.options.source}`
				const selectedTarget = `${event.options.target}`
				if (
					selectedTarget != undefined &&
					selectedTarget != 'undefined' &&
					selectedSource != undefined &&
					selectedSource != 'undefined'
				)
					self.tfcRoute(
						routeLevels.filter((level) => level != ''),
						selectedSource,
						selectedTarget,
					)
			},
		},
	})
}
