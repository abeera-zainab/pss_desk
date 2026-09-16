import { create } from "zustand";
import type { UserDTO } from "@shared/types";
import { api, setAccessToken, setOnUnauthorized, setOnTokenRefreshed } from "../lib/api";
import { connectSocket, disconnectSocket, updateSocketToken } from "../lib/socket";

interface AuthState {
  user: Pick<UserDTO, "id" | "name" | "username" | "email" | "role"> | null;
  ready: boolean; // has the initial refresh attempt finished?
  init: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,

  // On app load, try to restore a session using the refresh cookie.
  init: async () => {
    try {
      const { accessToken, user } = await api.refresh();
      setAccessToken(accessToken);
      connectSocket(accessToken);
      set({ user });
    } catch {
      setAccessToken(null);
      set({ user: null });
    } finally {
      set({ ready: true });
    }
  },

  login: async (identifier, password) => {
    const { accessToken, user } = await api.login(identifier, password);
    setAccessToken(accessToken);
    connectSocket(accessToken);
    set({ user });
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      /* ignore network errors on logout */
    }
    setAccessToken(null);
    disconnectSocket();
    set({ user: null });
  }
}));

// If a request ultimately fails auth (refresh rejected), drop the session.
setOnUnauthorized(() => {
  setAccessToken(null);
  disconnectSocket();
  useAuth.setState({ user: null });
});

// Keep the websocket's copy of the access token current. Without this the socket
// still holds the token it was given at login, and the first reconnect after it
// expires is rejected by the handshake.
setOnTokenRefreshed((token) => updateSocketToken(token));
