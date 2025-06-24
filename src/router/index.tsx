import { lazy } from 'react';
import { RouteObject, Navigate, createBrowserRouter } from 'react-router';

const Chat = lazy(() => import('@/views/chat/chat'));
const Login = lazy(() => import('@/views/login/login'));
const NotFound = lazy(() => import('@/views/notfound/notfound'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/chat" />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/chat',
    element: <Chat />
  },
  {
    path: '*',
    element: <NotFound />
  }
];

const router = createBrowserRouter(routes);

export default router;
