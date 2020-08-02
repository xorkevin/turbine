export default {
  login: {
    url: '/login',
    method: 'POST',
    transformer: (username, password) => [null, {username, password}],
    expectdata: true,
    selector: (_status, data) => {
      const {userid, exp: time} = data.claims;
      const authTags = data.auth_tags;
      const sessionid = data.session_token;
      const refresh = data.refresh;
      return {
        userid,
        authTags,
        sessionid,
        refresh,
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
      const {userid, exp: time} = data.claims;
      const authTags = data.auth_tags;
      const sessionid = data.session_token;
      const refresh = data.refresh;
      return {
        userid,
        authTags,
        sessionid,
        refresh,
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
      const {userid, exp: time} = data.claims;
      const authTags = data.auth_tags;
      const sessionid = data.session_token;
      const refresh = data.refresh;
      return {
        userid,
        authTags,
        sessionid,
        refresh,
        time,
      };
    },
    err: 'Login session expired',
  },
};
