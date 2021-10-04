/* eslint-disable import/no-extraneous-dependencies */
import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
} from 'homebridge';
import HeliosKWL from './heliosKWL';

interface HeliosKWLConfig extends AccessoryConfig{
  host?: string,
  port?: number
}

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever
 * import anything directly from the "homebridge" module (or the
 * "hap-nodejs" module).
 */
let hap: HAP;
class HeliosKWLAccessory implements AccessoryPlugin {
  private readonly log: Logging;

  private readonly name: string;

  private switchOn = false;

  private readonly switchService: Service;

  private readonly informationService: Service;

  private readonly heliosKwl: HeliosKWL;

  constructor(log: Logging, config: HeliosKWLConfig, api: API) {
    this.log = log;
    this.name = config.name;

    if (!(config.host && config.port)) throw new Error('No host and port configured.');

    this.heliosKwl = new HeliosKWL(
      config.host,
      config.port,
      (m) => log.info(m),
    );

    this.switchService = new hap.Service.Switch(`${this.name} - Party Mode`);

    this.switchService
      .getCharacteristic(hap.Characteristic.On)
      .on(
        CharacteristicEventTypes.GET,
        async (callback: CharacteristicGetCallback) => {
          log('Calling getPartyOn().');
          await this.heliosKwl.run(async (com) => {
            const isOn = await com.getPartyOn();
            log(`Return getPartyOn() => ${isOn}`);
            callback(undefined, isOn);
          });
        },
      )
      .on(
        CharacteristicEventTypes.SET,
        async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
          await this.heliosKwl.run(async (com) => {
            await com.setPartyOn(value as boolean);
            log(`SetPartyOn(${value as boolean})`);
            callback();
          });
        },
      );

    this.informationService = new hap.Service.AccessoryInformation();
    this.informationService.setCharacteristic(hap.Characteristic.Manufacturer, 'Helios AG 2');
    this.informationService.getCharacteristic(hap.Characteristic.Model).onGet(
      async () => {
        log('Calling getModel().');
        return this.heliosKwl.run(async (com) => {
          const model = await com.getModel();
          log(`Return getModel() => ${model}`);
          return model;
        });
      },
    );

    log.info('Switch finished initializing!');
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log('Identify!');
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [this.informationService, this.switchService];
  }
}
/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory('Helios KWL', HeliosKWLAccessory);
};
