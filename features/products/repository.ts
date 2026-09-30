import { database } from '@/lib/server/database';
import { Product } from './types';

type Row = Record<string, any>;

export async function readCatalog() {
  const db = database();
  const initialized = await db.prepare('SELECT value FROM settings WHERE key = ?').bind('catalog_initialized').first();
  const result = await db.prepare('SELECT * FROM products ORDER BY is_new DESC, created_at DESC, name ASC').all<Row>();

  return {
    initialized: !!initialized,
    products: (result.results || []).map(r => ({
      id: String(r.id || ''),
      name: String(r.name || ''),
      description: String(r.description || ''),
      category: String(r.category || 'Sushi'),
      price: Number(r.price) || 0,
      image: String(r.image || ''),
      portion: String(r.portion || ''),
      isNew: Boolean(Number(r.is_new) === 1 || r.is_new === true),
      available: Boolean(r.available === undefined ? true : Number(r.available) === 1 || r.available === true),
      createdAt: Number(r.created_at) || Date.now(),
    })),
  };
}

export async function saveProduct(id: string, p: Omit<Product, 'id'>, create: boolean) {
  const db = database();
  if (!create) {
    const exists = await db.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
    if (!exists) return false;
  }
  const now = Date.now();
  await db.batch([
    db.prepare('INSERT INTO products (id,name,description,category,price,image,portion,is_new,available,created_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,category=excluded.category,price=excluded.price,image=excluded.image,portion=excluded.portion,is_new=excluded.is_new,available=excluded.available,created_at=excluded.created_at').bind(id, p.name, p.description, p.category, Number(p.price) || 0, p.image || '', p.portion || '', p.isNew ? 1 : 0, p.available ? 1 : 0, now),
    db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').bind('catalog_initialized', '1')
  ]);
  return true;
}
