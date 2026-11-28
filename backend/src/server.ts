import { createApp } from './app';
import { getBackendEnv } from './config/env';

const env = getBackendEnv();
const app = createApp();

app.listen(env.port, () => {
  console.log(
    `[PrakYuks Payment Backend] berjalan di http://localhost:${env.port} (${env.midtransIsProduction ? 'PRODUCTION' : 'SANDBOX'})`
  );
});
