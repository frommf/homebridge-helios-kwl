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

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever
 * import anything directly from the "homebridge" module (or the
 * "hap-nodejs" module).
 */
let hap: HAP;
class HeliosKWL implements AccessoryPlugin {
  private readonly log: Logging;

  private readonly name: string;

  private switchOn = false;

  private readonly switchService: Service;

  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;

    this.switchService = new hap.Service.Switch(this.name);
    this.switchService
      .getCharacteristic(hap.Characteristic.On)
      .on(
        CharacteristicEventTypes.GET,
        (callback: CharacteristicGetCallback) => {
          log.info(
            `Current state of the switch was returned: ${
              this.switchOn ? 'ON' : 'OFF'
            }`,
          );
          callback(undefined, this.switchOn);
        },
      )
      .on(
        CharacteristicEventTypes.SET,
        (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
          this.switchOn = value as boolean;
          log.info(`Switch state was set to: ${this.switchOn ? 'ON' : 'OFF'}`);
          callback();
        },
      );

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Helios')
      .setCharacteristic(hap.Characteristic.Model, 'Custom Model');

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
  api.registerAccessory('Helios KWL', HeliosKWL);
};
