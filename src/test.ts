import HeliosKWL from './heliosKWL';

(async () => {
  const helios = new HeliosKWL('helios.fritz.box', 502, console.log);
  await helios.run(async (com) => {
    const percent = await com.getVentilationPercent();
    console.log({ percent });
  });
})();
