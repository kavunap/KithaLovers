import { Component, useEffect, useRef, useState, type ErrorInfo, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Heart, Menu, MessageCircle, ShieldCheck, Sparkles, Users, X, Send, Flag, Ban, LoaderCircle, ImagePlus, Trash2, Bell, CheckCheck, RefreshCw, Inbox, BadgeCheck, FileCheck2, ExternalLink, Bookmark, Eye, EyeOff, BarChart3, Paperclip, Download, Mic, Square, CircleX, Pin, Archive, ArchiveRestore, VolumeX, Volume2, Search, Forward, ChevronDown, Settings2, LockKeyhole, UserRound, Compass, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';

type HeaderAlert = { id:string; type:string; title:string; entity_id:string|null; created_at:string; read_at:string|null };
type PresenceResult = { online: boolean; last_seen: string | null };
function PresenceIndicator({ memberId }: { memberId: string }) {
  const [presence, setPresence] = useState<PresenceResult | null>(null);
  useEffect(() => {
    if (!supabase || !memberId) return;
    let active = true;
    const refresh = async () => {
      const { data, error } = await supabase!.rpc('get_member_presence', { target_member_id: memberId });
      if (active) setPresence(error ? null : (data as PresenceResult));
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [memberId]);
  if (!presence) return null;
  if (presence.online) return <span className="stage26-presence"><span className="stage26-dot"/> Online</span>;
  if (!presence.last_seen) return <span className="stage26-presence muted">Activity hidden</span>;
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(presence.last_seen).getTime()) / 60000));
  const label = minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
  return <span className="stage26-presence muted">Last active {label}</span>;
}
function PresenceHeartbeat() {
  useEffect(() => {
    if (!supabase) return;
    let running = true;
    let uid = '';
    let busy = false;
    const ping = async () => {
      if (!running || !uid || document.visibilityState !== 'visible' || busy) return;
      busy = true;
      await supabase!.rpc('touch_my_presence');
      busy = false;
    };
    void supabase.auth.getUser().then(({ data }) => { if (running) { uid = data.user?.id || ''; void ping(); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { uid = session?.user.id || ''; if (uid) void ping(); });
    const timer = window.setInterval(() => { void ping(); }, 45000);
    const onVisible = () => { void ping(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { running = false; subscription.unsubscribe(); window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  return null;
}
function PresencePrivacyPage() {
  const navigate = useNavigate();
  const [showOnline, setShowOnline] = useState(false);
  const [showLastSeen, setShowLastSeen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [userId, setUserId] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!supabase) { setNotice('Supabase is not configured.'); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);
      const { data, error } = await supabase.from('member_presence').select('show_online,show_last_seen').eq('user_id', user.id).maybeSingle();
      if (!active) return;
      if (error) setNotice(`Could not load privacy settings: ${error.message}. Apply Stage 26 SQL.`);
      else { setShowOnline(Boolean(data?.show_online)); setShowLastSeen(Boolean(data?.show_last_seen)); }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [navigate]);
  const save = async (key: 'show_online' | 'show_last_seen', value: boolean) => {
    if (!supabase || !userId) return;
    setBusy(true); setNotice('');
    const { error } = await supabase.from('member_presence').update({ [key]: value }).eq('user_id', userId);
    setBusy(false);
    if (error) { setNotice(`Could not save privacy setting: ${error.message}`); return; }
    if (key === 'show_online') setShowOnline(value);
    else setShowLastSeen(value);
    setNotice('Presence privacy preference saved.');
  };
  return <div className="app-page"><Header/><main className="wrap stage25-page"><div className="app-title"><div><div className="eyebrow"><Eye size={15}/> Privacy</div><h1>Online status & last seen</h1><p>Choose what other members can learn about your activity.</p></div><Link to="/settings" className="text-link">Settings →</Link></div>
    <section className="connection-section settings-panel"><h2>Presence visibility</h2><p className="settings-help">Both options are off by default. Your status is never shared with members you have blocked or who have blocked you.</p>
      {loading ? <p>Loading preferences…</p> : <><label className="stage26-setting"><span><strong>Show when I'm online</strong><small>Members may see a green online indicator while this app is active.</small></span><input type="checkbox" checked={showOnline} disabled={busy} onChange={e => void save('show_online', e.target.checked)}/></label><label className="stage26-setting"><span><strong>Show my last seen</strong><small>Members may see how recently you were active, even when you're offline.</small></span><input type="checkbox" checked={showLastSeen} disabled={busy} onChange={e => void save('show_last_seen', e.target.checked)}/></label></>}
    </section>{notice && <div className="notice" role="status">{notice}</div>}
  </main></div>;
}

const people = [
  { name: 'Aline', age: 25, city: 'Kigali', tag: 'Art & coffee', photo: 'photo-1531123897727-8f129e1688ce', note: 'Always looking for a new café and a good conversation.' },
  { name: 'David', age: 28, city: 'Kigali', tag: 'Hiking & music', photo: 'photo-1500648767791-00dcc994a43e', note: 'Weekend trails, live music, and spontaneous road trips.' },
  { name: 'Maya', age: 24, city: 'Huye', tag: 'Books & travel', photo: 'photo-1524504388940-b1c1722653e1', note: 'Collecting stories, passport stamps, and book recommendations.' },
];
function Brand() { return <Link to="/" className="brand"><span className="brand-mark"><Heart size={19} fill="currentColor" /></span><span>Kitha<span className="brand-light">Lovers</span></span></Link>; }
function Header() {
  const [open, setOpen] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<HeaderAlert[]>([]);
  const [alertsError, setAlertsError] = useState('');
  const [alertsBusy, setAlertsBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) { setSessionEmail(data.session?.user.email ?? null); setIsAdmin(data.session?.user.app_metadata?.role === 'admin'); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) { setSessionEmail(session?.user.email ?? null); setIsAdmin(session?.user.app_metadata?.role === 'admin'); }
      if (!session) { setRequestCount(0); setUnreadCount(0); setNotificationCount(0); }
    });
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | undefined;
    async function refreshBadges() {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!alive || !user) { setRequestCount(0); setUnreadCount(0); return; }
      const [requests, matches, notifications] = await Promise.all([
        supabase!.from('connection_requests').select('id', { count: 'exact', head: true }).eq('recipient_id', user.id).eq('status', 'pending'),
        supabase!.from('matches').select('id').or(`user_one.eq.${user.id},user_two.eq.${user.id}`),
        supabase!.from('user_notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null)
      ]);
      if (!alive) return;
      setRequestCount(requests.count ?? 0);
      setNotificationCount(notifications.error ? 0 : (notifications.count ?? 0));
      if (matches.error || !matches.data?.length) { setUnreadCount(0); return; }
      const { count, error } = await supabase!.from('messages').select('id', { count: 'exact', head: true }).in('match_id', matches.data.map(m => m.id)).neq('sender_id', user.id).is('read_at', null);
      if (alive) setUnreadCount(error ? 0 : (count ?? 0));
    }
    void refreshBadges();
    channel = supabase.channel(`header-notifications-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { void refreshBadges(); window.dispatchEvent(new Event('kitha:activity-changed')); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_requests' }, () => { void refreshBadges(); window.dispatchEvent(new Event('kitha:activity-changed')); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications' }, () => { void refreshBadges(); window.dispatchEvent(new Event('kitha:activity-changed')); })
      .subscribe();
    return () => { alive = false; subscription.unsubscribe(); if (channel) void supabase!.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!supabase || !sessionEmail) { setRecentAlerts([]); return; }
    let active = true;
    const refresh = async () => {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user || !active) return;
      const { data, error } = await supabase!.from('user_notifications')
        .select('id,type,title,created_at,read_at,entity_id')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(8);
      if (!active) return;
      if (error) setAlertsError(error.message);
      else { setRecentAlerts((data ?? []) as HeaderAlert[]); setAlertsError(''); }
    };
    void refresh();
    const onChange = () => { void refresh(); };
    window.addEventListener('kitha:activity-changed', onChange);
    const timer = window.setInterval(onChange, 45000);
    return () => { active = false; window.removeEventListener('kitha:activity-changed', onChange); window.clearInterval(timer); };
  }, [sessionEmail]);

  async function markAlertRead(id: string) {
    if (!supabase) return;
    setAlertsBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('user_notifications').update({read_at:new Date().toISOString()})
        .eq('id',id).eq('user_id',user.id).is('read_at',null);
      if (error) setAlertsError(error.message);
      else {
        setRecentAlerts(rows=>rows.map(row=>row.id===id?{...row,read_at:new Date().toISOString()}:row));
        setNotificationCount(n=>Math.max(0,n-1));
        window.dispatchEvent(new Event('kitha:activity-changed'));
      }
    }
    setAlertsBusy(false);
  }
  async function markAllAlertsRead() {
    if (!supabase) return;
    setAlertsBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('user_notifications').update({read_at:new Date().toISOString()})
        .eq('user_id',user.id).is('read_at',null);
      if (error) setAlertsError(error.message);
      else {
        setRecentAlerts(rows=>rows.map(row=>({...row,read_at:row.read_at??new Date().toISOString()})));
        setNotificationCount(0);
        window.dispatchEvent(new Event('kitha:activity-changed'));
      }
    }
    setAlertsBusy(false);
  }
  function alertDestination(item: HeaderAlert) {
    const entityId = typeof item.entity_id === 'string' ? item.entity_id : '';
    if (item.type === 'connection_request') return '/connections';
    if ((item.type === 'match' || item.type === 'message') && entityId) return `/messages/${encodeURIComponent(entityId)}`;
    return '/notification-center';
  }
  async function logout() {
    if (!supabase) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) window.alert(`Could not sign out: ${error.message}`);
    else window.location.assign('/');
  }

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [open]);
  const closeNav = () => { setOpen(false); setAlertsOpen(false); };
  const badge = (count: number) => count > 0 ? <span className="notification-badge">{count > 99 ? '99+' : count}</span> : null;
  return <><header className="header wrap stage32-header">
    <Brand/>
    <button type="button" className="menu-toggle" aria-expanded={open} aria-label="Toggle navigation" onClick={() => setOpen(v=>!v)}>{open?<X/>:<Menu/>}</button>
    <nav className={open ? 'nav nav-open stage32-nav' : 'nav stage32-nav'} aria-label="Main navigation">
      {!sessionEmail ? <>
        <a href="/#how-it-works" onClick={closeNav}>How it works</a><a href="/#discover" onClick={closeNav}>Discover</a><a href="/#safety" onClick={closeNav}>Your safety</a>
        <Link to="/login" onClick={closeNav}>Log in</Link><Link to="/signup" onClick={closeNav} className="button button-small">Join KithaLovers</Link>
      </> : <>
        <Link className="stage32-nav-primary" to="/dashboard" onClick={closeNav}><BarChart3 size={16}/> Dashboard</Link>
        <Link className="stage32-nav-primary" to="/discover" onClick={closeNav}><Compass size={16}/> Discover</Link>
        <Link className="stage32-nav-primary" to="/connections" onClick={closeNav}><MessageCircle size={16}/> Chats {badge(unreadCount)}</Link>
        <div className="stage38-alert-wrap">
          <button type="button" className="stage38-alert-trigger" aria-expanded={alertsOpen} aria-label={`Notifications: ${notificationCount} unread`} onClick={()=>setAlertsOpen(v=>!v)}><Bell size={17}/> Alerts {badge(notificationCount)} <ChevronDown size={13}/></button>
          {alertsOpen && <section className="stage38-alert-panel" aria-label="Recent notifications">
            <div className="stage38-alert-heading"><strong>Notifications</strong><button type="button" disabled={alertsBusy || notificationCount===0} onClick={()=>void markAllAlertsRead()}><CheckCheck size={14}/> Mark all read</button></div>
            {alertsError && <p className="stage38-alert-error" role="alert">{alertsError}</p>}
            {recentAlerts.length===0 ? <p className="stage38-alert-empty">No recent notifications</p> : recentAlerts.map(item=><div className={`stage38-alert-item ${item.read_at?'':'is-unread'}`} key={item.id}>
              <Link to={alertDestination(item)} onClick={()=>{if(!item.read_at) void markAlertRead(item.id);setAlertsOpen(false);closeNav();}}><span>{item.type==='message'?'Message':item.type==='match'?'New match':item.type==='connection_request'?'Connection request':'Activity'}</span><strong>{item.title}</strong><small>{new Date(item.created_at).toLocaleString()}</small></Link>
              {!item.read_at && <button type="button" title="Mark as read" aria-label="Mark as read" disabled={alertsBusy} onClick={()=>void markAlertRead(item.id)}><CheckCheck size={16}/></button>}
            </div>)}
            <Link className="stage38-all-alerts" to="/notification-center" onClick={()=>{setAlertsOpen(false);closeNav();}}>View notification center →</Link>
          </section>}
        </div>
        <details className="stage32-menu"><summary><Heart size={16}/> Connections <ChevronDown size={14}/>{badge(requestCount)}</summary><div className="stage32-dropdown">
          <Link to="/connections" onClick={closeNav}>Requests & matches</Link><Link to="/favorites" onClick={closeNav}>Saved profiles</Link><Link to="/profile-activity" onClick={closeNav}>Profile activity</Link>
        </div></details>
        <details className="stage32-menu"><summary><UserRound size={16}/> My account <ChevronDown size={14}/></summary><div className="stage32-dropdown">
          <div className="stage32-menu-label">Profile</div><Link to="/profile-setup" onClick={closeNav}>Edit profile</Link><Link to="/verification" onClick={closeNav}>Profile verification</Link>
          <div className="stage32-menu-label">Account & privacy</div><Link to="/settings" onClick={closeNav}>Settings & privacy center</Link>
          <div className="stage32-menu-label">Support</div><Link to="/safety" onClick={closeNav}>Safety center</Link>
        </div></details>
        {isAdmin && <details className="stage32-menu"><summary><LockKeyhole size={16}/> Admin <ChevronDown size={14}/></summary><div className="stage32-dropdown">
          <Link to="/admin/dashboard" onClick={closeNav}>Overview & analytics</Link>
          <Link to="/admin/moderation" onClick={closeNav}>Moderation</Link><Link to="/admin/users" onClick={closeNav}>User management</Link><Link to="/admin/audit-logs" onClick={closeNav}>Audit logs</Link><Link to="/admin/deletion-requests" onClick={closeNav}>Deletion requests</Link><Link to="/admin/verifications" onClick={closeNav}>Verification reviews</Link>
        </div></details>}
        <details className="stage32-menu stage32-account"><summary><Settings2 size={16}/> Account <ChevronDown size={14}/></summary><div className="stage32-dropdown stage32-dropdown-right">
          <div className="stage32-signed-in" title={sessionEmail}>{sessionEmail}</div><Link to="/profile-setup" onClick={closeNav}>My profile</Link><Link to="/help" onClick={closeNav}>Help center</Link>
          <button type="button" onClick={()=>void logout()} disabled={signingOut}><LogOut size={15}/>{signingOut?'Signing out…':'Log out'}</button>
        </div></details>
      </>}
    </nav>
  </header>
    {open && <button type="button" className="stage43-backdrop" aria-label="Close navigation" onClick={closeNav}/>}
    {sessionEmail && <nav className="stage43-mobile-nav" aria-label="Mobile quick navigation">
      <Link to="/dashboard" onClick={closeNav}><BarChart3 size={19}/> Home</Link>
      <Link to="/discover" onClick={closeNav}><Compass size={19}/> Discover</Link>
      <Link to="/connections" onClick={closeNav}><MessageCircle size={19}/> Chats {badge(unreadCount)}</Link>
      <Link to="/notification-center" onClick={closeNav}><Bell size={19}/> Alerts {badge(notificationCount)}</Link>
      <Link to="/settings" onClick={closeNav}><Settings2 size={19}/> Settings</Link>
    </nav>}
  </>;

}
function Home() { return <><Header /><main><section className="hero wrap"><div className="hero-copy"><div className="eyebrow"><Sparkles size={15} /> A little closer to your people</div><h1>Good connections<br />change <span>everything.</span></h1><p className="hero-text">Meet people who get you. Find your next great friend, a shared adventure, or a connection that becomes something more.</p><div className="hero-actions"><Link to="/signup" className="button">Find your people <ArrowRight size={17} /></Link><a className="text-link" href="#how-it-works">See how it works <span>↗</span></a></div><div className="social-proof"><div className="avatar-stack"><img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop&crop=faces" alt=""/><img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces" alt=""/><img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&h=80&fit=crop&crop=faces" alt=""/></div><div><strong>Your next hello starts here</strong><small>A welcoming space to be yourself</small></div></div></div><div className="hero-visual"><div className="sun-shape"></div><div className="floating-note note-top"><span>✳</span> Real people, real stories</div><article className="profile-card profile-back"><img loading="eager" decoding="async" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=640&h=850&fit=crop&crop=faces" alt="A member profile" /></article><article className="profile-card profile-front"><img loading="eager" decoding="async" src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=700&h=900&fit=crop&crop=faces" alt="A smiling member profile"/><div className="photo-shade"></div><div className="profile-caption"><span className="online-dot">● Here to connect</span><h3>Aline, 25</h3><p><span>⌖</span> Kigali, Rwanda</p><div className="interest-row"><span>Art</span><span>Coffee</span><span>Weekend walks</span></div></div><div className="heart-stamp"><Heart fill="currentColor" size={22}/></div></article><div className="floating-note note-bottom"><span className="mini-heart"><Heart size={16} fill="currentColor"/></span> A shared interest is a great start.</div><div className="decor-dot dot-one"></div><div className="decor-dot dot-two"></div></div></section><section className="value-strip wrap"><div><span className="value-icon"><Users size={20}/></span><div><strong>Meet beyond your circle</strong><small>Find people and fresh perspectives.</small></div></div><div><span className="value-icon"><Heart size={20}/></span><div><strong>Connect over what matters</strong><small>Shared interests make good beginnings.</small></div></div><div><span className="value-icon"><ShieldCheck size={20}/></span><div><strong>Feel good about connecting</strong><small>Your comfort and privacy matter.</small></div></div></section><section className="section how-section" id="how-it-works"><div className="wrap"><div className="section-heading"><div className="eyebrow">Simple by design</div><h2>From hello to <span>something real.</span></h2><p>No pressure to be anyone but yourself. Great connections grow one conversation at a time.</p></div><div className="steps-grid"><article className="step-card"><span className="step-number">01</span><div className="step-icon blush"><Users/></div><h3>Show up as you</h3><p>Create a profile that tells your story, from your favorite things to what kind of connection you’re looking for.</p></article><article className="step-card"><span className="step-number">02</span><div className="step-icon lilac"><Sparkles/></div><h3>Find your people</h3><p>Discover profiles, explore shared interests, and let curiosity guide your next hello.</p></article><article className="step-card"><span className="step-number">03</span><div className="step-icon mint"><MessageCircle/></div><h3>Let it grow</h3><p>When interest is mutual, connect and start a conversation at your own pace.</p></article></div></div></section><section className="section discover-section" id="discover"><div className="wrap discover-layout"><div className="discover-copy"><div className="eyebrow">A world of possibility</div><h2>Your kind of people<br/>are out <span>there.</span></h2><p>Whether you’re new in town, expanding your circle, or open to romance, KithaLovers helps you start with the things you have in common.</p><Link to="/signup" className="button">Start discovering <ArrowRight size={17}/></Link><div className="discover-note"><Heart size={16}/> Friendship first, romance if it feels right.</div></div><div className="people-grid">{people.map((person, i) => <article className={`person-card person-${i}`} key={person.name}><img loading="lazy" decoding="async" src={`https://images.unsplash.com/${person.photo}?w=480&h=620&fit=crop&crop=faces`} alt={`${person.name} profile`} /><div className="person-overlay"><span>{person.tag}</span><h3>{person.name}, {person.age}</h3><small>⌖ {person.city}</small></div></article>)}</div></div></section><section className="safety-section" id="safety"><div className="wrap safety-inner"><div className="safety-symbol"><ShieldCheck size={30}/></div><div><div className="eyebrow">Connection with care</div><h2>Your comfort comes first.</h2><p>We’re building KithaLovers around respectful connections, clear boundaries, and tools to help people feel in control.</p></div><div className="safety-points"><span>♡ Mutual connection</span><span>♡ Privacy-minded design</span><span>♡ Block & report tools available</span></div></div></section><section className="final-cta wrap"><div className="cta-spark">✳</div><h2>Someone great is<br/>one hello away.</h2><p>Make room for a new connection.</p><Link to="/signup" className="button button-light">Join KithaLovers <ArrowRight size={17}/></Link></section></main><footer className="footer wrap"><Brand/><span>Made for meaningful connections.</span><div><Link to="/help">Help Center</Link><Link to="/safety">Safety Center</Link><Link to="/login">Log in</Link><Link to="/signup">Create account</Link></div><small>© {new Date().getFullYear()} KithaLovers</small></footer></>; }
function AuthPage({ mode }: { mode: 'login' | 'signup' }) { const navigate = useNavigate(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState(''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(''); const signup = mode === 'signup'; async function submit(e: FormEvent) { e.preventDefault(); setNotice(''); if (!supabase) { setNotice('Connect Supabase to enable account creation and sign-in. See the setup instructions in README.md.'); return; } setBusy(true); try { if (signup) { const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } }); if (error) throw error; setNotice('Account request created. Check your email for a verification link.'); } else { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; navigate('/profile-setup'); } } catch (error) { setNotice(error instanceof Error ? error.message : 'Something went wrong. Please try again.'); } finally { setBusy(false); } } async function google() { if (!supabase) { setNotice('Connect Supabase and enable Google in Authentication → Providers to use Google sign-in.'); return; } const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/profile-setup' } }); if (error) setNotice(error.message); }
return <div className="auth-page"><header className="header wrap"><Brand/><Link to="/" className="text-link">← Back to home</Link></header><main className="auth-layout wrap"><div className="auth-story"><div className="eyebrow">Your next chapter starts here</div><h1>Come as you are.<br/><span>Connect as you.</span></h1><p>Make space for new friends, new stories, and maybe a little more.</p><div className="auth-quote">“The best connections start when you feel free to be yourself.”</div></div><form className="auth-card" onSubmit={submit}><span className="auth-icon"><Heart fill="currentColor"/></span><h2>{signup ? 'Create your account' : 'Welcome back'}</h2><p>{signup ? 'Your people are out there. Let’s find them.' : 'Good to have you back.'}</p>{signup && <label>Your name<input required value={name} onChange={e => setName(e.target.value)} placeholder="How should we call you?" autoComplete="name"/></label>}<label>Email address<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label><label>Password<input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={signup ? 'new-password' : 'current-password'}/></label><button className="button auth-submit" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'} <ArrowRight size={17}/></button><div className="auth-divider"><span/>or continue with<span/></div><button type="button" className="google-button" onClick={google}><span className="google-g">G</span> Continue with Google</button>{notice && <div className="notice" role="status">{notice}</div>}<div className="auth-switch">{signup ? 'Already have an account?' : 'New to KithaLovers?'} <Link to={signup ? '/login' : '/signup'}>{signup ? 'Log in' : 'Join us'}</Link></div><small className="terms">By continuing, you agree to treat others with respect and follow our community guidelines.</small></form></main></div> }
type DiscoverProfile = {
  id: string;
  display_name: string;
  birth_date: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  intent: 'friendship' | 'dating' | 'both';
  photo_url: string | null;
  verified_at?: string | null;
  interests: string[];
  created_at?: string | null;
};

function ageFromBirthDate(value: string | null) {
  if (!value) return null;
  const born = new Date(`${value}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  if (today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())) age--;
  return age;
}

type CompatibilityBreakdown = { score: number; shared: string[]; intentAligned: boolean; sameCity: boolean; sameCountry: boolean; factors: string[] };
function compatibilityFor(person: DiscoverProfile, myInterests: string[], myIntent: string, myCity: string, myCountry: string): CompatibilityBreakdown {
  const own = new Set(myInterests.map(i => i.trim().toLowerCase()).filter(Boolean));
  const shared = [...new Set(person.interests.filter(i => own.has(i.trim().toLowerCase())))];
  const theirIntent = person.intent;
  const intentAligned = Boolean(myIntent) && (myIntent === 'both' || theirIntent === 'both' || myIntent === theirIntent);
  const sameCity = Boolean(myCity && person.city && myCity.trim().toLowerCase() === person.city.trim().toLowerCase());
  const sameCountry = Boolean(myCountry && person.country && myCountry.trim().toLowerCase() === person.country.trim().toLowerCase());
  // Explicit, deterministic profile-similarity heuristic; not a prediction of relationship outcomes.
  const interestPoints = own.size && person.interests.length ? Math.round(60 * shared.length / Math.max(own.size, person.interests.length)) : 0;
  const score = Math.min(100, interestPoints + (intentAligned ? 25 : 0) + (sameCity ? 15 : sameCountry ? 8 : 0));
  const factors = [shared.length ? `${shared.length} shared ${shared.length === 1 ? 'interest' : 'interests'}` : '', intentAligned ? 'Compatible connection goals' : '', sameCity ? 'Same city' : sameCountry ? 'Same country' : ''].filter(Boolean);
  return {score, shared, intentAligned, sameCity, sameCountry, factors};
}
function isRecentMember(createdAt: string | null | undefined) {
  if (!createdAt) return false;
  const date = Date.parse(createdAt);
  return Number.isFinite(date) && date <= Date.now() && Date.now() - date <= 14 * 24 * 60 * 60 * 1000;
}

type PublicGalleryPhoto = { id: string; photo_url: string; sort_order: number };

function PublicPhotoGallery({ photos, mainPhoto, name, compact = false }: { photos: PublicGalleryPhoto[]; mainPhoto: string | null; name: string; compact?: boolean }) {
  const all = [mainPhoto, ...photos.map(photo => photo.photo_url)].filter((url): url is string => Boolean(url));
  const unique = [...new Set(all)];
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setSelected(0); setExpanded(false); }, [name, mainPhoto]);
  if (!unique.length) return null;
  const current = Math.min(selected, unique.length - 1);
  return <div className={`stage35-gallery ${compact ? 'stage35-gallery-compact' : ''}`}>
    <div className="stage35-gallery-main"><button type="button" onClick={() => setExpanded(true)} aria-label={`Enlarge ${name}'s photo ${current + 1}`}><img loading="lazy" decoding="async" src={unique[current]} alt={`${name} photo ${current + 1}`}/></button>
      {unique.length > 1 && <><button type="button" className="stage35-gallery-prev" onClick={() => setSelected(i => (i + unique.length - 1) % unique.length)} aria-label="Previous photo">‹</button><button type="button" className="stage35-gallery-next" onClick={() => setSelected(i => (i + 1) % unique.length)} aria-label="Next photo">›</button><span className="stage35-photo-counter">{current + 1} / {unique.length}</span></>}
    </div>
    {unique.length > 1 && <div className="stage35-gallery-thumbs" aria-label="Profile photo thumbnails">{unique.map((url, i) => <button type="button" key={url} className={current === i ? 'active' : ''} onClick={() => setSelected(i)} aria-label={`View photo ${i + 1}`}><img loading="lazy" decoding="async" src={url} alt=""/></button>)}</div>}
    {expanded && <div className="stage35-gallery-lightbox" role="dialog" aria-modal="true" aria-label={`${name}'s photo gallery`} onClick={() => setExpanded(false)}><button type="button" className="stage35-lightbox-close" onClick={() => setExpanded(false)}>Close ×</button><button type="button" aria-label="Previous photo" onClick={e => {e.stopPropagation();setSelected(i => (i + unique.length - 1) % unique.length);}}>‹</button><img loading="lazy" decoding="async" src={unique[current]} alt={`${name} photo ${current + 1}`} onClick={e => e.stopPropagation()}/><button type="button" aria-label="Next photo" onClick={e => {e.stopPropagation();setSelected(i => (i + 1) % unique.length);}}>›</button><span>{current + 1} / {unique.length}</span></div>}
  </div>;
}


// Stage 37: Member dashboard. All data is scoped by the signed-in account and existing RLS.
type DashboardMatch = { id: string; otherId: string; name: string; photo: string | null; lastMessage: string | null; lastAt: string | null };
function MemberDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityRevision, setActivityRevision] = useState(0);
  const [profile, setProfile] = useState<DiscoverProfile | null>(null);
  const [stats, setStats] = useState({ matches: 0, unread: 0, visitors: 0, requests: 0 });
  const [recent, setRecent] = useState<DashboardMatch[]>([]);
  const [recommended, setRecommended] = useState<{ person: DiscoverProfile; score: number; shared: string[] }[]>([]);
  const [completion, setCompletion] = useState({ score: 0, missing: [] as string[] });
  useEffect(() => {
    const refresh = () => setActivityRevision(n=>n+1);
    window.addEventListener('kitha:activity-changed', refresh);
    const timer = window.setInterval(refresh, 45000);
    const onFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange',onFocus);
    return () => { window.removeEventListener('kitha:activity-changed',refresh); window.clearInterval(timer); document.removeEventListener('visibilitychange',onFocus); };
  }, []);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return; }
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!alive) return;
      if (authError || !user) { navigate('/login', { replace: true }); return; }
      const uid = user.id;
      const [self, requests, matches, activity, ownInterests, candidates, candidateInterests, blocks] = await Promise.all([
        supabase.from('profiles').select('id,display_name,birth_date,bio,city,country,intent,photo_url,verified_at,created_at').eq('id', uid).maybeSingle(),
        supabase.from('connection_requests').select('id', { count: 'exact', head: true }).eq('recipient_id', uid).eq('status','pending'),
        supabase.from('matches').select('id,user_one,user_two,created_at').or(`user_one.eq.${uid},user_two.eq.${uid}`).order('created_at', { ascending: false }),
        supabase.rpc('my_profile_activity'),
        supabase.from('profile_interests').select('interests(name)').eq('profile_id',uid),
        supabase.from('profiles').select('id,display_name,birth_date,bio,city,country,intent,photo_url,verified_at,created_at').eq('is_visible',true).eq('is_suspended',false).neq('id',uid).limit(70),
        supabase.from('profile_interests').select('profile_id,interests(name)'),
        supabase.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`)
      ]);
      if (!alive) return;
      if (self.error || matches.error) { setError(self.error?.message || matches.error?.message || 'Unable to load dashboard.'); setLoading(false); return; }
      const mine = self.data as DiscoverProfile | null;
      setProfile(mine);
      const checklist = [
        { label:'Add your display name', done: Boolean(mine?.display_name?.trim()) },
        { label:'Add your birth date', done: Boolean(mine?.birth_date) },
        { label:'Write your bio', done: Boolean(mine?.bio?.trim()) },
        { label:'Add a profile photo', done: Boolean(mine?.photo_url) },
        { label:'Add your city', done: Boolean(mine?.city?.trim()) },
        { label:'Add your country', done: Boolean(mine?.country?.trim()) },
        { label:'Choose your connection goal', done: Boolean(mine?.intent) },
        { label:'Add interests', done: Boolean(ownInterests.data?.length) }
      ];
      setCompletion({score:Math.round(checklist.filter(x=>x.done).length/checklist.length*100),missing:checklist.filter(x=>!x.done).map(x=>x.label)});
      const matchRows = matches.data ?? [];
      const ids = matchRows.map(m=>m.id);
      const peers = matchRows.map(m=>m.user_one === uid ? m.user_two : m.user_one);
      const [peerRes, messageRes, unreadRes] = await Promise.all([
        peers.length ? supabase.from('profiles').select('id,display_name,photo_url').in('id',peers) : Promise.resolve({data:[],error:null}),
        ids.length ? supabase.from('messages').select('match_id,body,created_at,sender_id').in('match_id',ids).order('created_at',{ascending:false}).limit(300) : Promise.resolve({data:[],error:null}),
        ids.length ? supabase.from('messages').select('id',{count:'exact',head:true}).in('match_id',ids).neq('sender_id',uid).is('read_at',null) : Promise.resolve({count:0,error:null})
      ]);
      if (!alive) return;
      const names = new Map((peerRes.data ?? []).map(x=>[x.id,x]));
      const latest = new Map<string,{body:string;created_at:string}>();
      for(const msg of messageRes.data ?? []) if(!latest.has(msg.match_id)) latest.set(msg.match_id,{body:msg.body ?? '',created_at:msg.created_at});
      const conversationRows = matchRows.map(m=>{
        const otherId=m.user_one===uid?m.user_two:m.user_one;
        const other=names.get(otherId);
        const last=latest.get(m.id);
        return {id:m.id,otherId,name:other?.display_name || 'Member',photo:other?.photo_url ?? null,lastMessage:last?.body ?? null,lastAt:last?.created_at ?? m.created_at};
      }).sort((a,b)=>Date.parse(b.lastAt ?? '')-Date.parse(a.lastAt ?? ''));
      setRecent(conversationRows.slice(0,4));
      setStats({matches:matchRows.length,unread:unreadRes.error?0:unreadRes.count??0,requests:requests.error?0:requests.count??0,visitors:activity.error?0:Number((activity.data as ActivitySummary)?.unique_visitors??0)});
      const excluded = new Set([uid,...peers,...(blocks.data??[]).map(b=>b.blocker_id===uid?b.blocked_id:b.blocker_id)]);
      const interestNames=(rows:unknown[]):string[]=>rows.flatMap(row=>{
        const r=row as {interests?:{name?:string}|{name?:string}[]|null};
        return Array.isArray(r.interests)?r.interests.map(i=>i.name??''):[r.interests?.name??''];
      }).filter(Boolean);
      const myInterests=interestNames((ownInterests.data??[]) as unknown[]);
      const interestsByProfile=new Map<string,string[]>();
      for(const r of candidateInterests.data??[]){
        const arr=interestsByProfile.get(r.profile_id)??[];
        arr.push(...interestNames([r]));interestsByProfile.set(r.profile_id,arr);
      }
      const suggestions=(candidates.data??[]).filter(p=>!excluded.has(p.id)).map(p=>{
        const person={...p,interests:interestsByProfile.get(p.id)??[]} as DiscoverProfile;
        const score=compatibilityFor(person,myInterests,mine?.intent??'',mine?.city??'',mine?.country??'');
        return {person,score:score.score,shared:score.shared};
      }).sort((a,b)=>b.score-a.score).slice(0,3);
      setRecommended(suggestions);
      setLoading(false);
    };
    void load();
    return ()=>{alive=false;};
  },[navigate,activityRevision]);
  return <div className="app-page"><Header/><main className="wrap stage37-dashboard kl-member-pro">
    <div className="stage37-welcome"><div><div className="eyebrow"><Sparkles size={16}/> Your space</div><h1>Welcome back{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}!</h1><p>Your connections, conversations and discoveries in one place.</p></div><Link to="/discover" className="button"><Compass size={17}/> Explore members</Link></div>
    {loading ? <div className="notice" role="status">Loading your dashboard…</div> : error ? <div className="notice" role="alert">{error}</div> : <>
      <section className="stage37-stats" aria-label="Your activity">
        <Link to="/connections" className="stage37-stat"><Heart size={22}/><strong>{stats.matches}</strong><span>Matches</span></Link>
        <Link to="/connections" className="stage37-stat"><MessageCircle size={22}/><strong>{stats.unread}</strong><span>Unread messages</span></Link>
        <Link to="/profile-activity" className="stage37-stat"><Eye size={22}/><strong>{stats.visitors}</strong><span>Unique visitors</span></Link>
        <Link to="/connections" className="stage37-stat"><Users size={22}/><strong>{stats.requests}</strong><span>Pending requests</span></Link>
      </section>
      <div className="stage37-columns"><section className="stage37-panel"><div className="stage37-panel-heading"><h2>Recent conversations</h2><Link to="/connections">All chats →</Link></div>
        {recent.length ? recent.map(m=><Link key={m.id} to={`/messages/${m.id}`} className="stage37-conversation"><div className="stage37-avatar">{m.photo?<img loading="lazy" decoding="async" src={m.photo} alt=""/>:<UserRound size={23}/>}</div><div><strong>{m.name}</strong><small>{m.lastMessage ? m.lastMessage.slice(0,85) : 'Say hello to start a conversation'}</small></div><ArrowRight size={16}/></Link>) : <p className="stage37-empty">No conversations yet. Discover someone new and start connecting.</p>}
      </section><section className="stage37-panel"><div className="stage37-panel-heading"><h2>Your profile</h2><Link to="/profile-setup">Edit profile →</Link></div>
        <div className="stage37-profile-summary"><div className="stage37-avatar large">{profile?.photo_url?<img loading="lazy" decoding="async" src={profile.photo_url} alt="Your profile"/>:<UserRound size={28}/>}</div><div><strong>{profile?.display_name || 'Your profile'}</strong><small>{profile?.city || 'Add your city'}{profile?.country?`, ${profile.country}`:''}</small></div></div>
        <div className="stage37-progress-label"><strong>Profile completion</strong><span>{completion.score}%</span></div><div className="stage37-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion.score} aria-label="Profile completion"><span style={{width:`${completion.score}%`}}/></div>
        {completion.missing.length ? <><p className="stage37-hint">Next: {completion.missing[0]}</p><Link to="/profile-setup" className="button button-small">Complete profile <ArrowRight size={15}/></Link></> : <p className="stage37-hint">Your profile is complete. Keep it up to date!</p>}
      </section></div>
      <section className="stage37-panel"><div className="stage37-panel-heading"><h2>Recommended for you</h2><Link to="/discover">See more →</Link></div>
        {recommended.length ? <div className="stage37-recommendations">{recommended.map(({person,score,shared})=><Link to={`/members/${person.id}`} className="stage37-recommendation" key={person.id}><div className="stage37-recommendation-photo">{person.photo_url?<img loading="lazy" decoding="async" src={person.photo_url} alt=""/>:<UserRound size={32}/>}</div><div className="stage37-recommendation-info"><strong>{person.display_name}</strong><small>{person.city || person.country || 'KithaLovers member'}</small><span className="stage37-score">{score}% profile compatibility</span>{shared.length>0&&<small>{shared.slice(0,3).join(' · ')}</small>}</div></Link>)}</div> : <p className="stage37-empty">New recommendations will appear as members join and complete their profiles.</p>}
        <p className="stage37-disclaimer">Compatibility reflects shared profile information, not a prediction of relationship success.</p>
      </section>
      <section className="stage37-quick" aria-label="Quick actions"><Link to="/discover"><Compass size={18}/> Discover</Link><Link to="/connections"><MessageCircle size={18}/> Messages</Link><Link to="/favorites"><Bookmark size={18}/> Favorites</Link><Link to="/profile-setup"><UserRound size={18}/> My profile</Link></section>
    </>}
  </main></div>;
}

function DiscoverPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [intentFilter, setIntentFilter] = useState<'all' | 'friendship' | 'dating'>('all');
  const [cityFilter, setCityFilter] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [myProfile, setMyProfile] = useState<{intent:string;city:string;country:string}>({intent:'',city:'',country:''});
  const [sortMode, setSortMode] = useState<'smart'|'shared'|'new'>('smart');
  const [newOnly, setNewOnly] = useState(false);
  const [userId, setUserId] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [publicGalleries, setPublicGalleries] = useState<Record<string, PublicGalleryPhoto[]>>({});

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { setNotice('Supabase is not configured. Add your environment variables and restart Vite.'); setLoading(false); return; }
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { navigate('/login'); return; }
      if (alive) setUserId(user.id);

      const [profileResult, requestResult, blockResult, interestsResult, favoritesResult, myProfileResult] = await Promise.all([
        supabase.from('profiles').select('id,display_name,birth_date,bio,city,country,intent,photo_url,verified_at,created_at').eq('is_visible', true).eq('is_suspended', false).neq('id', user.id).limit(100),
        supabase.from('connection_requests').select('sender_id,recipient_id,status').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`),
        supabase.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
        supabase.from('profile_interests').select('profile_id, interests(name)'),
        supabase.from('profile_favorites').select('profile_id').eq('user_id', user.id),
        supabase.from('profiles').select('intent,city,country').eq('id',user.id).maybeSingle()
      ]);
      if (!alive) return;
      const firstError = profileResult.error || requestResult.error || blockResult.error || interestsResult.error || favoritesResult.error || myProfileResult.error;
      if (firstError) {
        setNotice(`Could not load discovery data: ${firstError.message}. If this mentions profile_interests, apply the included Stage 2 SQL migration.`);
        setLoading(false);
        return;
      }
      const processed = new Set<string>();
      for (const req of requestResult.data ?? []) {
        processed.add(req.sender_id === user.id ? req.recipient_id : req.sender_id);
      }
      const blocked = new Set<string>();
      for (const row of blockResult.data ?? []) blocked.add(row.blocker_id === user.id ? row.blocked_id : row.blocker_id);
      const interestMap = new Map<string, string[]>();
      for (const row of (interestsResult.data ?? []) as unknown as { profile_id: string; interests: { name: string } | { name: string }[] | null }[]) {
        const entries = Array.isArray(row.interests) ? row.interests : row.interests ? [row.interests] : [];
        interestMap.set(row.profile_id, [...(interestMap.get(row.profile_id) ?? []), ...entries.map(item => item.name)]);
      }
      const visible = (profileResult.data ?? [])
        .filter(profile => !processed.has(profile.id) && !blocked.has(profile.id))
        .map(profile => ({ ...profile, interests: interestMap.get(profile.id) ?? [] })) as DiscoverProfile[];
      setFavoriteIds((favoritesResult.data ?? []).map(row => row.profile_id));
      setMyInterests(interestMap.get(user.id) ?? []);
      setMyProfile({intent:myProfileResult.data?.intent ?? '',city:myProfileResult.data?.city ?? '',country:myProfileResult.data?.country ?? ''});
      setProfiles(visible);
      // Query only profiles already eligible for discovery; RLS rechecks visibility and blocks.
      if (visible.length) {
        const { data: galleryRows, error: galleryError } = await supabase.from('profile_gallery_photos')
          .select('id,user_id,photo_url,sort_order').in('user_id', visible.map(p => p.id))
          .order('sort_order', { ascending: true });
        if (!alive) return;
        if (galleryError) setNotice(`Photo galleries are unavailable: ${galleryError.message}. Run Stage 35 SQL.`);
        else {
          const galleries: Record<string, PublicGalleryPhoto[]> = {};
          for (const photo of galleryRows ?? []) (galleries[photo.user_id] ??= []).push({id:photo.id,photo_url:photo.photo_url,sort_order:photo.sort_order});
          setPublicGalleries(galleries);
        }
      }
      setIndex(0);
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, [navigate]);

  const filtered = profiles.filter(profile => {
    const intentOkay = intentFilter === 'all' || profile.intent === 'both' || profile.intent === intentFilter;
    const cityOkay = !cityFilter.trim() || `${profile.city ?? ''} ${profile.country ?? ''}`.toLowerCase().includes(cityFilter.trim().toLowerCase());
    const age = ageFromBirthDate(profile.birth_date);
    const minOkay = !minAge || (age !== null && age >= Number(minAge));
    const maxOkay = !maxAge || (age !== null && age <= Number(maxAge));
    const interestOkay = !interestFilter.trim() || profile.interests.some(item => item.toLowerCase().includes(interestFilter.trim().toLowerCase()));
    const verifiedOkay = !verifiedOnly || Boolean(profile.verified_at);
    return intentOkay && cityOkay && minOkay && maxOkay && interestOkay && verifiedOkay && (!newOnly || isRecentMember(profile.created_at));
  }).sort((a, b) => {
    if (sortMode === 'new') return (Date.parse(b.created_at ?? '') || 0) - (Date.parse(a.created_at ?? '') || 0);
    if (sortMode === 'shared') {
      const count = (p: DiscoverProfile) => compatibilityFor(p,myInterests,myProfile.intent,myProfile.city,myProfile.country).shared.length;
      return count(b) - count(a);
    }
    const score = (p: DiscoverProfile) => compatibilityFor(p,myInterests,myProfile.intent,myProfile.city,myProfile.country).score;
    return score(b) - score(a);
  });
  const person = filtered[index];
  const compatibility = person ? compatibilityFor(person,myInterests,myProfile.intent,myProfile.city,myProfile.country) : null;
  const sharedInterests = compatibility?.shared ?? [];
  function clearDiscoveryFilters() {
    setIntentFilter('all'); setCityFilter(''); setInterestFilter(''); setMinAge(''); setMaxAge(''); setVerifiedOnly(false); setNewOnly(false); setSortMode('smart'); setIndex(0);
  }

  async function expressInterest() {
    if (!supabase || !person || !userId) return;
    setBusy(true); setNotice('');
    const { data: request, error } = await supabase.from('connection_requests').insert({ sender_id: userId, recipient_id: person.id, status: 'pending' }).select('id').single();
    setBusy(false);
    if (error) {
      setNotice(error.code === '23505' ? 'You have already sent a request to this person.' : `Could not send request: ${error.message}`);
      return;
    }
    setNotice(`Connection request sent to ${person.display_name}. If they accept, you'll become a match.`);
    if (request?.id) {
      const { error: emailError } = await supabase.functions.invoke('send-notification-email', { body: { event_type: 'connection_request', record_id: request.id } });
      if (emailError) console.warn('Connection-request email could not be queued:', emailError.message);
    }
    setProfiles(current => current.filter(profile => profile.id !== person.id));
    setIndex(0);
  }

  async function toggleFavorite(profileId: string) {
    if (!supabase || !userId || favoriteBusy) return;
    setFavoriteBusy(true); setNotice('');
    const isSaved = favoriteIds.includes(profileId);
    const result = isSaved
      ? await supabase.from('profile_favorites').delete().eq('user_id', userId).eq('profile_id', profileId)
      : await supabase.from('profile_favorites').insert({ user_id: userId, profile_id: profileId });
    setFavoriteBusy(false);
    if (result.error) { setNotice(`Could not ${isSaved ? 'remove' : 'save'} favorite: ${result.error.message}`); return; }
    setFavoriteIds(current => isSaved ? current.filter(id => id !== profileId) : [...current, profileId]);
    setNotice(isSaved ? 'Removed from favorites.' : 'Saved to My Favorites.');
  }

  function skipProfile() { if (filtered.length) setIndex(current => (current + 1) % filtered.length); }

  return <div className="app-page"><Header/><main className="discover-app wrap kl-member-pro">
    <div className="app-title"><div><div className="eyebrow">Your next connection</div><h1>Discover people</h1><p>Real profiles from the KithaLovers community.</p></div><div className="stage23-title-actions"><Link to="/favorites" className="text-link"><Bookmark size={16}/> My favorites</Link><Link to="/connections" className="text-link">Requests & matches →</Link></div></div>
    <section className="discovery-filter-panel" aria-label="Discovery filters">
      <div className="discovery-filter-heading"><div><strong>Find your kind of people</strong><small>{filtered.length} {filtered.length === 1 ? 'profile' : 'profiles'} match your filters · {sortMode === 'smart' ? 'smart recommendations' : sortMode === 'new' ? 'newest first' : 'most shared interests'}</small></div><button type="button" className="filter-reset" onClick={clearDiscoveryFilters}>Reset filters</button></div>
      <div className="discovery-filters">
        <label>Connection type<select value={intentFilter} onChange={e => { setIntentFilter(e.target.value as typeof intentFilter); setIndex(0); }}><option value="all">All connections</option><option value="friendship">Friendship</option><option value="dating">Dating</option></select></label>
        <label>City or country<input value={cityFilter} onChange={e => { setCityFilter(e.target.value); setIndex(0); }} placeholder="e.g. Kigali, Rwanda"/></label>
        <label>Interest<input value={interestFilter} onChange={e => { setInterestFilter(e.target.value); setIndex(0); }} placeholder="e.g. music, travel"/></label>
        <label>Minimum age<input type="number" inputMode="numeric" min="18" max="120" value={minAge} onChange={e => { setMinAge(e.target.value); setIndex(0); }} placeholder="18"/></label>
        <label>Maximum age<input type="number" inputMode="numeric" min="18" max="120" value={maxAge} onChange={e => { setMaxAge(e.target.value); setIndex(0); }} placeholder="Any"/></label>
      </div>
      <div className="stage36-controls"><label>Sort recommendations<select value={sortMode} onChange={e => {setSortMode(e.target.value as typeof sortMode);setIndex(0);}}><option value="smart">Best compatibility</option><option value="shared">Most shared interests</option><option value="new">Newest members</option></select></label><label className="stage36-new-filter"><input type="checkbox" checked={newOnly} onChange={e => {setNewOnly(e.target.checked);setIndex(0);}}/> Joined in the last 14 days</label></div>
      <label className="verified-filter"><input type="checkbox" checked={verifiedOnly} onChange={e => { setVerifiedOnly(e.target.checked); setIndex(0); }}/> <BadgeCheck size={16}/> Show verified profiles only</label>
      {minAge && maxAge && Number(minAge) > Number(maxAge) && <p className="filter-validation" role="alert">Minimum age must not be greater than maximum age.</p>}
    </section>
    {loading ? <div className="notice">Loading profiles…</div> : person ? <>
      <article className="discover-profile">
        {person.photo_url || publicGalleries[person.id]?.length ? <PublicPhotoGallery key={person.id} photos={publicGalleries[person.id] ?? []} mainPhoto={person.photo_url} name={person.display_name} compact /> : <div className="profile-placeholder"><Users size={54}/><span>KithaLovers member</span></div>}
        <div className="discover-gradient"/>
        <div className="discover-profile-info">
          <PresenceIndicator memberId={person.id}/>{isRecentMember(person.created_at) && <span className="stage36-new-badge">New member</span>}<span className="online-pill">{person.intent === 'friendship' ? 'Looking for friendship' : person.intent === 'dating' ? 'Open to dating' : 'Friendship & dating'}</span>
          <h2>{person.display_name}{ageFromBirthDate(person.birth_date) !== null ? `, ${ageFromBirthDate(person.birth_date)}` : ''}{person.verified_at && <span className="verified-badge" title="Profile verification approved by KithaLovers"><BadgeCheck size={17}/> Verified</span>}</h2>
          {(person.city || person.country) && <p>⌖ {[person.city, person.country].filter(Boolean).join(', ')}</p>}
          {person.bio && <p className="person-bio">{person.bio}</p>}
          {compatibility && <div className="stage36-compatibility"><div className="stage36-compatibility-top"><strong>{compatibility.score}% profile compatibility</strong><small>Based on shared interests, goals and location</small></div><div className="stage36-progress" role="progressbar" aria-valuenow={compatibility.score} aria-valuemin={0} aria-valuemax={100} aria-label="Profile compatibility"><span style={{width:`${compatibility.score}%`}}/></div><details><summary>Why this recommendation?</summary>{compatibility.factors.length ? <ul>{compatibility.factors.map(factor=><li key={factor}>{factor}</li>)}</ul> : <p>Not enough shared profile information to identify compatibility factors yet.</p>}<small>This is a profile similarity estimate, not a prediction of relationship success.</small></details></div>}
          {sharedInterests.length > 0 && <div className="shared-interest-note"><Sparkles size={14}/> {sharedInterests.length} shared {sharedInterests.length === 1 ? 'interest' : 'interests'}: {sharedInterests.slice(0, 3).join(', ')}</div>}
          {person.interests.length > 0 && <div className="interest-row">{person.interests.map(interest => <span key={interest}>{interest}</span>)}</div>}
        </div>
      </article>
      <div className="stage24-view-link"><Link className="button button-small button-outline" to={`/members/${person.id}`}><Eye size={16}/> View full profile</Link></div>
      <div className="discover-controls">
        <button className="round-control pass" onClick={skipProfile} aria-label="Skip profile"><X/></button>
        <button className={`round-control favorite ${favoriteIds.includes(person.id) ? 'is-favorite' : ''}`} disabled={favoriteBusy} onClick={() => void toggleFavorite(person.id)} aria-label={favoriteIds.includes(person.id) ? 'Remove from favorites' : 'Save to favorites'} title={favoriteIds.includes(person.id) ? 'Remove from favorites' : 'Save to favorites'}><Bookmark fill={favoriteIds.includes(person.id) ? 'currentColor' : 'none'}/></button><button className="round-control like" disabled={busy} onClick={() => void expressInterest()} aria-label="Express interest"><Heart fill="currentColor"/></button>
        <button className="round-control next" onClick={skipProfile} aria-label="Next profile"><ArrowRight/></button>
      </div>
      <p className="demo-note">Connection requests are saved to your account. People you've already requested or blocked are hidden from discovery.</p>
    </> : <div className="empty-state"><div className="step-icon lilac"><Users/></div><h2>No profiles to show right now</h2><p>Try another filter, or come back when more people join KithaLovers.</p><button className="button" onClick={clearDiscoveryFilters}>Clear filters</button></div>}
    {notice && <div className="notice" role="status">{notice}</div>}
  </main></div>;
}


function FavoritesPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [userId, setUserId] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setNotice('Supabase is not configured.'); setLoading(false); return; }
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) { navigate('/login'); return; }
      if (active) setUserId(user.id);
      const { data: favorites, error } = await supabase.from('profile_favorites').select('profile_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false });
      if (!active) return;
      if (error) { setNotice(`Could not load favorites: ${error.message}. Run the Stage 23 SQL migration.`); setLoading(false); return; }
      const ids = (favorites ?? []).map(row => row.profile_id);
      if (!ids.length) { setProfiles([]); setLoading(false); return; }
      const [profileRes, blocksRes, interestsRes] = await Promise.all([
        supabase.from('profiles').select('id,display_name,birth_date,bio,city,country,intent,photo_url,verified_at').in('id', ids).eq('is_visible', true).eq('is_suspended', false),
        supabase.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
        supabase.from('profile_interests').select('profile_id,interests(name)').in('profile_id', ids)
      ]);
      if (!active) return;
      const firstError = profileRes.error || blocksRes.error || interestsRes.error;
      if (firstError) { setNotice(`Could not load saved profiles: ${firstError.message}`); setLoading(false); return; }
      const blocked = new Set((blocksRes.data ?? []).map(row => row.blocker_id === user.id ? row.blocked_id : row.blocker_id));
      const interestMap = new Map<string, string[]>();
      for (const row of (interestsRes.data ?? []) as unknown as { profile_id: string; interests: { name: string } | { name: string }[] | null }[]) {
        const entries = Array.isArray(row.interests) ? row.interests : row.interests ? [row.interests] : [];
        interestMap.set(row.profile_id, [...(interestMap.get(row.profile_id) ?? []), ...entries.map(item => item.name)]);
      }
      const order = new Map(ids.map((id, i) => [id, i]));
      setProfiles((profileRes.data ?? []).filter(profile => !blocked.has(profile.id) && profile.id !== user.id).map(profile => ({ ...profile, interests: interestMap.get(profile.id) ?? [] }) as DiscoverProfile).sort((a,b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [navigate]);

  async function removeFavorite(profileId: string) {
    if (!supabase || !userId) return;
    setBusyId(profileId); setNotice('');
    const { error } = await supabase.from('profile_favorites').delete().eq('user_id', userId).eq('profile_id', profileId);
    setBusyId('');
    if (error) { setNotice(`Could not remove favorite: ${error.message}`); return; }
    setProfiles(current => current.filter(profile => profile.id !== profileId));
    setNotice('Profile removed from favorites.');
  }

  async function connect(profileId: string, name: string) {
    if (!supabase || !userId) return;
    setBusyId(profileId); setNotice('');
    const { data, error } = await supabase.from('connection_requests').insert({ sender_id: userId, recipient_id: profileId, status: 'pending' }).select('id').single();
    setBusyId('');
    if (error) { setNotice(error.code === '23505' ? 'You have already sent a connection request.' : `Could not send request: ${error.message}`); return; }
    setNotice(`Connection request sent to ${name}.`);
    if (data?.id) {
      const { error: emailError } = await supabase.functions.invoke('send-notification-email', { body: { event_type: 'connection_request', record_id: data.id } });
      if (emailError) console.warn('Connection-request email could not be queued:', emailError.message);
    }
  }

  return <div className="app-page"><Header/><main className="wrap favorites-page kl-member-pro">
    <div className="app-title"><div><div className="eyebrow"><Bookmark size={15}/> Saved connections</div><h1>My Favorites</h1><p>Profiles you've bookmarked for later. Only you can see your favorites.</p></div><Link to="/discover" className="text-link">Discover people →</Link></div>
    {loading ? <div className="notice">Loading saved profiles…</div> : profiles.length === 0 ? <div className="empty-state"><div className="step-icon lilac"><Bookmark/></div><h2>No saved profiles to show</h2><p>Save a profile while discovering people to find it here. Profiles that are hidden, suspended, or blocked won't appear.</p><Link to="/discover" className="button">Explore profiles <ArrowRight size={16}/></Link></div> : <div className="favorites-grid">{profiles.map(profile => <article className="favorite-card" key={profile.id}>
      <div className="favorite-photo">{profile.photo_url ? <img loading="lazy" decoding="async" src={profile.photo_url} alt={`${profile.display_name}'s profile`}/> : <div className="profile-placeholder"><Users size={35}/></div>}</div>
      <div className="favorite-body"><h2>{profile.display_name}{ageFromBirthDate(profile.birth_date) !== null ? `, ${ageFromBirthDate(profile.birth_date)}` : ''}</h2>{profile.verified_at && <span className="verified-badge"><BadgeCheck size={15}/> Verified</span>}
      <p>{[profile.city, profile.country].filter(Boolean).join(', ') || 'Location not provided'}</p>
      <p className="favorite-bio">{profile.bio || 'No bio added yet.'}</p><div className="interest-row">{profile.interests.slice(0,4).map(item => <span key={item}>{item}</span>)}</div>
      <div className="favorite-actions"><Link className="button button-small button-outline" to={`/members/${profile.id}`}><Eye size={15}/> View profile</Link><button className="button button-small" disabled={busyId === profile.id} onClick={() => void connect(profile.id, profile.display_name)}><Heart size={15}/> Connect</button><button className="button button-small button-outline" disabled={busyId === profile.id} onClick={() => void removeFavorite(profile.id)}><Bookmark size={15}/> Remove</button></div></div>
    </article>)}</div>}
    {notice && <div className="notice" role="status">{notice}</div>}
  </main></div>;
}

function ConnectionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusedRequestId = searchParams.get('requestId');
  const [userId, setUserId] = useState('');
  const [incoming, setIncoming] = useState<{ id: string; sender_id: string; status: string; display_name: string; city: string | null; country: string | null }[]>([]);
  const [matches, setMatches] = useState<{ id: string; other_id: string; display_name: string; city: string | null; country: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [conversationSearch, setConversationSearch] = useState('');
  const [inboxTab, setInboxTab] = useState<'inbox' | 'archived'>('inbox');
  const [conversationPrefs, setConversationPrefs] = useState<Record<string,{pinned:boolean;archived:boolean;muted:boolean}>>({});
  const [conversationStats, setConversationStats] = useState<Record<string,{unread:number;last_message_at:string|null}>>({});


  async function refresh(uid?: string) {
    if (!supabase) { setNotice('Supabase is not configured.'); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }
    const id = uid ?? user.id;
    setUserId(id);
    const [requestRes, matchRes] = await Promise.all([
      supabase.from('connection_requests').select('id,sender_id,status,profiles!connection_requests_sender_id_fkey(display_name,city,country)').eq('recipient_id', id).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('matches').select('id,user_one,user_two,created_at').or(`user_one.eq.${id},user_two.eq.${id}`).order('created_at', { ascending: false })
    ]);
    if (requestRes.error || matchRes.error) {
      setNotice(`Could not load requests and matches: ${(requestRes.error || matchRes.error)?.message}`);
      setLoading(false); return;
    }
    const { data: blockRows, error: blocksError } = await supabase.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${id},blocked_id.eq.${id}`);
    if (blocksError) { setNotice(`Could not check blocked users: ${blocksError.message}`); setLoading(false); return; }
    const excluded = new Set((blockRows ?? []).map(b => b.blocker_id === id ? b.blocked_id : b.blocker_id));
    const requests = (requestRes.data ?? []).filter(row => !excluded.has(row.sender_id)).map((row: any) => ({
      id: row.id, sender_id: row.sender_id, status: row.status,
      display_name: row.profiles?.display_name ?? 'KithaLovers member',
      city: row.profiles?.city ?? null, country: row.profiles?.country ?? null
    }));
    const matchRows = (matchRes.data ?? []).filter(row => !excluded.has(row.user_one === id ? row.user_two : row.user_one));
    const otherIds = matchRows.map((row: any) => row.user_one === id ? row.user_two : row.user_one);
    let otherProfiles: any[] = [];
    if (otherIds.length) {
      const { data, error } = await supabase.from('profiles').select('id,display_name,city,country').in('id', otherIds);
      if (error) setNotice(`Could not load matched profiles: ${error.message}`);
      otherProfiles = data ?? [];
    }
    const profileMap = new Map(otherProfiles.map(profile => [profile.id, profile]));
    setIncoming(requests);
    setMatches(matchRows.map((row: any) => {
      const otherId = row.user_one === id ? row.user_two : row.user_one;
      const profile = profileMap.get(otherId);
      return { id: row.id, other_id: otherId, display_name: profile?.display_name ?? 'KithaLovers member', city: profile?.city ?? null, country: profile?.country ?? null, created_at: row.created_at };
    }));
    const [prefsResult, statsResult] = await Promise.all([
      supabase.from('match_conversation_settings').select('match_id,pinned,archived,muted').eq('user_id',id),
      supabase.rpc('get_my_conversation_stats')
    ]);
    if (prefsResult.error) setNotice(`Could not load conversation settings: ${prefsResult.error.message}`);
    else setConversationPrefs(Object.fromEntries((prefsResult.data ?? []).map(row=>[row.match_id,{pinned:row.pinned,archived:row.archived,muted:row.muted}])));
    if (statsResult.error) setNotice(`Could not load unread counts: ${statsResult.error.message}`);
    else setConversationStats(Object.fromEntries((statsResult.data ?? []).map((row:any)=>[row.match_id,{unread:Number(row.unread_count ?? 0),last_message_at:row.last_message_at}])));
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (!supabase || !userId) return;
    const timer=window.setInterval(()=>{void refresh(userId);},15000);
    return ()=>window.clearInterval(timer);
  },[userId]);

  async function updateConversation(matchId:string, field:'pinned'|'archived'|'muted', value:boolean) {
    if (!supabase || !userId || busyId) return;
    setBusyId(matchId); setNotice('');
    const current = conversationPrefs[matchId];
    const next = {
      pinned: current?.pinned ?? false,
      archived: current?.archived ?? false,
      muted: current?.muted ?? false,
      [field]: value,
    };
    const {error}=await supabase.from('match_conversation_settings').upsert({match_id:matchId,user_id:userId,...next},{onConflict:'user_id,match_id'});
    setBusyId('');
    if(error){setNotice(`Could not save conversation preference: ${error.message}`);return;}
    setConversationPrefs(old=>({...old,[matchId]:next}));
  }
  const visibleMatches=matches.filter(m=>Boolean(conversationPrefs[m.id]?.archived)===(inboxTab==='archived') && m.display_name.toLowerCase().includes(conversationSearch.trim().toLowerCase())).sort((a,b)=>{
    const pin=Number(Boolean(conversationPrefs[b.id]?.pinned))-Number(Boolean(conversationPrefs[a.id]?.pinned));
    if(pin) return pin;
    return new Date(conversationStats[b.id]?.last_message_at || b.created_at).getTime()-new Date(conversationStats[a.id]?.last_message_at || a.created_at).getTime();
  });


  async function respond(requestId: string, accept: boolean) {
    if (!supabase) return;
    setBusyId(requestId); setNotice('');
    const { data: matchId, error } = await supabase.rpc('respond_to_connection_request', { p_request_id: requestId, p_accept: accept });
    setBusyId('');
    if (error) { setNotice(`Could not update request: ${error.message}. Apply supabase/stage2_discovery_matching.sql first.`); return; }
    setNotice(accept ? 'Connection accepted. You are now matched!' : 'Connection request declined.');
    if (accept && matchId) {
      const { error: emailError } = await supabase.functions.invoke('send-notification-email', { body: { event_type: 'match', record_id: matchId } });
      if (emailError) console.warn('Match email could not be queued:', emailError.message);
    }
    await refresh(userId);
  }

  return <div className="app-page"><Header/><main className="discover-app wrap kl-member-pro">
    <div className="app-title"><div><div className="eyebrow">Your connections</div><h1>Requests & matches</h1><p>Manage incoming requests and your mutual connections.</p></div><Link to="/discover" className="text-link">Discover people →</Link></div>
    {loading ? <div className="notice">Loading your connections…</div> : <>
      <section className="connection-section"><h2>Incoming requests <span className="count-pill">{incoming.length}</span></h2>
        {focusedRequestId && !incoming.some(request => request.id === focusedRequestId) && <div className="notice notification-focus-notice" role="status">That request is no longer pending or is unavailable. You can review your current matches below.</div>}
        {incoming.length ? incoming.map(request => <article className={`connection-row ${focusedRequestId === request.id ? 'connection-row-focused' : ''}`} key={request.id} id={`request-${request.id}`}><div className="connection-avatar"><Users/></div><div className="connection-person"><strong>{request.display_name}</strong>{focusedRequestId === request.id && <span className="notification-focus-label">Opened from notification</span>}<span>{[request.city, request.country].filter(Boolean).join(', ') || 'Location not provided'}</span></div><div className="connection-actions"><button className="button button-small" disabled={busyId === request.id} onClick={() => void respond(request.id, true)}>{busyId === request.id ? 'Saving…' : 'Accept'}</button><button className="button button-small button-outline" disabled={busyId === request.id} onClick={() => void respond(request.id, false)}>Decline</button></div></article>) : <p className="empty-copy">No incoming requests yet. When someone wants to connect, you'll see them here.</p>}
      </section>
      <section className="connection-section"><h2>Conversations <span className="count-pill">{matches.length}</span></h2>
        <div className="stage31-toolbar"><label className="stage31-search"><Search size={17}/><input type="search" placeholder="Search conversations by member name" aria-label="Search conversations" value={conversationSearch} onChange={e=>setConversationSearch(e.target.value)}/></label><div className="stage31-tabs"><button type="button" className={inboxTab==='inbox'?'active':''} onClick={()=>setInboxTab('inbox')}>Inbox ({matches.filter(m=>!conversationPrefs[m.id]?.archived).length})</button><button type="button" className={inboxTab==='archived'?'active':''} onClick={()=>setInboxTab('archived')}>Archived ({matches.filter(m=>conversationPrefs[m.id]?.archived).length})</button></div></div>
        {visibleMatches.length ? visibleMatches.map(match=>{
          const prefs=conversationPrefs[match.id] || {pinned:false,archived:false,muted:false};
          const stats=conversationStats[match.id];
          return <article className="connection-row stage31-conversation" key={match.id}>
            <div className="connection-avatar"><Heart fill="currentColor"/></div><div className="connection-person"><strong>{match.display_name} {prefs.pinned && <Pin size={14} aria-label="Pinned"/>} {prefs.muted && <VolumeX size={14} aria-label="Muted"/>}</strong><span>{[match.city,match.country].filter(Boolean).join(', ') || 'Location not provided'} · {stats?.last_message_at ? `Last message ${new Date(stats.last_message_at).toLocaleString()}` : `Matched ${new Date(match.created_at).toLocaleDateString()}`}</span></div>
            <div className="connection-actions stage31-actions">
              {Boolean(stats?.unread) && <span className="stage31-unread" aria-label={`${stats?.unread ?? 0} unread messages`}>{stats?.unread}</span>}
              <Link className="button button-small" to={`/messages/${match.id}`}><MessageCircle size={15}/> Message</Link>
              <button type="button" className="button button-small button-outline" disabled={busyId===match.id} onClick={()=>void updateConversation(match.id,'pinned',!prefs.pinned)}><Pin size={14}/>{prefs.pinned?'Unpin':'Pin'}</button>
              <button type="button" className="button button-small button-outline" disabled={busyId===match.id} onClick={()=>void updateConversation(match.id,'archived',!prefs.archived)}>{prefs.archived?<ArchiveRestore size={14}/>:<Archive size={14}/>} {prefs.archived?'Unarchive':'Archive'}</button>
              <button type="button" className="button button-small button-outline" disabled={busyId===match.id} onClick={()=>void updateConversation(match.id,'muted',!prefs.muted)}>{prefs.muted?<Volume2 size={14}/>:<VolumeX size={14}/>} {prefs.muted?'Unmute':'Mute'}</button>
            </div>
          </article>;
        }) : <p className="empty-copy">{conversationSearch?'No conversations match your search.':inboxTab==='archived'?'No archived conversations.':'No conversations here yet. Check your matches or archived conversations.'}</p>}
      </section>
    </>}
    {notice && <div className="notice" role="status">{notice}</div>}
  </main></div>;
}

function MessagesPage() {
  const navigate = useNavigate();
  const { matchId: currentMatchId = '' } = useParams<{ matchId: string }>();
  const [userId, setUserId] = useState('');
  const [otherId, setOtherId] = useState('');
  const [otherName, setOtherName] = useState('Your match');
  const [messages, setMessages] = useState<{id:string; sender_id:string; body:string; created_at:string; read_at?:string|null; deleted_at?:string|null;edited_at?:string|null;reply_to_id?:string|null;is_forwarded?:boolean}[]>([]);
  const [draft, setDraft] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);
  const [forwardMatches, setForwardMatches] = useState<{id:string;name:string}[]>([]);
  const [forwardTarget, setForwardTarget] = useState('');
  const [forwardBusy, setForwardBusy] = useState(false);
  const [forwardLoading, setForwardLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate messages');
  const [reportDetails, setReportDetails] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [searchMessages, setSearchMessages] = useState('');
  const [reactions, setReactions] = useState<{message_id:string; user_id:string; emoji:string}[]>([]);
  const [peerTyping, setPeerTyping] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [attachments, setAttachments] = useState<{id:string;message_id:string;storage_path:string;file_name:string;mime_type:string;file_size:number}[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string,string>>({});
  const [voiceNotes, setVoiceNotes] = useState<{id:string;message_id:string;storage_path:string;mime_type:string;duration_seconds:number}[]>([]);
  const [voiceUrls, setVoiceUrls] = useState<Record<string,string>>({});
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [sendingVoice, setSendingVoice] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef(0);
  const recordTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const recordingMatchRef = useRef(currentMatchId);
  const recordingDurationRef = useRef(0);


  function clearRecording() {
    if (recordTimerRef.current !== null) window.clearInterval(recordTimerRef.current);
    recordTimerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl('');
    setRecordedAudio(null);
    setRecording(false);
    setRecordSeconds(0);
  }
  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setNotice('Audio recording is not supported in this browser. Use Chrome or another compatible browser over HTTPS.');
      return;
    }
    if (blocked || sendingVoice || uploading || recording || !currentMatchId) return;
    clearRecording();
    setNotice('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      streamRef.current = stream;
      const formats = ['audio/webm;codecs=opus','audio/mp4','audio/webm'];
      const mime = formats.find(f => MediaRecorder.isTypeSupported(f));
      const recorder = new MediaRecorder(stream, mime ? {mimeType:mime} : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelledRef.current = false;
      recordingMatchRef.current = currentMatchId;
      recordStartRef.current = Date.now();
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { setNotice('Microphone recording failed.'); clearRecording(); };
      recorder.onstop = () => {
        const duration = Math.min(120, Math.max(1, Math.ceil((Date.now()-recordStartRef.current)/1000)));
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (recordTimerRef.current !== null) window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
        setRecording(false);
        if (cancelledRef.current || recordingMatchRef.current !== currentMatchId) return;
        const blob = new Blob(chunksRef.current,{type:recorder.mimeType || 'audio/webm'});
        if (!blob.size) { setNotice('No audio was recorded.'); return; }
        recordingDurationRef.current = duration;
        setRecordedAudio(blob);
        setRecordedUrl(URL.createObjectURL(blob));
      };
      recorder.start(250);
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now()-recordStartRef.current)/1000);
        setRecordSeconds(elapsed);
        if (elapsed >= 120 && recorder.state === 'recording') recorder.stop();
      },500);
    } catch (error) {
      streamRef.current?.getTracks().forEach(track=>track.stop());
      streamRef.current = null;
      setNotice(`Microphone unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  function stopRecording(cancel=false) {
    cancelledRef.current = cancel;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    if (cancel) clearRecording();
  }
  async function sendVoice() {
    if (!supabase || !recordedAudio || !userId || !currentMatchId || blocked || sendingVoice || uploading) return;
    if (recordedAudio.size > 10*1024*1024) { setNotice('Voice message exceeds the 10 MB limit.'); return; }
    setSendingVoice(true); setNotice('');
    let messageId = ''; let path = '';
    try {
      const {data: msg,error: msgError} = await supabase.from('messages')
        .insert({match_id:currentMatchId,sender_id:userId,body:'Voice message'})
        .select('id,sender_id,body,created_at,read_at,deleted_at,edited_at,reply_to_id,is_forwarded').single();
      if (msgError || !msg) throw new Error(msgError?.message || 'Unable to create voice message');
      messageId=msg.id;
      const mime = recordedAudio.type.split(';')[0];
      if (!['audio/webm','audio/mp4'].includes(mime)) throw new Error('Unsupported audio format on this browser');
      path = `${currentMatchId}/${userId}/${crypto.randomUUID()}.${mime==='audio/mp4'?'m4a':'webm'}`;
      const {error: storageError} = await supabase.storage.from('chat-voice').upload(path,recordedAudio,{contentType:mime,upsert:false});
      if (storageError) throw new Error(storageError.message);
      const {error: recordError} = await supabase.from('message_voice_notes').insert({
        message_id:messageId,match_id:currentMatchId,uploader_id:userId,storage_path:path,
        mime_type:mime,file_size:recordedAudio.size,duration_seconds:recordingDurationRef.current
      });
      if (recordError) throw new Error(recordError.message);
      setMessages(items=>[...items,msg]);
      clearRecording();
      await refreshExtras(currentMatchId,userId);
      const {error: emailError} = await supabase.functions.invoke('send-notification-email',{body:{event_type:'message',record_id:msg.id}});
      if (emailError) console.warn('Voice message notification failed:',emailError.message);
    } catch(error) {
      if (path) await supabase.storage.from('chat-voice').remove([path]);
      if (messageId) await supabase.rpc('delete_my_chat_message',{p_message_id:messageId});
      setNotice(`Voice message failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {setSendingVoice(false);}
  }
  useEffect(() => {
    return () => {
      cancelledRef.current=true;
      if (recorderRef.current?.state==='recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track=>track.stop());
      if (recordTimerRef.current!==null) window.clearInterval(recordTimerRef.current);
    };
  }, []);
  useEffect(() => {
    cancelledRef.current=true;
    if (recorderRef.current?.state==='recording') recorderRef.current.stop();
    clearRecording();
  // Changing conversations discards any unsent recording.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatchId]);

  async function refreshExtras(matchId: string, me: string) {
    if (!supabase || !matchId || !me) return;
    const [reactionResult, typingResult] = await Promise.all([
      supabase.from('message_reactions').select('message_id,user_id,emoji').eq('match_id', matchId),
      supabase.rpc('get_match_typing', { p_match_id: matchId })
    ]);
    if (!reactionResult.error) setReactions(reactionResult.data ?? []);
    if (!typingResult.error) setPeerTyping(Boolean(typingResult.data));
    const attachmentResult = await supabase.from('message_attachments').select('id,message_id,storage_path,file_name,mime_type,file_size').eq('match_id', matchId);
    if (!attachmentResult.error) {
      const rows = attachmentResult.data ?? [];
      setAttachments(rows);
      const paths = rows.filter(a => a.mime_type.startsWith('image/')).map(a => a.storage_path);
      if (paths.length) {
        const signed = await Promise.all(paths.map(async path => {
          const {data} = await supabase!.storage.from('chat-attachments').createSignedUrl(path, 120);
          return [path, data?.signedUrl ?? ''] as const;
        }));
        setAttachmentUrls(Object.fromEntries(signed));
      }
    }
    const voiceResult = await supabase.from('message_voice_notes')
      .select('id,message_id,storage_path,mime_type,duration_seconds').eq('match_id',matchId);
    if (!voiceResult.error) {
      const rows=voiceResult.data ?? [];
      setVoiceNotes(rows);
      const signed=await Promise.all(rows.map(async note=>{
        const {data}=await supabase!.storage.from('chat-voice').createSignedUrl(note.storage_path,120);
        return [note.storage_path,data?.signedUrl ?? ''] as const;
      }));
      setVoiceUrls(Object.fromEntries(signed));
    } else console.warn('Could not load voice notes:',voiceResult.error.message);
  }

  async function load(uid?: string) {
    if (!supabase) { setNotice('Supabase is not configured.'); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }
    const me = uid ?? user.id; setUserId(me);
    const { data: match, error: matchError } = await supabase.from('matches').select('id,user_one,user_two').eq('id', currentMatchId).maybeSingle();
    if (matchError || !match || (match.user_one !== me && match.user_two !== me)) {
      setNotice('This conversation is unavailable. You can only message someone you have matched with.'); setLoading(false); return;
    }
    const peer = match.user_one === me ? match.user_two : match.user_one; setOtherId(peer);
    const [profileRes, blockRes, messageRes] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', peer).maybeSingle(),
      supabase.from('blocks').select('blocker_id,blocked_id').or(`and(blocker_id.eq.${me},blocked_id.eq.${peer}),and(blocker_id.eq.${peer},blocked_id.eq.${me})`),
      supabase.from('messages').select('id,sender_id,body,created_at,read_at,deleted_at,edited_at,reply_to_id,is_forwarded').eq('match_id', currentMatchId).order('created_at', {ascending:true}).limit(300)
    ]);
    setOtherName(profileRes.data?.display_name || 'Your match');
    const isBlocked = Boolean(blockRes.data?.length); setBlocked(isBlocked);
    if (messageRes.error) setNotice(`Could not load messages: ${messageRes.error.message}`);
    else {
      setMessages(messageRes.data ?? []);
      void refreshExtras(currentMatchId, me);
      const unreadIds = (messageRes.data ?? []).filter((message: any) => message.sender_id !== me && !message.read_at).map((message: any) => message.id);
      if (unreadIds.length) {
        const { error: readError } = await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
        if (readError) setNotice(`Messages loaded, but read status could not be updated: ${readError.message}. Apply the Stage 6 SQL migration.`);
      }
    }
    setLoading(false);
  }
  useEffect(() => { void load(); }, [currentMatchId]);
  useEffect(() => {
    if (!supabase || !currentMatchId || !userId || blocked) return;
    let alive = true;
    const poll = async () => {
      const result = await supabase!.from('messages').select('id,sender_id,body,created_at,read_at,deleted_at,edited_at,reply_to_id,is_forwarded').eq('match_id', currentMatchId).order('created_at', {ascending:true}).limit(300);
      if (!alive || result.error) return;
      setMessages(result.data ?? []);
      const ids = (result.data ?? []).filter(m => m.sender_id !== userId && !m.read_at).map(m => m.id);
      if (ids.length) await supabase!.from('messages').update({read_at:new Date().toISOString()}).in('id',ids);
      void refreshExtras(currentMatchId, userId);
    };
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void poll(); }, 3500);
    return () => { alive = false; window.clearInterval(timer); };
  }, [currentMatchId, userId, blocked]);
  // Keep the typing lease alive while a non-empty draft is present.
  // The database lease lasts six seconds; refresh it every two seconds.
  useEffect(() => {
    if (!supabase || !userId || !currentMatchId || blocked) return;
    let active = true;
    const updateTyping = async (typing: boolean) => {
      const { error } = await supabase!.rpc('set_match_typing', {
        p_match_id: currentMatchId,
        p_typing: typing,
      });
      if (error && active) console.error('Typing indicator update failed:', error.message);
    };
    if (!draft.trim()) {
      void updateTyping(false);
      return () => { active = false; };
    }
    void updateTyping(true);
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible') void updateTyping(true);
    }, 2000);
    return () => {
      active = false;
      window.clearInterval(heartbeat);
    };
  }, [Boolean(draft.trim()), currentMatchId, userId, blocked]);

  async function toggleReaction(messageId: string, emoji: string) {
    if (!supabase || blocked) return;
    setBusyMessage(messageId);
    const existing = reactions.some(r => r.message_id === messageId && r.user_id === userId && r.emoji === emoji);
    const request = existing
      ? supabase.from('message_reactions').delete().eq('message_id',messageId).eq('user_id',userId).eq('emoji',emoji)
      : supabase.from('message_reactions').insert({match_id:currentMatchId,message_id:messageId,user_id:userId,emoji});
    const {error} = await request;
    setBusyMessage('');
    if (error) setNotice(`Reaction failed: ${error.message}`);
    else void refreshExtras(currentMatchId,userId);
  }
  async function deleteMyMessage(messageId: string) {
    if (!supabase || !window.confirm('Delete this message for everyone?')) return;
    setBusyMessage(messageId);
    const {error} = await supabase.rpc('delete_my_chat_message', {p_message_id:messageId});
    setBusyMessage('');
    if (error) setNotice(`Could not delete message: ${error.message}`);
    else {setMessages(items => items.map(m => m.id === messageId ? {...m,body:'Message deleted',deleted_at:new Date().toISOString()} : m)); void refreshExtras(currentMatchId,userId);}
  }

  async function saveMessageEdit() {
    if (!supabase || !editingId || !userId || blocked || savingEdit) return;
    const newBody=editingText.trim();
    if (!newBody || newBody.length>4000) {setNotice('Enter a message between 1 and 4000 characters.');return;}
    setSavingEdit(true); setNotice('');
    const {error}=await supabase.rpc('edit_my_chat_message',{p_message_id:editingId,p_new_body:newBody});
    setSavingEdit(false);
    if (error) {setNotice(`Could not edit message: ${error.message}`);return;}
    setMessages(items=>items.map(m=>m.id===editingId?{...m,body:newBody,edited_at:new Date().toISOString()}:m));
    setEditingId(null); setEditingText('');
  }
  function jumpToMessage(id:string) {
    const element=document.getElementById(`chat-message-${id}`);
    if (!element) {setNotice('The original message is outside the most recent 300 messages.');return;}
    element.scrollIntoView({behavior:'smooth',block:'center'});
    element.classList.add('stage30-highlight');
    window.setTimeout(()=>element.classList.remove('stage30-highlight'),1600);
  }
  async function openForward(messageId: string) {
    if (!supabase || blocked || !userId) return;
    setForwardMessageId(messageId); setForwardTarget(''); setForwardMatches([]); setForwardLoading(true); setNotice('');
    const {data,error}=await supabase.from('matches').select('id,user_one,user_two').or(`user_one.eq.${userId},user_two.eq.${userId}`);
    if (error) {setNotice(`Could not load matches: ${error.message}`);setForwardLoading(false);return;}
    const candidates=(data??[]).filter(m=>m.id!==currentMatchId);
    const peerIds=candidates.map(m=>m.user_one===userId?m.user_two:m.user_one);
    const [profiles,blocks]=await Promise.all([
      peerIds.length?supabase.from('profiles').select('id,display_name').in('id',peerIds):Promise.resolve({data:[],error:null}),
      supabase.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
    ]);
    const blockedPeers=new Set((blocks.data??[]).map(b=>b.blocker_id===userId?b.blocked_id:b.blocker_id));
    setForwardMatches(candidates.filter(m=>!blockedPeers.has(m.user_one===userId?m.user_two:m.user_one)).map(m=>({id:m.id,name:profiles.data?.find(p=>p.id===(m.user_one===userId?m.user_two:m.user_one))?.display_name||'Member'})));
    setForwardLoading(false);
  }
  async function forwardSelectedMessage() {
    if (!supabase || !forwardMessageId || !forwardTarget || forwardBusy || blocked || !userId) return;
    const original=messages.find(m=>m.id===forwardMessageId);
    if (!original || original.deleted_at || !forwardMatches.some(m=>m.id===forwardTarget)) {setNotice('This message cannot be forwarded.');return;}
    const attachment=attachments.find(a=>a.message_id===original.id);
    const voice=voiceNotes.find(v=>v.message_id===original.id);
    if ((original.body.startsWith('Attachment:') && !attachment) || (original.body === 'Voice message' && !voice)) {setNotice('Media is still loading or unavailable. Please wait and try again.');return;}
    setForwardBusy(true);setNotice('');
    let createdId='';let copiedPath='';let copiedBucket='';
    try {
      // Storage is copied into the destination match, never linked to the source.
      // The original conversation's private object path is not shared with recipients.
      let fileBlob:Blob|null=null;
      if (attachment || voice) {
        const media=attachment||voice!;
        copiedBucket=attachment?'chat-attachments':'chat-voice';
        const {data,error}=await supabase.storage.from(copiedBucket).download(media.storage_path);
        if (error || !data) throw new Error(error?.message||'Cannot read source media');
        fileBlob=data;
        if (fileBlob.size>10485760) throw new Error('Attachment exceeds the size limit');
      }
      const body=original.body.length>4000?original.body.slice(0,4000):original.body;
      const {data:created,error:createError}=await supabase.from('messages').insert({match_id:forwardTarget,sender_id:userId,body,is_forwarded:true}).select('id').single();
      if (createError || !created) throw new Error(createError?.message||'Could not forward message');
      createdId=created.id;
      if (fileBlob && (attachment||voice)) {
        const media=attachment||voice!;
        const ext=attachment?(attachment.file_name.split('.').pop()?.replace(/[^a-z0-9]/gi,'').slice(0,8)||'file'):(voice!.mime_type==='audio/mp4'?'m4a':'webm');
        copiedPath=`${forwardTarget}/${userId}/${crypto.randomUUID()}.${ext}`;
        const {error:uploadError}=await supabase.storage.from(copiedBucket).upload(copiedPath,fileBlob,{contentType:media.mime_type,upsert:false});
        if (uploadError) throw new Error(uploadError.message);
        if (attachment) {
          const {error:metaError}=await supabase.from('message_attachments').insert({
            message_id:createdId,match_id:forwardTarget,uploader_id:userId,
            storage_path:copiedPath,file_name:attachment.file_name,
            mime_type:attachment.mime_type,file_size:fileBlob.size
          });
          if (metaError) throw new Error(metaError.message);
        } else if (voice) {
          const {error:metaError}=await supabase.from('message_voice_notes').insert({
            message_id:createdId,match_id:forwardTarget,uploader_id:userId,
            storage_path:copiedPath,mime_type:voice.mime_type,
            file_size:fileBlob.size,duration_seconds:voice.duration_seconds
          });
          if (metaError) throw new Error(metaError.message);
        }
      }
      setForwardMessageId(null);setForwardTarget('');setNotice('Message forwarded to your selected match.');
      const {error:emailError}=await supabase.functions.invoke('send-notification-email',{body:{event_type:'message',record_id:createdId}});
      if (emailError) console.warn('Forward notification not sent:',emailError.message);
    } catch(error) {
      if (copiedPath && copiedBucket) await supabase.storage.from(copiedBucket).remove([copiedPath]);
      if (createdId) await supabase.rpc('delete_my_chat_message',{p_message_id:createdId});
      setNotice(`Forwarding failed: ${error instanceof Error?error.message:String(error)}`);
    } finally {setForwardBusy(false);}
  }
  async function sendMessage(e: FormEvent) {
    e.preventDefault(); const body = draft.trim();
    if (!supabase || !body || sending || blocked) return;
    setSending(true); setNotice('');
    const { data, error } = await supabase.from('messages').insert({match_id:currentMatchId, sender_id:userId, body, reply_to_id:replyToId}).select('id,sender_id,body,created_at,read_at,deleted_at,edited_at,reply_to_id,is_forwarded').single();
    setSending(false);
    if (error) { setNotice(`Message not sent: ${error.message}. Check that the Stage 3 SQL migration has been applied.`); return; }
    setMessages(current => [...current, data]); setDraft(''); setReplyToId(null); void supabase.rpc('set_match_typing',{p_match_id:currentMatchId,p_typing:false});
    const { error: emailError } = await supabase.functions.invoke('send-notification-email', { body: { event_type: 'message', record_id: data.id } });
    if (emailError) console.warn('Message email could not be queued:', emailError.message);
  }
  async function sendAttachment(file: File | undefined) {
    if (!supabase || !file || !userId || !currentMatchId || blocked || uploading) return;
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf','text/plain'];
    if (!allowed.includes(file.type)) { setNotice('Only JPG, PNG, WebP, PDF and TXT files are allowed.'); return; }
    if (file.size > 10 * 1024 * 1024 || file.size === 0) { setNotice('Choose a nonempty file no larger than 10 MB.'); return; }
    setUploading(true); setUploadPercent(5); setNotice('');
    let messageId = '';
    let path = '';
    try {
      const {data: msg, error: msgError} = await supabase.from('messages').insert({match_id:currentMatchId,sender_id:userId,body:`Attachment: ${file.name}`}).select('id,sender_id,body,created_at,read_at,deleted_at,edited_at,reply_to_id,is_forwarded').single();
      if (msgError || !msg) throw new Error(msgError?.message || 'Could not create message');
      messageId = msg.id;
      setUploadPercent(20);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'file';
      path = `${currentMatchId}/${userId}/${crypto.randomUUID()}.${ext}`;
      const {error: storageError} = await supabase.storage.from('chat-attachments').upload(path,file,{contentType:file.type,upsert:false});
      if (storageError) throw new Error(storageError.message);
      setUploadPercent(85);
      const {error: recordError} = await supabase.from('message_attachments').insert({message_id:messageId,match_id:currentMatchId,uploader_id:userId,storage_path:path,file_name:file.name,mime_type:file.type,file_size:file.size});
      if (recordError) throw new Error(recordError.message);
      setUploadPercent(100);
      setMessages(items => [...items,msg]);
      await refreshExtras(currentMatchId,userId);
    } catch (err) {
      if (path) await supabase.storage.from('chat-attachments').remove([path]);
      if (messageId) await supabase.rpc('delete_my_chat_message',{p_message_id:messageId});
      setNotice(`Attachment failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setUploading(false); setUploadPercent(0); }
  }
  async function downloadAttachment(path: string, filename: string) {
    if (!supabase) return;
    const {data,error} = await supabase.storage.from('chat-attachments').createSignedUrl(path,60,{download:filename});
    if (error || !data?.signedUrl) { setNotice(`Download failed: ${error?.message || 'Access denied'}`); return; }
    window.open(data.signedUrl,'_blank','noopener,noreferrer');
  }
  async function blockMember() {
    if (!supabase || !userId || !otherId || !window.confirm(`Block ${otherName}? You will no longer be able to message each other.`)) return;
    const { error } = await supabase.from('blocks').insert({blocker_id:userId, blocked_id:otherId});
    if (error && error.code !== '23505') { setNotice(`Could not block member: ${error.message}`); return; }
    setBlocked(true); setNotice(`${otherName} has been blocked. Messaging is disabled.`);
  }
  async function submitReport(e: FormEvent) {
    e.preventDefault(); if (!supabase || !userId || !otherId) return;
    const { error } = await supabase.from('reports').insert({reporter_id:userId, reported_id:otherId, reason:reportReason, details:reportDetails.trim()});
    if (error) { setNotice(`Could not submit report: ${error.message}`); return; }
    setReportOpen(false); setReportDetails(''); setNotice('Thank you. Your report has been submitted for review.');
  }

  return <div className="app-page"><Header/><main className="wrap chat-page kl-member-pro">
    <div className="app-title"><div><div className="eyebrow">A connection worth growing</div><h1>Chat with {otherName}</h1><p>Keep it kind, respectful, and at your own pace.</p></div><Link to="/connections" className="text-link">← Back to matches</Link></div>
    <section className="chat-panel">
      <div className="chat-topbar"><div className="connection-avatar"><Heart fill="currentColor"/></div><div className="connection-person"><strong>{otherName}</strong>{!blocked && <PresenceIndicator memberId={otherId}/>}<span>{blocked ? 'Messaging blocked' : 'Matched on KithaLovers'}</span></div><div className="chat-safety-actions"><button className="button button-small button-outline" onClick={() => setReportOpen(v => !v)}><Flag size={15}/> Report</button><button className="button button-small button-outline danger-outline" onClick={() => void blockMember()} disabled={blocked}><Ban size={15}/> {blocked ? 'Blocked' : 'Block'}</button></div></div>
      {reportOpen && <form className="report-form" onSubmit={submitReport}><h3>Report this member</h3><label>Reason<select value={reportReason} onChange={e => setReportReason(e.target.value)}><option>Inappropriate messages</option><option>Harassment or bullying</option><option>Fake profile or impersonation</option><option>Spam or scam</option><option>Threats or safety concern</option><option>Other</option></select></label><label>Details (optional)<textarea rows={3} maxLength={2000} value={reportDetails} onChange={e => setReportDetails(e.target.value)} placeholder="Share context that may help us review this report."/></label><div className="connection-actions"><button className="button button-small" type="submit">Submit report</button><button className="button button-small button-outline" type="button" onClick={() => setReportOpen(false)}>Cancel</button></div></form>}
      <div className="stage27-toolbar"><label>Search messages <input value={searchMessages} onChange={e => setSearchMessages(e.target.value)} placeholder="Search this conversation…"/></label><span>{messages.length} messages</span></div>
      <div className="message-list" aria-live="polite">{loading ? <p className="empty-copy">Loading conversation…</p> : messages.length ? messages.filter(message => message.body.toLowerCase().includes(searchMessages.trim().toLowerCase())).map(message => {
        const quoted = message.reply_to_id ? messages.find(m=>m.id===message.reply_to_id) : null;
        const hasMedia=attachments.some(a=>a.message_id===message.id)||voiceNotes.some(v=>v.message_id===message.id);
        return <div id={`chat-message-${message.id}`} className={`message-bubble ${message.sender_id === userId ? 'message-own' : 'message-theirs'}`} key={message.id}>
          {message.reply_to_id && <button type="button" className="stage30-quote" onClick={()=>jumpToMessage(message.reply_to_id!)}><strong>{quoted ? (quoted.sender_id===userId?'You':otherName) : 'Original message'}</strong><span>{quoted ? (quoted.deleted_at?'Message deleted':quoted.body.slice(0,110)) : 'Message not loaded'}</span></button>}
          {editingId===message.id ? <div className="stage30-edit"><textarea maxLength={4000} value={editingText} onChange={e=>setEditingText(e.target.value)} aria-label="Edit message"/><div><button type="button" disabled={savingEdit||!editingText.trim()} onClick={()=>void saveMessageEdit()}>Save</button><button type="button" disabled={savingEdit} onClick={()=>setEditingId(null)}>Cancel</button></div></div> : <p>{message.body}</p>}
          {!message.deleted_at && voiceNotes.filter(v=>v.message_id===message.id).map(v=><div key={v.id} className="stage29-voice-note">{voiceUrls[v.storage_path] ? <audio controls preload="none" src={voiceUrls[v.storage_path]} aria-label={`Voice message (${v.duration_seconds} seconds)`}/> : <span>Audio unavailable</span>}<small>{Math.floor(v.duration_seconds/60)}:{String(v.duration_seconds%60).padStart(2,'0')}</small></div>)}
          {!message.deleted_at && attachments.filter(a=>a.message_id===message.id).map(a=><div key={a.id} className="stage28-attachment">{a.mime_type.startsWith('image/') && attachmentUrls[a.storage_path] && <img loading="lazy" decoding="async" src={attachmentUrls[a.storage_path]} alt={a.file_name}/>}<button type="button" className="button button-small button-outline" onClick={()=>void downloadAttachment(a.storage_path,a.file_name)}><Download size={14}/> {a.file_name} ({Math.ceil(a.file_size/1024)} KB)</button></div>)}
          {message.is_forwarded && !message.deleted_at && <span className="stage32-forwarded"><Forward size={12}/> Forwarded</span>}
          <time>{new Date(message.created_at).toLocaleString([], {dateStyle:'short',timeStyle:'short'})}{message.edited_at && !message.deleted_at ? ' · Edited' : ''} {message.sender_id===userId && (message.read_at?' · Read':' · Sent')}</time>
          {!message.deleted_at && !blocked && <div className="stage27-message-actions">
            <button type="button" onClick={()=>{setReplyToId(message.id);setEditingId(null);}}>Reply</button><button type="button" onClick={()=>void openForward(message.id)}><Forward size={13}/> Forward</button>
            {['❤️','👍','😂'].map(emoji=><button key={emoji} type="button" disabled={busyMessage===message.id} title={`React ${emoji}`} onClick={()=>void toggleReaction(message.id,emoji)}>{emoji} {reactions.filter(r=>r.message_id===message.id && r.emoji===emoji).length||''}</button>)}
            {message.sender_id===userId && <>{!hasMedia && <button type="button" onClick={()=>{setEditingId(message.id);setEditingText(message.body);setReplyToId(null);}}>Edit</button>}<button type="button" disabled={busyMessage===message.id} onClick={()=>void deleteMyMessage(message.id)}>Delete</button></>}
          </div>}
        </div>;
      }) : <div className="empty-state chat-empty"><MessageCircle size={30}/><h2>Start with a hello</h2><p>You’re matched! Send a friendly message and see where the conversation goes.</p></div>}</div>
      {forwardMessageId && !blocked && <div className="stage32-forward-panel" role="dialog" aria-label="Forward message to a match">
        <div className="stage32-forward-title"><div><strong><Forward size={16}/> Forward message</strong><p>Choose a different match. Files and voice notes are copied privately.</p></div><button type="button" onClick={()=>setForwardMessageId(null)} disabled={forwardBusy} aria-label="Close forwarding"><X size={18}/></button></div>
        {forwardLoading?<p>Loading matches…</p>:forwardMatches.length?<><label htmlFor="forward-target">Send to</label><select id="forward-target" value={forwardTarget} disabled={forwardBusy} onChange={e=>setForwardTarget(e.target.value)}><option value="">Select a match</option>{forwardMatches.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><button type="button" className="button button-small" disabled={!forwardTarget||forwardBusy} onClick={()=>void forwardSelectedMessage()}>{forwardBusy?'Forwarding…':'Forward securely'}</button></>:<p>No other available matches. Blocked members are excluded.</p>}
      </div>}
      {peerTyping && !blocked && <p className="stage27-typing" role="status">{otherName} is typing…</p>}
      {replyToId && !blocked && <div className="stage30-reply-banner"><span>Replying to: {messages.find(m=>m.id===replyToId)?.body.slice(0,90) || 'Message'}</span><button type="button" onClick={()=>setReplyToId(null)}>Cancel reply</button></div>}
      {blocked ? <div className="blocked-notice"><Ban size={17}/> Messaging is disabled because this connection is blocked.</div> : <form className="message-composer" onSubmit={sendMessage}><label className="stage28-attach-button" title="Attach a photo or document"><Paperclip size={20}/><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" disabled={uploading || sending || recording || sendingVoice} onChange={e => { const f=e.target.files?.[0]; e.target.value=''; void sendAttachment(f); }}/></label><button type="button" className="stage29-mic-button" title="Record voice message" aria-label="Record voice message" disabled={uploading || sending || sendingVoice || recording} onClick={()=>void startRecording()}><Mic size={20}/></button><textarea rows={2} maxLength={4000} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a message…" aria-label="Write a message"/><button className="button" type="submit" disabled={sending || !draft.trim()}>{sending ? <LoaderCircle size={17} className="spin"/> : <Send size={17}/>} Send</button></form>}
      {(recording || recordedAudio) && !blocked && <div className="stage29-recording" role="status">
        {recording ? <><span className="stage29-record-dot"/> Recording {Math.floor(recordSeconds/60)}:{String(recordSeconds%60).padStart(2,'0')} / 2:00 <button type="button" className="button button-small" onClick={()=>stopRecording(false)}><Square size={15}/> Stop</button><button type="button" className="button button-small button-outline" onClick={()=>stopRecording(true)}><CircleX size={15}/> Cancel</button></> :
        <><audio controls src={recordedUrl} aria-label="Preview voice recording"/><button type="button" className="button button-small" disabled={sendingVoice} onClick={()=>void sendVoice()}><Send size={15}/> {sendingVoice?'Sending…':'Send voice'}</button><button type="button" className="button button-small button-outline" disabled={sendingVoice} onClick={clearRecording}><CircleX size={15}/> Discard</button></>}
      </div>}
      {uploading && <p className="stage28-upload"  role="status">Uploading attachment… {uploadPercent}%</p>}
      {notice && <div className="notice" role="status">{notice}</div>}
    </section>
  </main></div>;
}

function ProfileSetupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Rwanda');
  const [intent, setIntent] = useState<'friendship' | 'dating' | 'both'>('both');
  const [interests, setInterests] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [gallery, setGallery] = useState<{id:string;url:string;storage_path:string|null;sort_order:number}[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number|null>(null);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string|null>(null);
  const [photoNotice, setPhotoNotice] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'basics' | 'story' | 'interests'>('basics');
  const interestOptions = ['Music', 'Travel', 'Food', 'Books', 'Hiking', 'Movies', 'Photography', 'Fitness', 'Art', 'Technology', 'Gaming', 'Coffee', 'Volunteering', 'Nature', 'Dancing'];
  const today = new Date();
  const age = birthDate ? ageFromBirthDate(birthDate) : null;
  const completionItems = [
    { label: 'Display name', done: Boolean(displayName.trim()) },
    { label: 'Adult age eligibility (18+)', done: age !== null && age >= 18 },
    { label: 'Profile photo', done: Boolean(photoUrl) },
    { label: 'About me', done: Boolean(bio.trim()) },
    { label: 'Location', done: Boolean(city.trim() && country.trim()) },
    { label: 'At least one interest', done: interests.length > 0 },
    { label: 'Connection preference', done: Boolean(intent) },
  ];
  const completionPercent = Math.round(completionItems.filter(item => item.done).length / completionItems.length * 100);

  useEffect(() => {
    let alive = true;
    async function loadProfile() {
      if (!supabase) { setNotice('Supabase is not configured. Add your project URL and publishable key to .env.local, then restart Vite.'); setLoading(false); return; }
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!alive) return;
      if (userError || !user) { navigate('/login'); return; }
      setUserId(user.id);
      const { data, error } = await supabase.from('profiles').select('display_name,birth_date,bio,city,country,intent,photo_url').eq('id', user.id).maybeSingle();
      if (!alive) return;
      if (error) setNotice(`Could not load your profile: ${error.message}`);
      if (data) {
        setDisplayName(data.display_name ?? ''); setBirthDate(data.birth_date ?? ''); setBio(data.bio ?? '');
        setCity(data.city ?? ''); setCountry(data.country ?? 'Rwanda'); setIntent(data.intent ?? 'both'); setPhotoUrl(data.photo_url ?? null);
        const { data: interestRows } = await supabase.from('profile_interests').select('interests(name)').eq('profile_id', user.id);
        if (interestRows) {
          const names = (interestRows as unknown as { interests: { name: string } | { name: string }[] | null }[]).flatMap(row => { const entry = row.interests; return Array.isArray(entry) ? entry.map(item => item.name) : entry ? [entry.name] : []; });
          setInterests(names);
        }
      }
      const {data: galleryRows, error: galleryError} = await supabase.from('profile_gallery_photos').select('id,photo_url,storage_path,sort_order').eq('user_id',user.id).order('sort_order',{ascending:true});
      if (!alive) return;
      if (galleryError) setPhotoNotice(`Gallery could not load: ${galleryError.message}. Run the Stage 34 SQL migration.`);
      else setGallery((galleryRows??[]).map((r:{id:string;photo_url:string;storage_path:string|null;sort_order:number})=>({id:r.id,url:r.photo_url,storage_path:r.storage_path,sort_order:r.sort_order})));
      setLoading(false);
    }
    void loadProfile();
    return () => { alive = false; };
  }, [navigate]);

  async function uploadPhoto(file?: File) {
    setPhotoNotice('');
    if (!file) return;
    if (!supabase || !userId) { setPhotoNotice('Please sign in again before uploading a photo.'); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setPhotoNotice('Choose a JPG, PNG, or WebP image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoNotice('The photo must be 5 MB or smaller.'); return; }
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    setPhotoBusy(true);
    try {
      const { error: uploadError } = await supabase.storage.from('profile-photos').upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
      setPhotoNotice('Photo uploaded. Save your profile to publish the change.');
    } catch (error) {
      setPhotoNotice(error instanceof Error ? error.message : 'Photo upload failed. Check that the Stage 4 SQL migration was applied.');
    } finally { setPhotoBusy(false); }
  }

  async function addGalleryPhoto(file?:File) {
    if (!file || !supabase || !userId) return;
    setPhotoNotice('');
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {setPhotoNotice('Choose JPG, PNG, or WebP.');return;}
    if (file.size>5*1024*1024) {setPhotoNotice('Each photo must be 5 MB or smaller.');return;}
    if (gallery.length>=8) {setPhotoNotice('You can add up to 8 gallery photos.');return;}
    setGalleryLoading(true);
    const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
    const path=`${userId}/gallery/${crypto.randomUUID()}.${ext}`;
    try {
      const {error:uploadError}=await supabase.storage.from('profile-photos').upload(path,file,{contentType:file.type,upsert:false});
      if(uploadError)throw uploadError;
      const url=supabase.storage.from('profile-photos').getPublicUrl(path).data.publicUrl;
      const {data,error}=await supabase.from('profile_gallery_photos').insert({user_id:userId,photo_url:url,storage_path:path,sort_order:gallery.length}).select('id,photo_url,storage_path,sort_order').single();
      if(error){await supabase.storage.from('profile-photos').remove([path]);throw error;}
      const next=[...gallery,{id:data.id,url:data.photo_url,storage_path:data.storage_path,sort_order:data.sort_order}];
      setGallery(next);
      if(!photoUrl){const {error:profileError}=await supabase.from('profiles').update({photo_url:url}).eq('id',userId);if(profileError)throw profileError;setPhotoUrl(url);}
      setPhotoNotice('Photo added to your gallery.');
    }catch(e){setPhotoNotice(`Could not add photo: ${e instanceof Error?e.message:String(e)}`);}finally{setGalleryLoading(false);}
  }
  async function setGalleryPrimary(item:{id:string;url:string}) {
    if(!supabase||!userId)return;
    setGalleryLoading(true);setPhotoNotice('');
    const {error}=await supabase.from('profiles').update({photo_url:item.url}).eq('id',userId);
    if(error)setPhotoNotice(`Could not set main photo: ${error.message}`);
    else {setPhotoUrl(item.url);setPhotoNotice('Main photo updated and published.');}
    setGalleryLoading(false);
  }
  async function reorderGallery(sourceId:string,targetId:string) {
    if(!supabase||sourceId===targetId)return;
    const previous=[...gallery];const next=[...gallery];const from=next.findIndex(p=>p.id===sourceId);const to=next.findIndex(p=>p.id===targetId);
    if(from<0||to<0)return;
    next.splice(to,0,...next.splice(from,1));setGallery(next);setGalleryLoading(true);setPhotoNotice('');
    try {
      for(let i=0;i<next.length;i++){
        const {error}=await supabase.from('profile_gallery_photos').update({sort_order:i}).eq('id',next[i].id).eq('user_id',userId);
        if(error)throw error;
      }
    }catch(e){setGallery(previous);setPhotoNotice(`Could not reorder photos: ${e instanceof Error?e.message:String(e)}`);}finally{setGalleryLoading(false);}
  }
  async function deleteGalleryPhoto(item:{id:string;url:string;storage_path:string|null}) {
    if(!supabase||!userId||!window.confirm('Remove this gallery photo?'))return;
    setGalleryLoading(true);setPhotoNotice('');
    try {
      const {error}=await supabase.from('profile_gallery_photos').delete().eq('id',item.id).eq('user_id',userId);
      if(error)throw error;
      const next=gallery.filter(p=>p.id!==item.id);setGallery(next);
      if(photoUrl===item.url){const replacement=next[0]?.url??null;const {error:profileError}=await supabase.from('profiles').update({photo_url:replacement}).eq('id',userId);if(profileError)throw profileError;setPhotoUrl(replacement);}
      if(item.storage_path){const {error:storageError}=await supabase.storage.from('profile-photos').remove([item.storage_path]);if(storageError)setPhotoNotice(`Photo removed from gallery, but storage cleanup failed: ${storageError.message}`);}
      setPhotoNotice(current=>current||'Photo removed from your gallery.');
    }catch(e){setPhotoNotice(`Could not remove photo: ${e instanceof Error?e.message:String(e)}`);}finally{setGalleryLoading(false);}
  }

  function removePhoto() {
    setPhotoUrl(null);
    setPhotoNotice('Photo removed from your profile draft. Save your profile to confirm.');
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setNotice('');
    if (!supabase || !userId) { setNotice('Please sign in again before saving your profile.'); return; }
    if (!birthDate) { setNotice('Please enter your date of birth to confirm that you are eligible to use KithaLovers.'); return; }
    const parsedBirthDate = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(parsedBirthDate.getTime()) || birthDate > today.toISOString().slice(0, 10)) { setNotice('Please enter a valid date of birth.'); return; }
    if (age === null || age < 18) { setNotice('KithaLovers is for adults aged 18 and over. You must be at least 18 to create a profile.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: userId, display_name: displayName.trim(), birth_date: birthDate || null,
        bio: bio.trim(), city: city.trim(), country: country.trim(), intent, photo_url: photoUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      if (error) throw error;
      const { error: clearInterestsError } = await supabase.from('profile_interests').delete().eq('profile_id', userId);
      if (clearInterestsError) throw clearInterestsError;
      if (interests.length) {
        const { data: interestRows, error: interestLookupError } = await supabase.from('interests').select('id,name').in('name', interests);
        if (interestLookupError) throw interestLookupError;
        const rows = (interestRows ?? []).map((item: { id: number; name: string }) => ({ profile_id: userId, interest_id: item.id }));
        if (rows.length) {
          const { error: interestSaveError } = await supabase.from('profile_interests').insert(rows);
          if (interestSaveError) throw interestSaveError;
        }
      }
      setNotice('✓ Profile saved successfully! Your changes are now published.');
    } catch (error: unknown) {
      console.error('Profile save failed:', error);
      const details = error && typeof error === 'object' ? error as { message?: string; code?: string; details?: string; hint?: string } : null;
      const message = details?.message || (error instanceof Error ? error.message : String(error));
      setNotice(`Could not save your profile: ${message}${details?.code ? ` (code: ${details.code})` : ''}${details?.details ? ` — ${details.details}` : ''}${details?.hint ? ` — ${details.hint}` : ''}`);
    }
    finally { setSaving(false); }
  }

  const previewAge = age !== null && age >= 18 ? `, ${age}` : '';
  const missingItems = completionItems.filter(item => !item.done);
  return <div className="app-page stage33-page"><Header/><main className="wrap stage33-shell kl-member-pro">
    <div className="stage33-heading"><div><div className="eyebrow">Your space · Your story</div><h1>Make your profile <span>shine.</span></h1><p>Share what makes you unique. Preview your public-facing details before saving.</p></div><div className="stage33-heading-actions"><button type="button" className="button button-outline" onClick={() => setPreviewOpen(true)}>Preview profile</button><Link to="/discover" className="text-link">Explore members →</Link></div></div>
    <div className="stage33-grid"><aside className="stage33-side">
      <div className="stage33-mini-card"><div className="stage33-mini-photo">{photoUrl ? <img loading="lazy" decoding="async" src={photoUrl} alt="Your profile photo"/> : <Users size={46}/>}</div><h2>{displayName.trim() || 'Your name'}{previewAge}</h2><p>{[city,country].filter(Boolean).join(', ') || 'Your location'}</p><span className="stage33-intent">{intent === 'both' ? 'Friendship & dating' : intent === 'friendship' ? 'Friendship' : 'Dating'}</span></div>
      <section className="stage33-completion"><div className="profile-completion-top"><strong>Profile strength</strong><b>{completionPercent}%</b></div><div className="profile-progress-track"><span style={{width:`${completionPercent}%`}}/></div><p>{missingItems.length ? `${missingItems.length} more ${missingItems.length===1?'step':'steps'} to complete your profile` : 'All profile essentials are complete!'}</p>{missingItems.length>0 && <ul>{missingItems.map(item=><li key={item.label}>○ {item.label}</li>)}</ul>}</section>
      <div className="stage33-tip"><ShieldCheck size={19}/><span>Your date of birth is used for age eligibility. Only your calculated age appears in this preview.</span></div>
    </aside>
    <form className="stage33-editor" onSubmit={saveProfile}><div className="stage33-editor-top"><div><h2>Edit your profile</h2><p>Keep it genuine and welcoming.</p></div><button type="button" className="button button-small button-outline" onClick={()=>setPreviewOpen(true)}>View preview</button></div>
    <div className="stage33-tabs" role="tablist" aria-label="Profile sections">{([{id:'basics',label:'Basics'},{id:'story',label:'Your story'},{id:'interests',label:'Interests'}] as const).map(tab=><button type="button" role="tab" aria-selected={activeSection===tab.id} key={tab.id} className={activeSection===tab.id?'stage33-tab active':'stage33-tab'} onClick={()=>setActiveSection(tab.id)}>{tab.label}</button>)}</div>
    {loading ? <p>Loading your profile…</p> : <>
    <section className={activeSection==='basics'?'stage33-section':'stage33-section stage33-hidden'}><h3>Profile essentials</h3><p className="stage33-hint">These details help others recognize you and find a connection.</p>
    <div className="profile-photo-editor"><div className="profile-photo-preview">{photoUrl ? <img loading="lazy" decoding="async" src={photoUrl} alt="Your profile preview"/> : <div className="profile-photo-empty"><ImagePlus size={30}/><span>Add a photo</span></div>}</div><div className="profile-photo-controls"><strong>Your main photo</strong><p>Use a clear picture of yourself.</p><label className="button button-small photo-upload-button"><ImagePlus size={15}/>{photoBusy?'Uploading…':photoUrl?'Change photo':'Upload photo'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy} onChange={e=>{void uploadPhoto(e.target.files?.[0]);e.currentTarget.value='';}}/></label>{photoUrl && <button type="button" className="button button-small button-outline photo-remove-button" onClick={removePhoto}><Trash2 size={14}/> Remove</button>}<small>JPG, PNG, WebP · maximum 5 MB</small>{photoNotice && <span className="photo-message" role="status">{photoNotice}</span>}</div></div>
    <section className="stage34-gallery"><div className="stage34-gallery-heading"><div><h3>My photo gallery</h3><p>Up to 8 photos. Drag to reorder, or use the arrow buttons. Select a main photo for Discover.</p></div><span>{gallery.length}/8</span></div>
    <div className="stage34-gallery-grid">{gallery.map((item,index)=><div className="stage34-gallery-tile" key={item.id} draggable={!galleryLoading} onDragStart={()=>setDraggedPhotoId(item.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(draggedPhotoId)void reorderGallery(draggedPhotoId,item.id);setDraggedPhotoId(null);}} onDragEnd={()=>setDraggedPhotoId(null)}><button type="button" className="stage34-photo-open" onClick={()=>setLightboxIndex(index)} aria-label={`View gallery photo ${index+1}`}><img loading="lazy" decoding="async" src={item.url} alt={`Gallery photo ${index+1}`}/></button>{photoUrl===item.url&&<span className="stage34-primary-label">Main photo</span>}<div className="stage34-photo-actions"><button type="button" disabled={galleryLoading||index===0} onClick={()=>void reorderGallery(item.id,gallery[index-1].id)} aria-label="Move photo left">←</button><button type="button" disabled={galleryLoading||index===gallery.length-1} onClick={()=>void reorderGallery(item.id,gallery[index+1].id)} aria-label="Move photo right">→</button><button type="button" disabled={galleryLoading||photoUrl===item.url} onClick={()=>void setGalleryPrimary(item)} title="Set as main photo">★</button><button type="button" disabled={galleryLoading} onClick={()=>void deleteGalleryPhoto(item)} aria-label="Delete photo">×</button></div></div>)}{gallery.length<8&&<label className="stage34-gallery-add"><ImagePlus size={24}/><strong>{galleryLoading?'Working…':'Add photo'}</strong><small>JPG, PNG, WebP · max 5 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" disabled={galleryLoading} onChange={e=>{void addGalleryPhoto(e.target.files?.[0]);e.currentTarget.value='';}}/></label>}</div><p className="stage34-gallery-tip">Your existing main photo remains available. Gallery changes save immediately; other profile details still use Save profile.</p></section>
    <div className="stage33-fields"><label>Display name<input required maxLength={80} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="How should people call you?" autoComplete="nickname"/></label><label>Date of birth (18+)<input type="date" required value={birthDate} onChange={e=>setBirthDate(e.target.value)} max={new Date().toISOString().slice(0,10)}/></label><label>City<input maxLength={100} value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. Kigali"/></label><label>Country<input maxLength={100} value={country} onChange={e=>setCountry(e.target.value)} placeholder="Country"/></label></div></section>
    <section className={activeSection==='story'?'stage33-section':'stage33-section stage33-hidden'}><h3>Tell your story</h3><p className="stage33-hint">A few authentic words can make a great first impression.</p><label>I'm looking for<select value={intent} onChange={e=>setIntent(e.target.value as 'friendship'|'dating'|'both')}><option value="friendship">Friendship</option><option value="dating">Dating</option><option value="both">Friendship and dating</option></select></label><label>About me<textarea maxLength={600} value={bio} onChange={e=>setBio(e.target.value)} placeholder="What makes you, you?" rows={6}/><small>{bio.length}/600 characters</small></label></section>
    <section className={activeSection==='interests'?'stage33-section':'stage33-section stage33-hidden'}><h3>Things you love</h3><p className="stage33-hint">Pick your interests so others can find common ground. {interests.length} selected.</p><fieldset className="interest-picker"><legend>Choose any that fit you</legend><div className="interest-options">{interestOptions.map(item=><label className="interest-option" key={item}><input type="checkbox" checked={interests.includes(item)} onChange={e=>setInterests(current=>e.target.checked?[...current,item]:current.filter(value=>value!==item))}/>{item}</label>)}</div></fieldset></section>
    <div className="stage33-editor-footer"><span>Changes are published when you save.</span><button type="submit" className="button" disabled={saving||photoBusy}>{saving?'Saving…':'Save profile'} <ArrowRight size={17}/></button></div></>}
    {notice && <div className="notice" role="status">{notice}</div>}</form></div>
    {lightboxIndex!==null && gallery[lightboxIndex] && <div className="stage34-lightbox" role="dialog" aria-modal="true" aria-label="Photo gallery viewer" onClick={()=>setLightboxIndex(null)}><button type="button" className="stage34-close" onClick={()=>setLightboxIndex(null)}>Close ×</button><button type="button" disabled={lightboxIndex===0} onClick={e=>{e.stopPropagation();setLightboxIndex(Math.max(0,lightboxIndex-1));}}>‹</button><img loading="lazy" decoding="async" src={gallery[lightboxIndex].url} alt={`Gallery photo ${lightboxIndex+1}`} onClick={e=>e.stopPropagation()}/><button type="button" disabled={lightboxIndex===gallery.length-1} onClick={e=>{e.stopPropagation();setLightboxIndex(Math.min(gallery.length-1,lightboxIndex+1));}}>›</button><span>{lightboxIndex+1} / {gallery.length}</span></div>}
    {previewOpen && <div className="stage33-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPreviewOpen(false);}}><section className="stage33-preview" role="dialog" aria-modal="true" aria-label="Your profile preview"><div className="stage33-preview-header"><strong>How others see you</strong><button type="button" onClick={()=>setPreviewOpen(false)} aria-label="Close preview">✕</button></div><div className="stage33-preview-photo">{photoUrl?<img loading="lazy" decoding="async" src={photoUrl} alt="Your profile"/>:<Users size={64}/>}</div><div className="stage33-preview-body"><h2>{displayName.trim()||'Your name'}{previewAge}</h2><p>⌖ {[city,country].filter(Boolean).join(', ')||'Location not provided'}</p><span className="stage33-intent">{intent==='both'?'Friendship & dating':intent==='friendship'?'Friendship':'Dating'}</span><h3>About me</h3><p>{bio.trim()||'Add a short introduction to help others get to know you.'}</p><h3>Photos</h3><div className="stage34-preview-thumbs">{gallery.map((item,index)=><button type="button" key={item.id} onClick={()=>{setPreviewOpen(false);setLightboxIndex(index);}}><img loading="lazy" decoding="async" src={item.url} alt={`Photo ${index+1}`}/></button>)}</div><h3>My interests</h3><div className="stage33-preview-tags">{interests.length?interests.map(item=><span key={item}>{item}</span>):<span>No interests added yet</span>}</div></div><div className="stage33-preview-footer"><small>Preview only · Not published until saved</small><button type="button" className="button button-small" onClick={()=>setPreviewOpen(false)}>Continue editing</button></div></section></div>}
  </main></div>;

}

function ProtectedDiscover() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    async function check() {
      if (!supabase) { if (alive) { setSignedIn(false); setChecking(false); } return; }
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSignedIn(Boolean(data.session)); setChecking(false);
    }
    void check();
    if (!supabase) return () => { alive = false; };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (alive) { setSignedIn(Boolean(session)); setChecking(false); } });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  if (checking) return <div className="auth-page"><main className="wrap"><p>Checking your session…</p></main></div>;
  if (!signedIn) { navigate('/login'); return null; }
  return <DiscoverPage/>;
}

function ProtectedFavorites() { return <ProtectedDiscoverFavorites/>; }
function ProtectedDiscoverFavorites() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => { if (alive) { setSignedIn(Boolean(data.session)); setChecking(false); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (alive) { setSignedIn(Boolean(session)); setChecking(false); } });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => { if (!checking && !signedIn) navigate('/login', { replace: true }); }, [checking, signedIn, navigate]);
  if (checking || !signedIn) return <div className="app-page"><Header/><main className="wrap"><p>Checking your session…</p></main></div>;
  return <FavoritesPage/>;
}

function ProtectedConnections() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    async function check() {
      if (!supabase) { if (alive) { setSignedIn(false); setChecking(false); } return; }
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSignedIn(Boolean(data.session)); setChecking(false);
    }
    void check();
    if (!supabase) return () => { alive = false; };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) { setSignedIn(Boolean(session)); setChecking(false); }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  if (checking) return <div className="auth-page"><main className="wrap"><p>Checking your session…</p></main></div>;
  if (!signedIn) { navigate('/login'); return null; }
  return <ConnectionsPage />;
}

function ProtectedMessages() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    async function check() {
      if (!supabase) { if (alive) { setSignedIn(false); setChecking(false); } return; }
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSignedIn(Boolean(data.session)); setChecking(false);
    }
    void check();
    if (!supabase) return () => { alive = false; };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (alive) { setSignedIn(Boolean(session)); setChecking(false); } });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  if (checking) return <div className="auth-page"><main className="wrap"><p>Checking your session…</p></main></div>;
  if (!signedIn) { navigate('/login'); return null; }
  return <MessagesPage/>;
}


function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [visible, setVisible] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionBusy, setDeletionBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { setNotice('Supabase is not configured.'); setLoading(false); return; }
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { navigate('/login'); return; }
      if (!alive) return;
      setEmail(user.email ?? '');
      setNewEmail(user.email ?? '');
      const { data, error: profileError } = await supabase.from('profiles').select('is_visible').eq('id', user.id).maybeSingle();
      if (!alive) return;
      if (profileError) setNotice(`Could not load privacy settings: ${profileError.message}`);
      else setVisible(data?.is_visible ?? true);
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, [navigate]);

  async function saveVisibility(next: boolean) {
    if (!supabase) return;
    setSaving(true); setNotice('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }
    const { error } = await supabase.from('profiles').update({ is_visible: next, updated_at: new Date().toISOString() }).eq('id', user.id);
    setSaving(false);
    if (error) { setNotice(`Could not save visibility: ${error.message}`); return; }
    setVisible(next);
    setNotice(next ? 'Your profile is visible in discovery.' : 'Your profile is hidden from discovery. Existing matches and conversations are unchanged.');
  }

  async function updateEmail(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !newEmail.trim()) return;
    setSaving(true); setNotice('');
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSaving(false);
    setNotice(error ? `Could not request email change: ${error.message}` : 'Check your email inbox to confirm the address change. Your email may remain unchanged until confirmation.');
  }

  async function updatePassword(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (password.length < 8) { setNotice('Choose a password with at least 8 characters.'); return; }
    if (password !== confirmPassword) { setNotice('The passwords do not match.'); return; }
    setSaving(true); setNotice('');
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { setNotice(`Could not update password: ${error.message}`); return; }
    setPassword(''); setConfirmPassword('');
    setNotice('Password updated successfully.');
  }

  async function exportMyData() {
    if (!supabase) return;
    setExporting(true); setNotice('');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { navigate('/login'); return; }
      const profile = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      const interests = await supabase.from('profile_interests').select('*, interest:interests(id,name)').eq('profile_id', user.id);
      const requests = await supabase.from('connection_requests').select('*').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
      const matches = await supabase.from('matches').select('*').or(`user_one.eq.${user.id},user_two.eq.${user.id}`);
      if (profile.error || interests.error || requests.error || matches.error) {
        throw new Error(profile.error?.message || interests.error?.message || requests.error?.message || matches.error?.message || 'Could not collect all account data.');
      }
      const matchIds = (matches.data ?? []).map((item: { id: string }) => item.id);
      let messages: unknown[] = [];
      if (matchIds.length) {
        const result = await supabase.from('messages').select('id,match_id,sender_id,body,created_at,read_at').in('match_id', matchIds).order('created_at', { ascending: true });
        if (result.error) throw new Error(result.error.message);
        messages = result.data ?? [];
      }
      const [blocks, reports] = await Promise.all([
        supabase.from('blocks').select('*').eq('blocker_id', user.id),
        supabase.from('reports').select('id,reporter_id,reported_id,reason,details,status,created_at').eq('reporter_id', user.id),
      ]);
      if (blocks.error || reports.error) throw new Error(blocks.error?.message || reports.error?.message || 'Could not collect all account data.');
      const bundle = {
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email ?? null, created_at: user.created_at, user_metadata: user.user_metadata },
        profile: profile.data,
        profile_interests: interests.data ?? [],
        connection_requests: requests.data ?? [],
        matches: matches.data ?? [],
        messages,
        blocks_created_by_you: blocks.data ?? [],
        reports_submitted_by_you: reports.data ?? [],
        note: 'This export includes data available to your account through current permissions. It may not include records held by service providers or restricted administrative records.',
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `kithalovers-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setNotice('Your data export has been downloaded. Keep the file private because it contains personal information and messages.');
    } catch (error) {
      setNotice(`Could not export your data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally { setExporting(false); }
  }

  async function requestAccountDeletion() {
    if (!supabase) return;
    const confirmed = window.confirm('Submit an account deletion request? This does not immediately delete your account. You will remain signed in until the request is reviewed and processed.');
    if (!confirmed) return;
    setDeletionBusy(true); setNotice('');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { navigate('/login'); return; }
      const { error } = await supabase.from('account_deletion_requests').insert({
        user_id: user.id,
        reason: deletionReason.trim() || null,
      });
      if (error) throw new Error(error.message);
      setDeletionReason('');
      setNotice('Your account deletion request has been submitted. Your account has not been deleted yet; the request must be securely processed by an administrator.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setNotice(message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')
        ? 'You already have an open account deletion request.'
        : `Could not submit deletion request: ${message}`);
    } finally { setDeletionBusy(false); }
  }

  return <div className="app-page"><Header/><main className="discover-app wrap settings-page kl-member-pro">
    <div className="app-title"><div><div className="eyebrow">Your account, your choice</div><h1>Settings & privacy</h1><p>Everything you need to manage your account, safety, and personal data in one place.</p></div><Link to="/profile-setup" className="text-link">Edit my profile →</Link></div>
    <nav className="stage39-settings-grid" aria-label="Settings sections">
      <a className="stage39-settings-card" href="#discovery-privacy"><Eye size={23}/><strong>Discovery privacy</strong><span>Control who can find you</span></a>
      <Link className="stage39-settings-card" to="/presence-privacy"><EyeOff size={23}/><strong>Online status</strong><span>Manage last seen and presence</span></Link>
      <Link className="stage39-settings-card" to="/notifications"><Bell size={23}/><strong>Notifications</strong><span>In-app and email preferences</span></Link>
      <Link className="stage39-settings-card" to="/blocked-users"><Ban size={23}/><strong>Blocked members</strong><span>Manage blocks and boundaries</span></Link>
      <Link className="stage39-settings-card" to="/security"><LockKeyhole size={23}/><strong>Account security</strong><span>Sessions and sign-in protection</span></Link>
      <a className="stage39-settings-card" href="#account-credentials"><Settings2 size={23}/><strong>Email & password</strong><span>Update your login details</span></a>
      <a className="stage39-settings-card" href="#personal-data"><Download size={23}/><strong>My data</strong><span>Download account information</span></a>
      <a className="stage39-settings-card" href="#account-deletion"><Trash2 size={23}/><strong>Account deletion</strong><span>Request account removal</span></a>
    </nav>
    <div className="stage39-privacy-note"><ShieldCheck size={19}/><span>Changes to your privacy and account settings use your existing secure KithaLovers controls. You can return here at any time.</span></div>
    {loading ? <div className="notice">Loading account settings…</div> : <>
      <section id="discovery-privacy" className="connection-section settings-panel"><div className="settings-heading"><div><h2>Discovery privacy</h2><p>Choose whether your profile can appear to other members in discovery.</p></div><span className={visible ? 'settings-status status-on' : 'settings-status'}>{visible ? 'Visible' : 'Hidden'}</span></div>
        <label className="visibility-toggle"><input type="checkbox" checked={visible} disabled={saving} onChange={e => void saveVisibility(e.target.checked)}/><span><strong>Show my profile in discovery</strong><small>When turned off, your profile is hidden from new discovery. Existing matches and chats remain available.</small></span></label>
      </section>
      <section id="personal-data" className="connection-section settings-panel"><h2>Your personal data</h2><p className="settings-help">Download a copy of the account data currently available to you, including your profile, connections, matches, messages, blocks you created, and reports you submitted.</p><button type="button" className="button button-small" disabled={exporting} onClick={() => void exportMyData()}>{exporting ? 'Preparing export…' : 'Download my data (JSON)'}</button></section>
      <section id="account-deletion" className="connection-section settings-panel"><h2>Request account deletion</h2><p className="settings-help">This submits a request for secure processing. It does not instantly delete your login, profile, messages, or audit records. Do not include passwords or other sensitive information below.</p><label className="settings-form">Reason (optional)<textarea value={deletionReason} onChange={e => setDeletionReason(e.target.value)} maxLength={1000} rows={3} placeholder="Tell us why you want to delete your account (optional)."/></label><button type="button" className="button button-small" disabled={deletionBusy} onClick={() => void requestAccountDeletion()}>{deletionBusy ? 'Submitting…' : 'Submit deletion request'}</button></section>
      <section id="account-credentials" className="connection-section settings-panel"><h2>Change email address</h2><p className="settings-help">Current address: <strong>{email || 'Not available'}</strong></p><form className="settings-form" onSubmit={updateEmail}><label>New email address<input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} autoComplete="email" placeholder="you@example.com"/></label><button className="button button-small" disabled={saving || !newEmail.trim() || newEmail.trim().toLowerCase() === email.toLowerCase()}>{saving ? 'Saving…' : 'Request email change'}</button></form><small className="settings-help">Supabase may send confirmation links to verify the new address.</small></section>
      <section className="connection-section settings-panel"><h2>Change password</h2><p className="settings-help">Use at least 8 characters and avoid reusing a password from another service.</p><form className="settings-form" onSubmit={updatePassword}><label>New password<input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters"/></label><label>Confirm new password<input type="password" required minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" placeholder="Enter it again"/></label><button className="button button-small" disabled={saving || !password || !confirmPassword}>{saving ? 'Saving…' : 'Update password'}</button></form></section>
    </>}
    {notice && <div className="notice" role="status">{notice}</div>}
  </main></div>;
}


function AccountSecurityPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [sessionStarted, setSessionStarted] = useState<string | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [factorId, setFactorId] = useState('');
  const [factorVerified, setFactorVerified] = useState(false);
  const [factorQr, setFactorQr] = useState('');
  const [factorSecret, setFactorSecret] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState('');

  async function loadSecurity() {
    if (!supabase) { setNotice('Supabase is not configured. Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'); setLoading(false); return; }
    const [{ data: sessionData }, { data: userData, error: userError }, { data: factorsData, error: factorsError }] = await Promise.all([
      supabase.auth.getSession(), supabase.auth.getUser(), supabase.auth.mfa.listFactors()
    ]);
    if (userError || !userData.user) { navigate('/login'); return; }
    setEmail(userData.user.email ?? ''); setRecoveryEmail(userData.user.email ?? ''); setUserId(userData.user.id);
    setSessionStarted(sessionData.session?.expires_at ? new Date(sessionData.session.expires_at * 1000).toLocaleString() : null);
    if (factorsError) setNotice(`Could not load MFA status: ${factorsError.message}`);
    const verified = factorsData?.totp?.find(f => f.status === 'verified');
    if (verified) { setFactorId(verified.id); setFactorVerified(true); }
    else { setFactorVerified(false); setFactorId(''); }
    setLoading(false);
  }
  useEffect(() => { void loadSecurity(); }, [navigate]);

  async function sendRecovery(e: FormEvent) {
    e.preventDefault(); if (!supabase || !recoveryEmail.trim()) return;
    setBusy(true); setNotice('');
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), { redirectTo: `${window.location.origin}/settings` });
    setBusy(false);
    setNotice(error ? `Could not send recovery email: ${error.message}` : 'If that email belongs to an account, a password-reset link has been sent. Check your inbox and spam folder. The link must be opened before it expires.');
  }

  async function signOutEverywhere() {
    if (!supabase || !window.confirm('Sign out this account on all devices, including this one? You will need to sign in again.')) return;
    setBusy(true); setNotice('');
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    setBusy(false);
    if (error) setNotice(`Could not sign out all sessions: ${error.message}`);
    else navigate('/login');
  }

  async function enrollMfa() {
    if (!supabase) return;
    setBusy(true); setNotice('');
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'KithaLovers authenticator' });
    setBusy(false);
    if (error || !data) { setNotice(`Could not start authenticator setup: ${error?.message ?? 'Unknown error'}`); return; }
    setFactorId(data.id); setFactorQr(data.totp.qr_code); setFactorSecret(data.totp.secret);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: data.id });
    if (challengeError || !challenge) { setNotice(`Authenticator setup started, but verification could not start: ${challengeError?.message ?? 'Unknown error'}`); return; }
    setChallengeId(challenge.id); setNotice('Scan the QR code with an authenticator app, then enter the current 6-digit code to confirm setup.');
  }

  async function verifyMfa(e: FormEvent) {
    e.preventDefault(); if (!supabase || !factorId || !challengeId || !/^\d{6}$/.test(otp)) { setNotice('Enter the 6-digit code from your authenticator app.'); return; }
    setBusy(true); setNotice('');
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: otp });
    setBusy(false);
    if (error) { setNotice(`Could not verify authenticator code: ${error.message}`); return; }
    setFactorVerified(true); setFactorQr(''); setFactorSecret(''); setChallengeId(''); setOtp('');
    setNotice('Multi-factor authentication is enabled for this account. Keep your authenticator app available when signing in.');
  }

  async function disableMfa() {
    if (!supabase || !factorId || !window.confirm('Disable multi-factor authentication for this account?')) return;
    setBusy(true); setNotice('');
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) { setNotice(`Could not disable MFA: ${error.message}`); return; }
    setFactorId(''); setFactorVerified(false); setNotice('Multi-factor authentication has been disabled.');
  }

  return <div className="app-page"><Header/><main className="discover-app wrap settings-page">
    <div className="app-title"><div><div className="eyebrow">Protect your account</div><h1>Account security</h1><p>Review your sign-in session, password recovery, and additional verification.</p></div><Link to="/settings" className="text-link">← Account settings</Link></div>
    {loading ? <div className="notice">Checking your account security…</div> : <>
      <section className="connection-section settings-panel"><h2>Current session</h2><p className="settings-help">Signed in as <strong>{email || 'Unknown account'}</strong></p><p className="settings-help">{sessionStarted ? `Current access token expires: ${sessionStarted}` : 'Session expiry information is not available.'}</p><p className="settings-help">Account ID: <code>{userId}</code></p><button type="button" className="button button-small button-outline danger-outline" disabled={busy} onClick={() => void signOutEverywhere()}>{busy ? 'Working…' : 'Sign out on all devices'}</button><small className="settings-help">This asks Supabase Auth to revoke refresh sessions globally. Existing access tokens may remain valid until they expire.</small></section>
      <section className="connection-section settings-panel"><h2>Password recovery</h2><p className="settings-help">Send a password-reset link to the email associated with your account. Recovery works only if the Supabase redirect URL and email delivery are configured.</p><form className="settings-form" onSubmit={sendRecovery}><label>Email address<input type="email" required autoComplete="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} /></label><button className="button button-small" disabled={busy || !recoveryEmail.trim()}>{busy ? 'Sending…' : 'Send password-reset link'}</button></form></section>
      <section className="connection-section settings-panel"><div className="settings-heading"><div><h2>Multi-factor authentication</h2><p>Add a second verification step using an authenticator app that supports time-based one-time passwords (TOTP).</p></div><span className={factorVerified ? 'settings-status status-on' : 'settings-status'}>{factorVerified ? 'Enabled' : 'Not enabled'}</span></div>
        {factorVerified ? <button type="button" className="button button-small button-outline danger-outline" disabled={busy} onClick={() => void disableMfa()}>Disable authenticator MFA</button> : <><button type="button" className="button button-small" disabled={busy || Boolean(factorQr)} onClick={() => void enrollMfa()}>{busy ? 'Preparing…' : 'Set up authenticator'}</button>{factorQr && <div className="mfa-setup"><p>Scan this QR code in your authenticator app. If you cannot scan it, enter the setup key manually.</p><img loading="lazy" decoding="async" className="mfa-qr" src={factorQr.startsWith('data:') ? factorQr : `data:image/svg+xml;utf8,${encodeURIComponent(factorQr)}`} alt="Authenticator setup QR code"/><p><strong>Setup key:</strong> <code>{factorSecret}</code></p><form className="settings-form" onSubmit={verifyMfa}><label>6-digit authenticator code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}/></label><button className="button button-small" disabled={busy || otp.length !== 6}>{busy ? 'Verifying…' : 'Verify and enable MFA'}</button><button type="button" className="button button-small button-outline" disabled={busy} onClick={() => { setFactorQr(''); setFactorSecret(''); setFactorId(''); setChallengeId(''); setOtp(''); setNotice('Authenticator setup cancelled.'); }}>Cancel setup</button></form></div>}</>}
        <small className="settings-help">MFA availability and enforcement depend on your Supabase Auth configuration. Keep access to your authenticator; test recovery before requiring MFA for all users.</small>
      </section>
    </>}
    {notice && <div className="notice" role="status">{notice}</div>}
  </main></div>;
}

function ProtectedAccountSecurity() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    async function check() {
      if (!supabase) { if (alive) { setSignedIn(false); setChecking(false); } return; }
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSignedIn(Boolean(data.session)); setChecking(false);
    }
    void check();
    if (!supabase) return () => { alive = false; };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (alive) { setSignedIn(Boolean(session)); setChecking(false); } });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  if (checking) return <div className="auth-page"><main className="wrap"><p>Checking your session…</p></main></div>;
  if (!signedIn) { navigate('/login'); return null; }
  return <AccountSecurityPage/>;
}

function ProtectedSettings() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    async function check() {
      if (!supabase) { if (alive) { setSignedIn(false); setChecking(false); } return; }
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSignedIn(Boolean(data.session)); setChecking(false);
    }
    void check();
    if (!supabase) return () => { alive = false; };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (alive) { setSignedIn(Boolean(session)); setChecking(false); } });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  if (checking) return <div className="auth-page"><main className="wrap"><p>Checking your session…</p></main></div>;
  if (!signedIn) { navigate('/login'); return null; }
  return <SettingsPage/>;
}


type AdminOverview = {
  members: number; suspended: number; matches: number; messages: number;
  pending_reports: number; pending_verifications: number; pending_deletions: number;
  active_7d: number; registrations: {day:string; total:number}[];
  messages_daily: {day:string; total:number}[];
};
function AdminDashboardPage() {
  const navigate = useNavigate();
  const [checking,setChecking] = useState(true);
  const [allowed,setAllowed] = useState(false);
  const [loading,setLoading] = useState(false);
  const [overview,setOverview] = useState<AdminOverview|null>(null);
  const [error,setError] = useState('');
  useEffect(()=>{
    let alive=true;
    if (!supabase) {setError('Supabase is not configured.');setChecking(false);return;}
    void supabase.auth.getUser().then(({data})=>{
      if(!alive)return;
      if(!data.user){navigate('/login');return;}
      setAllowed(data.user.app_metadata?.role==='admin');setChecking(false);
    });
    return ()=>{alive=false;};
  },[navigate]);
  useEffect(()=>{
    if(!allowed||!supabase)return;
    let active=true;
    const load=async()=>{
      setLoading(true);setError('');
      const {data,error:rpcError}=await supabase!.rpc('admin_dashboard_overview');
      if(!active)return;
      if(rpcError)setError(`Could not load analytics: ${rpcError.message}. Apply Stage 40 SQL migration.`);
      else setOverview(data as AdminOverview);
      setLoading(false);
    };
    void load();
    return ()=>{active=false;};
  },[allowed]);
  const [range,setRange] = useState<'registrations'|'messages'>('registrations');
  const [refreshing,setRefreshing] = useState(false);
  const refresh = async () => {
    if (!supabase || !allowed) return;
    setRefreshing(true);setError('');
    const {data,error:rpcError}=await supabase.rpc('admin_dashboard_overview');
    if(rpcError)setError(`Could not refresh analytics: ${rpcError.message}`);
    else setOverview(data as AdminOverview);
    setRefreshing(false);
  };
  const stats = overview ? [
    {label:'Total members',value:overview.members,Icon:Users,tone:'violet',detail:'Registered profiles'},
    {label:'Active members',value:overview.active_7d,Icon:Heart,tone:'teal',detail:'Last 7 days'},
    {label:'Total matches',value:overview.matches,Icon:Heart,tone:'pink',detail:'Member connections'},
    {label:'Messages sent',value:overview.messages,Icon:MessageCircle,tone:'blue',detail:'Platform engagement'},
    {label:'Pending reports',value:overview.pending_reports,Icon:Flag,tone:'amber',detail:'Requires review'},
    {label:'Suspended members',value:overview.suspended,Icon:Ban,tone:'red',detail:'Safety enforcement'},
    {label:'Verifications',value:overview.pending_verifications,Icon:BadgeCheck,tone:'violet',detail:'Pending requests'},
    {label:'Deletion requests',value:overview.pending_deletions,Icon:Trash2,tone:'slate',detail:'Account requests'}
  ] : [];
  const chartRows = overview ? (range==='registrations'?overview.registrations:overview.messages_daily) : [];
  const maxChart = Math.max(1,...chartRows.map(r=>r.total));
  const totalChart = chartRows.reduce((sum,r)=>sum+r.total,0);
  return <div className="app-page"><Header/><main className="wrap stage40-redesign">
    <section className="s40-hero">
      <div className="s40-hero-glow"/>
      <div className="s40-hero-content">
        <span className="s40-kicker"><BarChart3 size={15}/> KITHALOVERS ADMINISTRATION</span>
        <h1>Platform intelligence<span className="s40-dot">.</span></h1>
        <p>Your community, engagement and safety operations — all in one place.</p>
        <div className="s40-hero-foot"><span className="s40-live"><span/> Overview dashboard</span><span>Last 14 days of activity</span></div>
      </div>
      <div className="s40-hero-actions"><button type="button" onClick={()=>void refresh()} disabled={!allowed||refreshing} className="s40-refresh">{refreshing?'Refreshing…':'↻ Refresh data'}</button><Link to="/admin/moderation" className="s40-review">Review reports →</Link></div>
    </section>
    {checking ? <div className="s40-state">Checking administrator access…</div> : !allowed ? <div className="s40-state">Administrator access required.</div> : <>
      {loading && !overview && <div className="s40-state">Loading platform analytics…</div>}
      {error && <div className="notice" role="alert">{error}</div>}
      {overview && <>
        <div className="s40-section-heading"><div><span className="s40-overline">AT A GLANCE</span><h2>Platform overview</h2><p>Key numbers across your community</p></div><span className="s40-section-pill">8 key indicators</span></div>
        <div className="s40-stat-grid">{stats.map(({label,value,Icon,tone,detail})=><article className={`s40-stat s40-${tone}`} key={label}><div className="s40-stat-head"><span className="s40-stat-icon"><Icon size={20}/></span><span className="s40-stat-spark">●</span></div><div className="s40-stat-value">{value.toLocaleString()}</div><div className="s40-stat-label">{label}</div><div className="s40-stat-detail">{detail}</div></article>)}</div>
        <div className="s40-section-heading s40-activity-heading"><div><span className="s40-overline">ACTIVITY & GROWTH</span><h2>Community trends</h2><p>Daily activity across the last two weeks</p></div></div>
        <section className="s40-analytics">
          <div className="s40-analytics-top"><div><span className="s40-overline">{range==='registrations'?'MEMBER GROWTH':'ENGAGEMENT'}</span><h3>{range==='registrations'?'New registrations':'Messages sent'}</h3><div className="s40-analytics-total">{totalChart.toLocaleString()} <span>in 14 days</span></div></div><div className="s40-switch" role="group" aria-label="Chart metric"><button className={range==='registrations'?'active':''} onClick={()=>setRange('registrations')}>Registrations</button><button className={range==='messages'?'active':''} onClick={()=>setRange('messages')}>Messages</button></div></div>
          <div className="s40-plot" role="img" aria-label={chartRows.map(r=>`${r.day}: ${r.total}`).join(', ')}><div className="s40-gridlines"><span/><span/><span/><span/></div>{chartRows.map(r=><div className="s40-column" key={r.day} title={`${r.day}: ${r.total}`}><div className="s40-column-count">{r.total}</div><div className="s40-column-track"><div className="s40-column-bar" style={{height:`${r.total===0?0:Math.max(5,r.total/maxChart*100)}%`}}/></div><span className="s40-column-date">{r.day.slice(5)}</span></div>)}</div>
          <div className="s40-chart-footer"><span>Daily totals · UTC dates</span><span>Source: live platform analytics</span></div>
        </section>
        <div className="s40-section-heading s40-actions-heading"><div><span className="s40-overline">WORKSPACE</span><h2>Management shortcuts</h2><p>Jump straight into daily operations</p></div></div>
        <div className="s40-shortcuts"><Link to="/admin/users"><Users size={20}/><span><strong>Member management</strong><small>Accounts and suspensions</small></span><span className="s40-arrow">↗</span></Link><Link to="/admin/moderation"><Flag size={20}/><span><strong>Moderation reports</strong><small>Review flagged activity</small></span><span className="s40-arrow">↗</span></Link><Link to="/admin/verifications"><BadgeCheck size={20}/><span><strong>Verification requests</strong><small>Trust and identity reviews</small></span><span className="s40-arrow">↗</span></Link><Link to="/admin/deletion-requests"><Trash2 size={20}/><span><strong>Deletion requests</strong><small>Account data requests</small></span><span className="s40-arrow">↗</span></Link><Link to="/admin/audit-logs"><BarChart3 size={20}/><span><strong>Audit logs</strong><small>Administrative activity</small></span><span className="s40-arrow">↗</span></Link></div>
        <p className="s40-disclaimer">Active members are accounts with recorded presence in the past seven days. Analytics contain aggregate counts only — no private message content.</p>
      </>}
    </>}
  </main></div>;
}

function AdminModerationPage() {
  type ReportRow = { id: string; reporter_id: string; reported_id: string; reason: string; details: string; status: 'open' | 'reviewing' | 'resolved' | 'dismissed'; created_at: string };
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | ReportRow['status']>('open');
  const [notice, setNotice] = useState('');
  const [search,setSearch] = useState('');
  const [sort,setSort] = useState<'newest'|'oldest'>('newest');
  const [page,setPage] = useState(1);
  const [busyId,setBusyId] = useState<string|null>(null);

  useEffect(() => {
    let alive = true;
    async function verify() {
      if (!supabase) { setNotice('Supabase is not configured.'); setChecking(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { navigate('/login'); return; }
      const admin = user.app_metadata?.role === 'admin';
      setAllowed(admin); setChecking(false);
      if (!admin) setNotice('This area is restricted to authorized moderators.');
    }
    void verify();
    return () => { alive = false; };
  }, [navigate]);

  async function loadReports() {
    if (!supabase || !allowed) return;
    setLoading(true); setNotice('');
    const query = supabase.from('reports').select('id,reporter_id,reported_id,reason,details,status,created_at').order('created_at', { ascending: false }).limit(200);
    const { data, error } = filter === 'all' ? await query : await query.eq('status', filter);
    if (error) { setNotice(`Could not load reports: ${error.message}`); setLoading(false); return; }
    const rows = (data ?? []) as ReportRow[];
    setReports(rows);
    const ids = [...new Set(rows.flatMap(r => [r.reporter_id, r.reported_id]))];
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,display_name').in('id', ids);
      setNames(Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name || 'Member'] )));
    } else setNames({});
    setLoading(false);
  }
  useEffect(() => { if (allowed) void loadReports(); }, [allowed, filter]);

  async function updateStatus(report: ReportRow, status: ReportRow['status']) {
    if (!supabase) return;
    if (!window.confirm(`Change report #${report.id.slice(0,8)} to ${status}?`)) return;
    setBusyId(report.id); setNotice('');
    const { error } = await supabase.from('reports').update({ status }).eq('id', report.id);
    if (error) { setNotice(`Could not update report: ${error.message}`); setBusyId(null); return; }
    setNotice(`Report marked ${status}.`);
    await loadReports(); setBusyId(null);
  }

  const visibleReports=reports.filter(r=>`${r.reason} ${r.details} ${r.id} ${names[r.reporter_id]||''} ${names[r.reported_id]||''}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>sort==='newest'?b.created_at.localeCompare(a.created_at):a.created_at.localeCompare(b.created_at));
  const totalPages=Math.max(1,Math.ceil(visibleReports.length/12));
  const pagedReports=visibleReports.slice((Math.min(page,totalPages)-1)*12,Math.min(page,totalPages)*12);
  if (checking) return <div className="app-page"><Header/><main className="wrap moderation-page"><p>Checking moderator access…</p></main></div>;
  if (!allowed) return <div className="app-page"><Header/><main className="wrap moderation-page"><div className="app-title"><div><div className="eyebrow">KithaLovers safety</div><h1>Moderator access required</h1><p>{notice || 'This page is only available to authorized moderators.'}</p></div></div><Link to="/" className="button button-small">Return home</Link></main></div>;
  return <div className="app-page"><Header/><main className="discover-app wrap moderation-page kl-admin-pro">
    <div className="app-title"><div><div className="eyebrow">Trust & safety · Case management</div><h1>Moderation dashboard</h1><p>Search, triage and resolve member reports with a clear audit-friendly workflow.</p></div><button className="button button-small button-outline" onClick={() => void loadReports()} disabled={loading}><LoaderCircle size={15} className={loading ? 'spin' : ''}/> Refresh</button></div>
    <section className="connection-section moderation-panel">
      <div className="s41-summary"><div><strong>{reports.length}</strong><span>Loaded cases</span></div><div><strong>{reports.filter(r=>r.status==='open').length}</strong><span>Open</span></div><div><strong>{reports.filter(r=>r.status==='reviewing').length}</strong><span>Under review</span></div><div><strong>{reports.filter(r=>r.status==='resolved').length}</strong><span>Resolved</span></div></div>
      <div className="moderation-toolbar s41-toolbar"><label>Report status<select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}><option value="open">Open</option><option value="reviewing">Under review</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option><option value="all">All statuses</option></select></label><label>Search cases<input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Reason, member, details or ID" /></label><label>Sort<select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label><span className="moderation-count">{visibleReports.length} matching</span></div>
      {loading ? <div className="notice">Loading reports…</div> : visibleReports.length === 0 ? <div className="moderation-empty"><ShieldCheck size={28}/><h2>No reports in this view</h2><p>There are no reports matching this status filter.</p></div> : <div className="moderation-list">{pagedReports.map(report => <article className="moderation-report" key={report.id}>
        <div className="moderation-report-top"><div><span className={`report-status status-${report.status}`}>{report.status.replace('_',' ')}</span><h2>{report.reason}</h2><p className="moderation-date">Submitted {new Date(report.created_at).toLocaleString()}</p></div><span className="moderation-id">#{report.id.slice(0,8)}</span></div>
        <div className="moderation-members"><div><small>Reported by</small><strong>{names[report.reporter_id] || 'Member'}</strong><code>{report.reporter_id.slice(0,8)}…</code></div><div><small>Reported member</small><strong>{names[report.reported_id] || 'Member'}</strong><code>{report.reported_id.slice(0,8)}…</code></div></div>
        {report.details && <p className="moderation-details">{report.details}</p>}
        <div className="moderation-actions"><label>Update status<select disabled={busyId===report.id} aria-label={`Status for report ${report.id}`} value={report.status} onChange={e => void updateStatus(report, e.target.value as ReportRow['status'])}><option value="open">Open</option><option value="reviewing">Under review</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></label></div>
      </article>)}</div>}
      {visibleReports.length>12 && <div className="s41-pagination"><button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button><span>Page {Math.min(page,totalPages)} of {totalPages}</span><button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button></div>}
    </section>
    {notice && <div className="notice" role="status">{notice}</div>}
    <p className="moderation-footnote">This dashboard records report status only. It does not automatically suspend members or verify their identity. Investigate reports consistently and follow your published safety policy.</p>
  </main></div>;
}

function AdminUsersPage() {
  type Member = { id: string; display_name: string; city: string; country: string; is_visible: boolean; is_suspended: boolean; suspension_reason: string | null; created_at: string };
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter,setStatusFilter] = useState<'all'|'active'|'suspended'>('all');
  const [sort,setSort] = useState<'newest'|'oldest'|'name'>('newest');
  const [page,setPage] = useState(1);
  const [busyId,setBusyId] = useState<string|null>(null);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    async function verify() {
      if (!supabase) { setNotice('Supabase is not configured.'); setChecking(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { navigate('/login'); return; }
      const admin = user.app_metadata?.role === 'admin';
      setAllowed(admin); setChecking(false);
      if (!admin) setNotice('This area is restricted to authorized administrators.');
    }
    void verify();
    return () => { alive = false; };
  }, [navigate]);

  async function loadMembers() {
    if (!supabase || !allowed) return;
    setLoading(true); setNotice('');
    const { data, error } = await supabase.from('profiles').select('id,display_name,city,country,is_visible,is_suspended,suspension_reason,created_at').order('created_at', { ascending: false }).limit(500);
    if (error) setNotice(`Could not load members: ${error.message}`);
    else setMembers((data ?? []) as Member[]);
    setLoading(false);
  }
  useEffect(() => { if (allowed) void loadMembers(); }, [allowed]);

  async function setSuspended(member: Member, suspend: boolean) {
    if (!supabase) return;
    const reason = (reasonById[member.id] ?? member.suspension_reason ?? '').trim();
    if (suspend && reason.length < 5) { setNotice('Enter a suspension reason of at least 5 characters before suspending this account.'); return; }
    if (!window.confirm(`${suspend?'Suspend':'Reactivate'} ${member.display_name||'this member'}?`)) return;
    setBusyId(member.id); setNotice('');
    const { error } = await supabase.from('profiles').update({ is_suspended: suspend, suspension_reason: suspend ? reason : null, suspended_at: suspend ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', member.id);
    if (error) { setNotice(`Could not ${suspend ? 'suspend' : 'reactivate'} account: ${error.message}`); setBusyId(null); return; }
    setNotice(`${member.display_name || 'Member'} account ${suspend ? 'suspended' : 'reactivated'}.`);
    await loadMembers(); setBusyId(null);
  }

  if (checking) return <div className="app-page"><Header/><main className="wrap moderation-page"><p>Checking administrator access…</p></main></div>;
  if (!allowed) return <div className="app-page"><Header/><main className="wrap moderation-page"><div className="app-title"><div><div className="eyebrow">KithaLovers safety</div><h1>Administrator access required</h1><p>{notice || 'This page is only available to administrators.'}</p></div></div><Link to="/" className="button button-small">Return home</Link></main></div>;
  const filtered = members.filter(m => `${m.display_name} ${m.city} ${m.country} ${m.id}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter==='all'||(statusFilter==='suspended'?m.is_suspended:!m.is_suspended))).sort((a,b)=>sort==='name'?(a.display_name||'').localeCompare(b.display_name||''):sort==='oldest'?a.created_at.localeCompare(b.created_at):b.created_at.localeCompare(a.created_at));
  const totalPages=Math.max(1,Math.ceil(filtered.length/15));
  const visibleMembers=filtered.slice((Math.min(page,totalPages)-1)*15,Math.min(page,totalPages)*15);
  const activeCount=members.filter(m=>!m.is_suspended).length;
  const suspendedCount=members.length-activeCount;
  const visibleCount=members.filter(m=>m.is_visible).length;
  return <div className="app-page"><Header/><main className="wrap s41-users">
    <section className="s41-users-hero">
      <div><span className="s41-users-eyebrow"><Users size={15}/> KITHALOVERS · ADMINISTRATION</span>
      <h1>Member management<span>.</span></h1>
      <p>Monitor your community, review member accounts and take informed moderation actions.</p>
      <div className="s41-users-hero-meta"><span>● Administrator workspace</span><span>Up to 500 recent members loaded</span></div></div>
      <div className="s41-users-hero-buttons"><button className="s41-users-refresh" type="button" onClick={()=>void loadMembers()} disabled={loading}><LoaderCircle size={16} className={loading?'spin':''}/>{loading?'Refreshing…':'Refresh members'}</button><Link className="s41-users-back" to="/admin/dashboard">← Admin overview</Link></div>
    </section>
    <div className="s41-users-heading"><div><span>COMMUNITY OVERVIEW</span><h2>Member statistics</h2><p>Snapshot of recently loaded accounts</p></div><span className="s41-users-label">Live database records</span></div>
    <section className="s41-users-stats">
      <article><div className="s41-users-stat-icon violet"><Users size={21}/></div><strong>{members.length.toLocaleString()}</strong><span>Total loaded members</span><small>Recent account records</small></article>
      <article><div className="s41-users-stat-icon green"><Heart size={21}/></div><strong>{activeCount.toLocaleString()}</strong><span>Not suspended</span><small>Eligible accounts</small></article>
      <article><div className="s41-users-stat-icon rose"><Ban size={21}/></div><strong>{suspendedCount.toLocaleString()}</strong><span>Suspended</span><small>Restricted accounts</small></article>
      <article><div className="s41-users-stat-icon blue"><BadgeCheck size={21}/></div><strong>{visibleCount.toLocaleString()}</strong><span>Visible profiles</span><small>Profile visibility enabled</small></article>
    </section>
    <section className="s41-users-workspace">
      <div className="s41-users-workspace-top"><div><span>MEMBER DIRECTORY</span><h2>All members</h2><p>Search, filter and manage member accounts</p></div><div className="s41-users-result">{filtered.length.toLocaleString()} result{filtered.length===1?'':'s'}</div></div>
      <div className="s41-users-filters">
        <label className="s41-users-search"><span>Search members</span><input aria-label="Search members" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search name, location or member ID…"/></label>
        <label><span>Account status</span><select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value as typeof statusFilter);setPage(1);}}><option value="all">All members</option><option value="active">Not suspended</option><option value="suspended">Suspended</option></select></label>
        <label><span>Sort by</span><select value={sort} onChange={e=>{setSort(e.target.value as typeof sort);setPage(1);}}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option></select></label>
        {(search||statusFilter!=='all'||sort!=='newest')&&<button className="s41-users-clear" onClick={()=>{setSearch('');setStatusFilter('all');setSort('newest');setPage(1);}}>Clear filters</button>}
      </div>
      {notice&&<div className="notice" role="status">{notice}</div>}
      {loading?<div className="s41-users-empty">Loading members…</div>:filtered.length===0?<div className="s41-users-empty"><Users size={32}/><h3>No members found</h3><p>Try adjusting the search or status filter.</p></div>:
      <div className="s41-users-table-wrap"><table className="s41-users-table"><thead><tr><th>MEMBER</th><th>LOCATION</th><th>JOINED</th><th>STATUS</th><th>MANAGEMENT</th></tr></thead><tbody>{visibleMembers.map(member=><tr key={member.id}>
        <td><div className="s41-users-person"><span className="s41-users-avatar">{(member.display_name||'?').trim().slice(0,1).toUpperCase()}</span><div><strong>{member.display_name||'Unnamed member'}</strong><small>ID {member.id.slice(0,8)} · {member.is_visible?'Visible':'Hidden'} profile</small></div></div></td>
        <td><span className="s41-users-location">{[member.city,member.country].filter(Boolean).join(', ')||'Not provided'}</span></td>
        <td><span className="s41-users-date">{new Date(member.created_at).toLocaleDateString()}</span></td>
        <td><span className={`s41-users-status ${member.is_suspended?'suspended':'active'}`}>● {member.is_suspended?'Suspended':'Active'}</span></td>
        <td><div className="s41-users-manage">{member.is_suspended?<><small className="s41-users-reason" title={member.suspension_reason||''}>{member.suspension_reason||'No reason recorded'}</small><button disabled={busyId===member.id} className="s41-users-reactivate" onClick={()=>void setSuspended(member,false)}>{busyId===member.id?'Updating…':'Reactivate'}</button></>:<><input aria-label={`Suspension reason for ${member.display_name||member.id}`} value={reasonById[member.id]??''} onChange={e=>setReasonById(prev=>({...prev,[member.id]:e.target.value}))} maxLength={500} placeholder="Suspension reason"/><button disabled={busyId===member.id} className="s41-users-suspend" onClick={()=>void setSuspended(member,true)}>{busyId===member.id?'Updating…':'Suspend'}</button></>}</div></td>
      </tr>)}</tbody></table></div>}
      {filtered.length>15&&<div className="s41-users-pagination"><span>Showing {(Math.min(page,totalPages)-1)*15+1}–{Math.min(Math.min(page,totalPages)*15,filtered.length)} of {filtered.length}</span><div><button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>← Previous</button><span>Page {Math.min(page,totalPages)} of {totalPages}</span><button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next →</button></div></div>}
    </section>
    <p className="s41-users-footnote">Account suspension is enforced through existing database policies. Actions do not delete accounts or automatically sign members out. Document reasons consistently. Summary counts reflect the loaded records, not necessarily the entire database.</p>
  </main></div>;
}


function AdminAuditLogsPage() {
  type AuditRow = { id: string; actor_id: string | null; action: string; target_type: string; target_id: string | null; details: Record<string, unknown>; created_at: string };
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    let alive = true;
    async function verify() {
      if (!supabase) { setNotice('Supabase is not configured.'); setChecking(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { navigate('/login'); return; }
      const admin = user.app_metadata?.role === 'admin';
      setAllowed(admin); setChecking(false);
      if (!admin) setNotice('This area is restricted to authorized administrators.');
    }
    void verify();
    return () => { alive = false; };
  }, [navigate]);

  async function loadLogs() {
    if (!supabase || !allowed) return;
    setLoading(true); setNotice('');
    const { data, error } = await supabase.from('admin_audit_logs')
      .select('id,actor_id,action,target_type,target_id,details,created_at')
      .order('created_at', { ascending: false }).limit(1000);
    if (error) { setNotice(`Could not load audit logs: ${error.message}`); setLoading(false); return; }
    const auditRows = (data ?? []) as AuditRow[];
    setRows(auditRows);
    const ids = [...new Set(auditRows.flatMap(r => [r.actor_id, r.target_id]).filter((id): id is string => Boolean(id)))];
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,display_name').in('id', ids);
      setNames(Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name || 'Member'])));
    } else setNames({});
    setLoading(false);
  }
  useEffect(() => { if (allowed) void loadLogs(); }, [allowed]);

  const filtered = rows.filter(row => {
    if (actionFilter !== 'all' && row.action !== actionFilter) return false;
    const date = row.created_at.slice(0, 10);
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return [row.action, row.target_type, row.actor_id ?? '', row.target_id ?? '', names[row.actor_id ?? ''] ?? '', names[row.target_id ?? ''] ?? '', JSON.stringify(row.details ?? {})].join(' ').toLowerCase().includes(needle);
  });

  function exportCsv() {
    const fields = ['created_at', 'action', 'actor_id', 'actor_name', 'target_type', 'target_id', 'target_name', 'details'];
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [fields.map(quote).join(','), ...filtered.map(row => [row.created_at, row.action, row.actor_id, names[row.actor_id ?? ''] ?? '', row.target_type, row.target_id, names[row.target_id ?? ''] ?? '', JSON.stringify(row.details ?? {})].map(quote).join(','))];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `kithalovers-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  if (checking) return <div className="app-page"><Header/><main className="wrap moderation-page"><p>Checking administrator access…</p></main></div>;
  if (!allowed) return <div className="app-page"><Header/><main className="wrap moderation-page"><div className="app-title"><div><div className="eyebrow">Trust & safety</div><h1>Administrator access required</h1><p>{notice || 'This page is only available to administrators.'}</p></div></div><Link to="/" className="button button-small">Return home</Link></main></div>;
  return <div className="app-page"><Header/><main className="discover-app wrap moderation-page kl-admin-pro">
    <div className="app-title"><div><div className="eyebrow">Trust & accountability</div><h1>Admin audit logs</h1><p>Review recorded report-status changes and account suspension or reactivation events.</p></div><div className="audit-actions"><button className="button button-small button-outline" onClick={() => void loadLogs()} disabled={loading}><LoaderCircle size={15} className={loading ? 'spin' : ''}/> Refresh</button><button className="button button-small" onClick={exportCsv} disabled={!filtered.length}>Export CSV</button></div></div>
    <section className="connection-section moderation-panel">
      <div className="audit-filters">
        <label>Search<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Admin, member, action or ID" /></label>
        <label>Action<select value={actionFilter} onChange={e => setActionFilter(e.target.value)}><option value="all">All actions</option><option value="report_status_changed">Report status changed</option><option value="account_suspended">Account suspended</option><option value="account_reactivated">Account reactivated</option></select></label>
        <label>From<input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></label>
        <label>To<input type="date" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} /></label>
        <span className="moderation-count">{filtered.length} record{filtered.length === 1 ? '' : 's'}</span>
      </div>
      {loading ? <div className="notice">Loading audit records…</div> : filtered.length === 0 ? <div className="moderation-empty"><ShieldCheck size={28}/><h2>No audit records found</h2><p>Try changing your filters. New report and account moderation actions will appear here after the Stage 10 SQL migration is installed.</p></div> : <div className="moderation-list">{filtered.map(row => <article className="moderation-report" key={row.id}>
        <div className="moderation-report-top"><div><span className="report-status status-reviewing">{row.action.replace(/_/g, ' ')}</span><p className="moderation-date">{new Date(row.created_at).toLocaleString()}</p></div><span className="moderation-id">#{row.id.slice(0, 8)}</span></div>
        <div className="audit-record-grid"><div><small>Administrator</small><strong>{names[row.actor_id ?? ''] || 'Administrator'}</strong><code>{row.actor_id ? `${row.actor_id.slice(0, 8)}…` : 'System / unavailable'}</code></div><div><small>Affected {row.target_type}</small><strong>{names[row.target_id ?? ''] || (row.target_id ? 'Member / record' : 'Not specified')}</strong><code>{row.target_id ? `${row.target_id.slice(0, 8)}…` : '—'}</code></div></div>
        <p className="moderation-details">{Object.entries(row.details ?? {}).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${String(value ?? '—')}`).join(' · ') || 'No additional details recorded'}</p>
      </article>)}</div>}
    </section>
    {notice && <div className="notice" role="status">{notice}</div>}
    <p className="moderation-footnote">Audit records are read-only to client accounts. CSV exports include administrator and affected-member identifiers; store exported files securely because they contain moderation history.</p>
  </main></div>;
}


function AdminDeletionRequestsPage() {
  type RequestRow = { id: string; user_id: string; reason: string | null; status: 'pending' | 'reviewing' | 'completed' | 'rejected'; admin_notes: string | null; created_at: string; updated_at: string; processed_at: string | null };
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'all' | RequestRow['status']>('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let alive = true;
    async function verify() {
      if (!supabase) { setNotice('Supabase is not configured.'); setChecking(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { navigate('/login'); return; }
      const admin = user.app_metadata?.role === 'admin';
      setAllowed(admin); setChecking(false);
      if (!admin) setNotice('This page is restricted to administrators.');
    }
    void verify(); return () => { alive = false; };
  }, [navigate]);
  async function loadRequests() {
    if (!supabase || !allowed) return;
    setLoading(true); setNotice('');
    let query = supabase.from('account_deletion_requests').select('id,user_id,reason,status,admin_notes,created_at,updated_at,processed_at').order('created_at', { ascending: false }).limit(300);
    if (filter !== 'all') query = query.eq('status', filter);
    const { data, error } = await query;
    if (error) { setNotice(`Could not load requests: ${error.message}. Confirm the Stage 12 SQL migration is installed.`); setLoading(false); return; }
    const rows = (data ?? []) as RequestRow[]; setRequests(rows); setNotes(Object.fromEntries(rows.map(row => [row.id, row.admin_notes ?? ''])));
    const ids = [...new Set(rows.map(row => row.user_id))];
    if (ids.length) { const { data: profiles } = await supabase.from('profiles').select('id,display_name').in('id', ids); setNames(Object.fromEntries((profiles ?? []).map(profile => [profile.id, profile.display_name || 'Member']))); } else setNames({});
    setLoading(false);
  }
  useEffect(() => { if (allowed) void loadRequests(); }, [allowed, filter]);
  async function saveRequest(row: RequestRow, status: RequestRow['status']) {
    if (!supabase) return;
    const { error } = await supabase.from('account_deletion_requests').update({ status, admin_notes: notes[row.id]?.trim() || null }).eq('id', row.id);
    if (error) { setNotice(`Could not update request: ${error.message}`); return; }
    setNotice(`Request updated to ${status}. This records the decision only; it does not delete the account.`); await loadRequests();
  }
  if (checking) return <div className="app-page"><Header/><main className="wrap moderation-page"><p>Checking administrator access…</p></main></div>;
  if (!allowed) return <div className="app-page"><Header/><main className="wrap moderation-page"><h1>Administrator access required</h1><p>{notice}</p><Link to="/" className="button button-small">Return home</Link></main></div>;
  return <div className="app-page"><Header/><main className="discover-app wrap moderation-page kl-admin-pro">
    <div className="app-title"><div><div className="eyebrow">Privacy administration</div><h1>Account deletion requests</h1><p>Review member requests and record decisions. Completing a request here does not automatically delete authentication or related data.</p></div><button className="button button-small button-outline" onClick={() => void loadRequests()} disabled={loading}>Refresh</button></div>
    <section className="connection-section moderation-panel"><div className="moderation-toolbar"><label>Request status<select value={filter} onChange={event => setFilter(event.target.value as typeof filter)}><option value="pending">Pending</option><option value="reviewing">Under review</option><option value="completed">Completed</option><option value="rejected">Rejected</option><option value="all">All statuses</option></select></label><span className="moderation-count">{requests.length} request{requests.length === 1 ? '' : 's'}</span></div>
    {loading ? <div className="notice">Loading requests…</div> : requests.length === 0 ? <div className="moderation-empty"><ShieldCheck size={28}/><h2>No requests in this view</h2><p>There are no account deletion requests matching this status.</p></div> : <div className="moderation-list">{requests.map(row => <article className="moderation-report" key={row.id}><div className="moderation-report-top"><div><span className="report-status status-reviewing">{row.status.replace('_', ' ')}</span><h2>{names[row.user_id] || 'Member'}</h2><p className="moderation-date">Submitted {new Date(row.created_at).toLocaleString()}</p></div><span className="moderation-id">#{row.id.slice(0, 8)}</span></div><div className="moderation-members"><div><small>Member ID</small><code>{row.user_id}</code></div><div><small>Last updated</small><strong>{new Date(row.updated_at).toLocaleString()}</strong></div></div>{row.reason && <p className="moderation-details"><strong>Member's reason:</strong> {row.reason}</p>}<label className="settings-form">Administrator notes<textarea value={notes[row.id] ?? ''} onChange={event => setNotes(current => ({ ...current, [row.id]: event.target.value }))} maxLength={2000} rows={2} placeholder="Internal processing notes (optional)"/></label><div className="moderation-actions"><label>Update status<select value={row.status} onChange={event => void saveRequest(row, event.target.value as RequestRow['status'])}><option value="pending">Pending</option><option value="reviewing">Under review</option><option value="completed">Completed</option><option value="rejected">Rejected</option></select></label><button className="button button-small" type="button" onClick={() => void saveRequest(row, row.status)}>Save notes</button></div>{row.processed_at && <p className="moderation-date">Decision recorded {new Date(row.processed_at).toLocaleString()}</p>}</article>)}</div>}</section>
    {notice && <div className="notice" role="status">{notice}</div>}<p className="moderation-footnote">Verify each request and follow your retention policy before using trusted server-side tools to delete the account. Never expose a Supabase service-role key in this browser app.</p>
  </main></div>;
}


function SafetyCenterPage() {
  return <div className="app-page">
    <Header />
    <main className="discover-app wrap moderation-page">
      <div className="app-title">
        <div>
          <div className="eyebrow">KithaLovers trust & safety</div>
          <h1>Your safety, your boundaries.</h1>
          <p>Practical guidance for making respectful connections and using the tools available on KithaLovers.</p>
        </div>
        <Link to="/settings" className="text-link">Privacy settings →</Link>
      </div>

      <section className="connection-section settings-panel">
        <div className="settings-heading">
          <div>
            <h2>Before you connect</h2>
            <p>Take your time. You never owe anyone a reply, personal details, money, or a meeting.</p>
          </div>
        </div>
        <ul className="safety-guide-list">
          <li><strong>Keep personal information private.</strong> Avoid sharing passwords, verification codes, financial information, your home address, or documents with people you have just met.</li>
          <li><strong>Watch for pressure and scams.</strong> Be cautious if someone asks for money, tries to move you quickly to another service, or pressures you to act urgently.</li>
          <li><strong>Meet thoughtfully.</strong> If you choose to meet in person, consider a public place, arrange your own transport, tell someone you trust, and leave if you feel uncomfortable.</li>
          <li><strong>Respect boundaries.</strong> Consent and respect matter online and offline. Stop contact when someone asks you to.</li>
        </ul>
      </section>

      <section className="connection-section settings-panel">
        <div className="settings-heading">
          <div>
            <h2>Block or report a member</h2>
            <p>If an interaction feels unsafe or violates community expectations, use the tools on the relevant profile or conversation when available.</p>
          </div>
        </div>
        <ul className="safety-guide-list">
          <li><strong>Block:</strong> Blocking is intended to prevent further interaction between the accounts in supported areas of the app.</li>
          <li><strong>Report:</strong> Include clear, factual details that help moderators review the concern. Do not include unnecessary sensitive information.</li>
          <li><strong>Follow up:</strong> Administrators can review submitted reports. Submitting a report does not guarantee a particular outcome or an immediate response.</li>
        </ul>
        <p className="moderation-footnote">For immediate danger or an emergency, contact your local emergency services or a trusted local support organisation. KithaLovers is not an emergency-response service.</p>
      </section>

      <section className="connection-section settings-panel">
        <div className="settings-heading">
          <div>
            <h2>Privacy and account control</h2>
            <p>You can manage several account choices from within KithaLovers.</p>
          </div>
        </div>
        <div className="safety-action-grid">
          <Link to="/settings" className="safety-action-card"><strong>Account settings</strong><span>Manage profile visibility and account details.</span><span className="text-link">Open settings →</span></Link>
          <Link to="/security" className="safety-action-card"><strong>Account security</strong><span>Review available sign-in and session security options.</span><span className="text-link">Open security →</span></Link>
          <Link to="/settings" className="safety-action-card"><strong>Data and deletion requests</strong><span>Export available account data or submit an account deletion request.</span><span className="text-link">Manage my data →</span></Link>
        </div>
      </section>

      <section className="connection-section settings-panel">
        <div className="settings-heading">
          <div>
            <h2>Community expectations</h2>
            <p>KithaLovers is for adults seeking respectful friendship, dating, or other mutually welcome connections.</p>
          </div>
        </div>
        <ul className="safety-guide-list">
          <li>No harassment, threats, hate, stalking, impersonation, or unwanted repeated contact.</li>
          <li>No fraud, coercion, sexual exploitation, or requests that pressure others to provide money or private information.</li>
          <li>No sharing another person's private information or images without permission.</li>
          <li>Use accurate information and do not create accounts to evade moderation or a block.</li>
        </ul>
      </section>

      <div className="notice" role="note">
        This Safety Center is guidance, not a guarantee of safety or legal advice. Review and adapt these guidelines, privacy disclosures, and support procedures to your organisation's actual practices and applicable law before public launch.
      </div>
      <p><Link to="/" className="text-link">← Back to KithaLovers home</Link></p>
    </main>
  </div>;
}



function HelpCenterPage() {
  const [openItems, setOpenItems] = useState<number[]>([0]);
  const groups = [
    { title: 'Getting started', items: [
      ['How do I create an account?', 'Choose Create account, register with your email, and follow the prompts to complete your profile. Google sign-in may also be available depending on your project configuration.'],
      ['Why do I need to complete my profile?', 'A complete, accurate profile helps other members understand your interests and makes discovery more useful. Only provide information you are comfortable sharing.'],
      ['Who can use KithaLovers?', 'KithaLovers is intended for adults aged 18 and over. Use accurate details and do not create an account on behalf of someone else.']
    ]},
    { title: 'Discovery and connections', items: [
      ['How does discovery work?', 'The Discover area helps you browse profiles. Availability and profile visibility depend on your settings and the information members have added.'],
      ['What is a connection request?', 'A connection request lets you express interest in connecting. The other member can respond to it; a match is created when the app’s matching flow confirms mutual interest.'],
      ['Where can I see my connections?', 'Open Connections from the main navigation to review your available connections and continue a conversation where messaging is enabled.']
    ]},
    { title: 'Messaging and photos', items: [
      ['Who can I message?', 'Messaging is designed for matched connections. If you cannot open a conversation, check your connection status and whether either account has been blocked or suspended.'],
      ['How do I add or change a profile photo?', 'Use your profile or profile setup controls to upload a photo. Choose an image you have the right to use and avoid uploading private documents or someone else’s image without permission.'],
      ['Why can’t I send a message or request?', 'Check your connection status and internet connection. Some actions may be restricted by account status, privacy settings, blocks, or moderation safeguards.']
    ]},
    { title: 'Privacy and account security', items: [
      ['How do I control profile visibility?', 'Open Account Settings to review the visibility option and other account details available to you. Changes depend on the app’s current settings and policies.'],
      ['How can I secure my account?', 'Open Account Security to review session options and available multi-factor authentication controls. Never share your password or one-time verification codes.'],
      ['Can I export or request deletion of my data?', 'Use the data-management controls in Account Settings to export available account information or submit a deletion request. A request may require administrator review; submitting it does not mean the account has already been deleted.']
    ]},
    { title: 'Safety and support', items: [
      ['How do I block or report someone?', 'Use the block or report controls available on the relevant profile or conversation. Include clear, factual information in a report and avoid sharing unnecessary sensitive details.'],
      ['What happens after I submit a report?', 'Administrators can review reports and decide what action is appropriate. Submitting a report does not guarantee a particular outcome or an immediate response.'],
      ['What if I am in immediate danger?', 'Contact local emergency services or a trusted local support organisation. KithaLovers is not an emergency-response service.']
    ]}
  ];
  let index = -1;
  return <div className="app-page"><Header/><main className="discover-app wrap help-page">
    <div className="app-title"><div><div className="eyebrow">KithaLovers support</div><h1>How can we help?</h1><p>Quick answers to common questions about your account, connections, privacy, and safety.</p></div><Link to="/" className="text-link">← Home</Link></div>
    <div className="help-shortcuts">
      <Link to="/settings" className="help-shortcut"><strong>Account settings</strong><span>Profile visibility and data controls →</span></Link>
      <Link to="/security" className="help-shortcut"><strong>Account security</strong><span>Sessions and sign-in protection →</span></Link>
      <Link to="/safety" className="help-shortcut"><strong>Trust &amp; Safety</strong><span>Safer connections and reporting →</span></Link>
    </div>
    {groups.map(group => <section className="connection-section settings-panel help-group" key={group.title}><h2>{group.title}</h2><div className="help-faq-list">{group.items.map(([question, answer]) => { index += 1; const itemIndex = index; const expanded = openItems.includes(itemIndex); return <article className="help-faq" key={question}><button type="button" className="help-question" aria-expanded={expanded} onClick={() => setOpenItems(old => expanded ? old.filter(item => item !== itemIndex) : [...old, itemIndex])}><span>{question}</span><span aria-hidden="true">{expanded ? '−' : '+'}</span></button>{expanded && <p className="help-answer">{answer}</p>}</article>; })}</div></section>)}
    <section className="connection-section settings-panel help-contact"><h2>Still need help?</h2><p>Review the relevant settings or safety guidance first. If you provide support outside the app, use your organisation’s verified support channel and never send passwords or authentication codes.</p><Link to="/safety" className="button button-primary">Visit Trust &amp; Safety <ArrowRight size={16}/></Link></section>
    <p className="moderation-footnote">This Help Center describes common app flows. Exact options may vary as KithaLovers evolves. For urgent danger, contact local emergency services.</p>
  </main></div>;
}


function ProtectedAdminModeration() {
  return <AdminModerationPage />;
}


function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [preferences, setPreferences] = useState({
    in_app_connection_requests: true,
    in_app_matches: true,
    in_app_messages: true,
    email_connection_requests: false,
    email_matches: true,
    email_messages: false,
    email_product_updates: false,
  });

  useEffect(() => {
    let alive = true;
    async function loadPreferences() {
      if (!supabase) {
        setNotice('Supabase is not configured. Add your project URL and anon key to enable notification preferences.');
        setLoading(false);
        return;
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate('/login');
        return;
      }
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('in_app_connection_requests,in_app_matches,in_app_messages,email_connection_requests,email_matches,email_messages,email_product_updates')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        setNotice(`Could not load preferences: ${error.message}. Run the Stage 16 SQL migration, then reload.`);
      } else if (data) {
        setPreferences(current => ({ ...current, ...data }));
      }
      setLoading(false);
    }
    void loadPreferences();
    return () => { alive = false; };
  }, [navigate]);

  function updatePreference(key: keyof typeof preferences, value: boolean) {
    setPreferences(current => ({ ...current, [key]: value }));
    setNotice('');
  }

  async function savePreferences(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setNotice('Supabase is not configured.');
      return;
    }
    setSaving(true);
    setNotice('');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setSaving(false);
      navigate('/login');
      return;
    }
    const { error } = await supabase.from('notification_preferences').upsert({
      user_id: user.id,
      ...preferences,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) {
      setNotice(`Could not save preferences: ${error.message}. Confirm that the Stage 16 SQL migration has been run.`);
      return;
    }
    setNotice('Your notification preferences have been saved.');
  }

  const inAppRows: { key: keyof typeof preferences; title: string; description: string }[] = [
    { key: 'in_app_connection_requests', title: 'Connection requests', description: 'Show in-app indicators when someone requests to connect.' },
    { key: 'in_app_matches', title: 'New matches', description: 'Show in-app indicators when a mutual connection is created.' },
    { key: 'in_app_messages', title: 'New messages', description: 'Show unread-message indicators in the app.' },
  ];
  const emailRows: { key: keyof typeof preferences; title: string; description: string }[] = [
    { key: 'email_connection_requests', title: 'Connection requests', description: 'Email me when someone requests to connect.' },
    { key: 'email_matches', title: 'New matches', description: 'Email me when a mutual match is created.' },
    { key: 'email_messages', title: 'New messages', description: 'Email me when I receive a new message. Message text is never included in notification emails.' },
    { key: 'email_product_updates', title: 'Occasional product updates', description: 'Receive occasional news about KithaLovers features and improvements.' },
  ];

  return <div className="app-page">
    <Header />
    <main className="discover-app wrap notification-page">
      <div className="app-title">
        <div><div className="eyebrow">Make it yours</div><h1>Notification preferences</h1><p>Choose which updates you want to see and which emails you would like to receive.</p></div>
        <Link to="/settings" className="text-link">← Account settings</Link>
      </div>
      {loading ? <div className="connection-section settings-panel"><p>Loading your preferences…</p></div> : <>
        <form onSubmit={savePreferences}>
          <section className="connection-section settings-panel notification-panel">
            <div className="settings-heading"><div><h2>In-app notifications</h2><p>Control notification indicators inside KithaLovers.</p></div></div>
            <div className="preference-list">
              {inAppRows.map(row => <label className="preference-row" key={row.key}>
                <span className="preference-copy"><strong>{row.title}</strong><small>{row.description}</small></span>
                <input type="checkbox" checked={preferences[row.key]} onChange={e => updatePreference(row.key, e.target.checked)} aria-label={row.title} />
              </label>)}
            </div>
          </section>
          <section className="connection-section settings-panel notification-panel">
            <div className="settings-heading"><div><h2>Email notifications</h2><p>Choose which email alerts you would like to opt into.</p></div></div>
            <div className="preference-list">
              {emailRows.map(row => <label className="preference-row" key={row.key}>
                <span className="preference-copy"><strong>{row.title}</strong><small>{row.description}</small></span>
                <input type="checkbox" checked={preferences[row.key]} onChange={e => updatePreference(row.key, e.target.checked)} aria-label={row.title} />
              </label>)}
            </div>
            <p className="notification-privacy-note">Privacy note: email alerts should contain only a brief event notice and a secure link back to KithaLovers—not private message content or another member’s sensitive details.</p>
          </section>
          <div className="notification-save-row"><button className="button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button><Link to="/help" className="text-link">Visit Help Center →</Link></div>
        </form>
        {notice && <div className="notice" role="status">{notice}</div>}
      </>}
      <p className="notification-footnote">Your choices are stored privately with your account. Actual email delivery requires a configured server-side email provider and event sender. Never place provider API keys in browser code.</p>
    </main>
  </div>;
}

function NotificationCenterPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingRead, setClearingRead] = useState(false);
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const unreadCount = notifications.filter(item => !item.read_at).length;
  const readCount = notifications.filter(item => Boolean(item.read_at)).length;

  async function loadNotifications(showLoading = true) {
    if (!supabase) {
      setNotice('Supabase is not configured. Add your project URL and anon key to load notifications.');
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { navigate('/login'); return; }
    setUserId(user.id);
    const { data, error } = await supabase.from('user_notifications')
      .select('id,type,title,body,target_path,actor_id,entity_id,read_at,created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
    if (error) {
      setNotice(`Could not load notifications: ${error.message}. Apply supabase/stage18_in_app_notifications.sql first.`);
    } else {
      setNotifications(data ?? []);
      setNotice('');
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadNotifications();
    if (!supabase) return;
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | undefined;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data.user) return;
      channel = supabase!.channel(`notification-center-${data.user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${data.user.id}` }, () => { void loadNotifications(false); })
        .subscribe();
    });
    return () => { alive = false; if (channel) void supabase!.removeChannel(channel); };
  }, [navigate]);

  async function markRead(id: string) {
    if (!supabase || !userId) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from('user_notifications').update({ read_at: now }).eq('id', id).eq('user_id', userId).is('read_at', null);
    if (error) { setNotice(`Could not mark notification as read: ${error.message}`); return; }
    setNotifications(current => current.map(item => item.id === id ? { ...item, read_at: now } : item));
  }

  async function markAllRead() {
    if (!supabase || !userId || unreadCount === 0) return;
    setBusy(true); setNotice('');
    const now = new Date().toISOString();
    const { error } = await supabase.from('user_notifications').update({ read_at: now }).eq('user_id', userId).is('read_at', null);
    setBusy(false);
    if (error) { setNotice(`Could not mark notifications as read: ${error.message}`); return; }
    setNotifications(current => current.map(item => item.read_at ? item : { ...item, read_at: now }));
    setNotice('All notifications marked as read.');
  }

  async function deleteNotification(id: string) {
    if (!supabase || !userId || deletingId) return;
    const item = notifications.find(row => row.id === id);
    if (!item) return;
    if (!window.confirm('Delete this notification? This cannot be undone.')) return;
    setDeletingId(id);
    setNotice('');
    const { error } = await supabase.from('user_notifications')
      .delete().eq('id', id).eq('user_id', userId);
    setDeletingId(null);
    if (error) {
      setNotice(`Could not delete notification: ${error.message}. Apply supabase/stage20_notification_controls.sql if needed.`);
      return;
    }
    setNotifications(current => current.filter(row => row.id !== id));
    setNotice('Notification deleted.');
  }

  async function clearReadNotifications() {
    if (!supabase || !userId || readCount === 0 || clearingRead) return;
    if (!window.confirm(`Delete all ${readCount} read notification${readCount === 1 ? '' : 's'}? Unread notifications will be kept.`)) return;
    setClearingRead(true);
    setNotice('');
    const { error } = await supabase.from('user_notifications')
      .delete().eq('user_id', userId).not('read_at', 'is', null);
    setClearingRead(false);
    if (error) {
      setNotice(`Could not clear read notifications: ${error.message}. Apply supabase/stage20_notification_controls.sql if needed.`);
      return;
    }
    setNotifications(current => current.filter(item => !item.read_at));
    setNotice('Read notifications cleared. Unread notifications were kept.');
  }

  function notificationDestination(item: any): string {
    // Build destinations from known notification types instead of trusting a stored path.
    // The destination pages perform their own signed-in-user / resource-access checks.
    const entityId = typeof item.entity_id === 'string' ? item.entity_id : '';
    if (item.type === 'connection_request') {
      return entityId ? `/connections?requestId=${encodeURIComponent(entityId)}` : '/connections';
    }
    if ((item.type === 'match' || item.type === 'message') && entityId) {
      return `/messages/${encodeURIComponent(entityId)}`;
    }
    return '/connections';
  }

  async function openNotification(item: any) {
    if (!item.read_at) await markRead(item.id);
    navigate(notificationDestination(item));
  }

  const visible = filter === 'unread' ? notifications.filter(item => !item.read_at) : notifications;
  return <div className="app-page"><Header/><main className="discover-app wrap notification-center-page">
    <div className="app-title"><div><div className="eyebrow"><Bell size={14}/> Stay in the loop</div><h1>Notification center</h1><p>Your connection requests, matches, and messages—all in one place.</p></div><Link to="/notifications" className="text-link">Notification preferences →</Link></div>
    <section className="connection-section notification-center-panel">
      <div className="notification-center-toolbar"><div><h2>Recent activity <span className="count-pill">{unreadCount} unread</span></h2><p>Showing up to 100 recent notifications. Private message contents are never shown here.</p></div><div className="notification-center-actions"><button type="button" className="button button-small button-outline" onClick={() => void loadNotifications()} disabled={loading || busy || clearingRead}><RefreshCw size={14}/> Refresh</button><button type="button" className="button button-small button-outline" onClick={() => void clearReadNotifications()} disabled={clearingRead || busy || readCount === 0}>{clearingRead ? 'Clearing…' : <><Trash2 size={14}/> Clear read ({readCount})</>}</button><button type="button" className="button button-small" onClick={() => void markAllRead()} disabled={busy || clearingRead || unreadCount === 0}>{busy ? 'Updating…' : <><CheckCheck size={15}/> Mark all read</>}</button></div></div>
      <div className="notification-filter-tabs"><button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All ({notifications.length})</button><button type="button" className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>Unread ({unreadCount})</button></div>
      {loading ? <p className="empty-copy notification-center-empty">Loading notifications…</p> : visible.length ? <div className="notification-feed">{visible.map(item => <article key={item.id} className={`notification-item ${item.read_at ? 'notification-read' : 'notification-unread'}`}>
        <div className="notification-item-icon">{item.type === 'message' ? <MessageCircle size={19}/> : item.type === 'match' ? <Heart size={19}/> : <Users size={19}/>}</div>
        <button type="button" className="notification-item-content" onClick={() => void openNotification(item)}><span className="notification-item-title">{item.title}</span><span className="notification-item-body">{item.body}</span><time>{new Date(item.created_at).toLocaleString()}</time></button>
        {!item.read_at && <button type="button" className="notification-mark-read" aria-label="Mark notification as read" title="Mark as read" onClick={() => void markRead(item.id)}><CheckCheck size={17}/></button>}
        <button type="button" className="notification-delete" aria-label="Delete notification" title="Delete notification" disabled={deletingId === item.id || clearingRead} onClick={() => void deleteNotification(item.id)}>{deletingId === item.id ? <LoaderCircle size={16} className="spin"/> : <Trash2 size={16}/>}</button>
        {!item.read_at && <span className="notification-unread-dot" aria-label="Unread"/>}
      </article>)}</div> : <div className="empty-state notification-center-empty"><Inbox size={32}/><h2>{filter === 'unread' ? 'You’re all caught up' : 'No notifications yet'}</h2><p>{filter === 'unread' ? 'There are no unread notifications right now.' : 'When you receive a connection request, match, or message, it will appear here.'}</p>{filter === 'unread' && <button className="button button-small" onClick={() => setFilter('all')}>View all notifications</button>}</div>}
    </section>
    {notice && <div className="notice" role="status">{notice}</div>}
    <p className="notification-footnote">Notifications are private to your account. You can control which types appear in-app from <Link to="/notifications" className="text-link">notification preferences</Link>.</p>
  </main></div>;
}

type VerificationRequest = {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  evidence_path: string;
  evidence_type: string;
  member_note: string | null;
  admin_review_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

function VerificationPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState('');
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [latest, setLatest] = useState<VerificationRequest | null>(null);
  const [evidenceType, setEvidenceType] = useState('government_id');
  const [memberNote, setMemberNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function load() {
    if (!supabase) { setNotice('Supabase is not configured.'); setChecking(false); return; }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { navigate('/login'); return; }
    setUserId(user.id);
    const [profile, request] = await Promise.all([
      supabase.from('profiles').select('display_name,verified_at').eq('id', user.id).maybeSingle(),
      supabase.from('profile_verification_requests').select('id,user_id,status,evidence_path,evidence_type,member_note,admin_review_reason,created_at,reviewed_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    ]);
    if (profile.error) setNotice(`Could not load your profile: ${profile.error.message}`);
    else { setVerifiedAt(profile.data?.verified_at ?? null); }
    if (request.error && !request.error.message.includes('profile_verification_requests')) setNotice(`Could not load verification status: ${request.error.message}`);
    setLatest((request.data ?? null) as VerificationRequest | null);
    setChecking(false);
  }
  useEffect(() => { void load(); }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !userId) return;
    if (!file) { setNotice('Choose a supporting image or PDF before submitting.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) { setNotice('Use a JPG, PNG, WebP image, or PDF.'); return; }
    if (file.size > 8 * 1024 * 1024) { setNotice('The file must be 8 MB or smaller.'); return; }
    setBusy(true); setNotice('');
    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'evidence';
    const path = `${userId}/${id}/${safeName}`;
    try {
      const { error: uploadError } = await supabase.storage.from('verification-evidence').upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from('profile_verification_requests').insert({
        id, user_id: userId, status: 'pending', evidence_path: path, evidence_type: evidenceType,
        member_note: memberNote.trim() || null
      });
      if (insertError) {
        await supabase.storage.from('verification-evidence').remove([path]);
        throw insertError;
      }
      setNotice('Your verification request has been submitted securely. An administrator will review it.');
      setFile(null); setMemberNote('');
      const input = document.getElementById('verification-evidence-file') as HTMLInputElement | null;
      if (input) input.value = '';
      await load();
    } catch (error) {
      setNotice(`Could not submit verification request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally { setBusy(false); }
  }

  if (checking) return <div className="app-page"><Header/><main className="wrap verification-page"><p>Loading verification status…</p></main></div>;
  const pending = latest?.status === 'pending';
  return <div className="app-page"><Header/><main className="wrap verification-page">
    <div className="app-title"><div><div className="eyebrow">Trust & safety</div><h1>Profile verification</h1><p>Help other members feel more confident that your profile has been reviewed.</p></div>{verifiedAt && <span className="verification-approved"><BadgeCheck size={17}/> Verified</span>}</div>
    <section className="connection-section verification-intro"><div className="verification-icon"><ShieldCheck size={26}/></div><div><h2>{verifiedAt ? 'Your profile is verified' : 'A little more confidence, clearly earned'}</h2><p>{verifiedAt ? 'An administrator approved your verification request. Your profile may show a Verified badge.' : 'Submit a supporting document for a manual review. Your evidence is stored in a private bucket and is not shown on your public profile.'}</p><small>The badge confirms that a verification review was approved; it is not a guarantee of a person’s character, intentions, or safety.</small></div></section>
    {latest && <section className="connection-section verification-status-card"><div className="verification-status-head"><h2>Latest request</h2><span className={`report-status ${latest.status === 'approved' ? 'status-resolved' : latest.status === 'rejected' ? 'status-dismissed' : 'status-reviewing'}`}>{latest.status === 'pending' ? 'Under review' : latest.status}</span></div><p className="moderation-date">Submitted {new Date(latest.created_at).toLocaleString()}</p>{latest.admin_review_reason && <p className="moderation-details"><strong>Review note:</strong> {latest.admin_review_reason}</p>}{pending && <p className="verification-muted">Your request is waiting for an administrator. You cannot submit another request until this one is reviewed.</p>}</section>}
    {!verifiedAt && !pending && <form className="connection-section verification-form" onSubmit={submit}><h2>Submit verification evidence</h2><p>Only submit a document you are comfortable sharing with authorized KithaLovers administrators. Avoid uploading unrelated personal or financial information.</p><label>Evidence type<select value={evidenceType} onChange={e => setEvidenceType(e.target.value)}><option value="government_id">Government-issued identity document</option><option value="selfie_with_id">Selfie holding an identity document</option><option value="other">Other supporting evidence</option></select></label><label>Supporting file<input id="verification-evidence-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} required/><small>JPG, PNG, WebP, or PDF. Maximum 8 MB. The file stays private.</small></label><label>Optional note<textarea value={memberNote} onChange={e => setMemberNote(e.target.value)} maxLength={500} rows={3} placeholder="Anything the reviewer should know (optional)"/></label><button className="button" disabled={busy}>{busy ? 'Submitting securely…' : 'Submit for review'} <ArrowRight size={16}/></button></form>}
    {notice && <div className="notice" role="status">{notice}</div>}
    <p className="verification-privacy"><ShieldCheck size={16}/> Verification evidence is private and is not included in your profile, discovery card, or notifications. You may contact support if you need help with a review decision.</p>
  </main></div>;
}

function AdminVerificationsPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<VerificationRequest[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    async function verify() {
      if (!supabase) { setNotice('Supabase is not configured.'); setChecking(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { navigate('/login'); return; }
      const admin = user.app_metadata?.role === 'admin';
      setAllowed(admin); setChecking(false);
      if (!admin) setNotice('This area is restricted to authorized administrators.');
    }
    void verify(); return () => { alive = false; };
  }, [navigate]);

  async function loadRows() {
    if (!supabase || !allowed) return;
    setLoading(true); setNotice('');
    let query = supabase.from('profile_verification_requests').select('id,user_id,status,evidence_path,evidence_type,member_note,admin_review_reason,created_at,reviewed_at').order('created_at', { ascending: false }).limit(300);
    if (filter === 'pending') query = query.eq('status', 'pending');
    const { data, error } = await query;
    if (error) { setNotice(`Could not load verification requests: ${error.message}. Apply supabase/stage21_profile_verification.sql first.`); setRows([]); setLoading(false); return; }
    const items = (data ?? []) as VerificationRequest[];
    setRows(items);
    const ids = [...new Set(items.map(item => item.user_id))];
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,display_name').in('id', ids);
      setNames(Object.fromEntries((profiles ?? []).map(profile => [profile.id, profile.display_name || 'Member'])));
    } else setNames({});
    setLoading(false);
  }
  useEffect(() => { if (allowed) void loadRows(); }, [allowed, filter]);

  async function review(row: VerificationRequest, status: 'approved' | 'rejected') {
    if (!supabase) return;
    const reason = (reasonById[row.id] ?? '').trim();
    if (status === 'rejected' && reason.length < 5) { setNotice('Add a review reason of at least 5 characters before rejecting.'); return; }
    if (status === 'approved' && reason.length < 3) { setNotice('Add a short review note describing what was checked before approving.'); return; }
    setBusyId(row.id); setNotice('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusyId(''); navigate('/login'); return; }
    const { error } = await supabase.from('profile_verification_requests').update({ status, admin_review_reason: reason, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', row.id).eq('status', 'pending');
    if (error) setNotice(`Could not ${status} request: ${error.message}`);
    else { setNotice(`Request ${status}. ${status === 'approved' ? 'The member’s Verified badge is now enabled.' : 'The member can review the decision and submit a new request.'}`); await loadRows(); }
    setBusyId('');
  }

  async function openEvidence(row: VerificationRequest) {
    if (!supabase) return;
    const { data, error } = await supabase.storage.from('verification-evidence').createSignedUrl(row.evidence_path, 60);
    if (error || !data?.signedUrl) { setNotice(`Could not open private evidence: ${error?.message ?? 'No signed link returned'}`); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  if (checking) return <div className="app-page"><Header/><main className="wrap moderation-page"><p>Checking administrator access…</p></main></div>;
  if (!allowed) return <div className="app-page"><Header/><main className="wrap moderation-page"><h1>Administrator access required</h1><p>{notice || 'This page is only available to administrators.'}</p><Link to="/" className="button button-small">Return home</Link></main></div>;
  return <div className="app-page"><Header/><main className="wrap moderation-page verification-admin-page kl-admin-pro">
    <div className="app-title"><div><div className="eyebrow">Trust & safety</div><h1>Verification reviews</h1><p>Review evidence privately and record a clear reason for each decision.</p></div><button className="button button-small button-outline" onClick={() => void loadRows()} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    <div className="notification-filter-tabs verification-filter"><button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>Pending</button><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All requests</button></div>
    {loading ? <div className="notice">Loading requests…</div> : rows.length === 0 ? <div className="empty-state"><FileCheck2 size={30}/><h2>No requests to review</h2><p>New member submissions will appear here.</p></div> : <div className="moderation-list">{rows.map(row => <article className="moderation-report" key={row.id}><div className="moderation-report-top"><div><span className={`report-status ${row.status === 'approved' ? 'status-resolved' : row.status === 'rejected' ? 'status-dismissed' : 'status-reviewing'}`}>{row.status}</span><h2>{names[row.user_id] || 'Member'}</h2><p className="moderation-date">Submitted {new Date(row.created_at).toLocaleString()} · {row.evidence_type.replace(/_/g, ' ')}</p></div><span className="moderation-id">#{row.id.slice(0, 8)}</span></div>{row.member_note && <p className="moderation-details"><strong>Member note:</strong> {row.member_note}</p>}<div className="verification-admin-actions"><button className="button button-small button-outline" onClick={() => void openEvidence(row)}><ExternalLink size={15}/> Open private evidence</button>{row.status === 'pending' && <><label>Review reason / notes<textarea value={reasonById[row.id] ?? ''} onChange={e => setReasonById(prev => ({ ...prev, [row.id]: e.target.value }))} rows={2} maxLength={500} placeholder="Document what was checked or why the request is declined"/></label><div className="verification-decision-actions"><button className="button button-small" disabled={busyId === row.id} onClick={() => void review(row, 'approved')}>{busyId === row.id ? 'Saving…' : 'Approve & verify'}</button><button className="button button-small button-danger" disabled={busyId === row.id} onClick={() => void review(row, 'rejected')}>Reject request</button></div></>}</div>{row.admin_review_reason && <p className="moderation-details"><strong>Decision note:</strong> {row.admin_review_reason}</p>}</article>)}</div>}
    {notice && <div className="notice" role="status">{notice}</div>}
    <p className="moderation-footnote">Only an administrator can approve a request. Evidence is delivered using a short-lived signed link and remains in private storage. A verified badge means the review process was completed; it is not a promise of safety or identity beyond the evidence actually checked.</p>
  </main></div>;
}


// Stage 24: Visits are recorded only when a member opens a full profile.
// Discovery impressions are deliberately not counted as visits.
type ActivitySummary = {
  total_views: number;
  unique_visitors: number;
  favorites_received: number;
  recent_visitors: { id: string; visited_at: string; display_name: string; photo_url: string | null }[];
};
function ProfileActivityPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<ActivitySummary | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [userId, setUserId] = useState('');
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { setNotice('Supabase is not configured.'); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);
      const [activity, prefs] = await Promise.all([
        supabase.rpc('my_profile_activity'),
        supabase.from('profile_visit_preferences').select('anonymous_browsing').eq('user_id', user.id).maybeSingle()
      ]);
      if (!alive) return;
      if (activity.error || prefs.error) setNotice(`Unable to load activity: ${activity.error?.message || prefs.error?.message}. Run the Stage 24 SQL migration.`);
      else {
        setStats(activity.data as ActivitySummary);
        setAnonymous(Boolean(prefs.data?.anonymous_browsing));
      }
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, [navigate]);
  async function updateAnonymous(next: boolean) {
    if (!supabase || !userId) return;
    setSaving(true); setNotice('');
    const { error } = await supabase.from('profile_visit_preferences').upsert({ user_id: userId, anonymous_browsing: next, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { setNotice(`Unable to save privacy setting: ${error.message}`); return; }
    setAnonymous(next);
    setNotice(next ? 'Anonymous browsing enabled. Your visits will not be recorded, and your previous visits will no longer appear in visitor lists.' : 'Anonymous browsing disabled. Future profile visits may be recorded.');
  }
  return <div className="app-page"><Header/><main className="wrap stage24-page">
    <div className="app-title"><div><div className="eyebrow"><BarChart3 size={15}/> Member insights</div><h1>Profile activity</h1><p>See how your profile is being discovered and manage visit privacy.</p></div><Link to="/discover" className="text-link">Discover people →</Link></div>
    {loading ? <div className="notice">Loading profile activity…</div> : <>
      <div className="stage24-stats">
        <article><Eye size={23}/><strong>{stats?.total_views ?? 0}</strong><span>Total profile views</span></article>
        <article><Users size={23}/><strong>{stats?.unique_visitors ?? 0}</strong><span>Unique visitors</span></article>
        <article><Heart size={23}/><strong>{stats?.favorites_received ?? 0}</strong><span>Favorites received</span></article>
      </div>
      <section className="stage24-privacy"><div><h2>{anonymous ? <EyeOff size={20}/> : <Eye size={20}/>} Anonymous browsing</h2><p>When enabled, your future profile visits are not recorded. Your earlier visits are hidden from other members' visitor lists while this setting is on. Existing visit counts may still include previous visits.</p></div><label className="stage24-toggle"><input type="checkbox" checked={anonymous} disabled={saving} onChange={e => void updateAnonymous(e.target.checked)}/> Browse anonymously</label></section>
      <section className="stage24-visitors"><h2>Recent visitors</h2><p>Only identifiable visits are shown. Members browsing anonymously are not listed.</p>
        {!(stats?.recent_visitors?.length) ? <div className="empty-state"><Eye size={28}/><h3>No recent visitors</h3><p>When someone views your full profile, they may appear here.</p></div> : <div className="stage24-visitor-list">{stats.recent_visitors.map(visitor => <div className="stage24-visitor" key={visitor.id}><div className="stage24-avatar">{visitor.photo_url ? <img loading="lazy" decoding="async" src={visitor.photo_url} alt=""/> : <Users size={22}/>}</div><div><strong>{visitor.display_name || 'Member'}</strong><small>Last visited {new Date(visitor.visited_at).toLocaleString()}</small></div><Link to={`/members/${visitor.id}`} className="button button-small button-outline">View profile</Link></div>)}</div>}
      </section>
    </>}
    {notice && <div className="notice" role="status">{notice}</div>}
  </main></div>;
}
function MemberProfilePage() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DiscoverProfile | null>(null);
  const [memberPhotos, setMemberPhotos] = useState<PublicGalleryPhoto[]>([]);
  const [memberInterests, setMemberInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase || !memberId) { setNotice('Member not found.'); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { navigate('/login'); return; }
      if (user.id === memberId) { navigate('/profile-setup'); return; }
      const [res, blocks] = await Promise.all([
        supabase.from('profiles').select('id,display_name,birth_date,bio,city,country,intent,photo_url,verified_at').eq('id', memberId).eq('is_visible', true).eq('is_suspended', false).maybeSingle(),
        supabase.from('blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
      ]);
      if (!alive) return;
      if (res.error || blocks.error) { setNotice(res.error?.message || blocks.error?.message || 'Could not load profile.'); setLoading(false); return; }
      if (!res.data || (blocks.data ?? []).some(b => (b.blocker_id === user.id && b.blocked_id === memberId) || (b.blocker_id === memberId && b.blocked_id === user.id))) { setNotice('This profile is unavailable.'); setLoading(false); return; }
      setProfile({ ...res.data, interests: [] } as DiscoverProfile);
      const [galleryResult, interestResult] = await Promise.all([
        supabase.from('profile_gallery_photos').select('id,photo_url,sort_order').eq('user_id', memberId).order('sort_order', {ascending: true}),
        supabase.from('profile_interests').select('interests(name)').eq('profile_id', memberId)
      ]);
      if (!alive) return;
      if (galleryResult.error) setNotice(`Gallery unavailable: ${galleryResult.error.message}. Run Stage 35 SQL.`);
      else setMemberPhotos(galleryResult.data ?? []);
      if (!interestResult.error) {
        const names: string[] = [];
        for (const row of (interestResult.data ?? []) as unknown as {interests: {name:string} | {name:string}[] | null}[]) {
          const entries = Array.isArray(row.interests) ? row.interests : row.interests ? [row.interests] : [];
          names.push(...entries.map(item => item.name));
        }
        setMemberInterests(names);
      }
      setLoading(false);
      // The database function checks privacy, visibility, blocks, and rate limits.
      const visit = await supabase.rpc('record_profile_visit', { target_profile_id: memberId });
      if (visit.error && alive) setNotice(`Visit tracking is unavailable: ${visit.error.message}. Run the Stage 24 SQL migration.`);
    }
    void load();
    return () => { alive = false; };
  }, [memberId, navigate]);
  async function blockViewedMember() {
    if (!supabase || !memberId || !window.confirm('Block this member? They will no longer be able to interact with you.')) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === memberId) return;
    const { error } = await supabase.from('blocks').upsert({ blocker_id: user.id, blocked_id: memberId }, { onConflict: 'blocker_id,blocked_id' });
    if (error) { setNotice(`Unable to block: ${error.message}`); return; }
    setProfile(null); setNotice('Member blocked. You can manage blocked accounts under Blocked users.');
  }
  return <div className="app-page"><Header/><main className="wrap stage24-page"><div className="app-title"><div><div className="eyebrow">Member profile</div><h1>Get to know each other</h1><p>Profiles are visible only when members choose to be discoverable.</p></div><Link to="/discover" className="text-link">Back to discovery →</Link></div>
    {loading ? <div className="notice">Loading profile…</div> : profile ? <article className="stage24-member"><div className="stage24-member-photo">{profile.photo_url || memberPhotos.length ? <PublicPhotoGallery photos={memberPhotos} mainPhoto={profile.photo_url} name={profile.display_name}/> : <Users size={55}/>}</div><div><h2>{profile.display_name}{ageFromBirthDate(profile.birth_date) !== null ? `, ${ageFromBirthDate(profile.birth_date)}` : ''}</h2>{profile.verified_at && <span className="verified-badge"><BadgeCheck size={15}/> Verified</span>}<PresenceIndicator memberId={profile.id}/><p>{[profile.city, profile.country].filter(Boolean).join(', ') || 'Location not provided'}</p><p>{profile.bio || 'No bio added yet.'}</p><p><strong>Looking for:</strong> {profile.intent === 'both' ? 'Friendship & dating' : profile.intent === 'friendship' ? 'Friendship' : 'Dating'}</p>{memberInterests.length > 0 && <div className="interest-row">{memberInterests.map(interest => <span key={interest}>{interest}</span>)}</div>}<Link to="/discover" className="button button-small">Discover more profiles</Link> <button className="button button-small button-outline danger-outline" onClick={() => void blockViewedMember()}><Ban size={15}/> Block member</button></div></article> : <div className="empty-state">Profile unavailable.</div>}
    {notice && <div className="notice" role="status">{notice}</div>}
  </main></div>;
}

function BlockedUsersPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<{ id: string; name: string; created_at: string }[]>([]);
  const [policy, setPolicy] = useState('everyone');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [userId, setUserId] = useState('');

  async function load() {
    if (!supabase) { setNotice('Supabase is not configured.'); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }
    setUserId(user.id);
    const [blocksRes, profileRes] = await Promise.all([
      supabase.from('blocks').select('blocked_id,created_at').eq('blocker_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('connection_request_policy').eq('id', user.id).single()
    ]);
    if (blocksRes.error || profileRes.error) { setNotice(`Unable to load privacy settings: ${blocksRes.error?.message || profileRes.error?.message}`); setLoading(false); return; }
    setPolicy(profileRes.data?.connection_request_policy ?? 'everyone');
    const rows = blocksRes.data ?? [];
    // A blocked profile may be invisible by RLS; keep the entry so it can always be unblocked.
    const { data: names } = rows.length ? await supabase.from('profiles').select('id,display_name').in('id', rows.map(r => r.blocked_id)) : { data: [] as {id:string;display_name:string}[] };
    const nameMap = new Map((names ?? []).map(n => [n.id, n.display_name]));
    setMembers(rows.map(r => ({ id: r.blocked_id, name: nameMap.get(r.blocked_id) || 'Blocked member', created_at: r.created_at })));
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  async function unblock(id: string) {
    if (!supabase || !userId || !window.confirm('Unblock this member? They may become visible or contact you again depending on your settings.')) return;
    setBusy(id); setNotice('');
    const { error } = await supabase.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', id);
    setBusy('');
    if (error) { setNotice(`Could not unblock member: ${error.message}`); return; }
    setMembers(rows => rows.filter(r => r.id !== id)); setNotice('Member unblocked.');
  }
  async function updatePolicy(next: string) {
    if (!supabase || !userId) return;
    setBusy('policy'); setNotice('');
    const { error } = await supabase.from('profiles').update({ connection_request_policy: next }).eq('id', userId);
    setBusy('');
    if (error) { setNotice(`Could not update setting: ${error.message}`); return; }
    setPolicy(next); setNotice('Connection request preference saved.');
  }
  return <div className="app-page"><Header/><main className="wrap stage25-page">
    <div className="app-title"><div><div className="eyebrow"><ShieldCheck size={15}/> Privacy management</div><h1>Blocked users</h1><p>Manage blocked accounts and choose who can request a connection.</p></div><Link to="/settings" className="text-link">Settings →</Link></div>
    <section className="connection-section settings-panel"><h2>Who can send me connection requests?</h2><p className="settings-help">Existing matches and messages are not deleted when you change this setting.</p><label className="stage25-policy">Connection requests<select aria-label="Who can send connection requests" value={policy} disabled={busy === 'policy'} onChange={e => void updatePolicy(e.target.value)}><option value="everyone">Everyone (visible members)</option><option value="none">Nobody</option></select></label></section>
    <section className="connection-section settings-panel"><h2>Accounts you've blocked ({members.length})</h2><p className="settings-help">Blocking prevents new connection requests and messages and hides profiles from discovery. Existing conversations are inaccessible while blocked.</p>
      {loading ? <p>Loading blocked users…</p> : members.length ? <div className="stage25-block-list">{members.map(member => <div className="stage25-block-row" key={member.id}><div><strong>{member.name}</strong><small>Blocked {new Date(member.created_at).toLocaleDateString()}</small></div><button className="button button-small button-outline" disabled={busy === member.id} onClick={() => void unblock(member.id)}>{busy === member.id ? 'Unblocking…' : 'Unblock'}</button></div>)}</div> : <p className="empty-copy">You haven't blocked anyone.</p>}
    </section>{notice && <div className="notice" role="status">{notice}</div>}
  </main></div>;
}

// Keep navigation predictable when moving between pages.
function NavigationScrollManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

type Stage44BoundaryState = { hasError: boolean };
class Stage44ErrorBoundary extends Component<{ children: ReactNode }, Stage44BoundaryState> {
  state: Stage44BoundaryState = { hasError: false };
  static getDerivedStateFromError(): Stage44BoundaryState { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('KithaLovers page error:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) return <div className="stage44-error" role="alert">
      <div className="stage44-error-card"><ShieldCheck size={32}/><h1>Something went wrong</h1>
      <p>This page could not be displayed. Your account information has not been changed by this error.</p>
      <button className="button" type="button" onClick={() => this.setState({ hasError: false })}>Try again</button>
      <button className="button button-outline" type="button" onClick={() => window.location.assign('/dashboard')}>Go to dashboard</button>
      </div></div>;
    return this.props.children;
  }
}

export default function App() {
  return (
    <Stage44ErrorBoundary><NavigationScrollManager/><PresenceHeartbeat/><Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/profile-setup" element={<ProfileSetupPage />} />
      <Route path="/settings" element={<ProtectedSettings />} />
      <Route path="/notifications" element={<NotificationPreferencesPage />} />
      <Route path="/notification-center" element={<NotificationCenterPage />} />
      <Route path="/verification" element={<VerificationPage />} />
      <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
      <Route path="/security" element={<ProtectedAccountSecurity />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/admin/moderation" element={<ProtectedAdminModeration />} />
      <Route path="/admin/users" element={<AdminUsersPage />} />
      <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
      <Route path="/admin/deletion-requests" element={<AdminDeletionRequestsPage />} />
      <Route path="/safety" element={<SafetyCenterPage />} />
      <Route path="/help" element={<HelpCenterPage />} />
      <Route path="/dashboard" element={<MemberDashboardPage />} />
      <Route path="/discover" element={<ProtectedDiscover />} />
      <Route path="/favorites" element={<ProtectedFavorites />} />
      <Route path="/profile-activity" element={<ProfileActivityPage />} />
      <Route path="/blocked-users" element={<BlockedUsersPage />} />
      <Route path="/presence-privacy" element={<PresencePrivacyPage />} />
      <Route path="/members/:memberId" element={<MemberProfilePage />} />
      <Route path="/connections" element={<ProtectedConnections />} />
      <Route path="/messages/:matchId" element={<ProtectedMessages />} />
      <Route path="*" element={<Home />} />
    </Routes></Stage44ErrorBoundary>
  );
}
