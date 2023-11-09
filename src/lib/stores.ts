import { writable, derived } from 'svelte/store';
import { withoutTransition } from './without-transition';

/**
 * The key used to store the mode in local storage.
 */
export const localStorageKey = 'mode';
/**
 * Writable store that represents the user's preferred mode (`"dark"`, `"light"` or `"system"`)
 */
export const userPrefersMode = createUserPrefersMode();

/**
 * Readable store that represents the system's preferred mode (`"dark"`, `"light"` or `undefined`)
 */
export const systemPrefersMode = createSystemMode();

/**
 * Derived store that represents the current mode (`"dark"`, `"light"` or `undefined`)
 */
export const derivedMode = createDerivedMode();

// saves having to branch for server vs client
const noopStorage = {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	getItem: (_key: string) => null,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	setItem: (_key: string, _value: string) => {}
};

// derived from: https://github.com/CaptainCodeman/svelte-web-storage
function createUserPrefersMode() {
	const browser = typeof window !== 'undefined' && typeof document !== 'undefined';
	const defaultValue = 'system';

	const storage = browser ? localStorage : noopStorage;
	let value = (storage.getItem(localStorageKey) as 'dark' | 'light' | 'system') || defaultValue;

	const { subscribe, set: _set } = writable(value, () => {
		if (browser) {
			const handler = (e: StorageEvent) => {
				if (e.key === localStorageKey) {
					_set((value = (e.newValue as 'dark' | 'light' | 'system') || defaultValue));
				}
			};
			addEventListener('storage', handler);
			return () => removeEventListener('storage', handler);
		}
	});

	function set(v: 'dark' | 'light' | 'system') {
		_set((value = v));
		storage.setItem(localStorageKey, value);
	}

	return {
		subscribe,
		set
	};
}

function createSystemMode() {
	const browser = typeof window !== 'undefined' && typeof document !== 'undefined';
	const defaultValue = undefined;
	let track = true;

	const { subscribe, set } = writable<'dark' | 'light' | undefined>(defaultValue, () => {
		if (browser) {
			const handler = (e: MediaQueryListEvent) => {
				if (track) {
					set(e.matches ? 'light' : 'dark');
				}
			};
			const mediaQueryState = window.matchMedia('(prefers-color-scheme: light)');
			mediaQueryState.addEventListener('change', handler);
			return () => mediaQueryState.removeEventListener('change', handler);
		}
	});

	function query() {
		if (browser) {
			const mediaQueryState = window.matchMedia('(prefers-color-scheme: light)');
			set(mediaQueryState.matches ? 'light' : 'dark');
		}
	}

	/**
	 * Sets the tracking state to the given value.
	 * @param active - The new tracking state.
	 */
	function tracking(active: boolean) {
		track = active;
	}

	return {
		subscribe,
		query,
		tracking
	};
}

function createDerivedMode() {
	const browser = typeof window !== 'undefined' && typeof document !== 'undefined';

	const { subscribe } = derived(
		[userPrefersMode, systemPrefersMode],
		([$userPrefersMode, $systemPrefersMode]) => {
			if (!browser) return undefined;

			const derivedMode = $userPrefersMode === 'system' ? $systemPrefersMode : $userPrefersMode;

			withoutTransition(() => {
				const htmlEl = document.documentElement;
				if (derivedMode === 'light') {
					htmlEl.classList.remove('dark');
					htmlEl.style.colorScheme = 'light';
				} else {
					htmlEl.classList.add('dark');
					htmlEl.style.colorScheme = 'dark';
				}
			});

			return derivedMode;
		}
	);

	return {
		subscribe
	};
}
