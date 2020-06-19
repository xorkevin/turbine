import React, {useEffect, useCallback, useMemo, useContext} from 'react';
import {useLocation, useHistory} from 'react-router-dom';
import {useSelector, useDispatch, useStore} from 'react-redux';
import {useAPI, useAPICall, useResource} from '@xorkevin/substation';
import {
  getCookie,
  setCookie,
  getSearchParams,
  searchParamsToString,
} from './utility';
import GovAuthAPI from './src/apiconfig';

// Actions

const secondsDay = 86400;
const getRefreshTime = () => Math.floor(Date.now() / 1000) + secondsDay; // time is in seconds

const LOGIN_SUCCESS = Symbol('LOGIN_SUCCESS');
const LoginSuccess = (userid, authTags, timeEnd, refresh = false) => ({
  type: LOGIN_SUCCESS,
  userid,
  authTags,
  timeEnd, // timeEnd is in seconds
  refresh: refresh ? getRefreshTime() : false,
});

const LOGOUT = Symbol('LOGOUT');
const Logout = () => ({type: LOGOUT});

// Reducer

const storeUser = (userid, user) => {
  localStorage.setItem(`user:${userid}`, JSON.stringify(user));
};

const retrieveUser = (userid) => {
  const k = localStorage.getItem(`user:${userid}`);
  try {
    return JSON.parse(k);
  } catch (_e) {
    return null;
  }
};

const defaultState = Object.freeze({
  valid: false,
  loggedIn: false,
  userid: '',
  authTags: '',
  timeEnd: 0,
  timeRefresh: 0,
});

const initState = () => {
  const k = {valid: true};
  const userid = getCookie('userid');
  if (userid) {
    k.loggedIn = true;
    k.userid = userid;
    const user = retrieveUser(userid);
    if (user) {
      k.authTags = user.authTags;
    }
  }
  return Object.assign({}, defaultState, k);
};

const Auth = (state = initState(), action) => {
  switch (action.type) {
    case LOGIN_SUCCESS:
      return Object.assign({}, state, {
        loggedIn: true,
        userid: action.userid,
        authTags: action.authTags,
        timeEnd: action.timeEnd,
        timeRefresh: action.refresh ? action.refresh : state.timeRefresh,
      });
    case LOGOUT:
      return Object.assign({}, defaultState, {valid: true});
    default:
      return state;
  }
};

// Hooks

const DefaultTurbineValue = {
  selectReducerAuth: (store) => store.Auth,
  selectAPILogin: (api) => api.u.auth.login,
  selectAPIExchange: (api) => api.u.auth.exchange,
  selectAPIRefresh: (api) => api.u.auth.refresh,
  apiURL: '/api',
  authURL: '/api/u/auth',
  fallback: 'Unauthorized',
  paramName: 'redir',
  homePath: '/',
  loginPath: '/x/login',
  authLoading: Promise.resolve(),
};
const AuthContext = React.createContext(DefaultTurbineValue);

const useAuthState = () => {
  const ctx = useContext(AuthContext);
  return useSelector(ctx.selectReducerAuth);
};

const logoutCookies = (apiURL, authURL) => {
  setCookie('access_token', 'invalid', apiURL, 0);
  setCookie('refresh_token', 'invalid', authURL, 0);
  setCookie('userid', 'invalid', '/', 0);
};

const useLogout = () => {
  const ctx = useContext(AuthContext);
  const dispatch = useDispatch();
  const logout = useCallback(() => {
    logoutCookies(ctx.apiURL, ctx.authURL);
    dispatch(Logout());
  }, [dispatch, ctx.apiURL, ctx.authURL]);
  return logout;
};

const useLoginCall = (username, password) => {
  const ctx = useContext(AuthContext);
  const dispatch = useDispatch();
  const [apiState, execute] = useAPICall(
    ctx.selectAPILogin,
    [username, password],
    {
      userid: '',
      authTags: '',
      time: 0,
    },
  );

  const loginCall = useCallback(async () => {
    const [data, _status, err] = await execute();
    if (err) {
      return;
    }
    const {userid, authTags, time} = data;
    storeUser(userid, {authTags});
    dispatch(LoginSuccess(userid, authTags, time, true));
  }, [dispatch, execute]);

  const login = useCallback(() => {
    ctx.authLoading = ctx.authLoading.then(loginCall);
    return ctx.authLoading;
  }, [ctx, loginCall]);

  return [apiState, login];
};

const useRelogin = () => {
  const ctx = useContext(AuthContext);
  const dispatch = useDispatch();
  const store = useStore();
  const execEx = useAPI(ctx.selectAPIExchange);
  const execRe = useAPI(ctx.selectAPIRefresh);
  const execLogout = useLogout();

  const reloginCall = useCallback(async () => {
    const {loggedIn, timeEnd, timeRefresh} = ctx.selectReducerAuth(
      store.getState(),
    );
    if (!loggedIn) {
      return [null, -1, 'Not logged in'];
    }
    if (Date.now() / 1000 + 5 < timeEnd) {
      return [null, 0, null];
    }
    const isLoggedIn = getCookie('userid');
    if (!isLoggedIn) {
      execLogout();
      return [null, -1, 'Session expired'];
    }
    if (Date.now() / 1000 > timeRefresh) {
      const [data, status, err] = await execRe();
      if (err) {
        if (status > 0) {
          execLogout();
        }
        return [data, status, err];
      }
      const {userid, authTags, time} = data;
      storeUser(userid, {authTags});
      dispatch(LoginSuccess(userid, authTags, time, true));
      return [data, status, err];
    }
    const [data, status, err] = await execEx();
    if (err) {
      if (status > 0) {
        execLogout();
      }
      return [data, status, err];
    }
    const {userid, authTags, time} = data;
    storeUser(userid, {authTags});
    dispatch(LoginSuccess(userid, authTags, time));
    return [data, status, err];
  }, [ctx, dispatch, store, execEx, execRe, execLogout]);

  const relogin = useCallback(() => {
    ctx.authLoading = ctx.authLoading.then(reloginCall);
    return ctx.authLoading;
  }, [ctx, reloginCall]);

  return relogin;
};

const useAuth = (callback) => {
  const relogin = useRelogin();

  const exec = useCallback(
    async (opts) => {
      const [_data, _status, err] = await relogin();
      if (err) {
        return err;
      }
      return callback(opts);
    },
    [relogin, callback],
  );

  return exec;
};

const useAuthCall = (selector, args, initState, opts) => {
  const [apiState, execute] = useAPICall(selector, args, initState, opts);
  return [apiState, useAuth(execute)];
};

const useAuthResource = (selector, args, initState, opts = {}) => {
  const relogin = useRelogin();

  const {prehook} = opts;

  const reloginhook = useCallback(
    async (args, opts) => {
      const [_data, _status, err] = await relogin();
      if (opts.cancelRef && opts.cancelRef.current) {
        return;
      }
      if (err) {
        return err;
      }
      if (prehook) {
        return prehook(args, opts);
      }
    },
    [relogin, prehook],
  );

  const reloginOpts = Object.assign({}, opts, {
    prehook: reloginhook,
  });

  return useResource(selector, args, initState, reloginOpts);
};

// Higher Order

const Protected = (child, allowedAuth) => {
  const Inner = (props) => {
    const {pathname, search} = useLocation();
    const history = useHistory();
    const {valid, loggedIn, authTags} = useAuthState();
    const ctx = useContext(AuthContext);

    useEffect(() => {
      if (valid && !loggedIn) {
        const searchParams = getSearchParams(search);
        searchParams.delete(ctx.paramName);
        if (pathname !== ctx.homePath) {
          searchParams.set(ctx.paramName, pathname);
        }
        history.replace({
          pathname: ctx.loginPath,
          search: searchParamsToString(searchParams),
        });
      }
    }, [
      ctx.paramName,
      ctx.homePath,
      ctx.loginPath,
      valid,
      loggedIn,
      pathname,
      search,
      history,
    ]);

    const authorized = useMemo(() => {
      if (!allowedAuth) {
        return true;
      }
      const authTagSet = new Set(authTags.split(','));
      if (!Array.isArray(allowedAuth)) {
        return authTagSet.has(allowedAuth);
      }
      const intersection = new Set(
        allowedAuth.filter((x) => authTagSet.has(x)),
      );
      return intersection.size > 0;
    }, [authTags]);

    if (!authorized) {
      return ctx.fallback;
    }
    return React.createElement(child, props);
  };
  return Inner;
};

const AntiProtected = (child) => {
  const Inner = (props) => {
    const {search} = useLocation();
    const history = useHistory();
    const {loggedIn} = useAuthState();
    const ctx = useContext(AuthContext);

    useEffect(() => {
      if (loggedIn) {
        const searchParams = getSearchParams(search);
        let redir = searchParams.get(ctx.paramName);
        searchParams.delete(ctx.paramName);
        if (!redir) {
          redir = ctx.homePath;
        }
        history.replace({
          pathname: redir,
          search: searchParamsToString(searchParams),
        });
      }
    }, [ctx.homePath, ctx.paramName, loggedIn, search, history]);

    return React.createElement(child, props);
  };
  return Inner;
};

export {
  Auth as default,
  Auth,
  GovAuthAPI,
  AuthContext,
  DefaultTurbineValue,
  useAuthState,
  useLoginCall,
  useRelogin,
  useAuth,
  useAuthCall,
  useAuthResource,
  useLogout,
  Protected,
  AntiProtected,
};
