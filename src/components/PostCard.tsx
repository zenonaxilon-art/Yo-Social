import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { Link } from 'react-router-dom';
import { formatRelativeTime } from '../lib/utils';
import { Heart, MessageCircle, Trash2, Send, Bookmark, BadgeCheck, Repeat, Flag, X, Loader2 } from 'lucide-react';

export default function PostCard({ post, onDelete, onUpdate }: { key?: React.Key, post: any, onDelete?: (id: string) => void, onUpdate?: () => void }) {
  const { profile } = useAppStore();
  
  // Resolve whether this is a repost or not
  const isRepost = !!post.original_post_id && !!post.original_post;
  const displayPost = isRepost ? post.original_post : post;
  const user = displayPost.users || {};
  
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  
  const [reposted, setReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Reporting
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    fetchInteractions();
  }, [displayPost.id, profile?.id]);

  const fetchInteractions = async () => {
    // Fetch likes count
    const { count: lCount } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', displayPost.id);
    setLikesCount(lCount || 0);

    // Fetch comments count
    const { count: cCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', displayPost.id);
    setCommentsCount(cCount || 0);
    
    // Fetch reposts count
    const { count: rCount } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('original_post_id', displayPost.id);
    setRepostsCount(rCount || 0);

    // Fetch if user liked, bookmarked, or reposted
    if (profile) {
      const { data } = await supabase.from('likes').select('*').eq('post_id', displayPost.id).eq('user_id', profile.id).single();
      setLiked(!!data);
      
      const { data: repData } = await supabase.from('posts').select('id').eq('original_post_id', displayPost.id).eq('user_id', profile.id).maybeSingle();
      setReposted(!!repData);
      
      try {
         const { data: bData } = await supabase.from('bookmarks').select('*').eq('post_id', displayPost.id).eq('user_id', profile.id).single();
         setBookmarked(!!bData);
      } catch(e) {}
    }
  };

  const fetchComments = async () => {
    const { data } = await supabase.from('comments')
      .select('*, users:user_id(username, display_name, profile_picture_url, is_verified, role)')
      .eq('post_id', displayPost.id)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
  };

  const toggleComments = () => {
    if (!showComments) fetchComments();
    setShowComments(!showComments);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;
    
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', displayPost.id).eq('user_id', profile.id);
      setLikesCount(prev => prev - 1);
      setLiked(false);
    } else {
      await supabase.from('likes').insert({ post_id: displayPost.id, user_id: profile.id });
      setLikesCount(prev => prev + 1);
      setLiked(true);
      // Create notification
      if (displayPost.user_id !== profile.id) {
        supabase.from('notifications').insert({
           user_id: displayPost.user_id,
           actor_id: profile.id,
           type: 'like',
           post_id: displayPost.id
        }).then();
      }
    }
  };
  
  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;
    
    if (reposted) {
       // Delete the repost
       await supabase.from('posts').delete().eq('original_post_id', displayPost.id).eq('user_id', profile.id);
       setReposted(false);
       setRepostsCount(prev => prev - 1);
    } else {
       // Insert a repost
       if (window.confirm("Repost this to your feed?")) {
           try {
               await supabase.from('posts').insert({
                   user_id: profile.id,
                   content: '',
                   original_post_id: displayPost.id
               });
               setReposted(true);
               setRepostsCount(prev => prev + 1);
               // Send notification to original op
               if (displayPost.user_id !== profile.id) {
                  supabase.from('notifications').insert({
                     user_id: displayPost.user_id,
                     actor_id: profile.id,
                     type: 'repost',
                     post_id: displayPost.id
                  }).then();
               }
           } catch(e) {
               console.error("Failed to repost", e);
               alert("Please make sure you have applied the latest SQL schema updates to support Reposts.");
           }
       }
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;
    try {
      if (bookmarked) {
        await supabase.from('bookmarks').delete().eq('post_id', displayPost.id).eq('user_id', profile.id);
        setBookmarked(false);
      } else {
        await supabase.from('bookmarks').insert({ post_id: displayPost.id, user_id: profile.id });
        setBookmarked(true);
      }
    } catch(err) {}
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !profile) return;
    setPostingComment(true);

    try {
      await supabase.from('comments').insert({
        post_id: displayPost.id,
        user_id: profile.id,
        content: newComment.trim()
      });
      setNewComment('');
      setCommentsCount(prev => prev + 1);
      fetchComments();
      
      // Create notification
      if (displayPost.user_id !== profile.id) {
        supabase.from('notifications').insert({
           user_id: displayPost.user_id,
           actor_id: profile.id,
           type: 'comment',
           post_id: displayPost.id
        }).then();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPostingComment(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this post?')) {
       await supabase.from('posts').delete().eq('id', post.id); // Deletes the wrapper post (either the repost or the original)
       if (onDelete) onDelete(post.id);
    }
  };

  const handleReport = async () => {
    if (!profile || !reportReason) return;
    setIsReporting(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: profile.id,
        target_id: displayPost.id,
        type: 'post',
        reason: reportReason
      });
      if (!error) {
        alert('Report submitted successfully.');
        setShowReportModal(false);
        setReportReason('');
      } else {
        alert('Failed to submit report.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsReporting(false);
    }
  };

  // Skip rendering if original post is missing and it's a repost (means deleted)
  if (post.original_post_id && !post.original_post) {
      return (
         <div className="bg-card border border-border rounded-2xl p-4 text-muted-foreground text-[15px] italic">
            This repost is unavailable because the original post was deleted.
            {profile?.id === post.user_id && (
               <button onClick={handleDelete} className="ml-3 text-red-500 hover:underline not-italic">Remove</button>
            )}
         </div>
      );
  }

  const showGoldBadge = user.role === 'creator' || user.role === 'admin';

  return (
    <article className="bg-card border border-border rounded-2xl p-5 hover:border-muted-foreground/30 transition-colors">
      
      {isRepost && (
         <div className="flex items-center gap-2 text-muted-foreground text-[13px] font-bold mb-3 sm:ml-12">
            <Repeat size={14} /> 
            <Link to={`/profile/${post.users?.username}`} className="hover:underline">{post.users?.display_name} Reposted</Link>
         </div>
      )}

      <div className="flex gap-3">
        <Link to={`/profile/${user.username}`} className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden shrink-0 flex items-center justify-center font-bold">
          {user.profile_picture_url ? <img src={user.profile_picture_url} className="w-full h-full object-cover" alt="" /> : user.display_name?.charAt(0)}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
             <div className="flex items-center text-[15px] gap-1 flex-wrap">
               <Link to={`/profile/${user.username}`} className="font-bold hover:underline truncate">
                 {user.display_name || user.username}
               </Link>
               {user.is_verified && (
                 <svg viewBox="0 0 24 24" aria-label="Verified account" className={`w-[16px] h-[16px] fill-current shrink-0 ${showGoldBadge ? "text-yellow-500" : "text-accent"}`}><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.756 2.75 1.88 3.447-.077.387-.12.784-.12 1.18 0 2.21 1.708 3.998 3.917 3.998.47 0 .92-.086 1.336-.252C9.182 21.587 10.49 22.5 12 22.5s2.816-.915 3.336-2.252c.417.166.868.252 1.336.252 2.21 0 3.918-1.79 3.918-4 0-.398-.043-.795-.12-1.182 1.124-.697 1.88-1.986 1.88-3.447zM10.446 16l-3.3-3.03 1.144-1.246 2.155 1.97 5.56-5.56 1.25 1.186-6.81 6.68z"></path></g></svg>
               )}
               <span className="text-muted-foreground truncate text-sm">@{user.username}</span>
               <span className="text-muted-foreground px-1">·</span>
               <span className="text-muted-foreground hover:underline text-sm">{formatRelativeTime(post.created_at)}</span>
             </div>
             <div className="flex gap-2">
               {profile?.id !== post.user_id && (
                 <button onClick={() => setShowReportModal(true)} className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-500/10" aria-label="Report post">
                   <Flag size={16} />
                 </button>
               )}
               {profile?.id === post.user_id && (
                 <button onClick={handleDelete} className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-500/10" aria-label="Delete post">
                   <Trash2 size={16} />
                 </button>
               )}
             </div>
          </div>
          
          {displayPost.content && (
            <div className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap break-words text-[15px]">
              {displayPost.content.split(/(#[a-z\d-]+)/ig).map((part: string, i: number) => 
                 /^#[a-z\d-]+/i.test(part) ? <span key={i} className="text-primary hover:underline cursor-pointer">{part}</span> : part
              )}
            </div>
          )}
          
          {displayPost.image_url && (
            <div className="mt-3 rounded-xl bg-muted overflow-hidden border border-border relative">
              <img src={displayPost.image_url} alt="Post media" className="w-full h-auto max-h-[500px] object-cover" />
            </div>
          )}
          
          <div className="mt-4 flex gap-6 text-muted-foreground text-[14px]">
            <button onClick={toggleComments} className="flex flex-1 items-center gap-2 hover:text-accent cursor-pointer transition-colors group">
              <div className="p-1.5 rounded-full group-hover:bg-accent/10 transition-colors"><MessageCircle size={18} /></div> 
              {commentsCount > 0 && <span>{commentsCount}</span>}
            </button>
            <button onClick={handleRepost} className={`flex flex-1 items-center gap-2 hover:text-green-500 cursor-pointer transition-colors group ${reposted ? 'text-green-500' : ''}`}>
              <div className="p-1.5 rounded-full group-hover:bg-green-500/10 transition-colors"><Repeat size={18} /></div> 
              {repostsCount > 0 && <span>{repostsCount}</span>}
            </button>
            <button onClick={handleLike} className={`flex flex-1 items-center gap-2 cursor-pointer transition-colors group ${liked ? 'text-red-500' : 'hover:text-red-500'}`}>
              <div className="p-1.5 rounded-full group-hover:bg-red-500/10 transition-colors">
                <Heart size={18} className={liked ? 'fill-current' : ''} />
              </div> 
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>
            <button onClick={handleBookmark} className="ml-auto flex items-center gap-2 hover:text-primary cursor-pointer transition-colors group">
              <div className="p-1.5 rounded-full group-hover:bg-primary/10 transition-colors"><Bookmark size={18} className={bookmarked ? "fill-primary text-primary" : ""} /></div> 
            </button>
          </div>
        </div>
      </div>
      
      {/* Comments section hidden to save space but handled exactly as before just replacing references to displayPost.id */}
      {showComments && (
         <div className="mt-4 pt-4 border-t border-border">
            {comments.map(c => {
              const showGoldCommentBadge = c.users?.role === 'creator' || c.users?.role === 'admin';
              return (
              <div key={c.id} className="flex gap-2 mb-4">
                 <Link to={`/profile/${c.users?.username}`} className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                    {c.users?.profile_picture_url ? <img src={c.users.profile_picture_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs">{c.users?.display_name?.charAt(0)}</div>}
                 </Link>
                 <div className="flex-1 bg-muted/30 px-3 py-2 rounded-2xl rounded-tl-sm text-[14px]">
                    <div className="font-bold flex items-center gap-1">
                      {c.users?.display_name}
                      {c.users?.is_verified && <BadgeCheck size={14} className={showGoldCommentBadge ? "text-yellow-500" : "text-accent"} />}
                    </div>
                    <div className="text-foreground">{c.content}</div>
                 </div>
              </div>
            )})}
            
            <form onSubmit={handleComment} className="flex gap-2 items-center mt-2">
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0 font-bold overflow-hidden">
                {profile?.profile_picture_url ? <img src={profile.profile_picture_url} className="w-full h-full object-cover" /> : profile?.display_name?.charAt(0)}
              </div>
              <input 
                type="text" 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Post your reply..." 
                className="flex-1 bg-muted/50 border border-border rounded-full py-2 px-4 text-[14px] focus:outline-none focus:border-primary transition-colors"
              />
              <button disabled={!newComment.trim() || postingComment} type="submit" className="text-primary disabled:opacity-50 hover:bg-primary/10 p-2 rounded-full transition-colors">
                <Send size={18} />
              </button>
            </form>
         </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
         <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-[400px] border border-border rounded-xl shadow-xl flex flex-col p-5" onClick={(e) => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold flex items-center gap-2"><Flag size={20} className="text-red-500"/> Report Post</h2>
                 <button onClick={() => setShowReportModal(false)} className="hover:bg-muted p-1 rounded-full"><X size={20}/></button>
               </div>
               
               <p className="text-sm text-muted-foreground mb-4">Please select a reason for reporting this post. This will be reviewed by our admins.</p>
               
               <div className="space-y-2 mb-6">
                  {['Spam or misleading', 'Harassment or hate speech', 'Inappropriate content', 'Violence or gore'].map(reason => (
                     <button 
                       key={reason}
                       onClick={() => setReportReason(reason)}
                       className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${reportReason === reason ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:bg-muted'}`}
                     >
                        {reason}
                     </button>
                  ))}
               </div>

               <button 
                 onClick={handleReport}
                 disabled={!reportReason || isReporting}
                 className="w-full bg-red-500 text-white font-bold py-2.5 rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
               >
                 {isReporting && <Loader2 size={16} className="animate-spin" />}
                 {isReporting ? 'Submitting...' : 'Submit Report'}
               </button>
            </div>
         </div>
      )}
    </article>
  );
}
