import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, Mail, User, Store } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { cn } from '../lib/utils';

export default function MobileNav() {
  const { profile, unreadNotifications, unreadMessages } = useAppStore();
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Explore', path: '/explore', icon: Search },
    { name: 'Store', path: '/marketplace', icon: Store },
    { name: 'Notifications', path: '/notifications', icon: Bell, unread: unreadNotifications > 0 },
    { name: 'Messages', path: '/messages', icon: Mail, unread: unreadMessages > 0 },
    { name: 'Profile', path: `/profile/${profile?.username}`, icon: User },
  ];

  return (
    <div className="sm:hidden fixed bottom-0 w-full bg-background border-t border-border flex justify-around items-center h-16 z-50 px-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        const Icon = item.icon;
        return (
          <Link key={item.name} to={item.path} className="p-3 w-full h-full flex justify-center items-center">
            <div className="relative">
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-colors", isActive ? "text-foreground" : "text-muted-foreground")} />
               {item.unread && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary border-2 border-background rounded-full" />
                )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
