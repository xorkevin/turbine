export default {
  get: {
    url: '?amount={0}&offset={1}',
    method: 'GET',
    transformer: (amount, offset) => [[amount, offset], null],
    expectdata: true,
    selector: (_status, data) => data && data.apikeys,
    err: 'Could not get apikeys',
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
