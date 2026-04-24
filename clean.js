import { cleanupSeedData } from './lib/firestore.js';

cleanupSeedData().then(() => {
  console.log('Cleanup script executed.');
  process.exit(0);
}).catch(console.error);
