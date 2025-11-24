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
		routedSourceToVariableTarget: {
			name: 'Feedback on SectionIndex (variables)',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 200, 30),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'textinput',
					label: 'Source Index (Variable)',
					id: 'sourceIndex',
					default: '0',
					useVariables: true,
					tooltip: 'SectionIndex of source to check'
				},
				{
					type: 'textinput',
					label: 'Target Index (Variable)',
					id: 'targetIndex',
					default: '0',
					useVariables: true,
					tooltip: 'SectionIndex of target to check routing'
				},
				{
					type: 'checkbox',
					label: 'Check Video',
					id: 'checkVideo',
					default: true,
				},
				{
					type: 'checkbox',
					label: 'Check Audio',
					id: 'checkAudio',
					default: false,
				},
				{
					type: 'checkbox',
					label: 'Check Meta',
					id: 'checkMeta',
					default: false,
				},
			],
			callback: async (feedback, context) => {
				// Parse variables to get index values
				const sourceIndex = parseInt(await context.parseVariablesInString(feedback.options.sourceIndex as string))
				const targetIndex = parseInt(await context.parseVariablesInString(feedback.options.targetIndex as string))
				
				// Find source and target by their index property
				const sourceId = self.panel.sources.find(source => source?.index === sourceIndex)?.id
				const target = self.panel.targets.find(target => target?.index === targetIndex)
				
				if (!sourceId || !target || sourceId === 'undefined') return false
				
				// Check if this source is routed to this target on any of the specified levels
				let isRouted = false
				
				for (const routedSource of target.sources) {
					// Check if this routed source matches our source ID
					if (routedSource.id === sourceId) {
						// Check if it's on a level we care about
						if (feedback.options.checkVideo && routedSource.level === 'video') {
							isRouted = true
							break
						}
						if (feedback.options.checkAudio && routedSource.level === 'audio1') {
							isRouted = true
							break
						}
						if (feedback.options.checkMeta && routedSource.level === 'meta') {
							isRouted = true
							break
						}
					}
				}
				
				return isRouted
			},
		},
	})
}