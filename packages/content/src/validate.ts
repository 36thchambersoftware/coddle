import { cardIdentitySchema } from './index';

cardIdentitySchema.parse({ id: 'scaffold', name: 'Coddle' });
console.log('Content validation passed.');
