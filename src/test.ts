import { stringify } from 'querystring';
import HeliosKWL from './heliosKWL';

(async () => {
  try {
    const helios = new HeliosKWL('10.0.1.64', 502, console.log);
    await helios.run(async (com) => {
      var value = await com.getFanStage();
      console.log({ value });
      await com.setFanStage(4);
      value = await com.getFanStage();
      console.log({ value });
    });
  } catch (error) {
    console.log(`ERROR: ${error}`);
  }
})();
