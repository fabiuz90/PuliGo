const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await db.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // Self-deletion requires service-role elevation (User delete is admin-only under RLS).
    await db.asServiceRole.entities.User.delete(user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Errore durante l\'eliminazione' }, { status: 500 });
  }
}