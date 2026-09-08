import { PostTagRouteResponse, RouteLevel, RouteStateEntry, TFCResponse, TFCRouteSource } from './Message.js';
import { getRequest, postRequest } from './request.js';

export const getTagById = (location: string, authToken: string, tagId: string): Promise<TagResponse> =>
	getRequest<TagResponse>(location, authToken, `/v1/api/tags/${encodeURIComponent(tagId)}`);

/**
 * Take-route via Routing uSVC:
 * POST /v1/api/routing/tag/{targetTagId}
 * Body: [{ level, source_tag }, ...]
 */
export const postTagRoute = (
	location: string,
	authToken: string,
	targetTagId: string,
	sources: TFCRouteSource[],
	requestId?: string,
): Promise<PostTagRouteResponse> =>
	postRequest<PostTagRouteResponse>(
		location,
		authToken,
		`/v1/api/routing/tag/${encodeURIComponent(targetTagId)}`,
		sources.map((source) => ({
			level: source.level,
			source_tag: source.source_tag,
		})),
		requestId ? { 'X-Request-Id': requestId } : undefined,
	);

export const tagRouteState = (tag: TagResponse): RouteStateEntry[] =>
	(tag._embedded?.route_state ?? []).map((source) => ({
		level: source.level,
		source_tag: source.source_tag ?? '',
	}));

export const routeUpdatesFromPostResponse = (response: PostTagRouteResponse): TFCResponse[] => {
	const updates: TFCResponse[] = [];

	for (const issued of response.issued_route_instructs ?? []) {
		const targetTag = issued.route_instruct?.target_tag ?? response.target_tag;
		const result = (issued.route_instruct?.instruct ?? [])
			.filter((entry): entry is { level: string; source_tag: string } => !!entry.level && !!entry.source_tag)
			.map((entry) => ({
				level: entry.level,
				source_tag: entry.source_tag,
			}));

		if (targetTag && result.length > 0) {
			updates.push({ target_tag: targetTag, result });
		}
	}

	if (updates.length === 0 && response.target_tag) {
		updates.push({ target_tag: response.target_tag, result: [] });
	}

	return updates;
};

export const routeStateFingerprint = (routeState: RouteStateEntry[]): string =>
	routeState
		.map((entry) => `${entry.level}:${entry.source_tag}`)
		.sort()
		.join('|');

export const toRouteUpdate = (targetTag: string, routeState: RouteStateEntry[]): TFCResponse => ({
	target_tag: targetTag,
	result: routeState,
});

const isRouteLevel = (level: string): level is RouteLevel =>
	level === 'video' || level === 'audio1' || level === 'meta';

/** Mutates the same Target objects selector/feedbacks already hold. */
export const applyRouteUpdate = (targets: Panel['targets'], update: TFCResponse): void => {
	for (const target of targets) {
		if (target === undefined || target.id !== update.target_tag) continue;

		for (const incoming of update.result) {
			if (!isRouteLevel(incoming.level)) continue;

			const existing = target.sources.find((source) => source.level === incoming.level);
			if (existing) {
				existing.id = incoming.source_tag;
			} else {
				target.sources.push({ id: incoming.source_tag, level: incoming.level });
			}
		}
	}
};

export const getPanelBySlug = (location: string, authToken: string, slug: string): Promise<Panel> =>
	getRequest<PanelResponse>(location, authToken, `/v1/api/panels/custom/panels/${slug}`)
		.then((panel) => getRequest<PageResponse>(location, authToken, panel._links.default_panel_page.href))
		.then((page) => {
			// we use the first section we find on the panel and ignore else
			const firstSectionContainer = page._embedded.section_containers[0];
			if (firstSectionContainer === undefined || firstSectionContainer._embedded.section == undefined) {
				return Promise.reject('NO SECTIONS ON PANEL');
			}
			return Promise.all(
				firstSectionContainer._embedded.section._embedded.section_elements
					.filter((button) => button.type == 'source' || button.type == 'target')
					.map((sourceTarget) =>
						getRequest<TagResponse>(location, authToken, `/v1/api/tags/${sourceTarget.tag_id}`).then((tag) => {
							return {
								index: sourceTarget.index,
								tag: tag,
							};
						}),
					),
			);
		})
		.then((tags) => {
			return {
				sources: tags
					.filter((tag) => tag.tag.type == 'source')
					.map(({ index, tag }) => {
						return {
							id: tag.id,
							name: tag.labels.hardware_button_label || tag.labels.user_label || tag.name,
							index: index,
						};
					}),
				targets: tags
					.filter((tag) => tag.tag.type == 'target')
					.map(({ index, tag }) => {
						return {
							id: tag.id,
							name: tag.labels.hardware_button_label || tag.labels.user_label || tag.name,
							index: index,
							sources: tagRouteState(tag)
								.filter((source): source is RouteStateEntry & { level: RouteLevel } => isRouteLevel(source.level))
								.map((source) => ({
									id: source.source_tag,
									level: source.level,
								})),
						};
					}),
			};
		});

export interface PanelResponse {
	id: string;
	name: string;
	production_id: string;
	_links: {
		default_panel_page: {
			href: string;
			id: string;
		};
	};
}

export interface PageResponse {
	id: string;
	name: string;
	slug: string;
	production_id: string;
	_embedded: {
		section_containers: {
			id: string;
			name: string;
			rows: number;
			columns: number;
			_embedded: {
				section: {
					id: string;
					name: string;
					production_id: string;
					_embedded: {
						section_elements: {
							id: string;
							ordinal: number;
							type: 'source' | 'target';
							index: number;
							tag_id: string;
						}[];
					};
				};
			};
		}[];
	};
}

export interface TagResponse {
	id: string;
	name: string;
	production_id: string;
	type: 'source' | 'target';
	labels: {
		user_label: string;
		hardware_button_label: string;
		umd1_label: string;
		umd2_label: string;
		umd3_label: string;
	};
	locked: boolean;
	locked_reason: null | string;
	reserved: boolean;
	reserved_reason: null | string;
	_embedded?: {
		route_state?: {
			level: 'video' | 'audio1' | 'meta';
			source_tag: string | null;
			_embedded: {
				source_tag: {
					id: string;
					name: string;
					production_id: string;
					type: 'source';
					labels: {
						user_label: string | null;
						hardware_button_label: string | null;
						umd1_label: string | null;
						umd2_label: null | null;
						umd3_label: null | null;
					};
				} | null;
			};
		}[];
	};
}

export interface Panel {
	sources: (Source | undefined)[];
	targets: (Target | undefined)[];
}

export interface Source {
	id: string;
	name: string;
	index: number;
}

export interface Target {
	id: string;
	name: string;
	index: number;
	sources: { id: string; level: 'video' | 'audio1' | 'meta' }[];
}
