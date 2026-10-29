import { z } from 'zod';

export const cardIdentitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});
