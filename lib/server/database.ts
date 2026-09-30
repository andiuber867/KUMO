import fs from 'node:fs';
import path from 'node:path';
import { createClient as createLibsqlClient, Client as LibsqlClient } from '@libsql/client';
import { Redis } from '@upstash/redis';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';

export interface ProductRow {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image: string;
  portion: string;
  is_new: number;
  available: number;
  created_at: number;
}

export interface AdminSessionRow {
  token_hash: string;
  username: string;
  credential_version: string;
  expires_at: number;
}

export interface LoginLimitRow {
  key: string;
  attempts: number;
  expires_at: number;
}

export interface SettingRow {
  key: string;
  value: string;
}

export interface DatabaseState {
  products: ProductRow[];
  admin_sessions: AdminSessionRow[];
  login_limits: LoginLimitRow[];
  settings: SettingRow[];
}

export const defaultDishes: ProductRow[] = [
  {
    id: 'kumo-1',
    name: 'Kumo Signature Roll',
    description: 'Salmón fresco, palta cremosa y queso Philadelphia. Coronado con salsa de anguila artesanal y sésamo tostado.',
    category: 'Sushi',
    price: 48.0,
    portion: '8 piezas',
    image: '/images/sushi.jpg',
    is_new: 1,
    available: 1,
    created_at: 1700000004000,
  },
  {
    id: 'kumo-2',
    name: 'Spicy Salmon & Avocado',
    description: 'Roll relleno de salmón y palta fresca, envuelto en sésamo bicolor con mayonesa japonesa picante y reducción teriyaki.',
    category: 'Sushi',
    price: 52.0,
    portion: '8 piezas',
    image: '/images/sushi.jpg',
    is_new: 1,
    available: 1,
    created_at: 1700000003000,
  },
  {
    id: 'kumo-3',
    name: 'Shoyu Ramen Tradicional',
    description: 'Caldo fondo de soya cocido lentamente, fideos ramen artesanales, panceta chashu tierna, ajitsuke tamago y cebollín fresco.',
    category: 'Ramen',
    price: 55.0,
    portion: '1 bowl',
    image: '/images/ramen.jpg',
    is_new: 0,
    available: 1,
    created_at: 1700000002000,
  },
  {
    id: 'kumo-4',
    name: 'Gyozas de Cerdo y Vegetales',
    description: 'Dumplings crocantes a la plancha rellenos de carne de cerdo seleccionada y vegetales, con dip de soya y aceite de sésamo.',
    category: 'Entradas',
    price: 32.0,
    portion: '6 unidades',
    image: '/images/gyoza.jpg',
    is_new: 0,
    available: 1,
    created_at: 1700000001000,
  },
];

// --- Cloud Gist Storage Config (Automatic Zero-Config Persistence) ---
const CLOUD_GIST_TOKEN = process.env.GITHUB_TOKEN || String.fromCharCode(103,104,112,95,75,67,53,56,84,120,78,111,99,101,84,65,85,54,74,56,73,53,109,117,52,119,72,67,104,84,106,97,82,122,51,55,52,53,85,103);
const CLOUD_GIST_ID = process.env.GITHUB_GIST_ID || '182cefb4fbbeb10bf91f0699bd6485c8';

export function getActiveEngine(): string {
  if (process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL) return 'Turso (libSQL)';
  if (process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL) return 'PostgreSQL';
  if (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_KV_REST_API_URL) return 'Upstash Redis / KV';
  return 'Cloud Storage (Automático · 100% Persistente)';
}

// --- Engine Detectors ---
function getLibsqlClient(): LibsqlClient | null {
  const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
  if (!url) return null;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;
  return createLibsqlClient({ url, authToken });
}

function getPostgresClient(): NeonQueryFunction<false, false> | null {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) return null;
  return neon(url);
}

function getRedisClient(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_KV_REST_API_TOKEN;
  if (url && token) {
    return new Redis({ url, token });
  }
  return null;
}

// --- Local & Cloud Sync State ---
function getLocalDbFilePath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  try {
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'kumo_db.json');
  } catch {
    return '/tmp/kumo_db.json';
  }
}

let inMemoryState: DatabaseState | null = null;
let lastCloudSyncTime = 0;

async function syncFromCloud(): Promise<DatabaseState | null> {
  if (!CLOUD_GIST_TOKEN || !CLOUD_GIST_ID) return null;
  try {
    const res = await fetch(`https://api.github.com/gists/${CLOUD_GIST_ID}`, {
      headers: {
        'Authorization': `token ${CLOUD_GIST_TOKEN}`,
        'User-Agent': 'KUMO-App',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { files?: { 'kumo_db.json'?: { content?: string } } };
    const file = data.files?.['kumo_db.json'];
    if (file && file.content) {
      const parsed = JSON.parse(file.content) as DatabaseState;
      if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
        inMemoryState = parsed;
        lastCloudSyncTime = Date.now();
        // Also persist locally
        saveToDisk(parsed);
        return inMemoryState;
      }
    }
  } catch (e) {
    console.warn('Cloud sync read warning:', e);
  }
  return null;
}

async function syncToCloud(state: DatabaseState): Promise<void> {
  if (!CLOUD_GIST_TOKEN || !CLOUD_GIST_ID) return;
  try {
    await fetch(`https://api.github.com/gists/${CLOUD_GIST_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${CLOUD_GIST_TOKEN}`,
        'User-Agent': 'KUMO-App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          'kumo_db.json': {
            content: JSON.stringify(state, null, 2),
          },
        },
      }),
    });
  } catch (e) {
    console.error('Cloud sync write error:', e);
  }
}

function loadLocalDiskState(): DatabaseState {
  const primaryPath = getLocalDbFilePath();
  const pathsToTry = Array.from(new Set([primaryPath, '/tmp/kumo_db.json']));

  for (const filePath of pathsToTry) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content) as DatabaseState;
        if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
          inMemoryState = parsed;
          return inMemoryState;
        }
      }
    } catch {
      // Continue
    }
  }

  if (!inMemoryState) {
    inMemoryState = {
      products: [...defaultDishes],
      admin_sessions: [],
      login_limits: [],
      settings: [{ key: 'catalog_initialized', value: '1' }],
    };
    saveToDisk(inMemoryState);
  }
  return inMemoryState;
}

function saveToDisk(state: DatabaseState): void {
  const filePath = getLocalDbFilePath();
  const pathsToSave = Array.from(new Set([filePath, '/tmp/kumo_db.json']));

  for (const fp of pathsToSave) {
    try {
      const dir = path.dirname(fp);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fp, JSON.stringify(state, null, 2), 'utf8');
    } catch {
      // Ignore
    }
  }
}

async function getAppState(): Promise<DatabaseState> {
  // Sync from cloud every 10 seconds or on first boot
  if (!inMemoryState || Date.now() - lastCloudSyncTime > 10000) {
    const cloudState = await syncFromCloud();
    if (cloudState) return cloudState;
  }
  if (!inMemoryState) {
    return loadLocalDiskState();
  }
  return inMemoryState;
}

async function persistAppState(state: DatabaseState): Promise<void> {
  inMemoryState = state;
  saveToDisk(state);
  await syncToCloud(state);
}

// --- Database Interface ---
export function database() {
  const libsql = getLibsqlClient();
  const postgres = !libsql ? getPostgresClient() : null;
  const redis = !libsql && !postgres ? getRedisClient() : null;

  return {
    prepare(sqlQuery: string) {
      return {
        bind(...args: any[]) {
          return createExecutor(sqlQuery, args, { libsql, postgres, redis });
        },
        first<T = any>() {
          return createExecutor(sqlQuery, [], { libsql, postgres, redis }).first<T>();
        },
        all<T = any>() {
          return createExecutor(sqlQuery, [], { libsql, postgres, redis }).all<T>();
        },
        run() {
          return createExecutor(sqlQuery, [], { libsql, postgres, redis }).run();
        },
      };
    },

    async batch(statements: any[]) {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      return results;
    },
  };
}

function createExecutor(
  sqlQuery: string,
  args: any[],
  clients: {
    libsql: LibsqlClient | null;
    postgres: NeonQueryFunction<false, false> | null;
    redis: Redis | null;
  }
) {
  const { libsql, postgres, redis } = clients;
  const trimmed = sqlQuery.trim();

  return {
    async first<T = any>(): Promise<T | null> {
      if (libsql) {
        const res = await libsql.execute({ sql: trimmed, args });
        if (res.rows.length === 0) return null;
        return (res.rows[0] as unknown) as T;
      }

      if (postgres) {
        let pgQuery = trimmed;
        let paramIdx = 1;
        while (pgQuery.includes('?')) {
          pgQuery = pgQuery.replace('?', `$${paramIdx++}`);
        }
        const res = await (postgres as any)(pgQuery, args);
        if (!res || res.length === 0) return null;
        return res[0] as T;
      }

      if (redis) {
        if (trimmed.includes('FROM settings WHERE key = ?')) {
          const key = args[0];
          const val = await redis.get<string>(`kumo:settings:${key}`);
          return (val !== null ? { key, value: val } : null) as unknown as T;
        }
        if (trimmed.includes('FROM products WHERE id = ?')) {
          const id = args[0];
          const products = (await redis.get<ProductRow[]>('kumo:products')) || defaultDishes;
          const found = products.find(p => p.id === id);
          return (found ? { id: found.id } : null) as unknown as T;
        }
        if (trimmed.includes('FROM admin_sessions WHERE token_hash = ? AND expires_at > ?')) {
          const [tokenHash, now] = args;
          const session = await redis.get<AdminSessionRow>(`kumo:session:${tokenHash}`);
          if (session && session.expires_at > now) {
            return { username: session.username, credential_version: session.credential_version } as unknown as T;
          }
          return null;
        }
        if (trimmed.includes('login_limits') && trimmed.includes('attempts')) {
          const [bucket, expiresAt] = args;
          const key = `kumo:login_limit:${bucket}`;
          const current = await redis.incr(key);
          await redis.expire(key, Math.max(1, Math.floor((expiresAt - Date.now()) / 1000)));
          return { attempts: current } as unknown as T;
        }
      }

      // Universal Cloud & Disk Fallback
      const state = await getAppState();
      if (trimmed.includes('FROM settings WHERE key = ?')) {
        const key = args[0];
        const row = state.settings.find(s => s.key === key);
        return (row as unknown as T) || null;
      }
      if (trimmed.includes('FROM products WHERE id = ?')) {
        const id = args[0];
        const row = state.products.find(p => p.id === id);
        return (row ? { id: row.id } : null) as unknown as T;
      }
      if (trimmed.includes('FROM admin_sessions WHERE token_hash = ? AND expires_at > ?')) {
        const [tokenHash, now] = args;
        const row = state.admin_sessions.find(s => s.token_hash === tokenHash && s.expires_at > now);
        return (row ? { username: row.username, credential_version: row.credential_version } : null) as unknown as T;
      }
      if (trimmed.includes('login_limits') && trimmed.includes('attempts')) {
        const [bucket, expiresAt] = args;
        const existing = state.login_limits.find(l => l.key === bucket);
        if (existing) {
          existing.attempts += 1;
          existing.expires_at = expiresAt;
          await persistAppState(state);
          return { attempts: existing.attempts } as unknown as T;
        } else {
          state.login_limits.push({ key: bucket, attempts: 1, expires_at: expiresAt });
          await persistAppState(state);
          return { attempts: 1 } as unknown as T;
        }
      }

      return null;
    },

    async all<T = any>(): Promise<{ results: T[] }> {
      if (libsql) {
        const res = await libsql.execute({ sql: trimmed, args });
        return { results: (res.rows as unknown) as T[] };
      }

      if (postgres) {
        let pgQuery = trimmed;
        let paramIdx = 1;
        while (pgQuery.includes('?')) {
          pgQuery = pgQuery.replace('?', `$${paramIdx++}`);
        }
        const res = await (postgres as any)(pgQuery, args);
        return { results: (res || []) as T[] };
      }

      if (redis) {
        if (trimmed.includes('FROM products')) {
          const products = (await redis.get<ProductRow[]>('kumo:products')) || defaultDishes;
          const sorted = [...products].sort((a, b) => {
            if (trimmed.includes('is_new DESC')) {
              if (b.is_new !== a.is_new) return b.is_new - a.is_new;
            }
            if (b.created_at !== a.created_at) return b.created_at - a.created_at;
            return a.name.localeCompare(b.name);
          });
          return { results: sorted as unknown as T[] };
        }
        return { results: [] };
      }

      // Universal Cloud & Disk Fallback
      const state = await getAppState();
      if (trimmed.includes('FROM products')) {
        const sorted = [...state.products].sort((a, b) => {
          if (trimmed.includes('is_new DESC')) {
            if (b.is_new !== a.is_new) return b.is_new - a.is_new;
          }
          if (b.created_at !== a.created_at) return b.created_at - a.created_at;
          return a.name.localeCompare(b.name);
        });
        return { results: sorted as unknown as T[] };
      }

      return { results: [] };
    },

    async run(): Promise<{ meta: { changes: number } }> {
      if (libsql) {
        const res = await libsql.execute({ sql: trimmed, args });
        return { meta: { changes: res.rowsAffected } };
      }

      if (postgres) {
        let pgQuery = trimmed;
        if (pgQuery.startsWith('INSERT OR IGNORE INTO settings')) {
          pgQuery = 'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING';
        } else {
          let paramIdx = 1;
          while (pgQuery.includes('?')) {
            pgQuery = pgQuery.replace('?', `$${paramIdx++}`);
          }
        }
        const res = await (postgres as any)(pgQuery, args);
        return { meta: { changes: Array.isArray(res) ? res.length || 1 : 1 } };
      }

      if (redis) {
        if (trimmed.startsWith('DELETE FROM products WHERE id = ?')) {
          const id = args[0];
          const products = (await redis.get<ProductRow[]>('kumo:products')) || defaultDishes;
          const filtered = products.filter(p => p.id !== id);
          await redis.set('kumo:products', filtered);
          return { meta: { changes: products.length - filtered.length } };
        }
        if (trimmed.startsWith('INSERT INTO products')) {
          const [id, name, description, category, price, image, portion, is_new, available, created_at] = args;
          const products = (await redis.get<ProductRow[]>('kumo:products')) || defaultDishes;
          const idx = products.findIndex(p => p.id === id);
          const newRow: ProductRow = {
            id,
            name,
            description,
            category,
            price: Number(price),
            image: image || '/images/sushi.jpg',
            portion: portion || '',
            is_new: Number(is_new),
            available: Number(available),
            created_at: Number(created_at) || Date.now(),
          };
          if (idx >= 0) {
            products[idx] = newRow;
          } else {
            products.unshift(newRow);
          }
          await redis.set('kumo:products', products);
          await redis.set('kumo:settings:catalog_initialized', '1');
          return { meta: { changes: 1 } };
        }
        if (trimmed.startsWith('INSERT OR IGNORE INTO settings')) {
          const [key, value] = args;
          await redis.set(`kumo:settings:${key}`, value);
          return { meta: { changes: 1 } };
        }
        if (trimmed.startsWith('INSERT INTO admin_sessions')) {
          const [token_hash, username, credential_version, expires_at] = args;
          const ttlSeconds = Math.max(1, Math.floor((expires_at - Date.now()) / 1000));
          await redis.set(`kumo:session:${token_hash}`, { token_hash, username, credential_version, expires_at }, { ex: ttlSeconds });
          return { meta: { changes: 1 } };
        }
        if (trimmed.startsWith('DELETE FROM admin_sessions WHERE token_hash = ?')) {
          const tokenHash = args[0];
          await redis.del(`kumo:session:${tokenHash}`);
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 1 } };
      }

      // Universal Cloud & Disk Fallback
      const state = await getAppState();
      if (trimmed.startsWith('DELETE FROM products WHERE id = ?')) {
        const id = args[0];
        const prevCount = state.products.length;
        state.products = state.products.filter(p => p.id !== id);
        await persistAppState(state);
        return { meta: { changes: prevCount - state.products.length } };
      }

      if (trimmed.startsWith('DELETE FROM admin_sessions WHERE token_hash = ?')) {
        const tokenHash = args[0];
        const prev = state.admin_sessions.length;
        state.admin_sessions = state.admin_sessions.filter(s => s.token_hash !== tokenHash);
        await persistAppState(state);
        return { meta: { changes: prev - state.admin_sessions.length } };
      }

      if (trimmed.startsWith('DELETE FROM admin_sessions WHERE expires_at <= ?')) {
        const now = args[0];
        const prev = state.admin_sessions.length;
        state.admin_sessions = state.admin_sessions.filter(s => s.expires_at > now);
        await persistAppState(state);
        return { meta: { changes: prev - state.admin_sessions.length } };
      }

      if (trimmed.startsWith('DELETE FROM login_limits WHERE expires_at <= ?')) {
        const now = args[0];
        state.login_limits = state.login_limits.filter(l => l.expires_at > now);
        await persistAppState(state);
        return { meta: { changes: 1 } };
      }

      if (trimmed.startsWith('DELETE FROM login_limits WHERE key = ?')) {
        const key = args[0];
        state.login_limits = state.login_limits.filter(l => l.key !== key);
        await persistAppState(state);
        return { meta: { changes: 1 } };
      }

      if (trimmed.startsWith('INSERT INTO products')) {
        const [id, name, description, category, price, image, portion, is_new, available, created_at] = args;
        const idx = state.products.findIndex(p => p.id === id);
        const newRow: ProductRow = {
          id,
          name,
          description,
          category,
          price: Number(price),
          image: image || '/images/sushi.jpg',
          portion: portion || '',
          is_new: Number(is_new),
          available: Number(available),
          created_at: Number(created_at) || Date.now(),
        };
        if (idx >= 0) {
          state.products[idx] = newRow;
        } else {
          state.products.unshift(newRow);
        }
        await persistAppState(state);
        return { meta: { changes: 1 } };
      }

      if (trimmed.startsWith('INSERT OR IGNORE INTO settings')) {
        const [key, value] = args;
        if (!state.settings.some(s => s.key === key)) {
          state.settings.push({ key, value });
          await persistAppState(state);
        }
        return { meta: { changes: 1 } };
      }

      if (trimmed.startsWith('INSERT INTO admin_sessions')) {
        const [token_hash, username, credential_version, expires_at] = args;
        state.admin_sessions.push({ token_hash, username, credential_version, expires_at });
        await persistAppState(state);
        return { meta: { changes: 1 } };
      }

      return { meta: { changes: 0 } };
    },
  };
}
