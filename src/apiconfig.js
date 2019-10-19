import authAPI from './apiauth';
import userAPI from './apiuser';

export default {
  user: {
    url: '/user',
    children: userAPI,
  },
  auth: {
    url: '/auth',
    children: authAPI,
  },
};
