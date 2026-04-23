import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { UserPlus, Heart, MessageCircle } from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function Notifications() {
  const { user } = useAppStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:actor_id ( username, display_name, profile_picture_url ),
        post:post_id ( content )
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) {
      setNotifications(data);
      // Mark as read
      supabase.from('notifications').update({ is_read: true }).eq('user_id', user!.id).is('is_read', false).then();
    }
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow': return <UserPlus className="text-primary" size={24} />;
      case 'like': return <Heart className="text-pink-500 fill-pink-500" size={24} />;
      case 'comment': return <MessageCircle className="text-blue-500" size={24} />;
      default: return null;
    }
  };

  return (
    <div className="w-full">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>
      <div className="px-4 sm:px-8 py-6 space-y-4">
        {loading ? (
          <div className="p-4 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground mt-10 bg-card border border-border rounded-2xl">
            <div className="font-extrabold text-3xl text-foreground mb-2">Nothing to see here — yet</div>
            <p>From likes to follows, they'll show up here.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`flex gap-4 p-5 border border-border rounded-2xl transition-colors cursor-pointer ${!n.is_read ? 'bg-muted/20' : 'bg-card hover:border-muted-foreground/30'}`}>
              <div className="w-10 flex justify-end shrink-0 pt-1">
                {getIcon(n.type)}
              </div>
              <div className="flex-1">
                 <Link to={`/profile/${n.actor?.username}`} className="w-8 h-8 rounded-full bg-muted overflow-hidden mb-2 block">
                  {n.actor?.profile_picture_url && <img src={n.actor.profile_picture_url} className="w-full h-full object-cover" alt="" />}
                 </Link>
                 <div className="text-[15px]">
                    <span className="font-bold hover:underline cursor-pointer"><Link to={`/profile/${n.actor?.username}`}>{n.actor?.display_name || n.actor?.username}</Link></span>
                    {n.type === 'follow' && <span className="text-muted-foreground"> followed you</span>}
                    {n.type === 'like' && <span className="text-muted-foreground"> liked your post</span>}
                    {n.type === 'comment' && <span className="text-muted-foreground"> replied to your post</span>}
                 </div>
                 {n.post && (
                   <div className="text-muted-foreground mt-2 text-[15px] p-3 bg-muted/50 rounded-xl">{n.post.content}</div>
                 )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
