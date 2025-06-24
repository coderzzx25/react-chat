import { memo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import EmailLogin from './c-cpn/EmailLogin/EmailLogin';
import { emailLogin } from '@/service/modules/auth';
import { useAppDispatch } from '@/store';
import { setUserInfoActions } from '@/store/modules/user';
import { useNavigate } from 'react-router';

interface IProps {
  children?: ReactNode;
}

const login: FC<IProps> = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [errorMessage, setMessageError] = useState<string | undefined>();
  const handleEmailLogin = async (values: { email: string; password: string }) => {
    try {
      const { email, password } = values;
      const user = await emailLogin(email, password);
      // 存入redux
      dispatch(setUserInfoActions(user));
      // 跳转
      navigate('/chat');
    } catch (error: unknown) {
      const errorMessage = error as string;
      setMessageError(errorMessage);
    }
  };
  return <EmailLogin onLogin={(values) => handleEmailLogin(values)} errorMessage={errorMessage} />;
};

export default memo(login);
