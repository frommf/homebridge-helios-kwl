import Helios from './helios';

(async () => {
  const helios = new Helios('helios.fritz.box', 502);
  await helios.open();
  try {
    const result = await helios.get('v00094', 6);
    console.log(`Result: ${result}`);
  } catch (e) {
    // Deal with the fact the chain failed
  } finally {
    helios.close();
  }
})();
