import HeliosKWL from './heliosKWL';

(async () => {
  const helios = new HeliosKWL('helios.fritz.box', 502, console.log);

  async function test() {
    // eslint-disable-next-line no-await-in-loop
    await helios.run(async (com) => {
      const percent = await com.getVentilationPercent();
      console.log({ percent });
    });
  }

  const ps: Promise<void>[] = [];
  for (let i = 0; i < 25; i++) {
    ps.push(test());
  }
  await Promise.all(ps);
})();
