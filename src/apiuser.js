export default {
  get: {
    url: '',
    method: 'GET',
    expectdata: true,
    err: 'Unable to get user info',
    children: {
      roles: {
        url: '/role?amount={0}&offset={1}',
        method: 'GET',
        transformer: (amount, offset) => [[amount, offset], null],
        expectdata: true,
        selector: (_status, data) => data && data.roles,
        err: 'Could not get user roles',
      },
      roleint: {
        url: '/roleint?roles={0}',
        method: 'GET',
        transformer: (roles) => [[roles], null],
        expectdata: true,
        selector: (_status, data) => data && data.roles,
        err: 'Could not get user roles',
      },
    },
  },
  sessions: {
    url: '/sessions',
    children: {
      get: {
        url: '?amount={0}&offset={1}',
        method: 'GET',
        transformer: (amount, offset) => [[amount, offset], null],
        expectdata: true,
        selector: (_status, data) => data && data.active_sessions,
        err: 'Could not get sessions',
      },
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
            transformer: (userid, key, password) => [
              null,
              {userid, key, password},
            ],
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
            transformer: (userid, key, new_password) => [
              null,
              {userid, key, new_password},
            ],
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
      roles: {
        url: '/roles?amount={1}&offset={2}',
        method: 'GET',
        transformer: (userid, amount, offset) => [
          [userid, amount, offset],
          null,
        ],
        expectdata: true,
        selector: (_status, data) => data && data.roles,
        err: 'Unable to get user roles',
      },
      roleint: {
        url: '/roleint?roles={1}',
        method: 'GET',
        transformer: (userid, roles) => [[userid, roles], null],
        expectdata: true,
        selector: (_status, data) => data && data.roles,
        err: 'Could not get user roles',
      },
      edit: {
        url: '',
        children: {
          rank: {
            url: '/rank',
            method: 'PATCH',
            transformer: (userid, add, remove) => [[userid], {add, remove}],
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
    selector: (_status, data) => data && data.users,
    err: 'Unable to get user info',
  },
  all: {
    url: '/all?amount={0}&offset={1}',
    method: 'GET',
    transformer: (amount, offset) => [[amount, offset], null],
    expectdata: true,
    selector: (_status, data) => data && data.users,
    err: 'Unable to get user info',
  },
  role: {
    url: '/role/{0}?amount={1}&offset={2}',
    method: 'GET',
    transformer: (role, amount, offset) => [[role, amount, offset], null],
    expectdata: true,
    selector: (_status, data) => data && data.users,
    err: 'Unable to get users',
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
        transformer: (userid, key) => [null, {userid, key}],
        expectdata: true,
        err: 'Could not create account',
      },
    },
  },
  approvals: {
    url: '/approvals',
    children: {
      get: {
        url: '?amount={0}&offset={1}',
        method: 'GET',
        transformer: (amount, offset) => [[amount, offset], null],
        expectdata: true,
        selector: (_status, data) => data && data.approvals,
        err: 'Unable to get approvals',
      },
      id: {
        url: '/id/{0}',
        children: {
          approve: {
            url: '',
            method: 'POST',
            transformer: (userid) => [[userid], null],
            expectdata: false,
            err: 'Unable to approve request',
          },
          del: {
            url: '',
            method: 'DELETE',
            transformer: (userid) => [[userid], null],
            expectdata: false,
            err: 'Unable to delete request',
          },
        },
      },
    },
  },
};
