import { InstanceBase, InstanceStatus } from '@companion-module/base';
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js';
import { UpdateVariableDefinitions } from './variables.js';
import { UpdateActions } from './actions.js';
import { UpdateFeedbacks } from './feedbacks.js';
import { TFC } from './tfc/TFC.js';
import { Panel } from './tfc/Panel.js';
import { TargetSelector } from './select.js';

export { UpgradeScripts } from './upgrades.js';

export class TfcRouteInstance extends InstanceBase {
	config!: ModuleConfig;
	secrets!: ModuleSecrets;
	connection!: TFC | null;
	panel!: Panel;
	selector!: TargetSelector;

	constructor(internal: unknown) {
		super(internal);
	}

	async init(...args: Parameters<InstanceBase['init']>): Promise<void> {
		const [config, _isFirstInit, secrets] = args;
		this.config = config as unknown as ModuleConfig;
		this.secrets = (secrets ?? { password: '' }) as unknown as ModuleSecrets;
		this.selector = new TargetSelector();

		if (
			!this.config.panel ||
			this.config.url == 'xxxx.nepgroup.io' ||
			!this.config.username ||
			!this.secrets.password
		) {
			this.updateStatus(InstanceStatus.BadConfig);
			return;
		}

		this.updateStatus(InstanceStatus.Connecting);
		await this.initConnection();
		this.updateActions();
		this.updateFeedbacks();
		this.updateVariableDefinitions();
	}

	async initConnection() {
		try {
			this.connection = new TFC(this.config.url, 5000);
			this.log('debug', 'try authorize');
			this.connection.on('connect', () => {
				this.log('debug', 'connected to tfc');
			});
			this.connection.on('disconnect', () => {
				this.updateStatus(InstanceStatus.Disconnected);
			});
			this.connection.on('error', (error: string) => {
				this.log('error', error);
			});

			this.connection.on('route', (update) => {
				this.log('debug', `received route update: ${JSON.stringify(update)}`);
				this.panel.targets.forEach((target) => {
					if (target === undefined || target.id !== update.target_tag) return;

					target.sources.forEach((source) => {
						const newSource = update.result.find((newSource) => newSource.level === source.level);
						if (newSource === undefined) return;

						source.id = newSource.source_tag;
						this.log(
							'debug',
							`update route state of target: '${target.id}', level: '${source.level}', source: '${source.id}'`,
						);
					});
				});

				this.checkFeedbacks('routedSource', 'routedSourceToVariableTarget');
			});

			await this.connection.authorize(this.config.username, this.secrets.password);
			this.log('debug', 'successfully authorized');

			this.panel = await this.connection.getPanel(this.config.panel);
			this.log('debug', `fetched panel \n ${JSON.stringify(this.panel)}`);
			this.updateStatus(InstanceStatus.Ok);
		} catch (error) {
			this.log('error', `${error}`);
			this.updateStatus(InstanceStatus.BadConfig);
			return;
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
				this.log('error', `ROUTE FAILURE: SOURCE ${source}, TARGET ${target} (levels: ${levels}), reason ${err}`);
			});
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
