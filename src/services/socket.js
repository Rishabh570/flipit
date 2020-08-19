'use strict';
const socketio = require('socket.io');
const redis = require('redis');
const { REDIS_URL } = require('../config/vars');
const client = redis.createClient(6379, REDIS_URL, { no_ready_check: true });

exports.setup = (server) => {
	const io = socketio(server);

	io.on('connection', (socket) => {
		socket.on('message', (itemId) => {
			const roomId = itemId;
			socket.join(roomId);
			client.get(roomId, (err, viewers) => {
				const currentViewers =
					viewers === null ? 1 : parseInt(viewers) + 1;
				client.set(roomId, currentViewers);
				io.to(roomId).emit('viewersCnt', currentViewers);
			});
		});

		socket.on('decrementViewers', (itemId) => {
			const roomId = itemId;
			client.get(roomId, (err, viewers) => {
				const currentViewers =
					viewers === null || viewers === 1
						? 0
						: parseInt(viewers) - 1;
				client.set(roomId, currentViewers);
				io.to(roomId).emit('viewersCnt', currentViewers);
			});
		});

		socket.on('disconnect', () => {
			console.log('user disconnected');
		});
	});
};
