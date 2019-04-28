import * as raf from './raf-polyfill';
import * as utils from './utils';
import * as exts from './extensions';
import * as anime from './anime';
import * as patch from './patch';
import * as mount from './mount';
import * as dom from './dom';
import * as ws from './websocket';
import * as http from './http';
import * as tweened from './tween';
import * as inter from './interpolations';
import { fetchAPI } from './fetch';
import { PromiseAPI } from './promise';

export const WebVM = {
  dom: dom,
  raf: raf,
  http: http,
  mount: mount,
  patch: patch,
  utils: utils,
  websocket: ws,
  fetch: fetchAPI,
  extensions: exts,
  promise: PromiseAPI.Promise,
  vfx: {
    tween: tweened,
    animations: anime,
    interpolations: inter,
  },
};

// @ts-ignore
self.WebVM = WebVM;

export default WebVM;
