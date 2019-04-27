import * as fetch from 'whatwg-fetch';

export const fetchAPI = {
  fetch: self.fetch,
  // @ts-ignore
  Headers: self.Headers,
  // @ts-ignore
  Request: self.Request,
  // @ts-ignore
  Response: self.Response,
  // @ts-ignore
  DOMException: self.DOMException,
};

if (!self.fetch) {
  fetchAPI.fetch = fetch.fetch;
  fetchAPI.Headers = fetch.Headers;
  fetchAPI.Request = fetch.Request;
  fetchAPI.Response = fetch.Response;
  fetchAPI.DOMException = fetch.DOMException;

  // polyfill global context also.
  self.fetch = fetch.fetch;
  // @ts-ignore
  self.Headers = fetch.Headers;
  // @ts-ignore
  self.Request = fetch.Request;
  // @ts-ignore
  self.Response = fetch.Response;
  // @ts-ignore
  self.DOMException = fetch.DOMException;
}
