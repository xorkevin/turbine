export default {
  get: {
    url: '',
    method: 'GET',
    expectdata: true,
    err: 'Unable to get user info',
  },
  sessions: {
    url: '/sessions',
    method: 'GET',
    expectdata: true,
    selector: (_status, data) => data && data.active_sessions,
    err: 'Could not get sessions',
    children: {
      del: {
        url: '',
        method: 'DELETE',
        transformer: (ids) => [
          null,
          {session_ids: ids.length > 0 ? ids.split(',') : []},
        ],
        expectdata: false,
        err: 'Could not delete sessions',
      },
    },
  },
  edit: {
    url: '',
    method: 'PUT',
    expectdata: false,
    err: 'Could not edit account',
  },
  email: {
    url: '/email',
    children: {
      edit: {
        url: '',
        method: 'PUT',
        transformer: (email, password) => [null, {email, password}],
        expectdata: false,
        err: 'Could not edit email',
        children: {
          confirm: {
            url: '/verify',
            method: 'PUT',
            transformer: (key, password) => [null, {key, password}],
            expectdata: false,
            err: 'Could not edit email',
          },
        },
      },
    },
  },
  pass: {
    url: '/password',
    children: {
      edit: {
        url: '',
        method: 'PUT',
        transformer: (old_password, new_password) => [
          null,
          {old_password, new_password},
        ],
        expectdata: false,
        err: 'Could not edit password',
      },
      forgot: {
        url: '/forgot',
        method: 'PUT',
        transformer: (username) => [null, {username}],
        expectdata: false,
        err: 'Could not reset password',
        children: {
          confirm: {
            url: '/reset',
            method: 'PUT',
            transformer: (key, new_password) => [null, {key, new_password}],
            expectdata: false,
            err: 'Could not reset password',
          },
        },
      },
    },
  },
  id: {
    url: '/id/{0}',
    method: 'GET',
    transformer: (userid) => [[userid], null],
    expectdata: true,
    err: 'Unable to get user info',
    children: {
      priv: {
        url: '/private',
        method: 'GET',
        transformer: (userid) => [[userid], null],
        expectdata: true,
        err: 'Unable to get user info',
      },
      edit: {
        url: '',
        children: {
          rank: {
            url: '/rank',
            method: 'PATCH',
            transformer: (userid, add, remove) => {
              const body = {};
              if (add.length > 0) {
                body.add = add
                  .split(',')
                  .map((tag) => tag.trim())
                  .join(',');
              }
              if (remove.length > 0) {
                body.remove = remove
                  .split(',')
                  .map((tag) => tag.trim())
                  .join(',');
              }
              return [[userid], body];
            },
            expectdata: false,
            err: 'Unable to update user permissions',
          },
        },
      },
    },
  },
  name: {
    url: '/name/{0}',
    method: 'GET',
    transformer: (name) => [[name], null],
    expectdata: true,
    err: 'Unable to get user info',
    children: {
      priv: {
        url: '/private',
        method: 'GET',
        transformer: (name) => [[name], null],
        expectdata: true,
        err: 'Unable to get user info',
      },
    },
  },
  ids: {
    url: '/ids?ids={0}',
    method: 'GET',
    transformer: (userids) => [[userids], null],
    expectdata: true,
    selector: (_status, data) => data.users,
    err: 'Unable to get user info',
  },
  create: {
    url: '',
    method: 'POST',
    expectdata: true,
    err: 'Could not create account',
    children: {
      confirm: {
        url: '/confirm',
        method: 'POST',
        transformer: (key) => [null, {key}],
        expectdata: true,
        err: 'Could not create account',
      },
    },
  },
};
