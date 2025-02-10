export interface Call {
	resolve: Function
	reject: Function
	timeout: NodeJS.Timeout
}

export type CallMap = Map<string, Call>

export class CallStack {
	private callMap: CallMap
	private timeout: number

	constructor(timeout: number) {
		this.callMap = new Map<string, Call>()
		this.timeout = timeout
	}

	reset() {
		this.callMap.clear()
	}

	push(requestId: string, resolve: Function, reject: Function) {
		const timeout = setTimeout(() => reject('timeout'), this.timeout)
		this.callMap.set(requestId, {
			resolve,
			reject,
			timeout,
		})
	}

	reject(requestId: string, reason: string): boolean {
		if (this.callMap.has(requestId)) {
			const call = this.callMap.get(requestId)
			clearTimeout(call?.timeout)
			call?.reject(reason)
			this.callMap.delete(requestId)
			return true
		}
		return false
	}

	resolve(requestId: string): boolean {
		if (this.callMap.has(requestId)) {
			const call = this.callMap.get(requestId)
			clearTimeout(call?.timeout)
			call?.resolve()
			this.callMap.delete(requestId)
			return true
		}
		return false
	}
}
