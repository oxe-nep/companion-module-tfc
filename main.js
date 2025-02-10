const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
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
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
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
			setTimeout(() => this.initWebSocket(), 5000)
		})

		this.ws.on('message', (message) => {
			// this.log('debug', 'Received message: ' + message)
			const messageStr = message.toString()

			if (messageStr === 'ping') {
				// this.log('debug', 'Received Ping, sending Pong')
				if (this.ws && this.ws.readyState === WebSocket.OPEN) {	
					this.ws.send('pong')
				}
				return
			}

			try {
				this.parseMessage(messageStr)
			} catch (error) {
				this.log('error', 'Error parsing message: ' + error.message)
			}



		})
	}
	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
		if (this.ws) {
			this.ws.close()
		}
	}

	async configUpdated(config) {
		this.config = config
	}

	// Return config fields for web config
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

	tfcRoute(id, level, source, target) {
		const request = {
			request_id: id,
			target_tag: target,
			request: [
				{
					level: level,
					source_tag: source,
				}
			],
			type: 'route-request',
			username: '',
			panel: this.config.panel,
		}

		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(request))
			this.log('debug', `Sent route request to ${this.config.url}: ${JSON.stringify(request)}`)
		} else {
			this.log('error', 'WebSocket not connected')
		}
	}

	parseMessage(message) {
		const parsedMessage = JSON.parse(message)
		this.log('debug', `Received message: ${JSON.stringify(parsedMessage)}`)
		if (parsedMessage.type === 'route-response') {
			this.log('debug', `Received route response: ${JSON.stringify(parsedMessage)}`)
		}
	}


	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}
}

runEntrypoint(TfcRouteInstance, UpgradeScripts)
