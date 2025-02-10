import { TFC } from './TFC.js'

const TFCClient = new TFC('wss://controlws.decp.nepgroup.io/routing', 5000)

TFCClient.on('connect', () => {
	console.log('TFC Connected')

	TFCClient.route('THE PANEL', '6a9e8227-4cb8-49b1-84a3-912e82d6761c', {
		level: 'video',
		source_tag: '667e3d56-9ccf-4dbc-8592-3eed0f123df6',
	})
		.then(() => {
			console.log('route worked, WUHU')
		})
		.catch((error) => {
			console.log('OH NO...', error)
		})
})

TFCClient.on('disconnect', () => {
	console.log('TFC Disconnected')
})

TFCClient.on('error', (error) => {
	console.log('ERROR', error)
})

TFCClient.on('route', (update) => {
	console.log('ROUTE UPDATE', JSON.stringify(update))
})
