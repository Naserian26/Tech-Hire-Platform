import React from 'react';
import { Bell } from 'lucide-react';
import { useUiStore } from '../../store/ui.store';

const NotificationBell = () => {
  const notifications = useUiStore((state) => state.notifications);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative cursor-pointer">
      <Bell className="text-white w-6 h-6 hover:text-accent-teal transition" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
          {unreadCount}
        </span>
      )}
    </div>
  );
};

export default NotificationBell;