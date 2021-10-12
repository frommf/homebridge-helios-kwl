import { stringify } from 'querystring';
import HeliosKWL from './heliosKWL';

(async () => {
  try {
    const helios = new HeliosKWL('helios.fritz.box', 502, console.log);
    await helios.run(async (com) => {
      const value = await com.getFanStage();
      console.log({ value });
    });
  } catch (error) {
    console.log(`ERROR: ${error}`);
  }
})();
