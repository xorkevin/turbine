import {
  createElement,
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {atom, useRecoilState, useRecoilValue, useSetRecoilState} from 'recoil';
import {
  useAPI,
  useAPICall,
  useResource,
  selectAPINull,
} from '@xorkevin/substation';
import {
  getCookie,
  filterCookies,
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

const logoutCookies = (ctx, userid) => {
  setCookie(ctx.cookieAccessToken, 'invalid', ctx.routeAPI, 0);
  setCookie(ctx.cookieRefreshToken, 'invalid', ctx.routeAuth, 0);
  if (userid) {
    setCookie(ctx.cookieRefreshToken, 'invalid', ctx.routeIDAuth(userid), 0);
    setCookie(ctx.cookieIDUserid(userid), 'invalid', ctx.routeRoot, 0);
  }
  setCookie(ctx.cookieUserid, 'invalid', ctx.routeRoot, 0);
};

const secondsDay = 86400;

const DefaultRoleIntersect = Object.freeze([
  'user',
  'admin',
  'usr.gov.user',
  'mod.gov.user',
  'usr.gov.oauth',
  'mod.gov.oauth',
]);

const TurbineDefaultOpts = Object.freeze({
  // server config
  cookieUserid: 'userid',
  cookieAccessToken: 'access_token',
  cookieRefreshToken: 'refresh_token',
  cookieIDUserid: (userid) => `userid_${userid}`,
  routeRoot: '/',
  routeAPI: '/api',
  routeAuth: '/api/u/auth',
  routeIDAuth: (userid) => `/api/u/auth/id/${userid}`,
  // client config
  storageUserKey: (userid) => `turbine:user:${userid}`,
  selectAPILogin: (api) => api.turbine.auth.login,
  selectAPIExchange: (api) => api.turbine.auth.id.exchange,
  selectAPIRefresh: (api) => api.turbine.auth.id.refresh,
  selectAPIUser: (api) => api.turbine.user.get,
  selectAPIUserRoles: (api) => api.turbine.user.roleint,
  roleIntersect: DefaultRoleIntersect,
  durationRefresh: secondsDay,
  fallbackView: 'Unauthorized',
  authRedirParam: 'redir',
  pathHome: '/',
  pathLogin: '/x/login',
  authReqChain: Promise.resolve(),
  authReqState: {},
});

const AuthCtx = createContext(Object.assign({}, TurbineDefaultOpts));

const defaultAuth = Object.freeze({
  loggedIn: false,
  userid: '',
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  creation_time: 0,
  otp_enabled: false,
  roles: [],
  sessionid: '',
  timeAuth: 0,
  timeAccess: 0,
  timeRefresh: 0,
});

const AuthState = atom({
  key: 'turbine:auth_state',
  default: defaultAuth,
});

const makeInitAuthState =
  ({cookieUserid, cookieIDUserid, storageUserKey}) =>
  ({set}) => {
    const state = Object.assign({}, defaultAuth);

    const userid = getCookie(cookieUserid);
    if (userid && userid === getCookie(cookieIDUserid(userid))) {
      state.loggedIn = true;
      state.userid = userid;

      const user = retrieveUser(storageUserKey(userid));
      if (user) {
        const {
          username,
          first_name,
          last_name,
          email,
          creation_time,
          otp_enabled,
          roles,
          sessionid,
        } = user;
        Object.assign(state, {
          username,
          first_name,
          last_name,
          email,
          creation_time,
          otp_enabled,
          roles,
          sessionid,
        });
      }
    }

    return set(AuthState, state);
  };

const AuthMiddleware = (value) => {
  const v = Object.assign(
    {},
    TurbineDefaultOpts,
    {authReqChain: Promise.resolve(), authReqState: {}},
    value,
  );
  const {authReqState} = v;
  const apiTransformMiddleware =
    (transform) =>
    (...args) => {
      const req = transform(...args);
      if (authReqState.accessToken) {
        req.headers = Object.assign(
          {Authorization: `Bearer ${authReqState.accessToken}`},
          req.headers,
        );
      }
      return req;
    };
  return {
    ctxProvider: ({children}) => (
      <AuthCtx.Provider value={v}>{children}</AuthCtx.Provider>
    ),
    initState: makeInitAuthState(v),
    apiTransformMiddleware,
  };
};

// Hooks

const useProtectedRedir = () => {
  const ctx = useContext(AuthCtx);
  const {search} = useLocation();
  const navigate = useNavigate();

  const redirect = useCallback(() => {
    const searchParams = getSearchParams(search);
    let redir = searchParams.get(ctx.authRedirParam);
    searchParams.delete(ctx.authRedirParam);
    if (!redir) {
      redir = ctx.pathHome;
    }
    navigate(redir + searchParamsToString(searchParams), {replace: true});
  }, [ctx, search, navigate]);

  return redirect;
};

const useAccounts = () => {
  const ctx = useContext(AuthCtx);
  const accounts = useMemo(
    () =>
      Object.entries(
        filterCookies(([k, v]) => k === ctx.cookieIDUserid(v)),
      ).map(([_k, v]) => v),
    [ctx],
  );
  return accounts;
};

const useAuthValue = () => {
  return useRecoilValue(AuthState);
};

const useLogout = () => {
  const ctx = useContext(AuthCtx);
  const [auth, setAuth] = useRecoilState(AuthState);
  const {loggedIn, userid} = auth;
  const logout = useCallback(() => {
    logoutCookies(ctx, loggedIn && userid);
    setAuth(defaultAuth);
    ctx.authReqState.accessToken = null;
  }, [ctx, setAuth, loggedIn, userid]);
  return logout;
};

const useGetUser = () => {
  const ctx = useContext(AuthCtx);
  const [apiState, execute] = useAPICall(ctx.selectAPIUser, [], {
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    creation_time: 0,
    otp_enabled: false,
  });
  return [apiState, execute];
};

const useRefreshUser = () => {
  const ctx = useContext(AuthCtx);
  const setAuth = useSetRecoilState(AuthState);
  const [apiState, execute] = useGetUser();

  const refreshUserCall = useCallback(async () => {
    const [data, _res, err] = await execute();
    if (err) {
      return;
    }
    const {username, first_name, last_name, email, creation_time, otp_enabled} =
      data;
    setAuth((state) => {
      storeUser(ctx.storageUserKey(state.userid), {
        username,
        first_name,
        last_name,
        email,
        creation_time,
        otp_enabled,
        roles: state.roles,
        sessionid: state.sessionid,
      });
      return Object.assign({}, state, {
        username,
        first_name,
        last_name,
        email,
        creation_time,
        otp_enabled,
      });
    });
  }, [ctx, setAuth, execute]);

  const refreshUser = useCallback(() => {
    ctx.authReqChain = ctx.authReqChain.then(refreshUserCall);
    return ctx.authReqChain;
  }, [ctx, refreshUserCall]);

  return [apiState, refreshUser];
};

const useGetRoles = () => {
  const ctx = useContext(AuthCtx);
  const [apiState, execute] = useAPICall(
    ctx.selectAPIUserRoles,
    [ctx.roleIntersect],
    [],
  );
  return [apiState, execute];
};

const useRefreshRoles = () => {
  const ctx = useContext(AuthCtx);
  const setAuth = useSetRecoilState(AuthState);
  const [apiState, execute] = useGetRoles();

  const refreshRolesCall = useCallback(async () => {
    const [data, _res, err] = await execute();
    if (err) {
      return;
    }
    setAuth((state) => {
      storeUser(ctx.storageUserKey(state.userid), {
        username: state.username,
        first_name: state.first_name,
        last_name: state.last_name,
        email: state.email,
        creation_time: state.creation_time,
        otp_enabled: state.otp_enabled,
        roles: data,
        sessionid: state.sessionid,
      });
      return Object.assign({}, state, {
        roles: data,
      });
    });
  }, [ctx, setAuth, execute]);

  const refreshRoles = useCallback(() => {
    ctx.authReqChain = ctx.authReqChain.then(refreshRolesCall);
    return ctx.authReqChain;
  }, [ctx, refreshRolesCall]);

  return [apiState, refreshRoles];
};

const useLogin = (username, password, code, backup) => {
  const ctx = useContext(AuthCtx);
  const setAuth = useSetRecoilState(AuthState);
  const [apiState, execute] = useAPICall(
    ctx.selectAPILogin,
    [username, password, code, backup],
    {
      userid: '',
      sessionid: '',
      timeAuth: 0,
      time: 0,
    },
  );
  const [_apiState_user, execGetUser] = useGetUser();
  const [_apiState_roles, execGetRoles] = useGetRoles();

  const loginCall = useCallback(async () => {
    const [data, res, err] = await execute();
    if (err) {
      return [data, res, err];
    }
    const {userid, accessToken, sessionid, timeAuth, time} = data;
    ctx.authReqState.accessToken = accessToken;
    const [resUser, resRoles] = await Promise.all([
      execGetUser(),
      execGetRoles(),
    ]);
    const {username, first_name, last_name, email, creation_time, otp_enabled} =
      Object.assign(
        {
          username: '',
          first_name: '',
          last_name: '',
          email: '',
          creation_time: 0,
          otp_enabled: false,
        },
        resUser[0],
      );
    const roles = resRoles[0] || [];
    const now = unixTime();
    storeUser(ctx.storageUserKey(userid), {
      username,
      first_name,
      last_name,
      email,
      creation_time,
      otp_enabled,
      roles,
      sessionid,
    });
    setAuth({
      loggedIn: true,
      userid,
      username,
      first_name,
      last_name,
      email,
      creation_time,
      otp_enabled,
      roles,
      sessionid,
      timeAuth,
      timeAccess: time,
      timeRefresh: now + ctx.durationRefresh,
    });
    return [data, res, err];
  }, [ctx, setAuth, execute, execGetUser, execGetRoles]);

  const login = useCallback(() => {
    ctx.authReqChain = ctx.authReqChain.then(loginCall);
    return ctx.authReqChain;
  }, [ctx, loginCall]);

  return [apiState, login];
};

const defaultErr = (message) => ({message});

const useRelogin = () => {
  const ctx = useContext(AuthCtx);
  const [auth, setAuth] = useRecoilState(AuthState);
  const execEx = useAPI(ctx.selectAPIExchange);
  const execRe = useAPI(ctx.selectAPIRefresh);
  const execLogout = useLogout();

  const reloginCall = useCallback(
    async ({signal} = {}) => {
      if (!auth.loggedIn) {
        return [null, null, defaultErr('Not logged in')];
      }
      const now = unixTime();
      if (now + 5 < auth.timeAccess) {
        return [null, null, null];
      }
      const isLoggedIn = getCookie(ctx.cookieIDUserid(auth.userid));
      if (!isLoggedIn) {
        execLogout();
        return [null, null, defaultErr('Session expired')];
      }
      if (now + 5 > auth.timeRefresh) {
        const [data, res, err] = await execRe({signal}, auth.userid);
        if (err) {
          return [data, res, err];
        }
        const {userid, accessToken, sessionid, timeAuth, time} = data;
        if (userid !== auth.userid) {
          return [null, null, defaultErr('Switched user')];
        }
        ctx.authReqState.accessToken = accessToken;
        setAuth((state) => {
          storeUser(ctx.storageUserKey(state.userid), {
            username: state.username,
            first_name: state.first_name,
            last_name: state.last_name,
            email: state.email,
            creation_time: state.creation_time,
            otp_enabled: state.otp_enabled,
            roles: state.roles,
            sessionid,
          });
          return Object.assign({}, state, {
            sessionid,
            timeAuth,
            timeAccess: time,
            timeRefresh: now + ctx.durationRefresh,
          });
        });
        return [data, res, err];
      }
      const [data, res, err] = await execEx({signal}, auth.userid);
      if (err) {
        return [data, res, err];
      }
      const {userid, accessToken, sessionid, timeAuth, refresh, time} = data;
      if (userid !== auth.userid) {
        return [null, null, defaultErr('Switched user')];
      }
      ctx.authReqState.accessToken = accessToken;
      if (refresh) {
        setAuth((state) => {
          storeUser(ctx.storageUserKey(state.userid), {
            username: state.username,
            first_name: state.first_name,
            last_name: state.last_name,
            email: state.email,
            creation_time: state.creation_time,
            otp_enabled: state.otp_enabled,
            roles: state.roles,
            sessionid,
          });
          return Object.assign({}, state, {
            sessionid,
            timeAuth,
            timeAccess: time,
            timeRefresh: now + ctx.durationRefresh,
          });
        });
      } else {
        setAuth((state) => {
          storeUser(ctx.storageUserKey(state.userid), {
            username: state.username,
            first_name: state.first_name,
            last_name: state.last_name,
            email: state.email,
            creation_time: state.creation_time,
            otp_enabled: state.otp_enabled,
            roles: state.roles,
            sessionid,
          });
          return Object.assign({}, state, {
            sessionid,
            timeAuth,
            timeAccess: time,
          });
        });
      }
      return [data, res, err];
    },
    [ctx, auth, setAuth, execEx, execRe, execLogout],
  );

  const relogin = useCallback(
    ({signal} = {}) => {
      ctx.authReqChain = ctx.authReqChain.then(() => reloginCall({signal}));
      return ctx.authReqChain;
    },
    [ctx, reloginCall],
  );

  return relogin;
};

const useSwitchAccount = (targetUserid) => {
  const ctx = useContext(AuthCtx);
  const [auth, setAuth] = useRecoilState(AuthState);
  const [apiState, execute] = useAPICall(ctx.selectAPIRefresh, [targetUserid], {
    userid: '',
    sessionid: '',
    timeAuth: 0,
    time: 0,
  });
  const [_apiState_user, execGetUser] = useGetUser();
  const [_apiState_roles, execGetRoles] = useGetRoles();

  const authUserid = auth.userid;
  const switchCall = useCallback(async () => {
    if (targetUserid === authUserid) {
      return [null, null, null];
    }
    const isLoggedIn = getCookie(ctx.cookieIDUserid(targetUserid));
    if (!isLoggedIn) {
      return [null, null, defaultErr('Session expired')];
    }
    const [data, res, err] = await execute();
    if (err) {
      return [data, res, err];
    }
    const {userid, accessToken, sessionid, timeAuth, time} = data;
    if (userid !== targetUserid) {
      return [null, null, defaultErr('Switched user')];
    }
    ctx.authReqState.accessToken = accessToken;
    const [resUser, resRoles] = await Promise.all([
      execGetUser(),
      execGetRoles(),
    ]);
    const {username, first_name, last_name, email, creation_time, otp_enabled} =
      Object.assign(
        {
          username: '',
          first_name: '',
          last_name: '',
          email: '',
          creation_time: 0,
          otp_enabled: false,
        },
        resUser[0],
      );
    const roles = resRoles[0] || [];
    const now = unixTime();
    storeUser(ctx.storageUserKey(userid), {
      username,
      first_name,
      last_name,
      email,
      creation_time,
      otp_enabled,
      roles,
      sessionid,
    });
    setAuth({
      loggedIn: true,
      userid,
      username,
      first_name,
      last_name,
      email,
      creation_time,
      otp_enabled,
      roles,
      sessionid,
      timeAuth,
      timeAccess: time,
      timeRefresh: now + ctx.durationRefresh,
    });
    return [data, res, err];
  }, [
    ctx,
    targetUserid,
    authUserid,
    setAuth,
    execute,
    execGetUser,
    execGetRoles,
  ]);

  const switchUser = useCallback(() => {
    ctx.authReqChain = ctx.authReqChain.then(switchCall);
    return ctx.authReqChain;
  }, [ctx, switchCall]);

  return [apiState, switchUser];
};

const useWrapAuth = (callback) => {
  const relogin = useRelogin();

  const exec = useCallback(
    async (...args) => {
      const [data, res, err] = await relogin();
      if (err) {
        return [data, res, err];
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
      const [_data, _res, err] = await relogin({signal: opts.signal});
      if (opts.signal && opts.signal.aborted) {
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

const useRefreshAuth = () => {
  const [once, setOnce] = useState(false);
  const {loggedIn} = useAuthValue();
  const relogin = useRelogin();
  const [_user, refreshUser] = useRefreshUser();
  const [_roles, refreshRoles] = useRefreshRoles();
  useEffect(() => {
    if (once) {
      return;
    }
    if (loggedIn) {
      (async () => {
        const [_data, _res, err] = await relogin();
        if (err) {
          return;
        }
        refreshUser();
        refreshRoles();
      })();
    }
    setOnce(true);
  }, [once, setOnce, loggedIn, relogin, refreshUser, refreshRoles]);
};

const useIntersectRoles = (roleIntersect) => {
  const ctx = useContext(AuthCtx);
  return useAuthResource(
    !Array.isArray(roleIntersect) || roleIntersect.length === 0
      ? selectAPINull
      : ctx.selectAPIUserRoles,
    [roleIntersect],
    [],
  );
};

// Higher Order

const Protected = (child, allowedAuth) => {
  const Inner = (props) => {
    const {pathname, search} = useLocation();
    const navigate = useNavigate();
    const ctx = useContext(AuthCtx);
    const {loggedIn, roles} = useAuthValue();

    useEffect(() => {
      if (!loggedIn) {
        const searchParams = getSearchParams(search);
        searchParams.delete(ctx.authRedirParam);
        if (pathname !== ctx.pathHome) {
          searchParams.set(ctx.authRedirParam, pathname);
        }
        navigate(ctx.pathLogin + searchParamsToString(searchParams), {
          replace: true,
        });
      }
    }, [ctx, loggedIn, pathname, search, navigate]);

    const authorized = useMemo(() => {
      if (!allowedAuth) {
        return true;
      }
      const roleSet = new Set(roles);
      if (!Array.isArray(allowedAuth)) {
        return roleSet.has(allowedAuth);
      }
      const intersection = new Set(allowedAuth.filter((x) => roleSet.has(x)));
      return intersection.size > 0;
    }, [roles]);

    if (!authorized) {
      return ctx.fallbackView;
    }
    return createElement(child, props);
  };
  return Inner;
};

const AntiProtected = (child) => {
  const Inner = (props) => {
    const redirect = useProtectedRedir();
    const {loggedIn} = useAuthValue();

    useEffect(() => {
      if (loggedIn) {
        redirect();
      }
    }, [redirect, loggedIn]);

    return createElement(child, props);
  };
  return Inner;
};

export {
  GovAuthAPI,
  TurbineDefaultOpts,
  DefaultRoleIntersect,
  AuthCtx,
  AuthState,
  AuthMiddleware,
  useAuthValue,
  useProtectedRedir,
  useAccounts,
  useLogout,
  useLogin,
  useRefreshUser,
  useRefreshRoles,
  useRelogin,
  useSwitchAccount,
  useWrapAuth,
  useAuthCall,
  useAuthResource,
  useRefreshAuth,
  useIntersectRoles,
  Protected,
  AntiProtected,
};
