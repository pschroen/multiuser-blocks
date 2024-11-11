export const isMobile = !!navigator.maxTouchPoints;
export const isTablet = isMobile && Math.max(window.innerWidth, window.innerHeight) > 1000;
export const isPhone = isMobile && !isTablet;
export const isHighQuality = navigator.hardwareConcurrency > 4 || (!navigator.hardwareConcurrency && !isTablet);

export var isObserver;
export var isOrbit;
export var isDebug;

if (typeof window !== 'undefined') {
	isObserver = /[?&]observer/.test(location.search);
	isOrbit = /[?&]orbit/.test(location.search);
	isDebug = /[?&]debug/.test(location.search);
}

export const lightColor = 0xf44336;
export const breakpoint = 1000;
export const numPointers = 22; // iOS limit

export const store = {
	users: [],
	sound: true,
	color: ''
};

export const layers = {
	default: 0,
	picking: 1
};
