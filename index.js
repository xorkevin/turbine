import React, {useEffect, useCallback, useMemo, useContext} from 'react';
import {useLocation, useHistory} from 'react-router-dom';
import {atom, useRecoilState, useRecoilValue, useSetRecoilState} from 'recoil';
import {useAPI, useAPICall, useResource} from '@xorkevin/substation';
import {
  getCookie,
  setCookie,
  getSearchParams,
  searchParamsToString,
} from './utility';
import GovAuthAPI from './src/apiconfig';

const unixTime = () => Date.now() / 1000;

const storeUser = (key, user) => {
  localStorage.setItem(key, JSON.stringify(user));
};

const retrieveUser = (key) => {
  const k = localStorage.getItem(key);
  try {
    return JSON.parse(k);
  } catch (_e) {
    return null;
  }
};

const logoutCookies = (ctx) => {
  setCookie(ctx.cookieAccessToken, 'invalid', ctx.routeAPI, 0);
  setCookie(ctx.cookieRefreshToken, 'invalid', ctx.routeAuth, 0);
  setCookie(ctx.cookieUserid, 'invalid', ctx.routeRoot, 0);
};

const secondsDay = 86400;

const TurbineDefaultOpts = Object.freeze({
  // server config
  cookieUserid: 'userid',
  cookieAccessToken: 'access_token',
  cookieRefreshToken: 'refresh_token',
  routeRoot: '/',
  routeAPI: '/api',
  routeAuth: '/api/u/auth',
  // client config
  storageUserKey: (userid) => `turbine:user:${userid}`,
  selectAPILogin: (api) => api.u.auth.login,
  selectAPIExchange: (api) => api.u.auth.exchange,
  selectAPIRefresh: (api) => api.u.auth.refresh,
  durationRefresh: secondsDay,
  fallbackView: 'Unauthorized',
  authRedirParam: 'redir',
  pathHome: '/',
  pathLogin: '/x/login',
  authReqChain: Promise.resolve(),
});

const AuthCtx = React.createContext(Object.assign({}, TurbineDefaultOpts));

const defaultAuth = Object.freeze({
  valid: true,
  loggedIn: false,
  userid: '',
  authTags: '',
  sessionid: '',
  timeAccess: 0,
  timeRefresh: 0,
});

const AuthState = atom({
  key: 'turbine:auth_state',
  default: defaultAuth,
});

const makeInitAuthState = ({cookieUserid, storageUserKey}) => ({set}) => {
  const state = Object.assign({}, defaultAuth);

  const userid = getCookie(cookieUserid);
  if (userid) {
    state.loggedIn = true;
    state.userid = userid;

    const user = retrieveUser(storageUserKey(userid));
    if (user) {
      state.authTags = user.authTags;
      state.sessionid = user.sessionid;
    }
  }

  return set(AuthState, state);
};

// Hooks

const useAuthValue = () => {
  return useRecoilValue(AuthState);
};

const useLogout = () => {
  const ctx = useContext(AuthCtx);
  const setAuth = useSetRecoilState(AuthState);
  const logout = useCallback(() => {
    logoutCookies(ctx);
    setAuth(defaultAuth);
  }, [ctx, setAuth]);
  return logout;
};

const useLogin = (username, password) => {
  const ctx = useContext(AuthCtx);
  const setAuth = useSetRecoilState(AuthState);
  const [apiState, execute] = useAPICall(
    ctx.selectAPILogin,
    [username, password],
    {
      userid: '',
      authTags: '',
      sessionid: '',
      time: 0,
    },
  );

  const loginCall = useCallback(async () => {
    const [data, _status, err] = await execute();
    if (err) {
      return;
    }
    const {userid, authTags, sessionid, time} = data;
    storeUser(ctx.storageUserKey(userid), {authTags, sessionid});
    setAuth((state) => ({
      valid: true,
      loggedIn: true,
      userid,
      authTags,
      sessionid,
      timeAccess: time,
      timeRefresh: state.timeRefresh,
    }));
  }, [ctx, setAuth, execute]);

  const login = useCallback(() => {
    ctx.authReqChain = ctx.authReqChain.then(loginCall);
    return ctx.authReqChain;
  }, [ctx, loginCall]);

  return [apiState, login];
};

const useRelogin = () => {
  const ctx = useContext(AuthCtx);
  const [auth, setAuth] = useRecoilState(AuthState);
  const execEx = useAPI(ctx.selectAPIExchange);
  const execRe = useAPI(ctx.selectAPIRefresh);
  const execLogout = useLogout();

  const reloginCall = useCallback(async () => {
    if (!auth.loggedIn) {
      return [null, -1, 'Not logged in'];
    }
    const now = unixTime();
    if (now + 5 < auth.timeAccess) {
      return [null, 0, null];
    }
    const isLoggedIn = getCookie(ctx.cookieUserid);
    if (!isLoggedIn) {
      execLogout();
      return [null, -1, 'Session expired'];
    }
    if (now + 5 > auth.timeRefresh) {
      const [data, status, err] = await execRe();
      if (err) {
        if (status > 0 && status < 500) {
          execLogout();
        }
        return [data, status, err];
      }
      const {userid, authTags, sessionid, time} = data;
      storeUser(userid, {authTags, sessionid});
      setAuth({
        valid: true,
        loggedIn: true,
        userid,
        authTags,
        sessionid,
        timeAccess: time,
        timeRefresh: now + ctx.durationRefresh,
      });
      return [data, status, err];
    }
    const [data, status, err] = await execEx();
    if (err) {
      if (status > 0 && status < 500) {
        execLogout();
      }
      return [data, status, err];
    }
    const {userid, authTags, sessionid, refresh, time} = data;
    storeUser(userid, {authTags, sessionid});
    if (refresh) {
      setAuth({
        valid: true,
        loggedIn: true,
        userid,
        authTags,
        sessionid,
        timeAccess: time,
        timeRefresh: now + ctx.durationRefresh,
      });
    } else {
      setAuth((state) => ({
        valid: true,
        loggedIn: true,
        userid,
        authTags,
        sessionid,
        timeAccess: time,
        timeRefresh: state.timeRefresh,
      }));
    }
    return [data, status, err];
  }, [ctx, auth, setAuth, execEx, execRe, execLogout]);

  const relogin = useCallback(() => {
    ctx.authReqChain = ctx.authReqChain.then(reloginCall);
    return ctx.authReqChain;
  }, [ctx, reloginCall]);

  return relogin;
};

const useWrapAuth = (callback) => {
  const relogin = useRelogin();

  const exec = useCallback(
    async (...args) => {
      const [_data, _status, err] = await relogin();
      if (err) {
        return err;
      }
      return callback(...args);
    },
    [relogin, callback],
  );

  return exec;
};

const useAuthCall = (selector, args, initState, opts) => {
  const [apiState, execute] = useAPICall(selector, args, initState, opts);
  return [apiState, useWrapAuth(execute)];
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
    const ctx = useContext(AuthCtx);
    const {valid, loggedIn, authTags} = useAuthValue();

    useEffect(() => {
      if (valid && !loggedIn) {
        const searchParams = getSearchParams(search);
        searchParams.delete(ctx.authRedirParam);
        if (pathname !== ctx.pathHome) {
          searchParams.set(ctx.authRedirParam, pathname);
        }
        history.replace({
          pathname: ctx.pathLogin,
          search: searchParamsToString(searchParams),
        });
      }
    }, [ctx, valid, loggedIn, pathname, search, history]);

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
      return ctx.fallbackView;
    }
    return React.createElement(child, props);
  };
  return Inner;
};

const AntiProtected = (child) => {
  const Inner = (props) => {
    const {search} = useLocation();
    const history = useHistory();
    const ctx = useContext(AuthCtx);
    const {valid, loggedIn} = useAuthValue();

    useEffect(() => {
      if (valid && loggedIn) {
        const searchParams = getSearchParams(search);
        let redir = searchParams.get(ctx.authRedirParam);
        searchParams.delete(ctx.authRedirParam);
        if (!redir) {
          redir = ctx.pathHome;
        }
        history.replace({
          pathname: redir,
          search: searchParamsToString(searchParams),
        });
      }
    }, [ctx, valid, loggedIn, search, history]);

    return React.createElement(child, props);
  };
  return Inner;
};

export {
  GovAuthAPI,
  TurbineDefaultOpts,
  AuthCtx,
  AuthState,
  makeInitAuthState,
  useAuthValue,
  useLogout,
  useLogin,
  useRelogin,
  useWrapAuth,
  useAuthCall,
  useAuthResource,
  Protected,
  AntiProtected,
};
