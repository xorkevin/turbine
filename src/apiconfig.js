import authAPI from './apiauth';
import userAPI from './apiuser';
import apikeyAPI from './apiapikey';

const user = (url = '/u') => ({
  url,
  children: {
    user: {
      url: '/user',
      children: userAPI,
    },
    auth: {
      url: '/auth',
      children: authAPI,
    },
    apikey: {
      url: '/apikey',
      children: apikeyAPI,
    },
  },
});

const setupz = () => ({
  url: '/setupz',
  method: 'POST',
  expectdata: true,
  err: 'Could not run server setup',
});

const healthz = () => ({
  url: '/healthz',
  children: {
    live: {
      url: '/live',
      method: 'GET',
      expectdata: false,
      err: 'Could not get health report from api server',
    },
    ready: {
      url: '/ready',
      method: 'GET',
      expectdata: true,
      err: 'Could not get health report from api server',
    },
  },
});

const GovAuthAPI = Object.freeze({
  setupz,
  healthz,
  user,
});

export {GovAuthAPI as default, GovAuthAPI};
