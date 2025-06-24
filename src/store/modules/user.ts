import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IUserInfo } from '@/service/modules/auth';
import { localCache } from '@/utils/cache';

interface IUserState {
  userInfo: IUserInfo | null;
}

const userSlice = createSlice({
  name: 'user',
  initialState: {
    userInfo: localCache.getCache('userInfo') ?? null
  } as IUserState,
  reducers: {
    setUserInfoActions(state, { payload }: PayloadAction<IUserInfo>) {
      state.userInfo = payload;

      localCache.setCache('userInfo', payload);
    }
  }
});

export const { setUserInfoActions } = userSlice.actions;

export default userSlice.reducer;
