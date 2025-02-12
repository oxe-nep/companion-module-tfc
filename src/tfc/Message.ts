export interface TFCResponse {
	request_id: string
	status: 'success' | 'failed'
	message: string
	target_tag: string
	result: {
		level: '' | 'video' | 'audio1'
		source_tag: string
		source_flow: string
		target_flow: string
	}[]
}

export interface TFCRequest {
	request_id: string
	target_tag: string
	request: TFCRouteSource[]
	type: 'route-request'
	username: string
	panel: string
}

export interface TFCRouteSource {
	level: 'video' | 'audio1' | 'meta'
	source_tag: string
}

export type AuthResponse = Promise<{ token: string }>

export interface TFCTagSearchResponse {
	results: TFCTagResponse[]
	total_results: number
}

export interface TFCTagResponse {
	id: string
	name: string
	production_id: string
	type: 'source' | 'target'
	labels: {
		user_label: string
		hardware_button_label: string
		umd1_label: null
		umd2_label: null
		umd3_label: null
	}
	assigned_to: Array<any>
	assigned_to_permissions: Object
}
