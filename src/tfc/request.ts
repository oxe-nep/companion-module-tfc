import { AuthResponse } from './Message.js'

export const authRequest = (location: string, username: string, password: string): Promise<string> =>
	fetch(`https://api.${location}/v1/api/login_check`, {
		method: 'POST',
		body: JSON.stringify({
			username: username,
			password: password,
		}),
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
	})
		.then((resp) => {
			if (resp.status !== 200) {
				return Promise.reject(`Auth Error: ${resp.statusText}`)
			}
			return resp.json() as AuthResponse
		})
		.then((resp) => {
			if (!resp.token) {
				return Promise.reject('no valid token')
			}
			return resp.token
		})

export const getRequest = <T>(location: string, authToken: string, endpoint: string): Promise<T> =>
	fetch(`https://api.${location}${endpoint}`, {
		method: 'GET',
		headers: { Authorization: `Bearer ${authToken}`, Accept: 'application/json' },
	}).then((resp) => {
		// OK
		if (resp.status === 200) {
			return resp.json() as Promise<T>
		}
		// Unauthorized
		if (resp.status === 401) {
			return Promise.reject(new Error('UNAUTHORIZED', { cause: endpoint }))
		}
		return Promise.reject(new Error(resp.statusText, { cause: endpoint }))
	})
