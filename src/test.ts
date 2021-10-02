import Helios from './helios';

(async () => {
  const helios = new Helios('helios.fritz.box', 502);
  await helios.open();
  try {
    const result = await helios.get('v00104', 8);
    console.log(`Result: ${result}`);
  } catch (e) {
    console.error(e);
  } finally {
    await helios.close();
  }
})();
