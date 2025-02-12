import { combineRgb } from '@companion-module/base'
import type { TfcRouteInstance } from './main.js'

export function UpdateFeedbacks(self: TfcRouteInstance): void {
	self.setFeedbackDefinitions({
		ChannelState: {
			name: 'Example Feedback',
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
			],
			callback: async (feedback) => {
				self.log(
					'debug',
					`Check Feedback with ControlId ${feedback.controlId}: ${self.selectedControlTarget.get(feedback.controlId)} == ${feedback.options.target}`,
				)
				return self.selectedControlTarget.get(feedback.controlId) == feedback.options.target
			},
		},
	})
}
