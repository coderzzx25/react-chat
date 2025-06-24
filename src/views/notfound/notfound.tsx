import { memo } from 'react';
import type { FC, ReactNode } from 'react';

interface IProps {
  children?: ReactNode;
}

const notfound: FC<IProps> = () => {
  return <div>notfound</div>;
};

export default memo(notfound);
