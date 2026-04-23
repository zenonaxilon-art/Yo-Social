import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, Mail, User } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { cn } from '../lib/utils';

export default function MobileNav() {
  const { profile } = useAppStore();
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Explore', path: '/explore', icon: Search },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Messages', path: '/messages', icon: Mail },
    { name: 'Profile', path: `/profile/${profile?.username}`, icon: User },
  ];

  return (
    <div className="sm:hidden fixed bottom-0 w-full bg-background border-t border-border flex justify-around items-center h-16 z-50">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        const Icon = item.icon;
        return (
          <Link key={item.name} to={item.path} className="p-3 w-full h-full flex justify-center items-center">
            <div className="relative">
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-colors", isActive ? "text-foreground" : "text-muted-foreground")} />
               {item.name === 'Notifications' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
