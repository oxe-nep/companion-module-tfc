export type RouteLevel = 'video' | 'audio1' | 'meta';

export interface RouteStateEntry {
	level: string;
	source_tag: string;
}

/**
 * Transport-agnostic route update used by feedbacks.
 * Built from Routing API POST response and/or GET tag `_embedded.route_state` poll.
 */
export interface TFCResponse {
	target_tag: string;
	result: RouteStateEntry[];
}

/** Body item for POST /v1/api/routing/tag/{targetTagId} */
export interface TFCRouteSource {
	level: RouteLevel;
	source_tag: string;
}

export interface AuthResponse {
	token: string;
}

export interface RoutingErrorBody {
	request_id?: string;
	status?: number;
	title?: string;
}

export interface PostTagRouteResponse {
	initial_request_time: number;
	request_id: string;
	target_tag: string;
	issued_route_instructs: {
		route_instruct: {
			target_tag?: string;
			instruct?: {
				level?: string;
				source_tag?: string;
			}[];
		};
	}[];
}

export interface TFCTagSearchResponse {
	results: TFCTagResponse[];
	total_results: number;
}

export interface TFCTagResponse {
	id: string;
	name: string;
	production_id: string;
	type: 'source' | 'target';
	labels: {
		user_label: string;
		hardware_button_label: string;
		umd1_label: null;
		umd2_label: null;
		umd3_label: null;
	};
	assigned_to: Array<unknown>;
	assigned_to_permissions: object;
}
