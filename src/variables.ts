import type { TfcRouteInstance } from './main.js'

export function UpdateVariableDefinitions(self: TfcRouteInstance): void {
	const variableArray = [...self.panel.sources, ...self.panel.targets]
		.sort((a, b) => a?.index! - b?.index!)
		.map((sourceTarget) => {
			return {
				variableId: `sectionIndex${sourceTarget?.index}`,
				name: `Section Index ${sourceTarget?.index}`,
				value: sourceTarget?.name,
			}
		})
	const variableObject: { [key: string]: string } = {}
	variableArray.forEach((sourceTarget) => {
		if (sourceTarget !== undefined && sourceTarget.variableId !== undefined) {
			variableObject[sourceTarget.variableId] = sourceTarget.value!
		}
	})

	self.setVariableDefinitions(variableArray)
	self.setVariableValues(variableObject)
}
