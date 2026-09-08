import type { TfcRouteInstance } from './main.js';
import type { RouteLevel } from './tfc/Message.js';

const ROUTE_LEVELS: RouteLevel[] = ['video', 'audio1', 'meta'];

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

	for (const target of self.panel.targets) {
		if (target === undefined) continue;

		for (const level of ROUTE_LEVELS) {
			const sourceId = `target_${target.index}_${level}_source`;
			const indexId = `target_${target.index}_${level}_source_index`;
			definitions[sourceId] = { name: `Target ${target.index} ${level} Source` };
			definitions[indexId] = { name: `Target ${target.index} ${level} Source Index` };
		}
	}

	self.setVariableDefinitions(definitions);
	self.setVariableValues(values);
	UpdateRouteStateVariables(self);
}

/** Refresh routed-source name/index variables from current panel.targets[].sources. */
export function UpdateRouteStateVariables(self: TfcRouteInstance): void {
	const values: { [key: string]: string } = {};
	const sourcesById = new Map(
		self.panel.sources
			.filter((source): source is NonNullable<typeof source> => source != undefined)
			.map((source) => [source.id, source]),
	);

	for (const target of self.panel.targets) {
		if (target === undefined) continue;

		for (const level of ROUTE_LEVELS) {
			const routed = target.sources.find((source) => source.level === level);
			const source = routed ? sourcesById.get(routed.id) : undefined;
			values[`target_${target.index}_${level}_source`] = source?.name ?? '';
			values[`target_${target.index}_${level}_source_index`] = source ? String(source.index) : '';
		}
	}

	self.setVariableValues(values);
}
