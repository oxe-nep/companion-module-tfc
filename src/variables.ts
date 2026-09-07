import type { TfcRouteInstance } from './main.js';

export function UpdateVariableDefinitions(self: TfcRouteInstance): void {
	const items = [...self.panel.sources, ...self.panel.targets]
		.filter((item): item is NonNullable<typeof item> => item != undefined)
		.sort((a, b) => a.index - b.index);

	const definitions: { [key: string]: { name: string } } = {};
	const values: { [key: string]: string } = {};

	for (const item of items) {
		const variableId = `sectionIndex${item.index}`;
		definitions[variableId] = { name: `Section Index ${item.index}` };
		values[variableId] = item.name;
	}

	self.setVariableDefinitions(definitions);
	self.setVariableValues(values);
}
