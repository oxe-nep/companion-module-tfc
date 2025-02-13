import { getRequest } from './request.js'

export const getPanelBySlug = (location: string, authToken: string, slug: string): Promise<Panel> =>
	getRequest<PanelResponse>(location, authToken, `/v1/api/panels/custom/panels/${slug}`)
		.then((panel) => getRequest<PageResponse>(location, authToken, panel._links.default_panel_page.href))
		.then((page) => {
			// we use the first section we find on the panel and ignore else
			const firstSectionContainer = page._embedded.section_containers[0]
			if (firstSectionContainer === undefined || firstSectionContainer._embedded.section == undefined) {
				return Promise.reject('NO SECTIONS ON PANEL')
			}
			return Promise.all(
				firstSectionContainer._embedded.section._embedded.section_elements
					.filter((button) => button.type == 'source' || button.type == 'target')
					.map((sourceTarget) =>
						getRequest<TagResponse>(location, authToken, `/v1/api/tags/${sourceTarget.tag_id}`).then((tag) => {
							return {
								index: sourceTarget.index,
								tag: tag,
							}
						}),
					),
			)
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
						}
					}),
				targets: tags
					.filter((tag) => tag.tag.type == 'target')
					.map(({ index, tag }) => {
						return {
							id: tag.id,
							name: tag.labels.hardware_button_label || tag.labels.user_label || tag.name,
							index: index,
							sources: tag._embedded.route_state.map((source) => {
								return {
									id: source.source_tag,
									level: source.level,
								}
							}),
						}
					}),
			}
		})

export interface PanelResponse {
	id: string
	name: string
	production_id: string
	_links: {
		default_panel_page: {
			href: string
			id: string
		}
	}
}

export interface PageResponse {
	id: string
	name: string
	slug: string
	production_id: string
	_embedded: {
		section_containers: {
			id: string
			name: string
			rows: number
			columns: number
			_embedded: {
				section: {
					id: string
					name: string
					production_id: string
					_embedded: {
						section_elements: {
							id: string
							ordinal: number
							type: 'source' | 'target'
							index: number
							tag_id: string
						}[]
					}
				}
			}
		}[]
	}
}

export interface TagResponse {
	id: string
	name: string
	production_id: string
	type: 'source' | 'target'
	labels: {
		user_label: string
		hardware_button_label: string
		umd1_label: string
		umd2_label: string
		umd3_label: string
	}
	locked: boolean
	locked_reason: null | string
	reserved: boolean
	reserved_reason: null | string
	_embedded: {
		route_state: {
			level: 'video' | 'audio1' | 'meta'
			source_tag: string
			_embedded: {
				source_tag: {
					id: string
					name: string
					production_id: string
					type: 'source'
					labels: {
						user_label: string | null
						hardware_button_label: string | null
						umd1_label: string | null
						umd2_label: null | null
						umd3_label: null | null
					}
				} | null
			}
		}[]
	}
}

export interface Panel {
	sources: (Source | undefined)[]
	targets: (Target | undefined)[]
}

export interface Source {
	id: string
	name: string
	index: number
}

export interface Target {
	id: string
	name: string
	index: number
	sources: { id: string; level: 'video' | 'audio1' | 'meta' }[]
}
