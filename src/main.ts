import { InstanceBase, InstanceStatus } from '@companion-module/base';
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js';
import { UpdateVariableDefinitions } from './variables.js';
import { UpdateActions } from './actions.js';
import { UpdateFeedbacks } from './feedbacks.js';
import { TFC } from './tfc/TFC.js';
import { applyRouteUpdate, Panel } from './tfc/Panel.js';
import { TargetSelector } from './select.js';

export { UpgradeScripts } from './upgrades.js';

const emptyPanel = (): Panel => ({ sources: [], targets: [] });

export class TfcRouteInstance extends InstanceBase {
	config!: ModuleConfig;
	secrets!: ModuleSecrets;
	connection: TFC | null = null;
	panel: Panel = emptyPanel();
	selector: TargetSelector = new TargetSelector();

	constructor(internal: unknown) {
		super(internal);
	}

	async init(...args: Parameters<InstanceBase['init']>): Promise<void> {
		const [config, _isFirstInit, secrets] = args;
		this.config = config as unknown as ModuleConfig;
		this.secrets = (secrets ?? { password: '' }) as unknown as ModuleSecrets;
		this.selector = new TargetSelector();
		this.panel = emptyPanel();

		if (
			!this.config.panel ||
			this.config.url == 'xxxx.nepgroup.io' ||
			!this.config.username ||
			!this.secrets.password
		) {
			this.updateStatus(InstanceStatus.BadConfig);
			this.updateDefinitions();
			return;
		}

		this.updateStatus(InstanceStatus.Connecting);
		const connected = await this.initConnection();
		this.updateDefinitions();

		if (!connected) {
			return;
		}
	}

	async initConnection(): Promise<boolean> {
		try {
			this.connection = new TFC(this.config.url);
			this.log('debug', 'try authorize');
			this.connection.on('connect', () => {
				this.log('debug', 'connected to tfc');
				this.updateStatus(InstanceStatus.Ok);
			});
			this.connection.on('disconnect', () => {
				this.updateStatus(InstanceStatus.Disconnected);
			});
			this.connection.on('error', (error: string) => {
				this.log('error', error);
			});

			this.connection.on('route', (update) => {
				if (!this.panel.targets.length) return;
				this.log('debug', `received route update: ${JSON.stringify(update)}`);
				applyRouteUpdate(this.panel.targets, update);
				this.checkFeedbacks('routedSource', 'routedSourceToVariableTarget');
			});

			await this.connection.authorize(this.config.username, this.secrets.password);
			this.log('debug', 'successfully authorized');

			this.panel = await this.connection.getPanel(this.config.panel);
			this.log('debug', `fetched panel \n ${JSON.stringify(this.panel)}`);
			this.connection.watchRouteState(this.panel);
			this.updateStatus(InstanceStatus.Ok);
			return true;
		} catch (error) {
			this.log('error', `${error}`);
			await this.destroy();
			this.panel = emptyPanel();
			this.updateStatus(InstanceStatus.BadConfig);
			return false;
		}
	}

	async destroy() {
		if (this.connection) {
			this.connection.close();
			this.connection = null;
		}
	}

	async configUpdated(...args: Parameters<InstanceBase['configUpdated']>) {
		const [config, secrets] = args;
		this.config = config as unknown as ModuleConfig;
		this.secrets = (secrets ?? { password: '' }) as unknown as ModuleSecrets;
		await this.destroy();
		return this.init(config, false, secrets);
	}

	getConfigFields() {
		return GetConfigFields();
	}

	tfcRoute(levels: ('video' | 'audio1' | 'meta')[], source: string, target: string) {
		return this.connection
			?.route(
				this.config.panel,
				target,
				...levels.map((level) => {
					return { source_tag: source, level: level };
				}),
			)
			.then(() => {
				this.log('debug', `ROUTE SUCCESS: SOURCE ${source}, TARGET ${target} (levels: ${levels})`);
			})
			.catch((err) => {
				const detail = err instanceof Error && err.cause ? ` (${err.cause})` : '';
				this.log(
					'error',
					`ROUTE FAILURE: SOURCE ${source}, TARGET ${target} (levels: ${levels}), reason ${err}${detail}`,
				);
			});
	}

	updateDefinitions() {
		this.updateActions();
		this.updateFeedbacks();
		this.updateVariableDefinitions();
	}

	updateActions() {
		UpdateActions(this);
	}

	updateFeedbacks() {
		UpdateFeedbacks(this);
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this);
	}
}

export default TfcRouteInstance;
