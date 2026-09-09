import { useState } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../store/notifications";
import { formatDateTime } from "../lib/format";

export default function NotificationBell() {
  const { items, unread, markRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="relative flex items-center gap-1 bg-transparent text-sm font-semibold text-white"
        onClick={() => setOpen((o) => !o)}
      >
        Notifications
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-reject text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[115%] z-20 max-h-96 w-80 overflow-y-auto rounded-md border border-line bg-paper-raised shadow-xl">
          {items.length === 0 && (
            <div className="p-4 text-xs text-text-mute">No notifications yet.</div>
          )}
          {items.slice(0, 30).map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`block w-full border-b border-line px-4 py-2.5 text-left text-[12.5px] last:border-0 hover:bg-paper ${
                n.read ? "" : "bg-blue-50/60"
              }`}
            >
              <div className="text-text">{n.message}</div>
              <div className="mt-1 text-[10px] text-text-mute">{formatDateTime(n.createdAt)}</div>
            </button>
          ))}
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-line px-4 py-2 text-center text-xs font-medium text-accent-info hover:bg-paper"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}