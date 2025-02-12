import { EventEmitter } from 'events'
import { WebSocket } from 'ws'
import { TFCRequest, TFCResponse, TFCRouteSource } from './Message.js'
import { CallStack } from './CallStack.js'
import { v4 as UUID } from 'uuid'
import { authRequest } from './request.js'
import { getPanelBySlug } from './Panel.js'

export interface TFCEvents {
	connect: () => void
	disconnect: () => void
	error: (error: string) => void
	route: (update: TFCResponse) => void
}

export declare interface TFC {
	on<U extends keyof TFCEvents>(event: U, listener: TFCEvents[U]): this
	emit<U extends keyof TFCEvents>(event: U, ...args: Parameters<TFCEvents[U]>): boolean
}

export class TFC extends EventEmitter {
	private _ws: WebSocket
	private _isAlive: boolean
	private _isAliveTimer!: null | NodeJS.Timeout
	private _callStack: CallStack
	private _location: string
	private _authToken: string

	constructor(location: string, sendTimeout: number) {
		super()
		this._ws = new WebSocket(`wss://controlws.${location}/routing`)
		this._isAlive = false
		this._callStack = new CallStack(sendTimeout)
		this._location = location
		this._authToken = ''

		this._ws.on('open', () => this.onOpen())
		this._ws.on('close', (code, reason) => this.onClose(code, `${reason}`))
		this._ws.on('error', (error) => this.onError(error))
		this._ws.on('message', (data, isBinary) => this.onMessage(data, isBinary))
		this._ws.on('ping', () => this.onPing())
	}

	/**
	 * Sends a route request to TFC and returns a Promise which is fulfilled when the route request
	 * was accepted by TFC. The Promise is reject if either the socket is not connected, the request
	 * was not accepted by TFC or a timeout occured.
	 */
	route(panel: string, targetTag: string, ...sources: TFCRouteSource[]): Promise<void> {
		// this creates a new random UUID we use as request_id
		const uuid = UUID().toString()

		const request: TFCRequest = {
			request_id: uuid,
			target_tag: targetTag,
			request: sources,
			type: 'route-request',
			username: '',
			panel: panel,
		}

		return this.send(request).then(
			() =>
				new Promise<void>((resolve, reject) => {
					this._callStack.push(request.request_id, resolve, reject)
				}),
		)
	}

	close() {
		this.onClose(200, 'closed by client')
	}

	authorize(username: string, password: string) {
		return authRequest(this._location, username, password).then((authToken) => {
			this._authToken = authToken
		})
	}

	getPanel(slug: string) {
		return getPanelBySlug(this._location, this._authToken, slug)
	}

	/**
	 * Sends the request to TFC and returns a Promise which is fulfilled
	 * when the request is sent out by the underlaying socket
	 */
	private send(msg: TFCRequest): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (!this._isAlive || this._ws.readyState != WebSocket.OPEN) {
				reject('no connection')
			}
			this._ws.send(JSON.stringify(msg), (err) => {
				if (err) {
					reject(err)
				} else {
					resolve()
				}
			})
		})
	}

	private onOpen() {
		this.heartbeat()
		this.emit('connect')
	}

	private onClose(code: number, reason: string) {
		this._isAlive = false
		try {
			this._ws.close(code, reason)
		} catch (error) {
			this.onError(new Error(`${error}`))
		}
		if (this._isAliveTimer) {
			clearTimeout(this._isAliveTimer)
			this._isAliveTimer = null
		}
		this.emit('disconnect')
	}

	private onError(error: Error) {
		this.emit('error', error.message)
	}

	/**
	 * onMessage parses incoming data from TFC.
	 */
	private onMessage(data: WebSocket.RawData, isBinary: boolean) {
		// We don't care about binary data (only for safety)
		if (isBinary) return

		const messageString = data.toString()

		if (messageString == 'ping') {
			this.onPing()
			return
		} else if (messageString == 'pong') {
			return
		}

		const message = JSON.parse(messageString) as TFCResponse
		// We don't care about messages without request_id as they could
		// occur but we don't want to process these further
		if (!message.request_id) return

		if (message.status == 'success') {
			// if it is a success message, we pretend it was our request and
			// try to resolve the Promise from above. The callstack tells us
			// if the request_id was indeed from us (it ignores request_id's
			// it doesn't know)
			this._callStack.resolve(message.request_id)
			this.emit('route', message)
			return
		}

		if (message.status == 'failed') {
			// if it is a failed message, we pretend it was our request and
			// try to reject the Promise from above. The callstack ignores
			// request_id's that it doesn't know so we can do that safely.
			this._callStack.reject(message.request_id, message.message)
		}
	}

	/**
	 * TFC sends periodic pings but it seems they don't care about
	 * our pings and pongs. That's why we use TFCs ping to keep track
	 * of working connection.
	 *
	 * @param {Buffer<ArrayBufferLike>} data
	 */
	private onPing() {
		if (this._ws.readyState == WebSocket.OPEN) {
			this._ws.pong()
		}
		this.heartbeat()
	}

	/**
	 * heartbeat keeps track of connection status. This needs to be called on every
	 * received ping message. If it is not called, the timer will timeout and trigger
	 * a disconnect from the TFC.
	 */
	private heartbeat() {
		this._isAlive = true

		if (this._isAliveTimer) {
			clearTimeout(this._isAliveTimer)
			this._isAliveTimer = null
		}

		this._isAliveTimer = setTimeout(
			(self) => {
				self.onClose(400, 'connection loss, no ping for 10 seconds')
			},
			10000,
			this,
		)
	}
}
