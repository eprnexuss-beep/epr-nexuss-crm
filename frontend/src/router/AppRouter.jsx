import { lazy, useEffect } from 'react';

import {} from 'react-router-dom';
import {} from 'react-router-dom';
import { Navigate, useLocation, useRoutes } from 'react-router-dom';
import { useAppContext } from '@/context/appContext';

import routes from './routes';
import { useRole } from '@/utils/roleAccess';

export default function AppRouter() {
  let location = useLocation();
  const { state: stateApp, appContextAction } = useAppContext();
  const { app } = appContextAction;

  const { isAdmin } = useRole();
  const employeePaths = ['/', '/login', '/logout', '/profile', '/lead', '/not-interested-leads', '/about', '*'];
  const routesList = [];

  Object.entries(routes).forEach(([key, value]) => {
    routesList.push(...value.map(route => !isAdmin && !employeePaths.includes(route.path) ? { ...route, element: <Navigate to="/" replace /> } : route));
  });

  function getAppNameByPath(path) {
    for (let key in routes) {
      for (let i = 0; i < routes[key].length; i++) {
        if (routes[key][i].path === path) {
          return key;
        }
      }
    }
    // Return 'default' app  if the path is not found
    return 'default';
  }
  useEffect(() => {
    if (location.pathname === '/') {
      app.default();
    } else {
      const path = getAppNameByPath(location.pathname);
      app.open(path);
    }
  }, [location]);

  let element = useRoutes(routesList);

  return element;
}
