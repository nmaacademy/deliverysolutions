const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;

type Check = { ok: boolean; status?: number; detail?: string };

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

async function fetchWithTimeout(input: string | URL, init?: RequestInit) {
  return fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function supabaseHeaders(secretKey: string) {
  const headers: Record<string, string> = {
    apikey: secretKey,
    'Content-Type': 'application/json',
  };
  // New sb_secret keys are not JWTs and must never be put in Authorization. Keep compatibility
  // with a legacy service_role JWT for projects that have not created a secret key yet.
  if (!secretKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${secretKey}`;
  return headers;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return json({ status: 'unauthorized' }, 401);
  }
  // With no extra secret to configure, only Vercel's scheduler is accepted in production.
  if (!cronSecret && process.env.VERCEL && request.headers.get('user-agent') !== 'vercel-cron/1.0') {
    return json({ status: 'unauthorized' }, 401);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !secretKey) {
    return json({ status: 'misconfigured', missing: ['VITE_SUPABASE_URL', 'SUPABASE_SECRET_KEY'] }, 500);
  }

  const checkedAt = new Date();
  const checks: Record<string, Check> = {};

  try {
    const home = await fetchWithTimeout(new URL('/', request.url), {
      headers: { 'User-Agent': 'deliverysolutions-healthcheck/1.0' },
      cache: 'no-store',
    });
    checks.website = { ok: home.ok, status: home.status };
  } catch (error) {
    checks.website = { ok: false, detail: errorMessage(error) };
  }

  const headers = supabaseHeaders(secretKey);
  try {
    const database = await fetchWithTimeout(`${supabaseUrl}/rest/v1/demo_orders?select=id&limit=1`, { headers });
    checks.database = { ok: database.ok, status: database.status };
    if (!database.ok) checks.database.detail = (await database.text()).slice(0, 300);
  } catch (error) {
    checks.database = { ok: false, detail: errorMessage(error) };
  }

  const healthy = Object.values(checks).every(check => check.ok);
  let lastHeartbeatAt: Date | null = null;
  let lastStatus: 'up' | 'down' | null = null;
  try {
    const lastResponse = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/system_heartbeats?select=checked_at,status&order=checked_at.desc&limit=1`,
      { headers },
    );
    if (lastResponse.ok) {
      const rows = await lastResponse.json() as Array<{ checked_at: string; status: 'up' | 'down' }>;
      if (rows[0]?.checked_at) lastHeartbeatAt = new Date(rows[0].checked_at);
      if (rows[0]?.status) lastStatus = rows[0].status;
    }
  } catch {
    // The insert below will expose a missing/unavailable heartbeat table as a failed check.
  }

  const heartbeatDue = !lastHeartbeatAt || checkedAt.getTime() - lastHeartbeatAt.getTime() >= FOUR_DAYS_MS;
  const currentStatus = healthy ? 'up' : 'down';
  const shouldRecord = !healthy || heartbeatDue || (lastStatus !== null && lastStatus !== currentStatus);
  const message = healthy
    ? `✅ Delivery Solutions — toate sistemele sunt up and running (${checkedAt.toISOString()}).`
    : `🚨 Delivery Solutions — healthcheck eșuat (${checkedAt.toISOString()}).`;

  let recorded = false;
  if (shouldRecord) {
    try {
      const logResponse = await fetchWithTimeout(`${supabaseUrl}/rest/v1/system_heartbeats`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          checked_at: checkedAt.toISOString(),
          status: currentStatus,
          checks,
          message,
        }),
      });
      if (!logResponse.ok) {
        checks.heartbeat_log = { ok: false, status: logResponse.status, detail: (await logResponse.text()).slice(0, 300) };
      } else {
        recorded = true;
      }
    } catch (error) {
      checks.heartbeat_log = { ok: false, detail: errorMessage(error) };
    }
  }

  const logHealthy = checks.heartbeat_log?.ok !== false;
  return json(
    { status: healthy ? 'up' : 'down', message, checkedAt: checkedAt.toISOString(), checks, recorded },
    healthy && logHealthy ? 200 : 503,
  );
}
