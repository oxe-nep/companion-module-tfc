const { InstanceBase, Regex, runEntrypoint, InstanceStatus, combineRgb } = require('@companion-module/base')
const WebSocket = require('ws')

class TfcRouteInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.selectedTarget = null
	}

	async init(config) {
		this.config = config
		this.updateStatus(InstanceStatus.Connecting)
		this.initWebSocket()
		this.initActions()
		this.initVariables()
		this.initFeedbacks()
	}

	initVariables() {
		this.setVariableDefinitions([
			{
				name: 'Selected Target',
				variableId: 'selected_target',
			},
		])
		// Set initial variable
		this.setVariableValues({ selected_target: 'None' })
	}

	initWebSocket() {
		if (this.ws) {
			this.ws.close()
		}

		this.ws = new WebSocket(this.config.url)

		this.ws.on('open', () => {
			this.updateStatus(InstanceStatus.Ok)
			this.log('debug', 'Connected to router')
		})

		this.ws.on('error', (error) => {
			this.log('error', 'WebSocket error: ' + error.message)
			this.updateStatus(InstanceStatus.ConnectionFailure)
		})

		this.ws.on('close', () => {
			this.updateStatus(InstanceStatus.Disconnected)
			// Reconnect after 5 seconds
			setTimeout(() => this.initWebSocket(), 5000)
		})
	}

	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'Configure Websocket connection to TFC Instance',
			},
			{
				type: 'textinput',
				id: 'url',
				label: 'Router WebSocket URL',
				width: 12,
				default: 'wss://localhost:8080',
				required: true,
			},
			{
				type: 'textinput',
				id: 'panel',
				label: 'Panel Name',
				width: 12,
				default: 'Companion Panel',
			},
		]
	}

	async destroy() {
		if (this.ws) {
			this.ws.close()
		}
	}

	initActions() {
		this.setActionDefinitions({
			setTarget: {
				name: 'Set Target',
				options: [
					{
						type: 'textinput',
						label: 'Target Tag',
						id: 'targetTag',
						default: '',
					},
				],
				callback: async (action) => {
					this.selectedTarget = action.options.targetTag.trim()
					this.setVariableValues({ 
						selected_target: this.selectedTarget || 'None' 
					})
					this.checkFeedbacks('targetSelected')
					this.log('debug', 'Selected Target: ' + this.selectedTarget)
				},
			},
			routeToTarget: {
				name: 'Route Source to Target',
				options: [
					{
						type: 'textinput',
						label: 'Source Tag',
						id: 'sourceTag',
						default: '',
					},
					{
						type: 'textinput',
						label: 'Target Tag',
						id: 'targetTag',
						default: '',
					},
					{
						type: 'checkbox',
						label: 'Include Audio',
						id: 'includeAudio',
						default: true,
					},
				],
				callback: async (action) => {
					const requestId = `${Date.now()}`
					
					const request = {
						request_id: requestId,
						target_tag: action.options.targetTag.trim(),
						request: [
							{
								level: 'video',
								source_tag: action.options.sourceTag.trim(),
							},
						],
						type: 'route-request',
						username: '',
						panel: this.config.panel,
					}

					if (action.options.includeAudio) {
						request.request.push({
							level: 'audio1',
							source_tag: action.options.sourceTag.trim(),
						})
					}

					if (this.ws && this.ws.readyState === WebSocket.OPEN) {
						this.ws.send(JSON.stringify(request))
						this.log('debug', `Sent route request to ${this.config.url}: ${JSON.stringify(request)}`)
					} else {
						this.log('error', 'WebSocket not connected')
					}
				},
			},
			routeToVariable: {
				name: 'Route Source to Selected Target',
				options: [
					{
						type: 'textinput',
						label: 'Source Tag',
						id: 'sourceTag',
						default: '',
					},
					{
						type: 'checkbox',
						label: 'Include Audio',
						id: 'includeAudio',
						default: true,
					},
				],
				callback: async (action) => {
					if (!this.selectedTarget) {
						this.log('error', 'No target selected')
						return
					}

					const requestId = `${Date.now()}`
					
					const request = {
						request_id: requestId,
						target_tag: this.selectedTarget,
						request: [
							{
								level: 'video',
								source_tag: action.options.sourceTag.trim(),
							},
						],
						type: 'route-request',
						username: '',
						panel: this.config.panel,
					}

					if (action.options.includeAudio) {
						request.request.push({
							level: 'audio1',
							source_tag: action.options.sourceTag.trim(),
						})
					}
					this.log('debug', 'Source Tag: ' + action.options.sourceTag)
					this.log('debug', 'JSON String: ' + JSON.stringify(request))
					if (this.ws && this.ws.readyState === WebSocket.OPEN) {
						this.ws.send(JSON.stringify(request))
						this.log('debug', `Sent route request to ${this.config.url}: ${JSON.stringify(request)}`)
					} else {
						this.log('error', 'WebSocket not connected')
					}
				},
			},
		})
	}

	initFeedbacks() {
		this.setFeedbackDefinitions({
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
				callback: (feedback) => {
					return this.selectedTarget === feedback.options.targetTag.trim()

				},
			},
		})
	}

	async configUpdated(config) {
		this.config = config
		this.initWebSocket()
	}
}

runEntrypoint(TfcRouteInstance, [])