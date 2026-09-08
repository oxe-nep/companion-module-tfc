import type { TfcRouteInstance } from './main.js';

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
							return { id: target.id, label: target.name };
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
				const routingDomain = Number(event.options.routingDomain);
				const targetId = String(event.options.target);
				const currentSelected = self.selector.getTarget(routingDomain);

				if (targetId === currentSelected?.id) {
					self.selector.deleteTarget(routingDomain);
				} else {
					const target = self.panel.targets.find((target) => target?.id === targetId);
					if (target !== undefined) {
						self.selector.setTarget(routingDomain, target);
					}
				}

				self.checkFeedbacks('selectedTarget', 'routedSource');
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
							return { id: source.id, label: source.name };
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
				const routingDomain = Number(event.options.routingDomain);
				const source = String(event.options.source);
				const selectedTarget = self.selector.getTarget(routingDomain);

				if (selectedTarget == undefined || source == 'undefined') {
					return;
				}

				const routeLevels: ('video' | 'audio1' | 'meta')[] = [];
				if (event.options.video) routeLevels.push('video');
				if (event.options.audio) routeLevels.push('audio1');
				if (event.options.meta) routeLevels.push('meta');

				void self.tfcRoute(routeLevels, source, selectedTarget.id);
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
							return { id: source.id, label: source.name };
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
							return { id: target.id, label: target.name };
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
				const routeLevels: ('video' | 'audio1' | 'meta')[] = [];
				if (event.options.video) routeLevels.push('video');
				if (event.options.audio) routeLevels.push('audio1');
				if (event.options.meta) routeLevels.push('meta');

				const selectedSource = String(event.options.source);
				const selectedTarget = String(event.options.target);
				if (selectedTarget != 'undefined' && selectedSource != 'undefined')
					void self.tfcRoute(routeLevels, selectedSource, selectedTarget);
			},
		},
		routeByIndex: {
			name: 'Route by SectionIndex',
			options: [
				{
					type: 'number',
					label: 'Source Index',
					id: 'sourceIndex',
					default: 0,
					min: 0,
					max: 999,
					tooltip: 'SectionIndex shown in variables (0, 1, 2...)',
				},
				{
					type: 'number',
					label: 'Target Index',
					id: 'targetIndex',
					default: 0,
					min: 0,
					max: 999,
					tooltip: 'SectionIndex shown in variables (0, 1, 2...)',
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
				const routeLevels: ('video' | 'audio1' | 'meta')[] = [];
				if (event.options.video) routeLevels.push('video');
				if (event.options.audio) routeLevels.push('audio1');
				if (event.options.meta) routeLevels.push('meta');

				const sourceIndex = Number(event.options.sourceIndex);
				const targetIndex = Number(event.options.targetIndex);

				const selectedSource = self.panel.sources.find((source) => source?.index === sourceIndex)?.id;
				const selectedTarget = self.panel.targets.find((target) => target?.index === targetIndex)?.id;

				if (selectedTarget && selectedSource && selectedTarget !== 'undefined' && selectedSource !== 'undefined') {
					void self.tfcRoute(routeLevels, selectedSource, selectedTarget);
				}
			},
		},
		routeByUuid: {
			name: 'Route by UUID',
			options: [
				{
					type: 'textinput',
					label: 'Source Tag UUID',
					id: 'sourceUuid',
					default: '',
					useVariables: true,
					tooltip: 'TFC source tag id (UUID)',
				},
				{
					type: 'textinput',
					label: 'Target Tag UUID',
					id: 'targetUuid',
					default: '',
					useVariables: true,
					tooltip: 'TFC target tag id (UUID). Watched for feedback even if not on the panel.',
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
			optionsToMonitorForSubscribe: ['targetUuid'],
			subscribe: async (action) => {
				self.bindWatchedTarget(`action:${action.id}`, String(action.options.targetUuid ?? ''));
			},
			unsubscribe: async (action) => {
				self.unbindWatchedTarget(`action:${action.id}`);
			},
			callback: async (event) => {
				const routeLevels: ('video' | 'audio1' | 'meta')[] = [];
				if (event.options.video) routeLevels.push('video');
				if (event.options.audio) routeLevels.push('audio1');
				if (event.options.meta) routeLevels.push('meta');

				const selectedSource = String(event.options.sourceUuid ?? '').trim();
				const selectedTarget = String(event.options.targetUuid ?? '').trim();

				if (selectedSource && selectedTarget) {
					// Keep watchlist warm for variable-driven UUIDs resolved at press time.
					self.bindWatchedTarget(`action:${event.id}`, selectedTarget);
					void self.tfcRoute(routeLevels, selectedSource, selectedTarget);
				}
			},
		},
	});
}
