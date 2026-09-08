import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { RouteStateEntry, TFCResponse, TFCRouteSource } from './Message.js';
import { TfcTokenManager, isUnauthorized } from './request.js';
import {
	getPanelBySlug,
	getTagById,
	postTagRoute,
	routeStateFingerprint,
	routeUpdatesFromPostResponse,
	tagRouteState,
	toRouteUpdate,
	type Panel,
	type TagResponse,
} from './Panel.js';

const DEFAULT_POLL_INTERVAL_MS = 1000;
const POLL_FAILURES_BEFORE_DISCONNECT = 3;

export interface TFCEvents {
	connect: () => void;
	disconnect: () => void;
	error: (error: string) => void;
	route: (update: TFCResponse) => void;
}

export declare interface TFC {
	on<U extends keyof TFCEvents>(event: U, listener: TFCEvents[U]): this;
	emit<U extends keyof TFCEvents>(event: U, ...args: Parameters<TFCEvents[U]>): boolean;
}

/**
 * REST TFC client per Routing uSVC + Tag uSVC.
 *
 * Take-route: POST /v1/api/routing/tag/{targetTagId}
 * Live / confirm: poll GET /v1/api/tags/{id} `_embedded.route_state`
 *
 * Actions/feedbacks should only use `route()` and the `route` event.
 */
export class TFC extends EventEmitter {
	private readonly _tokens: TfcTokenManager;
	private readonly _pollIntervalMs: number;
	private _isAlive = false;
	private _closed = false;
	private _pollTimer: NodeJS.Timeout | null = null;
	private _pollInFlight = false;
	private _pollFailures = 0;
	private _targetIds: string[] = [];
	private _panelTargetIds: string[] = [];
	private _extraTargetIds: string[] = [];
	private readonly _routeFingerprints = new Map<string, string>();

	constructor(
		private readonly _location: string,
		pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
	) {
		super();
		this._tokens = new TfcTokenManager(_location);
		this._pollIntervalMs = pollIntervalMs;
	}

	/**
	 * Take a route over Routing REST API.
	 * `panel` is unused by this endpoint; kept for call-site compatibility.
	 */
	route(_panel: string, targetTag: string, ...sources: TFCRouteSource[]): Promise<void> {
		if (this._closed) {
			return Promise.reject('closed');
		}
		if (sources.length === 0) {
			return Promise.resolve();
		}

		const requestId = randomUUID();

		return this.withAuth((token) => postTagRoute(this._location, token, targetTag, sources, requestId)).then(
			(response) => {
				const updates = routeUpdatesFromPostResponse(response);
				if (updates.some((update) => update.result.length > 0)) {
					for (const update of updates) {
						this.publishRoute(update.target_tag, update.result, true);
					}
				} else {
					// 200 means dispatched; completion is async via routestate poll.
					this.publishRoute(targetTag, sources, true);
				}
			},
		);
	}

	watchRouteState(panel: Panel, extraTargetIds: string[] = []): void {
		this.stopPolling();
		this._panelTargetIds = panel.targets
			.filter((target): target is NonNullable<typeof target> => target != undefined)
			.map((target) => target.id);
		this._extraTargetIds = [...new Set(extraTargetIds.filter(Boolean))];
		this.rebuildTargetIds();

		for (const target of panel.targets) {
			if (target === undefined) continue;
			this._routeFingerprints.set(
				target.id,
				routeStateFingerprint(target.sources.map((source) => ({ level: source.level, source_tag: source.id }))),
			);
		}

		void this.pollOnce();
		this._pollTimer = setInterval(() => {
			void this.pollOnce();
		}, this._pollIntervalMs);
	}

	/** Update the extra (non-panel) targets included in the poll set. */
	setExtraWatchTargets(extraTargetIds: string[]): void {
		this._extraTargetIds = [...new Set(extraTargetIds.filter(Boolean))];
		this.rebuildTargetIds();
		if (this._pollTimer && this._targetIds.length > 0) {
			void this.pollOnce();
		}
	}

	close(): void {
		this._closed = true;
		this.stopPolling();
		if (this._isAlive) {
			this._isAlive = false;
			this.emit('disconnect');
		}
	}

	authorize(username: string, password: string): Promise<void> {
		this._tokens.setCredentials(username, password);
		return this._tokens.refresh().then(() => {
			this._isAlive = true;
			this.emit('connect');
		});
	}

	getPanel(slug: string): Promise<Panel> {
		return this.withAuth((token) => getPanelBySlug(this._location, token, slug));
	}

	private rebuildTargetIds(): void {
		this._targetIds = [...new Set([...this._panelTargetIds, ...this._extraTargetIds])];
	}

	private async pollOnce(): Promise<void> {
		if (this._pollInFlight || this._closed || this._targetIds.length === 0) return;

		this._pollInFlight = true;
		try {
			const results = await Promise.allSettled(this._targetIds.map((targetId) => this.getTag(targetId)));
			if (this._closed) return;

			let anySuccess = false;
			let failed = 0;

			for (let index = 0; index < this._targetIds.length; index++) {
				const targetId = this._targetIds[index];
				const result = results[index];
				if (!targetId || !result) continue;

				if (result.status !== 'fulfilled') {
					failed += 1;
					continue;
				}

				anySuccess = true;
				this.publishRoute(targetId, tagRouteState(result.value), false);
			}

			if (this._closed) return;

			if (failed > 0) {
				this.emit('error', `route state poll failed for ${failed} target(s)`);
			}

			if (anySuccess) {
				this._pollFailures = 0;
				if (!this._isAlive) {
					this._isAlive = true;
					this.emit('connect');
				}
			} else {
				this._pollFailures += 1;
				if (this._pollFailures >= POLL_FAILURES_BEFORE_DISCONNECT && this._isAlive) {
					this._isAlive = false;
					this.emit('disconnect');
				}
			}
		} finally {
			this._pollInFlight = false;
		}
	}

	private getTag(tagId: string): Promise<TagResponse> {
		return this.withAuth((token) => getTagById(this._location, token, tagId));
	}

	private publishRoute(targetTag: string, routeState: RouteStateEntry[], force: boolean): void {
		const fingerprint = routeStateFingerprint(routeState);
		if (!force && this._routeFingerprints.get(targetTag) === fingerprint) {
			return;
		}

		this._routeFingerprints.set(targetTag, fingerprint);
		this.emit('route', toRouteUpdate(targetTag, routeState));
	}

	private stopPolling(): void {
		if (this._pollTimer) {
			clearInterval(this._pollTimer);
			this._pollTimer = null;
		}
		this._pollInFlight = false;
	}

	private async withAuth<T>(fn: (token: string) => Promise<T>): Promise<T> {
		try {
			return await fn(await this._tokens.getToken());
		} catch (error) {
			if (!isUnauthorized(error)) {
				throw error;
			}
			return fn(await this._tokens.refresh());
		}
	}
}
