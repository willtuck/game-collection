import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function readBody(req: any): Promise<any> {
  if (req.body !== undefined) return req.body;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: any) => chunks.push(Buffer.from(c)));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const userId = await requireAuth(req);
  if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const body = await readBody(req);
  const { sessionId } = body ?? {};

  if (!sessionId) { res.status(400).json({ error: 'Missing sessionId' }); return; }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      res.status(400).json({ error: 'Payment not completed' });
      return;
    }

    if (session.metadata?.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from('profiles').upsert({ id: userId, is_premium: true });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
