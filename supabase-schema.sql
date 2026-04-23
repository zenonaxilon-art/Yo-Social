-- Run this in your Supabase SQL Editor to set up the database schema

-- Enable true UUID generation
create extension if not exists "uuid-ossp";

-- Define custom enum for notification types if needed, though text works fine.

-- Users Table (Extends auth.users)
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  display_name text not null,
  bio text,
  profile_picture_url text,
  banner_url text,
  website_url text,
  role text default 'user',
  is_online boolean default false,
  is_verified boolean default false,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Posts Table
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  content text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Likes Table
create table public.likes (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

-- Comments Table
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Follows Table
create table public.follows (
  follower_id uuid references public.users on delete cascade not null,
  following_id uuid references public.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

-- Notifications Table
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  actor_id uuid references public.users on delete cascade not null,
  type text not null check (type in ('follow', 'like', 'comment', 'mention')),
  post_id uuid references public.posts on delete cascade,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages Table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.users on delete cascade not null,
  receiver_id uuid references public.users on delete cascade not null,
  content text not null,
  image_url text,
  seen boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Verification Requests
create table public.verification_requests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reports Table
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.users on delete cascade not null,
  target_id uuid not null,
  type text not null check (type in ('post', 'user')),
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bookmarks Table
create table public.bookmarks (
  user_id uuid references public.users on delete cascade not null,
  post_id uuid references public.posts on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

-- Marketplace Table
create table public.marketplace (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  title text not null,
  description text not null,
  price numeric not null,
  category text default 'General',
  status text default 'available',
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)

-- Users: Read all, update self
alter table public.users enable row level security;
create policy "Users are viewable by everyone." on public.users for select using (true);
create policy "Users can update their own profile." on public.users for update using (auth.uid() = id);

-- IMPORTANT Admin Setup:
-- To set the pre-created admin account, have the user sign up with Username: Edredm3 and Password: Longtamad1.
-- Then, run this query in the SQL editor:
-- UPDATE public.users SET is_admin = true, is_verified = true, role = 'admin' WHERE username = 'Edredm3';

-- Posts: Read all, insert self, update self, delete self
alter table public.posts enable row level security;
create policy "Posts are viewable by everyone." on public.posts for select using (true);
create policy "Authenticated users can insert posts." on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts." on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts." on public.posts for delete using (auth.uid() = user_id);

-- Messages: Read if sender/receiver, insert if sender
alter table public.messages enable row level security;
create policy "Users can read own messages" on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can insert messages" on public.messages for insert with check (auth.uid() = sender_id);
create policy "Users can update messages" on public.messages for update using (auth.uid() = receiver_id);

-- Bookmarks: Read self, insert self, delete self
alter table public.bookmarks enable row level security;
create policy "Users can read own bookmarks" on public.bookmarks for select using (auth.uid() = user_id);
create policy "Users can insert own bookmarks" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "Users can delete own bookmarks" on public.bookmarks for delete using (auth.uid() = user_id);

-- Verification Requests: Insert self, Read self or admin
alter table public.verification_requests enable row level security;
create policy "Users can view own requests" on public.verification_requests for select using (auth.uid() = user_id);
create policy "Users can request verification" on public.verification_requests for insert with check (auth.uid() = user_id);

-- Likes: Read all, insert self, delete self
alter table public.likes enable row level security;
create policy "Likes are viewable by everyone." on public.likes for select using (true);
create policy "Authenticated users can insert likes." on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can delete own likes." on public.likes for delete using (auth.uid() = user_id);

-- Comments: Read all, insert self, delete self
alter table public.comments enable row level security;
create policy "Comments are viewable by everyone." on public.comments for select using (true);
create policy "Authenticated users can insert comments." on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments." on public.comments for delete using (auth.uid() = user_id);

-- Follows: Read all, insert self (as follower), delete self (as follower)
alter table public.follows enable row level security;
create policy "Follows viewable by everyone" on public.follows for select using (true);
create policy "Users can follow others" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

-- Notifications: Read self, update self (to mark read), insert triggered by functions/users.
alter table public.notifications enable row level security;
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can insert notifications" on public.notifications for insert with check (auth.uid() = actor_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- Marketplace: Read all, insert self, update self, delete self
alter table public.marketplace enable row level security;
create policy "Marketplace items are viewable by everyone." on public.marketplace for select using (true);
create policy "Authenticated can insert marketplace items." on public.marketplace for insert with check (auth.uid() = user_id);
create policy "Users can update own marketplace items." on public.marketplace for update using (auth.uid() = user_id);
create policy "Users can delete own marketplace items." on public.marketplace for delete using (auth.uid() = user_id);

-- Storage (Avatars and Post Images)
-- To use these, you need to manually create buckets called 'avatars' and 'post_images' in the Supabase UI.
-- Then apply RLS on storage via UI or SQL.
-- Example SQL to create buckets and policies (Requires SUPERUSER, which you have in SQL Editor):

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
insert into storage.buckets (id, name, public) values ('post_images', 'post_images', true);

create policy "Avatar images are publicly accessible." on storage.objects for select using (bucket_id = 'avatars');
create policy "Anyone can upload an avatar." on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "Anyone can update their avatar." on storage.objects for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Post images are publicly accessible." on storage.objects for select using (bucket_id = 'post_images');
create policy "Anyone can upload a post image." on storage.objects for insert with check (bucket_id = 'post_images' and auth.role() = 'authenticated');

-- Function to handle new user signups and add them to the public.users table automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, username, display_name)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable Realtime for relevant tables
alter publication supabase_realtime add table public.posts, public.comments, public.likes, public.notifications, public.messages;
