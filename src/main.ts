import { InstanceBase, runEntrypoint, InstanceStatus } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions } from './actions.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { TFC } from './tfc/TFC.js'

export class TfcRouteInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig
	selectedTarget: string | null
	connection!: TFC | null

	constructor(internal: unknown) {
		super(internal)
		this.selectedTarget = null
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateStatus(InstanceStatus.Connecting)
		this.initConnection()
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
	}

	initConnection() {
		if (this.connection) {
			this.connection.close()
		}

		try {
			this.connection = new TFC(this.config.url, 5000)
		} catch {
			this.updateStatus(InstanceStatus.BadConfig)
			return
		}

		this.connection.on('connect', () => {
			this.updateStatus(InstanceStatus.Ok)
			this.log('debug', 'connected to tfc')
		})
		this.connection.on('disconnect', () => {
			this.updateStatus(InstanceStatus.Disconnected)
			setTimeout(() => {
				this.initConnection()
			}, 5000)
		})
		this.connection.on('error', (error) => {
			this.log('error', error)
		})
		this.connection.on('route', (update) => {
			this.log('info', `received route update: ${JSON.stringify(update)}`)
		})
	}
	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
		if (this.connection) {
			this.connection.close()
			this.connection = null
		}
	}

	async configUpdated(config: ModuleConfig) {
		this.config = config
	}

	// Return config fields for web config
	getConfigFields() {
		return GetConfigFields()
	}

	tfcRoute(level: 'video' | 'audio1' | 'meta', source: string, target: string) {
		this.connection?.route(this.config.panel, target, { source_tag: source, level: level }).then(() => {
			this.log('debug', `Sent route request to ${this.config.url}: SOURCE ${source}, TARGET ${target}`)
		})
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
