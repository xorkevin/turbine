const turbine = (url = '/u') => ({
  url,
  children: {
    user: {
      url: '/user',
      children: {
        get: {
          url: '',
          method: 'GET',
          expectjson: true,
          err: 'Unable to get user info',
        },
        roleint: {
          url: '/roleint',
          method: 'GET',
          transformer: (roles) => ({
            query: {
              roles: roles.join(','),
            },
          }),
          expectjson: true,
          selector: (_res, data) => data && data.roles,
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
          transformer: (username, password, code, backup) => ({
            json: {username, password, code, backup},
          }),
          expectjson: true,
          selector: (_res, data) => {
            const {sub: userid, exp: time, auth_time: timeAuth} = data.claims;
            const accessToken = data.access_token;
            const sessionid = data.session_token;
            const refresh = data.refresh;
            return {
              userid,
              accessToken,
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
          expectjson: true,
          selector: (_res, data) => {
            const {sub: userid, exp: time, auth_time: timeAuth} = data.claims;
            const accessToken = data.access_token;
            const sessionid = data.session_token;
            const refresh = data.refresh;
            return {
              userid,
              accessToken,
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
          expectjson: true,
          selector: (_res, data) => {
            const {sub: userid, exp: time, auth_time: timeAuth} = data.claims;
            const accessToken = data.access_token;
            const sessionid = data.session_token;
            const refresh = data.refresh;
            return {
              userid,
              accessToken,
              sessionid,
              timeAuth,
              refresh,
              time,
            };
          },
          err: 'Login session expired',
        },
        id: {
          url: '/id/{0}',
          children: {
            exchange: {
              url: '/exchange',
              method: 'POST',
              transformer: (userid) => ({
                params: [userid],
              }),
              expectjson: true,
              selector: (_res, data) => {
                const {
                  sub: userid,
                  exp: time,
                  auth_time: timeAuth,
                } = data.claims;
                const accessToken = data.access_token;
                const sessionid = data.session_token;
                const refresh = data.refresh;
                return {
                  userid,
                  accessToken,
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
              transformer: (userid) => ({
                params: [userid],
              }),
              expectjson: true,
              selector: (_res, data) => {
                const {
                  sub: userid,
                  exp: time,
                  auth_time: timeAuth,
                } = data.claims;
                const accessToken = data.access_token;
                const sessionid = data.session_token;
                const refresh = data.refresh;
                return {
                  userid,
                  accessToken,
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
    },
  },
});

const GovAuthAPI = Object.freeze({
  turbine,
});

export default GovAuthAPI;
