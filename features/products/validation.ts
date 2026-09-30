import { z } from 'zod';
import { categories } from './types';

export const productInput = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido.').max(100, 'El nombre debe tener menos de 100 caracteres.'),
  description: z.string().trim().max(1000).optional().or(z.literal('')).transform(v => v || ''),
  category: z.string().refine(val => (categories as readonly string[]).includes(val), { message: 'Categoría no válida.' }),
  price: z.number().finite().min(0, 'El precio debe ser positivo.').max(100000),
  portion: z.string().trim().max(100).optional().or(z.literal('')).transform(v => v || ''),
  image: z.string().optional().or(z.literal('')).transform(v => v || '/images/sushi.jpg'),
  isNew: z.boolean().default(false),
  available: z.boolean().default(true),
});
