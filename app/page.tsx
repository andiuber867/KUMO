import { readCatalog } from '@/features/products/repository';
import { MenuExperience } from '@/features/menu/menu-experience';
import { Product } from '@/features/products/types';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let initialProducts: Product[] = [];
  try {
    const catalog = await readCatalog();
    initialProducts = catalog.products;
  } catch (e) {
    console.error('Failed to load initial catalog:', e);
  }
  return <MenuExperience initialProducts={initialProducts} />;
}
