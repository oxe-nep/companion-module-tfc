import type { Target } from './tfc/Panel.js';

const TAG_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isTagUuid = (value: string): boolean => TAG_ID_RE.test(value.trim());

/**
 * Tracks extra target tags to poll, beyond the configured TFC panel.
 * Used when Stream Deck actions/feedbacks reference UUIDs that are not on the panel.
 */
export class TargetWatchList {
	private readonly _counts = new Map<string, number>();
	private readonly _extraTargets = new Map<string, Target>();
	private readonly _bindingTargets = new Map<string, string>();

	constructor(private readonly _isPanelTarget: (id: string) => boolean) {}

	clear(): void {
		this._counts.clear();
		this._extraTargets.clear();
		this._bindingTargets.clear();
	}

	/** All extra (non-panel) targets currently being watched. */
	extraTargets(): Target[] {
		return [...this._extraTargets.values()];
	}

	/** Target ids that should be polled in addition to the panel. */
	extraTargetIds(): string[] {
		return [...this._extraTargets.keys()];
	}

	getTarget(id: string, panelTargets: (Target | undefined)[]): Target | undefined {
		const fromPanel = panelTargets.find((target) => target?.id === id);
		if (fromPanel) return fromPanel;
		return this._extraTargets.get(id);
	}

	/**
	 * Bind a Companion action/feedback instance to a target UUID.
	 * Returns true when the poll set changed.
	 */
	bind(bindingId: string, targetUuid: string): boolean {
		const next = isTagUuid(targetUuid) ? targetUuid.trim() : '';
		const prev = this._bindingTargets.get(bindingId) ?? '';

		if (prev === next) return false;

		let changed = false;
		if (prev) {
			changed = this.release(prev) || changed;
			this._bindingTargets.delete(bindingId);
		}
		if (next) {
			changed = this.acquire(next) || changed;
			this._bindingTargets.set(bindingId, next);
		}
		return changed;
	}

	/** Drop a Companion action/feedback instance binding. */
	unbind(bindingId: string): boolean {
		const prev = this._bindingTargets.get(bindingId);
		if (!prev) return false;
		this._bindingTargets.delete(bindingId);
		return this.release(prev);
	}

	private acquire(id: string): boolean {
		const count = (this._counts.get(id) ?? 0) + 1;
		this._counts.set(id, count);
		if (count !== 1 || this._isPanelTarget(id)) return false;

		this._extraTargets.set(id, {
			id,
			name: id,
			index: -1,
			sources: [],
		});
		return true;
	}

	private release(id: string): boolean {
		const count = (this._counts.get(id) ?? 0) - 1;
		if (count > 0) {
			this._counts.set(id, count);
			return false;
		}

		this._counts.delete(id);
		if (!this._extraTargets.has(id)) return false;
		this._extraTargets.delete(id);
		return true;
	}
}
