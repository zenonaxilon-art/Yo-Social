import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, ShoppingBag, User, Shield, Moon, Sun, MessageCircle } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function Sidebar() {
  const { profile, theme, toggleTheme } = useAppStore();
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Explore', path: '/explore', icon: Search },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
    { name: 'Profile', path: `/profile/${profile?.username}`, icon: User },
  ];

  if (profile?.is_admin) {
    navItems.push({ name: 'Admin', path: '/admin', icon: Shield });
  }

  return (
    <header className="hidden sm:flex flex-col w-[88px] xl:w-[275px] items-center xl:items-start pt-2 px-2 pb-6 min-h-screen sticky top-0">
      <Link to="/" className="p-3 w-12 h-12 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-primary mb-2">
        <MessageCircle size={28} />
      </Link>
      
      <nav className="flex-1 w-full space-y-1 mt-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <Link key={item.name} to={item.path} className={cn("group flex items-center justify-center xl:justify-start w-fit text-[17px] rounded-xl hover:bg-muted transition-colors relative", isActive ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground")}>
              <div className="flex items-center gap-4 px-4 py-3 w-full rounded-xl">
                <div className="relative">
                  <Icon size={26} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-200" />
                  {item.name === 'Notifications' && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent rounded-full" />
                  )}
                </div>
                <span className={cn("hidden xl:block pr-4", isActive ? "font-bold" : "font-medium")}>
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <button onClick={toggleTheme} className="flex items-center gap-4 px-4 py-3 w-fit text-[17px] text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors xl:mb-2 mt-auto">
        {theme === 'dark' ? <Sun size={26} /> : <Moon size={26} />}
        <span className="hidden xl:block font-medium">Theme</span>
      </button>

      {profile && (
        <div className="mt-4 w-full flex items-center justify-center xl:justify-start p-3 bg-muted rounded-2xl cursor-pointer transition-colors border border-border">
          <div className="w-10 h-10 rounded-full bg-accent/80 overflow-hidden shrink-0 text-accent-foreground flex items-center justify-center">
             {profile.profile_picture_url ? (
               <img src={profile.profile_picture_url} className="w-full h-full object-cover" alt="" />
             ) : (
               <User className="w-full h-full p-2" />
             )}
          </div>
          <div className="hidden xl:block ml-3 flex-1 overflow-hidden text-left">
            <div className="font-bold truncate text-[15px] leading-tight flex items-center gap-1">
              {profile.display_name}
            </div>
            <div className="text-muted-foreground text-[15px] truncate leading-tight">@{profile.username}</div>
          </div>
          <div className="hidden xl:flex ml-4">
             {/* ellipsis icon */}
             <div className="w-4 h-1 flex gap-[2px]">
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
                <div className="w-1 h-1 bg-current rounded-full"></div>
             </div>
          </div>
        </div>
      )}
    </header>
  );
}
