import { database } from '@/lib/server/database';
import { Product } from './types';
type Row = Omit<Product, 'isNew' | 'available' | 'createdAt'> & { is_new: number; available: number; created_at: number };
export async function readCatalog() {
  const db = database();
  const initialized = await db.prepare('SELECT value FROM settings WHERE key = ?').bind('catalog_initialized').first();
  const result = await db.prepare('SELECT * FROM products ORDER BY is_new DESC, created_at DESC, name ASC').all<Row>();
  return {
    initialized: !!initialized,
    products: result.results.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      price: r.price,
      image: r.image,
      portion: r.portion,
      isNew: !!r.is_new,
      available: !!r.available,
      createdAt: r.created_at,
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
    db.prepare('INSERT INTO products (id,name,description,category,price,image,portion,is_new,available,created_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,category=excluded.category,price=excluded.price,image=excluded.image,portion=excluded.portion,is_new=excluded.is_new,available=excluded.available,created_at=excluded.created_at').bind(id, p.name, p.description, p.category, p.price, p.image, p.portion, Number(p.isNew), Number(p.available), now),
    db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').bind('catalog_initialized', '1')
  ]);
  return true;
}

