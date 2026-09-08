import { InstanceBase, InstanceStatus } from '@companion-module/base';
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js';
import { UpdateVariableDefinitions } from './variables.js';
import { UpdateActions } from './actions.js';
import { UpdateFeedbacks } from './feedbacks.js';
import { TFC } from './tfc/TFC.js';
import { applyRouteUpdate, Panel, type Target } from './tfc/Panel.js';
import { TargetSelector } from './select.js';
import { TargetWatchList } from './watchlist.js';

export { UpgradeScripts } from './upgrades.js';

const emptyPanel = (): Panel => ({ sources: [], targets: [] });

export class TfcRouteInstance extends InstanceBase {
	config!: ModuleConfig;
	secrets!: ModuleSecrets;
	connection: TFC | null = null;
	panel: Panel = emptyPanel();
	selector: TargetSelector = new TargetSelector();
	watchList: TargetWatchList = new TargetWatchList(() => false);

	constructor(internal: unknown) {
		super(internal);
	}

	async init(...args: Parameters<InstanceBase['init']>): Promise<void> {
		const [config, _isFirstInit, secrets] = args;
		this.config = config as unknown as ModuleConfig;
		this.secrets = (secrets ?? { password: '' }) as unknown as ModuleSecrets;
		this.selector = new TargetSelector();
		this.panel = emptyPanel();
		this.watchList = new TargetWatchList((id) => this.panel.targets.some((target) => target?.id === id));

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

		// Re-bind any UUID actions/feedbacks already placed on the surface.
		this.subscribeActions('routeByUuid');
		this.checkFeedbacks('routedSourceToTargetByUuid');
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
				this.log('debug', `received route update: ${JSON.stringify(update)}`);
				applyRouteUpdate(this.panel.targets, update);
				applyRouteUpdate(this.watchList.extraTargets(), update);
				this.checkFeedbacks('routedSource', 'routedSourceToVariableTarget', 'routedSourceToTargetByUuid');
			});

			await this.connection.authorize(this.config.username, this.secrets.password);
			this.log('debug', 'successfully authorized');

			this.panel = await this.connection.getPanel(this.config.panel);
			this.log('debug', `fetched panel \n ${JSON.stringify(this.panel)}`);
			this.connection.watchRouteState(this.panel, this.watchList.extraTargetIds());
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
		this.watchList.clear();
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

	getTargetById(targetId: string): Target | undefined {
		return this.watchList.getTarget(targetId, this.panel.targets);
	}

	/** Keep TFC poll set in sync after Stream Deck bind/unbind. */
	syncWatchList(): void {
		this.connection?.setExtraWatchTargets(this.watchList.extraTargetIds());
	}

	bindWatchedTarget(bindingId: string, targetUuid: string): void {
		if (this.watchList.bind(bindingId, targetUuid)) {
			this.syncWatchList();
		}
	}

	unbindWatchedTarget(bindingId: string): void {
		if (this.watchList.unbind(bindingId)) {
			this.syncWatchList();
		}
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
