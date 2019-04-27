import *  as raf from './raf-polyfill';
import *  as utils from './utils';
import *  as exts from './extensions';
import *  as anime from './anime';
import * as patch  from './patch';
import * as mount  from './mount';
import * as dom  from './dom';
import * as ws  from './websocket';
import * as tweens  from './tween';
import * as inter  from './interpolations';
import * as fetch from 'whatwg-fetch';
import * as promise from 'promise-polyfill';

export default {
	dom: dom,
	raf: raf,
	fetch: fetch,
	mount: mount,
	patch: patch,
	utils: utils,
	websocket: ws,
	extensions: exts,
	promise: promise,
	vfx: {
		tween: tweens,
		animations: anime,
		interpolations: inter,
	},
};

