import { z } from 'zod';
import { categories } from './types';
export const productInput=z.object({name:z.string().trim().min(2).max(100),description:z.string().trim().max(700),category:z.enum(categories),price:z.number().finite().min(0).max(100000),portion:z.string().trim().max(60),image:z.string().max(300).refine(v=>v===''||/^\/images\/[a-z0-9.-]+$/i.test(v)||/^\/api\/images\/[a-z0-9-]+\.(jpg|png|webp)$/.test(v)),isNew:z.boolean(),available:z.boolean()});
