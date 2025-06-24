import request from '..';

export interface IUserInfo {
  id: number;
  uuid: string;
  email: string;
  cnName: string;
  enName: string;
  age: number;
  phone: string;
  avatarUrl: string;
  sex: number;
  status: number;
  createTime: string;
  updateTime: string;
}

export const emailLogin = (email: string, password: string) => {
  return request.post<IUserInfo>({
    url: '/auth/login',
    data: {
      email,
      password
    }
  });
};
