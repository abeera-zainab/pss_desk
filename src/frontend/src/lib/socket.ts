import { io, Socket } from "socket.io-client";
import { API_BASE, refreshAccessToken } from "./api";

let socket: Socket | null = null;

// The socket server lives at the API host without the /api suffix. With the
// default relative API base that strips down to an empty string, which means
// "same origin as the page" - the nginx in front of us proxies /socket.io.
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, "") || window.location.origin;

export function connectSocket(token: string) {
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(SOCKET_URL, { auth: { token }, autoConnect: true });

  // The handshake carries the access token, which expires after 15 minutes. On
  // any reconnect (a laptop waking, a wifi blip, an API restart) socket.io
  // replays the token it was constructed with, the server middleware rejects the
  // stale one, and socket.io does not retry a middleware rejection on its own -
  // realtime would simply stop for the rest of the session with nothing shown to
  // the user. Refreshing the token and reconnecting closes that hole.
  socket.on("connect_error", async (err) => {
    const stale = /token|jwt|expired|auth/i.test(err?.message ?? "");
    if (!stale) return; // network-level failure: socket.io retries by itself
    try {
      const fresh = await refreshAccessToken();
      if (socket) {
        socket.auth = { token: fresh };
        socket.connect();
      }
    } catch {
      // The refresh token is gone too, so the session is genuinely over. The
      // axios interceptor drives the redirect to login; nothing to do here.
    }
  });

  return socket;
}

// Push a newly minted access token into the live socket so the next reconnect
// handshake uses it. Called by the auth store after a silent refresh.
export function updateSocketToken(token: string) {
  if (socket) socket.auth = { token };
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
