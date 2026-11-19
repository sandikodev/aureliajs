import { createClientHydrator } from '@aureliajs/ssr/client';
import { AppRoot } from './components/app-root.js';

// Automatically reads __AURELIA_HYDRATION__ JSON script and hydrates AppRoot on the client
createClientHydrator({
  components: [AppRoot],
});
