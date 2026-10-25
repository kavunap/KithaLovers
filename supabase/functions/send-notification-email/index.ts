import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type EventType = 'connection_request' | 'match' | 'message' | 'product_update';
type Recipient = { id: string; email: string; name: string };

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const emailFrom = Deno.env.get('EMAIL_FROM');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendKey || !emailFrom) {
    return json(500, { error: 'Email service is not fully configured. Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY and EMAIL_FROM.' });
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json(401, { error: 'Sign in to request a notification.' });
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  const actor = authData.user;
  if (authError || !actor) return json(401, { error: 'Your session is invalid or expired.' });

  let payload: { event_type?: EventType; record_id?: string; subject?: string; html?: string };
  try { payload = await req.json(); } catch { return json(400, { error: 'Request body must be valid JSON.' }); }
  const eventType = payload.event_type;
  const recordId = typeof payload.record_id === 'string' ? payload.record_id.trim() : '';
  if (!eventType || !['connection_request', 'match', 'message', 'product_update'].includes(eventType) || !recordId) {
    return json(400, { error: 'A valid event_type and record_id are required.' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const recipients: Recipient[] = [];
  let emailSubject = '';
  let emailHeading = '';
  let emailCopy = '';

  async function addRecipient(userId: string, preferenceColumn: string, subject: string, heading: string, copy: string) {
    const { data: prefs, error: prefError } = await admin.from('notification_preferences').select(preferenceColumn).eq('user_id', userId).maybeSingle();
    if (prefError) throw new Error(`Could not read notification preferences: ${prefError.message}`);
    if (!prefs || (prefs as Record<string, unknown>)[preferenceColumn] !== true) return;
    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !authUser.user?.email) return;
    const { data: profile } = await admin.from('profiles').select('display_name').eq('id', userId).maybeSingle();
    recipients.push({ id: userId, email: authUser.user.email, name: profile?.display_name || 'there' });
    emailSubject = subject;
    emailHeading = heading;
    emailCopy = copy;
  }

  try {
    if (eventType === 'connection_request') {
      const { data: request, error } = await admin.from('connection_requests').select('id,sender_id,recipient_id,status').eq('id', recordId).maybeSingle();
      if (error || !request) return json(404, { error: 'Connection request not found.' });
      if (request.sender_id !== actor.id) return json(403, { error: 'Only the sender can request this notification.' });
      if (request.status !== 'pending') return json(200, { sent: 0, skipped: 0, reason: 'The request is no longer pending.' });
      const { data: sender } = await admin.from('profiles').select('display_name').eq('id', actor.id).maybeSingle();
      await addRecipient(request.recipient_id, 'email_connection_requests', 'You have a new connection request', 'Someone wants to connect', `${escapeHtml(sender?.display_name || 'A KithaLovers member')} sent you a connection request. Sign in to KithaLovers to review it.`);
    } else if (eventType === 'match') {
      const { data: match, error } = await admin.from('matches').select('id,user_one,user_two').eq('id', recordId).maybeSingle();
      if (error || !match) return json(404, { error: 'Match not found.' });
      if (match.user_one !== actor.id && match.user_two !== actor.id) return json(403, { error: 'You are not part of this match.' });
      const ids = [match.user_one, match.user_two];
      for (const id of ids) await addRecipient(id, 'email_matches', 'It’s a match on KithaLovers!', 'You have a new match', 'You and another member have connected. Sign in to KithaLovers to say hello.');
    } else if (eventType === 'message') {
      const { data: message, error } = await admin.from('messages').select('id,sender_id,match_id').eq('id', recordId).maybeSingle();
      if (error || !message) return json(404, { error: 'Message not found.' });
      if (message.sender_id !== actor.id) return json(403, { error: 'Only the sender can request this notification.' });
      const { data: match } = await admin.from('matches').select('user_one,user_two').eq('id', message.match_id).maybeSingle();
      if (!match || (match.user_one !== actor.id && match.user_two !== actor.id)) return json(403, { error: 'Conversation access could not be verified.' });
      const recipientId = match.user_one === actor.id ? match.user_two : match.user_one;
      const { data: blockRows } = await admin.from('blocks').select('blocker_id').or(`and(blocker_id.eq.${actor.id},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${actor.id})`);
      if (blockRows?.length) return json(200, { sent: 0, skipped: 1, reason: 'Messaging is blocked.' });
      const { data: muteSetting, error: muteError } = await admin.from('match_conversation_settings').select('muted').eq('user_id',recipientId).eq('match_id',message.match_id).maybeSingle();
      if (muteError) throw new Error(`Could not check conversation mute: ${muteError.message}`);
      if (muteSetting?.muted) return json(200, { sent: 0, skipped: 1, reason: 'Conversation muted by recipient.' });
      await addRecipient(recipientId, 'email_messages', 'You have a new message', 'A new message is waiting', 'Someone you matched with sent you a message. Sign in to KithaLovers to read and reply. We do not include message contents in email notifications.');
    } else {
      const allowedAdmins = (Deno.env.get('ADMIN_USER_IDS') || '').split(',').map((id) => id.trim()).filter(Boolean);
      if (!allowedAdmins.includes(actor.id)) return json(403, { error: 'Product updates can only be sent by configured administrators.' });
      const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
      const html = typeof payload.html === 'string' ? payload.html : '';
      if (!subject || !html || subject.length > 180 || html.length > 20000) return json(400, { error: 'A subject and HTML body are required (subject max 180 characters, HTML max 20,000 characters).' });
      const users = [] as { id: string; email?: string }[];
      for (let page = 1; ; page++) {
        const { data: userPage, error: usersError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (usersError) throw new Error(`Could not list eligible recipients: ${usersError.message}`);
        users.push(...userPage.users.map((user) => ({ id: user.id, email: user.email })));
        if (userPage.users.length < 1000) break;
      }
      const { data: prefs, error: prefsError } = await admin.from('notification_preferences').select('user_id').eq('email_product_updates', true);
      if (prefsError) throw new Error(`Could not read product-update preferences: ${prefsError.message}`);
      const allowed = new Set((prefs ?? []).map((row) => row.user_id));
      for (const user of users) {
        if (!user.email || !allowed.has(user.id)) continue;
        const { data: profile } = await admin.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
        recipients.push({ id: user.id, email: user.email, name: profile?.display_name || 'there' });
      }
      emailSubject = subject;
      emailHeading = 'KithaLovers update';
      emailCopy = '';
      // Custom campaign HTML is sent below only after administrator allowlist validation.
      if (recipients.length === 0) return json(200, { sent: 0, skipped: 0, reason: 'No users have opted in to product updates.' });
      let sent = 0;
      let failed = 0;
      for (const recipient of recipients) {
        const { data: prior } = await admin.from('email_notification_log').select('id,status').eq('event_type', 'product_update').eq('event_id', recordId).eq('recipient_id', recipient.id).maybeSingle();
        if (prior?.status === 'sent') { continue; }
        const { data: log } = await admin.from('email_notification_log').upsert({ event_type: 'product_update', event_id: recordId, recipient_id: recipient.id, status: 'pending', error_message: null }, { onConflict: 'event_type,event_id,recipient_id' }).select('id').single();
        const result = await sendEmail(resendKey, emailFrom, recipient, emailSubject, emailHeading, '', html);
        await admin.from('email_notification_log').update({ status: result.ok ? 'sent' : 'failed', provider_message_id: result.id ?? null, error_message: result.ok ? null : result.error, updated_at: new Date().toISOString() }).eq('id', log?.id);
        if (result.ok) sent++; else failed++;
      }
      return json(200, { sent, failed, total: recipients.length });
    }

    if (!recipients.length) return json(200, { sent: 0, skipped: 1, reason: 'The recipient has disabled this email category or has no email address.' });
    let sent = 0;
    let failed = 0;
    for (const recipient of recipients) {
      const { data: prior } = await admin.from('email_notification_log').select('id,status').eq('event_type', eventType).eq('event_id', recordId).eq('recipient_id', recipient.id).maybeSingle();
      if (prior?.status === 'sent') continue;
      const { data: log, error: logError } = await admin.from('email_notification_log').upsert({ event_type: eventType, event_id: recordId, recipient_id: recipient.id, status: 'pending', error_message: null }, { onConflict: 'event_type,event_id,recipient_id' }).select('id').single();
      if (logError) throw new Error(`Could not record email attempt: ${logError.message}`);
      const result = await sendEmail(resendKey, emailFrom, recipient, emailSubject, emailHeading, emailCopy);
      await admin.from('email_notification_log').update({ status: result.ok ? 'sent' : 'failed', provider_message_id: result.id ?? null, error_message: result.ok ? null : result.error, updated_at: new Date().toISOString() }).eq('id', log.id);
      if (result.ok) sent++; else failed++;
    }
    return json(200, { sent, failed, total: recipients.length });
  } catch (error) {
    console.error('send-notification-email failed:', error);
    return json(500, { error: error instanceof Error ? error.message : 'Unable to send notification email.' });
  }
});

async function sendEmail(apiKey: string, from: string, recipient: Recipient, subject: string, heading: string, copy: string, customHtml?: string) {
  const html = customHtml ?? `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#202938"><div style="max-width:600px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden"><header style="background:#063B9B;color:#fff;padding:26px 30px"><div style="font-size:12px;letter-spacing:2px;font-weight:bold">KITHALOVERS</div><h1 style="margin:12px 0 0;font-size:24px">${escapeHtml(heading)}</h1></header><main style="padding:28px 30px"><p>Hi ${escapeHtml(recipient.name)},</p><p>${copy}</p><p style="margin-top:28px">— The KithaLovers team</p></main><footer style="padding:18px 30px;background:#f8f9fc;color:#687386;font-size:12px">You are receiving this because of your KithaLovers notification preferences.</footer></div></body></html>`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [recipient.email], subject, html }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, error: typeof result.message === 'string' ? result.message : `Email provider returned HTTP ${response.status}.` };
  return { ok: true, id: typeof result.id === 'string' ? result.id : undefined };
}
