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
          url: '/roleint',
          method: 'GET',
          transformer: (roles) => ({
            query: {
              roles: roles.join(','),
            },
          }),
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
          transformer: (username, password) => ({
            body: {username, password},
          }),
          expectdata: true,
          selector: (_status, data) => {
            const {sub: userid, exp: time, auth_time: timeAuth} = data.claims;
            const sessionid = data.session_token;
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
            const {sub: userid, exp: time, auth_time: timeAuth} = data.claims;
            const sessionid = data.session_token;
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
            const {sub: userid, exp: time, auth_time: timeAuth} = data.claims;
            const sessionid = data.session_token;
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
        id: {
          url: '/id/{0}',
          children: {
            exchange: {
              url: '/exchange',
              method: 'POST',
              transformer: (userid) => ({
                params: [userid],
              }),
              expectdata: true,
              selector: (_status, data) => {
                const {
                  sub: userid,
                  exp: time,
                  auth_time: timeAuth,
                } = data.claims;
                const sessionid = data.session_token;
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
              transformer: (userid) => ({
                params: [userid],
              }),
              expectdata: true,
              selector: (_status, data) => {
                const {
                  sub: userid,
                  exp: time,
                  auth_time: timeAuth,
                } = data.claims;
                const sessionid = data.session_token;
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
    },
  },
});

const GovAuthAPI = Object.freeze({
  turbine,
});

export default GovAuthAPI;
