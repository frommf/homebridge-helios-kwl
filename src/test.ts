import HeliosKWL from './heliosKWL';

(async () => {
  const helios = new HeliosKWL('helios.fritz.box', 502, console.log);
  await helios.run(async (com) => {
    const isParty = await com.getPartyOn();
    console.log({ isParty });
  });
  await helios.run(async (com) => {
    await com.setPartyOn(true);
  });
  await helios.run(async (com) => {
    const isParty = await com.getPartyOn();
    console.log({ isParty });
  });
})();
