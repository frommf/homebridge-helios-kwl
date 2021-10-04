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
      (m) => log.debug(m),
    );

    this.switchService = new hap.Service.Switch(`${this.name} - Party Mode`);

    this.switchService.getCharacteristic(hap.Characteristic.On)
      .onGet(this.handlePartyGet.bind(this))
      .onSet(this.handlePartySet.bind(this));

    this.informationService = new hap.Service.AccessoryInformation();
    this.informationService.setCharacteristic(hap.Characteristic.Manufacturer, 'Helios');
    this.informationService.getCharacteristic(hap.Characteristic.Model)
      .onGet(this.handleModelGet.bind(this));
    this.informationService.getCharacteristic(hap.Characteristic.SerialNumber)
      .onGet(this.handleSerialNumberGet.bind(this));
    this.informationService.getCharacteristic(hap.Characteristic.FirmwareRevision)
      .onGet(this.handleFirmwareRevisionGet.bind(this));
    this.informationService.getCharacteristic(hap.Characteristic.Identify)
      .onSet(this.handleIdentifySet.bind(this));

    setInterval(() => this.periodicFetch(), 1000 * 5);
    log.info('Switch finished initializing!');
  }

  handleIdentifySet(value: any) {
    this.log.error(`Triggered SET Identify: ${value}`);
  }

  private async handleSerialNumberGet() {
    this.log.info('Triggered GET SerialNumber');
    return this.heliosKwl
      .run(async (com) => com.getSerial())
      .catch((err) => {
        this.log.error(err);
        return '';
      });
  }

  private async handleModelGet() {
    this.log.info('Triggered GET Model');
    return this.heliosKwl
      .run(async (com) => com.getModel())
      .catch((err) => {
        this.log.error(err);
        return '';
      });
  }

  private async handlePartyGet() {
    this.log.info('Triggered GET Party');
    return this.heliosKwl
      .run(async (com) => com.getPartyOn())
      .catch((err) => {
        this.log.error(err);
        return false;
      });
  }

  private async handlePartySet(isParty : any) {
    this.log.info('Triggered SET Party');
    return this.heliosKwl
      .run(async (com) => com.setPartyOn(isParty as boolean))
      .catch((err) => this.log.error(err));
  }

  private async handleFirmwareRevisionGet() {
    this.log.info('Triggered GET FirmwareRevision');
    return this.heliosKwl
      .run(async (com) => com.getFirmwareRevision())
      .catch((err) => {
        this.log.error(err);
        return '';
      });
  }

  private isFetching = false;

  private async periodicFetch() {
    try {
      // prevent callback overflow
      if (this.isFetching) return;
      this.isFetching = true;
      this.log.debug('Fetching updates');
      await this.heliosKwl.run(async (com) => {
        const isOn = await com.getPartyOn();
        this.log.info(`getPartyOn() => ${isOn}`);
        this.switchService
          .getCharacteristic(hap.Characteristic.On)
          .updateValue(isOn);
      });
    } catch (error) {
      this.log.error(`Fetching error: ${error}`);
    } finally {
      this.isFetching = false;
    }
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
