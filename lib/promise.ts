import * as promise from 'promise-polyfill';

export const PromiseAPI: any = {
  //@ts-ignore
  Promise: self.Promise,
};

//@ts-ignore
if (!self.Promise!) {
  PromiseAPI.Promise = promise;
  //@ts-ignore
  self.Promise = promise;
}
