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
    url: '?authtags={0}',
    method: 'GET',
    transformer: (keyid, key, auth_tags) => [
      [auth_tags],
      null,
      {Authorization: `Basic ${btoa(keyid + ':' + key)}`},
    ],
    expectdata: true,
    err: 'Could not create apikey',
  },
  create: {
    url: '',
    method: 'POST',
    transformer: (name, desc, auth_tags) => [null, {name, desc, auth_tags}],
    expectdata: true,
    err: 'Could not create apikey',
  },
  id: {
    url: '/id/{0}',
    children: {
      edit: {
        url: '',
        method: 'PUT',
        transformer: (keyid, name, desc, auth_tags) => [
          [keyid],
          {name, desc, auth_tags},
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
