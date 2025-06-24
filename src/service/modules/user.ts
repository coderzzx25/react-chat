import request from '..';

interface ISearchUserInfo {
  uuid: string;
  email: string;
  cnName: string;
  enName: string;
  avatarUrl: string;
}

/**
 * 模糊搜索用户
 */
export const searchUser = (email: string) => {
  return request.get<ISearchUserInfo[]>({
    url: '/user/search',
    params: {
      email
    }
  });
};
