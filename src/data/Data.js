import { store } from '../config/Config.js';

export class Data {
	// Public methods

	static getUser = id => {
		return store.users.find(item => item.id === id);
	};

	static getReticleData = id => {
		const data = this.getUser(id);

		if (!data) {
			return;
		}

		return {
			// primary: data.color || data.remoteAddress,
			primary: data.color || data.id,
			secondary: `${data.latency}ms`
		};
	};
}
