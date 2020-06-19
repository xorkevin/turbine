const COOKIE = {
  prev: false,
  map: new Map(),
};

const getCookie = (key) => {
  const cookies = document.cookie;
  if (cookies === COOKIE.prev) {
    return COOKIE.map.get(key);
  }
  const map = new Map(
    cookies.split(';').map((value) => {
      return value.trim().split('=');
    }),
  );
  COOKIE.prev = cookies;
  COOKIE.map = map;
  return map.get(key);
};

const setCookie = (key, value, path = '/', age = 31536000) => {
  document.cookie = `${key}=${value};path=${path};max-age=${age}`;
};

const getSearchParams = (search) => {
  let k = search;
  if (k.length > 0 && k[0] === '?') {
    k = k.slice(1);
  }
  return new URLSearchParams(k);
};

const searchParamsToString = (search) => {
  let k = search.toString();
  if (k.length > 0 && k[0] !== '?') {
    k = '?' + k;
  }
  return k;
};

export {getCookie, setCookie, getSearchParams, searchParamsToString};
