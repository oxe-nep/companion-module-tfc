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
