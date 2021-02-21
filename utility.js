const COOKIE = {
  prev: false,
  map: {},
};

const getCookie = (key) => {
  const cookies = document.cookie;
  if (cookies === COOKIE.prev) {
    return COOKIE.map[key];
  }
  const map = Object.fromEntries(
    cookies.split(';').map((value) => value.trim().split('=', 2)),
  );
  COOKIE.prev = cookies;
  COOKIE.map = map;
  return COOKIE.map[key];
};

const filterCookies = (fn) => {
  const cookies = document.cookie;
  if (cookies === COOKIE.prev) {
    return Object.fromEntries(Object.entries(COOKIE.map).filter(fn));
  }
  const map = Object.fromEntries(
    cookies.split(';').map((value) => value.trim().split('=', 2)),
  );
  COOKIE.prev = cookies;
  COOKIE.map = map;
  return Object.fromEntries(Object.entries(COOKIE.map).filter(fn));
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

export {
  getCookie,
  filterCookies,
  setCookie,
  getSearchParams,
  searchParamsToString,
};
