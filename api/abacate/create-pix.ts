/*
  Vercel Serverless Function: Create Abacate Pay Pix charge

  Env vars required (configure in Vercel):
  - ABACATE_BASE_URL (e.g., https://api.abacatepay.com)
  - ABACATE_API_KEY (secret token)
  - ABACATE_API_KEY_HEADER (optional, default: Authorization)
  - ABACATE_API_KEY_PREFIX (optional, default: Bearer )
*/
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { plan, amount, expiresIn, description, customer, metadata } = req.body || {};
    if (!amount || !customer) {
      return res.status(400).json({ error: 'Missing amount/customer' });
    }

    const baseUrl = process.env.ABACATE_BASE_URL;
    const apiKey = process.env.ABACATE_API_KEY;
    if (!baseUrl || !apiKey) {
      return res.status(500).json({ error: 'Missing Abacate Pay configuration' });
    }

    const keyHeader = process.env.ABACATE_API_KEY_HEADER || 'Authorization';
    const keyPrefix = process.env.ABACATE_API_KEY_PREFIX ?? 'Bearer ';

    // Build request payload - adapt fields to Abacate Pay spec if needed
    const payload = {
      amount,
      expiresIn: expiresIn ?? 1800,
      description: description ?? (plan === 'annual' ? 'Finnko Premium Anual' : 'Finnko Premium Mensal'),
      customer: {
        name: customer?.name || customer?.full_name,
        cellphone: customer?.cellphone || customer?.phone,
        email: customer?.email,
        taxId: customer?.taxId || customer?.document || customer?.cpf,
      },
      metadata: { source: 'finnko-app', plan, ...(metadata || {}) },
    } as any;

    const resp = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/pixQrCode/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [keyHeader]: `${keyPrefix}${apiKey}`,
      } as any,
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(502).json({ error: 'abacate_error', detail: txt.slice(0, 500) });
    }

    const data = await resp.json();
    const qr = data?.data?.brCodeBase64;
    const emv = data?.data?.brCode;
    if (!qr || !emv) {
      return res.status(502).json({ error: 'invalid_abacate_response', data });
    }
    return res.status(200).json({ qrcode: qr, copia_cola: emv });
  } catch (err: any) {
    return res.status(500).json({ error: 'unexpected', detail: err?.message || String(err) });
  }
}


