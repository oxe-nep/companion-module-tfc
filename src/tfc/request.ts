import { AuthResponse, RoutingErrorBody } from './Message.js';

const TOKEN_REFRESH_SKEW_MS = 30_000;

export const isUnauthorized = (error: unknown): boolean => error instanceof Error && error.message === 'UNAUTHORIZED';

const decodeTokenExpiryMs = (token: string): number | null => {
	const part = token.split('.')[1];
	if (!part) return null;

	try {
		const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
		const payload = JSON.parse(json) as { exp?: number };
		return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
	} catch {
		return null;
	}
};

export class TfcTokenManager {
	private token = '';
	private expiryMs: number | null = null;
	private username = '';
	private password = '';

	constructor(private readonly location: string) {}

	setCredentials(username: string, password: string): void {
		this.username = username;
		this.password = password;
		this.token = '';
		this.expiryMs = null;
	}

	async getToken(): Promise<string> {
		if (this.token && this.expiryMs && Date.now() < this.expiryMs - TOKEN_REFRESH_SKEW_MS) {
			return this.token;
		}
		return this.refresh();
	}

	async refresh(): Promise<string> {
		this.token = await authRequest(this.location, this.username, this.password);
		this.expiryMs = decodeTokenExpiryMs(this.token) ?? Date.now() + 50 * 60 * 1000;
		return this.token;
	}
}

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
				return Promise.reject(`Auth Error: ${resp.statusText}`);
			}
			return resp.json() as Promise<AuthResponse>;
		})
		.then((resp) => {
			if (!resp.token) {
				return Promise.reject('no valid token');
			}
			return resp.token;
		});

const apiHeaders = (authToken: string, extra?: Record<string, string>): Record<string, string> => ({
	Authorization: `Bearer ${authToken}`,
	Accept: 'application/json',
	'x-context': 'user',
	...extra,
});

const rejectHttpError = async (resp: Response, endpoint: string): Promise<never> => {
	let detail = resp.statusText;
	try {
		const body = (await resp.json()) as RoutingErrorBody;
		if (body.title) {
			detail = body.title;
		}
	} catch {
		// keep statusText
	}

	if (resp.status === 401) {
		return Promise.reject(new Error('UNAUTHORIZED', { cause: `${endpoint}: ${detail}` }));
	}

	return Promise.reject(new Error(`${resp.status} ${detail}`, { cause: endpoint }));
};

const parseJsonResponse = async <T>(resp: Response, endpoint: string): Promise<T> => {
	if (resp.status === 204) {
		return undefined as T;
	}
	if (resp.status === 200) {
		return resp.json() as Promise<T>;
	}
	return rejectHttpError(resp, endpoint);
};

export const getRequest = <T>(location: string, authToken: string, endpoint: string): Promise<T> =>
	fetch(`https://api.${location}${endpoint}`, {
		method: 'GET',
		headers: apiHeaders(authToken),
	}).then((resp) => parseJsonResponse<T>(resp, endpoint));

export const postRequest = <T>(
	location: string,
	authToken: string,
	endpoint: string,
	body: unknown,
	extraHeaders?: Record<string, string>,
): Promise<T> =>
	fetch(`https://api.${location}${endpoint}`, {
		method: 'POST',
		headers: apiHeaders(authToken, {
			'Content-Type': 'application/json',
			...extraHeaders,
		}),
		body: JSON.stringify(body),
	}).then((resp) => parseJsonResponse<T>(resp, endpoint));
