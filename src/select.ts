import { Target } from './tfc/Panel.js'

export class TargetSelector {
	private _store: Map<number, Target>

	constructor() {
		this._store = new Map<number, Target>()
	}

	setTarget(routingInstance: number, target: Target) {
		this._store.set(routingInstance, target)
	}

	getTarget(routingInstance: number): Target | undefined {
		return this._store.get(routingInstance)
	}

	deleteTarget(routingInstance: number) {
		this._store.delete(routingInstance)
	}

	hasSource(routingInstace: number, otherSourceId: string): boolean {
		return this._store.get(routingInstace)?.sources.find((source) => source.id == otherSourceId) != undefined
	}
}
