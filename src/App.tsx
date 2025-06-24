import { memo, Suspense } from 'react';
import type { FC, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router';

import router from '@/router';
import store from './store';

interface IProps {
  children?: ReactNode;
}

const App: FC<IProps> = () => {
  return (
    <Provider store={store}>
      <Suspense fallback="loading...">
        <RouterProvider router={router} />
      </Suspense>
    </Provider>
  );
};

export default memo(App);
