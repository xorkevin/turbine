import {
  createElement,
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useContext,
} from 'react';
import {useLocation, useHistory} from 'react-router-dom';
import {atom, useRecoilState, useRecoilValue, useSetRecoilState} from 'recoil';
import {
  useAPI,
  useAPICall,
  useResource,
  selectAPINull,
} from '@xorkevin/substation';
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
  routeRoot: '/',
  routeAPI: '/api',
  routeAuth: '/api/u/auth',
  // client config
  storageUserKey: (userid) => `turbine:user:${userid}`,
  selectAPILogin: (api) => api.turbine.auth.login,
  selectAPIExchange: (api) => api.turbine.auth.exchange,
  selectAPIRefresh: (api) => api.turbine.auth.refresh,
  selectAPIUser: (api) => api.turbine.user.get,
  selectAPIUserRoles: (api) => api.turbine.user.roleint,
  roleIntersect: DefaultRoleIntersect,
  durationRefresh: secondsDay,
  fallbackView: 'Unauthorized',
  authRedirParam: 'redir',
  pathHome: '/',
  pathLogin: '/x/login',
  authReqChain: Promise.resolve(),
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

const makeInitAuthState = ({cookieUserid, storageUserKey}) => ({set}) => {
  const state = Object.assign({}, defaultAuth);

  const userid = getCookie(cookieUserid);
  if (userid) {
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
        roles,
        sessionid,
      } = user;
      Object.assign(state, {
        username,
        first_name,
        last_name,
        email,
        creation_time,
        roles,
        sessionid,
      });
    }
  }

  return set(AuthState, state);
};

const AuthMiddleware = (value) => {
  const v = Object.assign({}, TurbineDefaultOpts, value);
  return {
    ctxProvider: ({children}) => (
      <AuthCtx.Provider value={v}>{children}</AuthCtx.Provider>
    ),
    initState: makeInitAuthState(v),
  };
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

const useGetUser = () => {
  const ctx = useContext(AuthCtx);
  const [apiState, execute] = useAPICall(ctx.selectAPIUser, [], {
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    creation_time: 0,
  });
  return [apiState, execute];
};

const useRefreshUser = () => {
  const ctx = useContext(AuthCtx);
  const setAuth = useSetRecoilState(AuthState);
  const [apiState, execute] = useGetUser();

  const refreshUser = useCallback(async () => {
    const [data, _status, err] = await execute();
    if (err) {
      return;
    }
    const {username, first_name, last_name, email, creation_time} = data;
    setAuth((state) => {
      storeUser(ctx.storageUserKey(state.userid), {
        username,
        first_name,
        last_name,
        email,
        creation_time,
        roles: state.roles,
        sessionid: state.sessionid,
      });
      return Object.assign({}, state, {
        username,
        first_name,
        last_name,
        email,
        creation_time,
      });
    });
  }, [ctx, setAuth, execute]);
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

  const refreshRoles = useCallback(async () => {
    const [data, _status, err] = await execute();
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
        roles: data,
        sessionid: state.sessionid,
      });
      return Object.assign({}, state, {
        roles: data,
      });
    });
  }, [ctx, setAuth, execute]);
  return [apiState, refreshRoles];
};

const useLogin = (username, password) => {
  const ctx = useContext(AuthCtx);
  const setAuth = useSetRecoilState(AuthState);
  const [apiState, execute] = useAPICall(
    ctx.selectAPILogin,
    [username, password],
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
    const [data, _status, err] = await execute();
    if (err) {
      return;
    }
    const [resUser, resRoles] = await Promise.all([
      execGetUser(),
      execGetRoles(),
    ]);
    const {userid, sessionid, timeAuth, time} = data;
    const {
      username,
      first_name,
      last_name,
      email,
      creation_time,
    } = Object.assign(
      {
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        creation_time: '',
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
      roles,
      sessionid,
      timeAuth,
      timeAccess: time,
      timeRefresh: now + ctx.durationRefresh,
    });
  }, [ctx, setAuth, execute, execGetUser, execGetRoles]);

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
      const {userid, sessionid, timeAuth, time} = data;
      setAuth((state) => {
        storeUser(ctx.storageUserKey(userid), {
          username: state.username,
          first_name: state.first_name,
          last_name: state.last_name,
          email: state.email,
          creation_time: state.creation_time,
          roles: state.roles,
          sessionid,
        });
        return Object.assign({}, state, {
          loggedIn: true,
          userid,
          sessionid,
          timeAuth,
          timeAccess: time,
          timeRefresh: now + ctx.durationRefresh,
        });
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
    const {userid, sessionid, timeAuth, refresh, time} = data;
    if (refresh) {
      setAuth((state) => {
        storeUser(ctx.storageUserKey(userid), {
          username: state.username,
          first_name: state.first_name,
          last_name: state.last_name,
          email: state.email,
          creation_time: state.creation_time,
          roles: state.roles,
          sessionid,
        });
        return Object.assign({}, state, {
          loggedIn: true,
          userid,
          sessionid,
          timeAuth,
          timeAccess: time,
          timeRefresh: now + ctx.durationRefresh,
        });
      });
    } else {
      setAuth((state) => {
        storeUser(ctx.storageUserKey(userid), {
          username: state.username,
          first_name: state.first_name,
          last_name: state.last_name,
          email: state.email,
          creation_time: state.creation_time,
          roles: state.roles,
          sessionid,
        });
        return Object.assign({}, state, {
          loggedIn: true,
          userid,
          sessionid,
          timeAuth,
          timeAccess: time,
        });
      });
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
        const [_data, _status, err] = await relogin();
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
    const history = useHistory();
    const ctx = useContext(AuthCtx);
    const {loggedIn, roles} = useAuthValue();

    useEffect(() => {
      if (!loggedIn) {
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
    }, [ctx, loggedIn, pathname, search, history]);

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
    const {search} = useLocation();
    const history = useHistory();
    const ctx = useContext(AuthCtx);
    const {loggedIn} = useAuthValue();

    useEffect(() => {
      if (loggedIn) {
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
    }, [ctx, loggedIn, search, history]);

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
  useLogout,
  useLogin,
  useRefreshUser,
  useRefreshRoles,
  useRelogin,
  useWrapAuth,
  useAuthCall,
  useAuthResource,
  useRefreshAuth,
  useIntersectRoles,
  Protected,
  AntiProtected,
};
