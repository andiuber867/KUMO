export const categories = ['Sushi', 'Ramen', 'Entradas', 'Bebidas'] as const;
export type Product = { id: string; name: string; description: string; category: string; price: number; image: string; isNew: boolean; available: boolean; portion: string; createdAt?: number };

