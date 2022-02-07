import pTimeout from './ptimeout';
export default async function pWaitFor(condition, options = {}) {
	const {
		interval = 20,
		timeout = Number.POSITIVE_INFINITY,
		before = true
	}: any = options;

	let retryTimeout;

	const promise = new Promise((resolve, reject) => {
		const check = async () => {
			try {
				const value = await condition();

				if (typeof value !== 'boolean') {
					throw new TypeError('Expected condition to return a boolean');
				}

				if (value === true) {
                    //@ts-ignore
					resolve();
				} else {
					retryTimeout = setTimeout(check, interval);
				}
			} catch (error) {
				reject(error);
			}
		};

		if (before) {
			check();
		} else {
			retryTimeout = setTimeout(check, interval);
		}
	});

	if (timeout !== Number.POSITIVE_INFINITY) {
		try {
			//@ts-ignore
			return await pTimeout(promise, timeout);
		} catch (error) {
			if (retryTimeout) {
				clearTimeout(retryTimeout);
			}

			throw error;
		}
	}

	return promise;
}

export {TimeoutError} from './ptimeout';
