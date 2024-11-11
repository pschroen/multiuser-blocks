/**
 * @author pschroen / https://ufo.ai/
 *
 * Remix of https://glitch.com/edit/#!/multiuser-fluid
 */

import express from 'express';
import enableWs from 'express-ws';

const interval = 4000; // 4 second heartbeat

const app = express();
const expressWs = enableWs(app);
expressWs.getWss('/');

app.use(express.static('public'));

//

import { ObjectPool } from '@alienkitty/space.js/three';

import { numPointers } from './src/config/Config.js';

const mousePool = new ObjectPool();

for (let i = 0; i < numPointers; i++) {
	mousePool.put(i);
}

//

const clients = [];
const room = new Array(255);

function getRemoteAddress(request) {
	return (request.headers['x-forwarded-for'] || request.connection.remoteAddress).split(',')[0].trim();
}

function getRemoteAddresses() {
	return clients.map(ws => ws._remoteAddress);
}

function getUsers() {
	if (!clients.length) {
		return;
	}

	const length = clients.length;
	const byteLength = 1 + 6 + 4 + 2;
	const data = Buffer.allocUnsafe(1 + byteLength * length);
	data.writeUInt8(0, 0);

	let index = 1;

	for (let i = 0; i < length; i++) {
		const client = clients[i];

		data.writeUInt8(client._id, index);

		const buf = Buffer.from(client._color, 'utf8');

		for (let j = 0; j < 6; j++) {
			data.writeUInt8(buf[j], index + 1 + j);
		}

		data.writeUInt32BE(ip2long(client._remoteAddress), index + 7);
		data.writeUInt16BE(client._latency, index + 11);

		index += byteLength;
	}

	// console.log('USERS:', data);

	return data;
}

function add(ws, request) {
	clients.push(ws);

	for (let i = 0, l = room.length; i < l; i++) {
		if (room[i] === undefined) {
			const remoteAddresses = getRemoteAddresses();

			let count = 1;
			let remoteAddress = getRemoteAddress(request);

			while (remoteAddresses.includes(remoteAddress)) {
				count++;
				remoteAddress = `${getRemoteAddress(request)} (${count})`;
			}

			ws._id = i;
			ws._idle = Date.now();
			ws._mouse = mousePool.get();
			ws._isMove = false;
			ws._isDown = false;
			ws._color = '';
			ws._remoteAddress = remoteAddress;
			ws._latency;

			room[i] = ws;

			if (ws._mouse !== null) {
				const mouse = `mouse_${ws._mouse}`;
				const position = [0, 0, 0];

				physics.setPosition(mouse, position);
			}

			console.log('REMOTE:', ws._remoteAddress, request.headers['user-agent']);

			return;
		}
	}
}

function remove(ws) {
	const mouseJoint = `mouseJoint_${ws._mouse}`;

	if (physics.get(mouseJoint)) {
		physics.remove(mouseJoint);
	}

	let index = clients.indexOf(ws);

	if (~index) {
		clients.splice(index, 1);
	}

	index = room.indexOf(ws);

	if (~index) {
		room[index] = undefined;
	}

	if (ws._mouse !== null) {
		mousePool.put(ws._mouse);
	}
}

function broadcast(ws, data) {
	for (let i = 0, l = clients.length; i < l; i++) {
		const client = clients[i];

		if (client !== ws && client.readyState === client.OPEN) {
			client.send(data);
		}
	}
}

function users(ws) {
	broadcast(ws, getUsers());
}

app.ws('/', (ws, request) => {
	add(ws, request);

	console.log('USERS:', clients.length);

	if (timeout === null) {
		startTime = 0;
		timeout = setTimeout(onUpdate, 0);

		console.log('Started physics engine');
	}

	ws.on('close', () => {
		remove(ws);
		users(ws);

		console.log('USERS:', clients.length);

		if (!clients.length) {
			clearTimeout(timeout);
			timeout = null;

			console.log('Stopped physics engine');
		}
	});

	ws.on('message', data => {
		ws._idle = 0;

		switch (data.readUInt8(0)) {
			case 1:
				// console.log('HEARTBEAT:', data);
				ws._latency = Math.min(65535, Date.now() - Number(data.readBigUInt64BE(2))); // Clamp to 65535
				break;
			case 4: {
				if (ws._mouse !== null) {
					// console.log('COLOR:', data);
					ws._color = Buffer.from(data.subarray(2), 'utf-8').toString();
					users(ws);
				}
				break;
			}
			case 5: {
				if (ws._mouse !== null) {
					const index = data.readUInt8(2);
					const body = shapes[index].name;
					const mouse = `mouse_${ws._mouse}`;
					const mouseJoint = `mouseJoint_${ws._mouse}`;
					const position = [data.readFloatBE(3), data.readFloatBE(7), data.readFloatBE(11)];
					// console.log('PICK:', data, data.readUInt8(2), position);

					physics.setPosition(mouse, position);

					if (physics.get(mouseJoint)) {
						physics.remove(mouseJoint);
					}

					physics.add({
						name: mouseJoint,
						type: 'joint',
						mode: 'spherical',
						body1: body,
						body2: mouse,
						worldAnchor: index === 6 || index === 7 || physics.get(body).getNumJointLinks() ? position : null,
						springDamper: [4, 1]
						// springDamper: [2, 0.5] // elastic
					});
				}
				break;
			}
			case 6: {
				if (ws._mouse !== null) {
					const mouse = `mouse_${ws._mouse}`;
					const mouseJoint = `mouseJoint_${ws._mouse}`;
					const position = [data.readFloatBE(3), data.readFloatBE(7), data.readFloatBE(11)];
					// console.log('MOTION:', data, data.readUInt8(2), position);

					ws._isMove = true;
					ws._isDown = !!data.readUInt8(2);

					physics.setPosition(mouse, position);

					if (!ws._isDown && physics.get(mouseJoint)) {
						physics.remove(mouseJoint);
					}
				}
				break;
			}
		}

		// console.log('MESSAGE:', data);
	});

	const heartbeat = () => {
		if (ws.readyState === ws.OPEN) {
			const data = Buffer.allocUnsafe(10);
			data.writeUInt8(1, 0);
			data.writeUInt8(ws._id, 1);
			data.writeBigUInt64BE(BigInt(Date.now()), 2);

			ws.send(data);

			setTimeout(heartbeat, interval);
		}
	};

	heartbeat();
	users();
});

setInterval(() => {
	const idleTime = Date.now() - 1800000; // 30 * 60 * 1000

	for (let i = 0, l = clients.length; i < l; i++) {
		const client = clients[i];

		if (client._idle === 0) {
			client._idle = Date.now();
		} else if (client._idle < idleTime) {
			client.terminate();
			console.log('IDLE:', client._id);
		}
	}

	users();
}, interval);

//

const listener = app.listen(process.env.PORT, '0.0.0.0', () => {
	console.log(`Listening on port ${listener.address().port}`);
});

// https://stackoverflow.com/questions/1908492/unsigned-integer-in-javascript/7414641#7414641
function ip2long(ip) {
	let ipl = 0;
	ip.split('.').forEach(octet => {
		ipl <<= 8;
		ipl += parseInt(octet, 10);
	});
	return ipl >>> 0;
}

//

import { OimoPhysicsBuffer } from '@alienkitty/alien.js/three/oimophysics';

const shapes = [
	{ name: 'room_0', type: 'box', position: [-7, 0, 0], quaternion: [0, 0.13052619222005157, 0, 0.9914448613738104], size: [2.5, 12, 12], density: 0 },
	{ name: 'room_1', type: 'box', position: [7, 0, 0], quaternion: [0, -0.13052619222005157, 0, 0.9914448613738104], size: [2.5, 12, 12], density: 0 },
	{ name: 'room_2', type: 'box', position: [0, -2.5, 0], quaternion: [0, 0, 0, 1], size: [50, 2.5, 50], density: 0 },
	{ name: 'room_3', type: 'box', position: [0, 12, 0], quaternion: [0, 0, 0, 1], size: [12, 2.5, 12], density: 0 },
	{ name: 'room_4', type: 'box', position: [0, 0, -7], quaternion: [0, 0, 0, 1], size: [12, 12, 2.5], density: 0 },
	{ name: 'room_5', type: 'box', position: [0, 0, 5], quaternion: [0, 0, 0, 1], size: [12, 12, 2.5], density: 0 },
	{ name: 'block_0', type: 'compound', position: [0, 0.2175, -1], quaternion: [0, 0, 0, 1], shapes: [
		{ name: 'fwa_0', type: 'box', position: [-0.704, 0, 0], quaternion: [0, 0, 0, 1], size: [0.265, 0.0445, 0.125] },
		{ name: 'fwa_1', type: 'box', position: [-0.747, 0, 0], quaternion: [0, 0, 0, 1], size: [0.0445, 0.2195, 0.125] },
		{ name: 'fwa_2', type: 'box', position: [-0.56, 0.1755, 0], quaternion: [0, 0, 0, 1], size: [0.15625, 0.0445, 0.125] },
		{ name: 'fwa_3', type: 'box', position: [-0.308, 0, 0], quaternion: [0, 0, -0.5262139236518696, 0.8503522249955628], size: [0.2195, 0.0445, 0.125] },
		{ name: 'fwa_4', type: 'box', position: [-0.132, 0, 0], quaternion: [0, 0, 0.5262139236518696, 0.8503522249955628], size: [0.2195, 0.0445, 0.125] },
		{ name: 'fwa_5', type: 'box', position: [0.044, 0, 0], quaternion: [0, 0, -0.5262139236518696, 0.8503522249955628], size: [0.2195, 0.0445, 0.125] },
		{ name: 'fwa_6', type: 'box', position: [0.22, 0, 0], quaternion: [0, 0, 0.5262139236518696, 0.8503522249955628], size: [0.2195, 0.0445, 0.125] },
		{ name: 'fwa_7', type: 'box', position: [0.55, 0.1755, 0], quaternion: [0, 0, 0, 1], size: [0.24, 0.0445, 0.125] },
		{ name: 'fwa_8', type: 'box', position: [0.7465, 0, 0], quaternion: [0, 0, 0, 1], size: [0.0445, 0.2195, 0.125] },
		{ name: 'fwa_9', type: 'box', position: [0.531, -0.176, 0], quaternion: [0, 0, 0, 1], size: [0.18, 0.0445, 0.125] },
		{ name: 'fwa_10', type: 'box', position: [0.395, -0.045, 0], quaternion: [0, 0, 0, 1], size: [0.0445, 0.089, 0.125] },
		{ name: 'fwa_11', type: 'box', position: [0.704, 0, 0], quaternion: [0, 0, 0, 1], size: [0.265, 0.0445, 0.125] }
	], density: 1, autoSleep: false },
	// { name: 'block_1', type: 'box', position: [0, 0.125, 1], quaternion: [0, 0, 0, 1], size: [1.5, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_1', type: 'compound', position: [-0.209, 0.2435, 1], quaternion: [0, 0, 0, 1], shapes: [
		{ name: 'awwwards_0', type: 'box', position: [-0.2123, 0, 0], quaternion: [0, 0, -0.5894078684164374, 0.8078356049647673], size: [0.2455, 0.055, 0.125] },
		{ name: 'awwwards_1', type: 'box', position: [-0.07, 0, 0], quaternion: [0, 0, 0.6018150231520483, 0.7986355100472928], size: [0.2455, 0.0475, 0.125] },
		{ name: 'awwwards_2', type: 'box', position: [0.072, 0, 0], quaternion: [0, 0, -0.6018150231520483, 0.7986355100472928], size: [0.2455, 0.0475, 0.125] },
		{ name: 'awwwards_3', type: 'box', position: [0.2118, 0, 0], quaternion: [0, 0, 0.5894078684164374, 0.8078356049647673], size: [0.2455, 0.055, 0.125] },
		{ name: 'awwwards_4', type: 'box', position: [-0.3305, 0.234, 0], quaternion: [0, 0, -0.5894078684164374, 0.8078356049647673], size: [0.01375, 0.01375, 0.125] },
		{ name: 'awwwards_5', type: 'box', position: [0.33, 0.234, 0], quaternion: [0, 0, 0.5894078684164374, 0.8078356049647673], size: [0.01375, 0.01375, 0.125] }
	], density: 1, autoSleep: false },
	{ name: 'block_2', type: 'sphere', position: [0.208, 0.083, 1.125], quaternion: [0, 0, 0, 1], size: [0.085], density: 1, autoSleep: false },
	{ name: 'block_3', type: 'box', position: [-2.25, 2.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_4', type: 'box', position: [-1.75, 2.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_5', type: 'box', position: [-1.25, 2.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_6', type: 'box', position: [-0.75, 2.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_7', type: 'box', position: [-0.25, 2.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_8', type: 'box', position: [0.25, 2.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_9', type: 'box', position: [0.75, 2.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_10', type: 'box', position: [1.25, 2.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_11', type: 'box', position: [1.75, 2.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_12', type: 'box', position: [2.25, 2.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_13', type: 'box', position: [-2.25, 2.75, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_14', type: 'box', position: [-1.75, 2.75, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_15', type: 'box', position: [-1.25, 2.75, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_16', type: 'box', position: [-0.75, 2.75, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_17', type: 'box', position: [-0.25, 2.75, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_18', type: 'box', position: [0.25, 2.75, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_19', type: 'box', position: [0.75, 2.75, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_20', type: 'box', position: [1.25, 2.75, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_21', type: 'box', position: [1.75, 2.75, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_22', type: 'box', position: [2.25, 2.75, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_23', type: 'box', position: [-2.25, 3.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_24', type: 'box', position: [-1.75, 3.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_25', type: 'box', position: [-1.25, 3.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_26', type: 'box', position: [-0.75, 3.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_27', type: 'box', position: [-0.25, 3.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_28', type: 'box', position: [0.25, 3.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_29', type: 'box', position: [0.75, 3.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_30', type: 'box', position: [1.25, 3.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_31', type: 'box', position: [1.75, 3.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_32', type: 'box', position: [2.25, 3.25, 0], quaternion: [0, 0, 0, 1], size: [0.25, 0.25, 0.25], density: 1, autoSleep: false },
	{ name: 'block_33', type: 'box', position: [-1.125, 3.75, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_34', type: 'box', position: [-0.875, 3.75, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_35', type: 'box', position: [-0.625, 3.75, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_36', type: 'box', position: [-0.375, 3.75, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_37', type: 'box', position: [-0.125, 3.75, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_38', type: 'box', position: [0.125, 3.75, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_39', type: 'box', position: [0.375, 3.75, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_40', type: 'box', position: [0.625, 3.75, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_41', type: 'box', position: [0.875, 3.75, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_42', type: 'box', position: [1.125, 3.75, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_43', type: 'box', position: [-1.125, 4, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_44', type: 'box', position: [-0.875, 4, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_45', type: 'box', position: [-0.625, 4, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_46', type: 'box', position: [-0.375, 4, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_47', type: 'box', position: [-0.125, 4, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_48', type: 'box', position: [0.125, 4, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_49', type: 'box', position: [0.375, 4, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_50', type: 'box', position: [0.625, 4, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_51', type: 'box', position: [0.875, 4, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_52', type: 'box', position: [1.125, 4, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_53', type: 'box', position: [-1.125, 4.25, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_54', type: 'box', position: [-0.875, 4.25, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_55', type: 'box', position: [-0.625, 4.25, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_56', type: 'box', position: [-0.375, 4.25, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_57', type: 'box', position: [-0.125, 4.25, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_58', type: 'box', position: [0.125, 4.25, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_59', type: 'box', position: [0.375, 4.25, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_60', type: 'box', position: [0.625, 4.25, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_61', type: 'box', position: [0.875, 4.25, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'block_62', type: 'box', position: [1.125, 4.25, 0], quaternion: [0, 0, 0, 1], size: [0.125, 0.125, 0.125], density: 1, autoSleep: false },
	{ name: 'mouse_0' },
	{ name: 'mouse_1' },
	{ name: 'mouse_2' },
	{ name: 'mouse_3' },
	{ name: 'mouse_4' },
	{ name: 'mouse_5' },
	{ name: 'mouse_6' },
	{ name: 'mouse_7' },
	{ name: 'mouse_8' },
	{ name: 'mouse_9' },
	{ name: 'mouse_10' },
	{ name: 'mouse_11' },
	{ name: 'mouse_12' },
	{ name: 'mouse_13' },
	{ name: 'mouse_14' },
	{ name: 'mouse_15' },
	{ name: 'mouse_16' },
	{ name: 'mouse_17' },
	{ name: 'mouse_18' },
	{ name: 'mouse_19' },
	{ name: 'mouse_20' },
	{ name: 'mouse_21' }
];

const physics = new OimoPhysicsBuffer();

shapes.forEach(shape => physics.add(shape));

//

import { Vector3 } from 'three';

class Block {
	constructor(name, small) {
		this.force = new Vector3();
		this.forceDamping = small ? 0.6 : 0.4;
		this.forceThreshold = small ? 0.2 : 0.3;
		this.contact = false;

		physics.setContactCallback(name, this.onContact);
	}

	// Event handlers

	onContact = (body, name) => {
		if (this.contact || elapsed < 1000) {
			return;
		}

		const linearVelocity = body.getLinearVelocity();
		const mass = body.getMass();

		this.force.addScaledVector(linearVelocity, mass);
		this.force.multiplyScalar(this.forceDamping);

		const force = this.force.length();

		if (force > this.forceThreshold) {
			this.contact = true;

			const data = Buffer.allocUnsafe(6);
			data.writeUInt8(3, 0);
			data.writeUInt8(parseInt(name.match(/\d+$/)[0], 10), 1);
			data.writeFloatBE(force, 2);

			// console.log('CONTACT:', name, data);
			broadcast(null, data);

			setTimeout(() => {
				this.contact = false;
			}, 250);
		} else {
			this.force.multiplyScalar(0);
		}
	};
}

for (let i = 0; i < 63; i++) {
	new Block(`block_${i}`, i === 2 || i >= 33);
}

//

import { performance } from 'perf_hooks';

const timestep = 1000 / 61;
const byteLength = 8 * 4;
const startIndex = 1 + 63 * byteLength;

let time = 0;
let startTime = 0;
let delta = 0;
let elapsed = 0;
let timeout = null;

function onUpdate() {
	time = performance.now();
	delta = Math.min(150, time - startTime); // Clamp delta
	startTime = time;
	elapsed += delta;

	physics.step();

	const data = Buffer.allocUnsafe(1 + physics.array.buffer.byteLength);
	data.writeUInt8(2, 0);

	Buffer.from(physics.array.buffer).copy(data, 1);

	let index;

	for (let i = 0, l = clients.length; i < l; i++) {
		const client = clients[i];

		if (client._mouse !== null) {
			index = startIndex + byteLength * client._mouse;

			data.writeFloatLE(client._isMove ? client._isDown ? 2 : 1 : 0, index + 28); // 7 * 4
		}
	}

	broadcast(null, data);

	if (timeout !== null) {
		timeout = setTimeout(onUpdate, Math.max(0, timestep - (performance.now() - startTime)));
	}
}
