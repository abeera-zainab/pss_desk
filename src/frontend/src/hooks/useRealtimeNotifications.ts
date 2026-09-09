import { useEffect } from "react";
import type { NotificationDTO } from "@shared/types";
import { getSocket } from "../lib/socket";
import { useNotifications } from "../store/notifications";

// Loads persisted notifications once, then keeps the store in sync with live
// socket pushes. Mounted once by the Layout.
export function useRealtimeNotifications() {
  const load = useNotifications((s) => s.load);
  const push = useNotifications((s) => s.push);

  useEffect(() => {
    load().catch(() => {});
    const socket = getSocket();
    if (!socket) return;
    const handler = (n: NotificationDTO) => push(n);
    socket.on("notification:new", handler);
    return () => {
      socket.off("notification:new", handler);
    };
  }, [load, push]);
}
