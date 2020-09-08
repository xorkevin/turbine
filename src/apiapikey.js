export default {
  get: {
    url: '?amount={0}&offset={1}',
    method: 'GET',
    transformer: (amount, offset) => [[amount, offset], null],
    expectdata: true,
    selector: (_status, data) => data && data.apikeys,
    err: 'Could not get apikeys',
  },
  check: {
    url: '/check?roles={0}&scope={1}',
    method: 'GET',
    transformer: (keyid, key, roles, scope) => [
      [roles, scope],
      null,
      {Authorization: `Basic ${btoa(keyid + ':' + key)}`},
    ],
    expectdata: true,
    err: 'Could not create apikey',
  },
  create: {
    url: '',
    method: 'POST',
    transformer: (name, desc, scope) => [null, {name, desc, scope}],
    expectdata: true,
    err: 'Could not create apikey',
  },
  id: {
    url: '/id/{0}',
    children: {
      edit: {
        url: '',
        method: 'PUT',
        transformer: (keyid, name, desc, scope) => [
          [keyid],
          {name, desc, scope},
        ],
        expectdata: false,
        err: 'Could not edit apikey',
      },
      rotate: {
        url: '/rotate',
        method: 'PUT',
        transformer: (keyid) => [[keyid], null],
        expectdata: true,
        err: 'Could not rotate apikey',
      },
      del: {
        url: '',
        method: 'DELETE',
        transformer: (keyid) => [[keyid], null],
        expectdata: false,
        err: 'Could not delete apikey',
      },
    },
  },
};
