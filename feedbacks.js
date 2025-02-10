const { combineRgb } = require('@companion-module/base')

module.exports = async function (self) {
	self.setFeedbackDefinitions({
		targetSelected: {
			type: 'boolean',
			name: 'Target is selected',
			description: 'Changes style when a specific target is selected',
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'textinput',
					label: 'Target Tag',
					id: 'targetTag',
					default: '',
				},
			],

		/**
		 *
		 * @param {import('@companion-module/base').CompanionFeedbackInfo} feedback
		 */

		// Needs reference to the surfaceId
			callback: (feedback) => {
				const selectedFeedbackTarget = self.getSelectedTarget(feedback.controlId)
				return selectedFeedbackTarget === feedback.options.targetTag

			},
		},
	})
}
