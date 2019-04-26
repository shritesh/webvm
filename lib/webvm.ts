import *  as raf from './raf-polyfill';
import *  as utils from './utils';
import *  as exts from './extensions';
import *  as anime from './anime';
import * as patch  from './patch';
import * as mount  from './mount';
import * as dom  from './dom';

export default {
	dom: dom,
	raf: raf,
	mount: mount,
	patch: patch,
	utils: utils,
	extensions: exts,
	animation: anime,
};

