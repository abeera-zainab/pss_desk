import { useEffect, useState } from "react";
import { useNotifications } from "../store/notifications";
import { EmptyState } from "../components/ui";
import { formatDateTime } from "../lib/format";
import { card, heading, colors } from "../lib/theme";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBell, 
  faCheckCircle, 
  faTimesCircle, 
  faClock, 
  faEnvelope,
  faUser,
 faTasks,
  faCalendarAlt,
  faRocket,
  faStar,
  faGem,
  faBolt,
  faCircle,
  faCheckDouble,
  faFilter,
  faTrash
} from '@fortawesome/free-solid-svg-icons';

function NotificationsKeyframes() {
  return (
    <style>{`
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-15px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.25); }
        50% { box-shadow: 0 0 20px 4px rgba(99, 102, 241, 0.08); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  );
}

// Get icon based on notification type
const getNotificationIcon = (type: string) => {
  const lowerType = type?.toLowerCase() || '';
  if (lowerType.includes('task') || lowerType.includes('assign')) return faTasks;
  if (lowerType.includes('user') || lowerType.includes('profile')) return faUser;
  if (lowerType.includes('leave') || lowerType.includes('attendance')) return faCalendarAlt;
  if (lowerType.includes('complete') || lowerType.includes('done')) return faCheckCircle;
  if (lowerType.includes('reject') || lowerType.includes('fail')) return faTimesCircle;
  if (lowerType.includes('system') || lowerType.includes('update')) return faRocket;
  return faBell;
};

// Get color based on notification type
const getNotificationColor = (type: string) => {
  const lowerType = type?.toLowerCase() || '';
  if (lowerType.includes('task') || lowerType.includes('assign')) return '#6366F1';
  if (lowerType.includes('user') || lowerType.includes('profile')) return '#8B5CF6';
  if (lowerType.includes('leave') || lowerType.includes('attendance')) return '#10B981';
  if (lowerType.includes('complete') || lowerType.includes('done')) return '#10B981';
  if (lowerType.includes('reject') || lowerType.includes('fail')) return '#EF4444';
  if (lowerType.includes('system') || lowerType.includes('update')) return '#F59E0B';
  return '#6366F1';
};

export default function Notifications() {
  const { items, load, markRead } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load]);

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !item.read;
    if (filter === 'read') return item.read;
    return true;
  });

  const unreadCount = items.filter(i => !i.read).length;

  const handleMarkAllRead = () => {
    items.forEach(item => {
      if (!item.read) markRead(item.id);
    });
  };

  return (
    <div className="p-6 lg:p-8" style={{ background: "#F8FAFC", minHeight: '100vh' }}>
      <NotificationsKeyframes />

      {/* Header */}
      <div className="mb-6" style={{ animation: "fadeUp 0.5s ease-out both" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-md"
                style={{ 
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)',
                }}
              >
                <FontAwesomeIcon icon={faBell} className="text-xl text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: "#1A1D23" }}>
                  Notifications
                </h1>
                <p className="mt-0.5 text-sm flex items-center gap-3" style={{ color: "#64748B" }}>
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faBell} className="text-indigo-400 text-xs" />
                    {items.length} total
                  </span>
                  {unreadCount > 0 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faCircle} className="text-indigo-400 text-[6px]" />
                        <span style={{ color: "#6366F1" }}>{unreadCount} unread</span>
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all duration-200 hover:shadow-lg active:scale-95"
              style={{ 
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
              }}
            >
              <FontAwesomeIcon icon={faCheckDouble} className="text-sm" />
              Mark All Read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border bg-white p-1" style={{ borderColor: "#E2E8F0" }}>
            {[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread' },
              { value: 'read', label: 'Read' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as any)}
                className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  filter === tab.value 
                    ? "text-white shadow-sm" 
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                style={{
                  background: filter === tab.value ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
                }}
              >
                {tab.label}
                {tab.value === 'unread' && unreadCount > 0 && (
                  <span className="ml-1.5 text-[8px] bg-white/20 px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div 
              className="h-12 w-12 animate-spin rounded-full border-4"
              style={{ 
                borderColor: '#E2E8F0',
                borderTopColor: '#6366F1',
              }}
            />
            <p className="text-sm font-medium" style={{ color: "#64748B" }}>Loading notifications...</p>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed bg-white p-16 text-center" style={{ borderColor: "#E2E8F0" }}>
          <div className="flex h-20 w-20 items-center justify-center rounded-full mx-auto" style={{ background: "#EEF2FF" }}>
            <FontAwesomeIcon icon={faBell} className="text-3xl text-indigo-400" />
          </div>
          <p className="mt-4 text-lg font-semibold" style={{ color: "#1A1D23" }}>
            {filter === 'all' ? 'No notifications yet' : filter === 'unread' ? 'All caught up!' : 'No read notifications'}
          </p>
          <p className="text-sm" style={{ color: "#64748B" }}>
            {filter === 'all' ? 'We\'ll notify you when something happens' : 'You have no unread notifications'}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border bg-white shadow-sm overflow-hidden" style={{ borderColor: "#E2E8F0", animation: "fadeUp 0.5s ease-out both" }}>
          {filteredItems.map((n, index) => {
            const icon = getNotificationIcon(n.type);
            const iconColor = getNotificationColor(n.type);
            const isUnread = !n.read;
            
            return (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`group flex w-full items-start gap-4 px-5 py-4 text-left transition-all duration-300 ${
                  isUnread ? 'hover:bg-indigo-50/50' : 'hover:bg-gray-50/50'
                } ${!isUnread ? 'opacity-70' : ''}`}
                style={{
                  borderBottom: `1px solid #E2E8F0`,
                  animation: `slideIn 0.3s ease-out ${index * 40}ms both`,
                  background: isUnread ? '#EEF2FF20' : 'transparent',
                }}
              >
                {/* Unread indicator */}
                {isUnread && (
                  <div className="absolute left-0 top-0 h-full w-1">
                    <div
                      className="h-full w-full rounded-r-full"
                      style={{ 
                        background: `linear-gradient(180deg, #6366F1, #8B5CF6)`,
                      }}
                    />
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                    isUnread ? 'shadow-sm' : ''
                  }`}
                  style={{
                    background: isUnread ? `${iconColor}15` : '#F1F5F9',
                    boxShadow: isUnread ? `0 4px 12px ${iconColor}15` : 'none',
                  }}
                >
                  <FontAwesomeIcon 
                    icon={icon} 
                    className="text-lg"
                    style={{ 
                      color: isUnread ? iconColor : '#94A3B8',
                    }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <p 
                      className={`text-sm transition-colors duration-200 ${
                        isUnread ? 'text-slate-800 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {n.message}
                    </p>
                    {isUnread && (
                      <span
                        className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0"
                        style={{
                          background: '#EEF2FF',
                          color: '#6366F1',
                        }}
                      >
                        New
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <FontAwesomeIcon 
                        icon={faClock} 
                        className="text-[9px]"
                        style={{ color: '#94A3B8' }} 
                      />
                      <span className="text-[10px]" style={{ color: '#94A3B8' }}>
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    {n.type && (
                      <>
                        <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                        <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#94A3B8' }}>
                          {n.type.replace('_', ' ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Mark read indicator */}
                {!isUnread && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <FontAwesomeIcon 
                      icon={faCheckCircle} 
                      className="text-[10px]"
                      style={{ color: '#94A3B8' }}
                    />
                  </div>
                )}
                {isUnread && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <FontAwesomeIcon 
                      icon={faCircle} 
                      className="text-[10px]"
                      style={{ color: '#6366F1' }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}