const turbine = (url = '/u') => ({
  url,
  children: {
    user: {
      url: '/user',
      children: {
        get: {
          url: '',
          method: 'GET',
          expectdata: true,
          err: 'Unable to get user info',
        },
        roleint: {
          url: '/roleint?roles={0}',
          method: 'GET',
          transformer: (roles) => [[roles.join(',')], null],
          expectdata: true,
          selector: (_status, data) => data && data.roles,
          err: 'Could not get user roles',
        },
      },
    },
    auth: {
      url: '/auth',
      children: {
        login: {
          url: '/login',
          method: 'POST',
          transformer: (username, password) => [null, {username, password}],
          expectdata: true,
          selector: (_status, data) => {
            const {sub: userid, exp: time} = data.claims;
            const sessionid = data.session_token;
            const timeAuth = data.auth_time;
            const refresh = data.refresh;
            return {
              userid,
              sessionid,
              timeAuth,
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
            const {sub: userid, exp: time} = data.claims;
            const sessionid = data.session_token;
            const timeAuth = data.auth_time;
            const refresh = data.refresh;
            return {
              userid,
              sessionid,
              timeAuth,
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
            const {sub: userid, exp: time} = data.claims;
            const sessionid = data.session_token;
            const timeAuth = data.auth_time;
            const refresh = data.refresh;
            return {
              userid,
              sessionid,
              timeAuth,
              refresh,
              time,
            };
          },
          err: 'Login session expired',
        },
      },
    },
  },
});

const GovAuthAPI = Object.freeze({
  turbine,
});

export default GovAuthAPI;
