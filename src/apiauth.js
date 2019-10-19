export default {
  login: {
    url: '/login',
    method: 'POST',
    transformer: (username, password) => [null, {username, password}],
    expectdata: true,
    selector: (_status, data) => {
      const {userid, auth_tags: authTags, exp: time} = data.claims;
      return {
        userid,
        authTags,
        time,
      };
    },
    err: 'Incorrect username or password',
  },
  exchange: {
    url: '/exchange',
    method: 'POST',
    expectdata: true,
    selector: (_status, data) => {
      const {userid, auth_tags: authTags, exp: time} = data.claims;
      return {
        userid,
        authTags,
        time,
      };
    },
    err: 'Login session expired',
  },
  refresh: {
    url: '/refresh',
    method: 'POST',
    expectdata: true,
    selector: (_status, data) => {
      const {userid, auth_tags: authTags, exp: time} = data.claims;
      return {
        userid,
        authTags,
        time,
      };
    },
    err: 'Login session expired',
  },
};
