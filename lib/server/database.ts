import fs from 'node:fs';
import path from 'node:path';

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

interface DatabaseState {
  products: ProductRow[];
  admin_sessions: AdminSessionRow[];
  login_limits: LoginLimitRow[];
  settings: SettingRow[];
}

const defaultDishes: ProductRow[] = [
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

function getDbFilePath(): string {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  try {
    const dataDir = path.join(process.cwd(), '.data');
    if (!fs.existsSync(/*turbopackIgnore: true*/ dataDir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ dataDir, { recursive: true });
    }
    return path.join(dataDir, 'kumo_db.json');
  } catch {
    return path.join('/tmp', 'kumo_db.json');
  }
}

let inMemoryState: DatabaseState | null = null;

function loadState(): DatabaseState {
  const filePath = getDbFilePath();
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ filePath, 'utf8');
      const parsed = JSON.parse(content) as DatabaseState;
      if (parsed && Array.isArray(parsed.products)) {
        inMemoryState = parsed;
        return inMemoryState;
      }
    }
  } catch (e) {
    // Read error fallback
  }

  if (!inMemoryState) {
    inMemoryState = {
      products: [...defaultDishes],
      admin_sessions: [],
      login_limits: [],
      settings: [{ key: 'catalog_initialized', value: '1' }],
    };
    saveState(inMemoryState);
  }
  return inMemoryState;
}

function saveState(state: DatabaseState): void {
  inMemoryState = state;
  try {
    const filePath = getDbFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    }
    fs.writeFileSync(/*turbopackIgnore: true*/ filePath, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Read-only serverless filesystem outside /tmp
  }
}

function createStatementExecutor(sql: string, args: any[] = []) {
  return {
    async first<T = any>(): Promise<T | null> {
      const state = loadState();
      const trimmed = sql.trim();

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
          saveState(state);
          return { attempts: existing.attempts } as unknown as T;
        } else {
          state.login_limits.push({ key: bucket, attempts: 1, expires_at: expiresAt });
          saveState(state);
          return { attempts: 1 } as unknown as T;
        }
      }

      return null;
    },

    async all<T = any>(): Promise<{ results: T[] }> {
      const state = loadState();
      const trimmed = sql.trim();

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
      const state = loadState();
      const trimmed = sql.trim();

      if (trimmed.startsWith('DELETE FROM products WHERE id = ?')) {
        const id = args[0];
        const prevCount = state.products.length;
        state.products = state.products.filter(p => p.id !== id);
        saveState(state);
        return { meta: { changes: prevCount - state.products.length } };
      }

      if (trimmed.startsWith('DELETE FROM admin_sessions WHERE token_hash = ?')) {
        const tokenHash = args[0];
        const prev = state.admin_sessions.length;
        state.admin_sessions = state.admin_sessions.filter(s => s.token_hash !== tokenHash);
        saveState(state);
        return { meta: { changes: prev - state.admin_sessions.length } };
      }

      if (trimmed.startsWith('DELETE FROM admin_sessions WHERE expires_at <= ?')) {
        const now = args[0];
        const prev = state.admin_sessions.length;
        state.admin_sessions = state.admin_sessions.filter(s => s.expires_at > now);
        saveState(state);
        return { meta: { changes: prev - state.admin_sessions.length } };
      }

      if (trimmed.startsWith('DELETE FROM login_limits WHERE expires_at <= ?')) {
        const now = args[0];
        state.login_limits = state.login_limits.filter(l => l.expires_at > now);
        saveState(state);
        return { meta: { changes: 1 } };
      }

      if (trimmed.startsWith('DELETE FROM login_limits WHERE key = ?')) {
        const key = args[0];
        state.login_limits = state.login_limits.filter(l => l.key !== key);
        saveState(state);
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
        saveState(state);
        return { meta: { changes: 1 } };
      }

      if (trimmed.startsWith('INSERT OR IGNORE INTO settings')) {
        const [key, value] = args;
        if (!state.settings.some(s => s.key === key)) {
          state.settings.push({ key, value });
          saveState(state);
        }
        return { meta: { changes: 1 } };
      }

      if (trimmed.startsWith('INSERT INTO admin_sessions')) {
        const [token_hash, username, credential_version, expires_at] = args;
        state.admin_sessions.push({ token_hash, username, credential_version, expires_at });
        saveState(state);
        return { meta: { changes: 1 } };
      }

      return { meta: { changes: 0 } };
    },
  };
}

export function database() {
  return {
    prepare(sql: string) {
      return {
        bind(...args: any[]) {
          return createStatementExecutor(sql, args);
        },
        first<T = any>() {
          return createStatementExecutor(sql, []).first<T>();
        },
        all<T = any>() {
          return createStatementExecutor(sql, []).all<T>();
        },
        run() {
          return createStatementExecutor(sql, []).run();
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
