import { cards, validateContent } from './index';

validateContent();
console.log(`Content validation passed: ${cards.length} cards.`);
