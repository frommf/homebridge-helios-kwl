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

  private firmware?: string;

  private model?:string;

  private serial?: string;

  private lastFanOnValue = true;

  private isFetching = false;

  private readonly partySwitch: Service;

  private readonly fan: Service;

  private readonly silentSwitch: Service;

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

    this.fan = new hap.Service.Fan(`${this.name} - Fan`, 'fan speed');
    this.fan.getCharacteristic(hap.Characteristic.On)
      .onSet(this.handleFanSet.bind(this));

    this.silentSwitch = new hap.Service.Switch(`${this.name} - Silent Mode`, 'silent mode');
    this.silentSwitch.getCharacteristic(hap.Characteristic.On)
      .onSet(this.handleSilentSet.bind(this));

    this.partySwitch = new hap.Service.Switch(`${this.name} - Party Mode`, 'party mode');
    this.partySwitch.getCharacteristic(hap.Characteristic.On)
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

    setTimeout(() => setInterval(() => this.periodicFetch(), 1000 * 7), 1000 * 3);

    log.info('Switch finished initializing!');
  }

  handleIdentifySet(value: any) {
    this.log.error(`Triggered SET Identify: ${value}`);
  }

  private async handleSerialNumberGet() {
    this.log.info('Triggered GET SerialNumber');
    return this.heliosKwl
      .run(async (com) => {
        if (!this.serial) {
          this.serial = await com.getSerial();
        }
        return this.serial;
      })
      .catch((err) => {
        this.log.error(err);
        return '';
      });
  }

  private async handleModelGet() {
    this.log.info('Triggered GET Model');
    return this.heliosKwl
      .run(async (com) => {
        if (!this.model) {
          this.model = await com.getModel();
        }
        return this.model;
      })
      .catch((err) => {
        this.log.error(err);
        return '';
      });
  }

  private async handlePartySet(isParty : any) {
    this.log.info('Triggered SET Party');
    return this.heliosKwl
      .run(async (com) => com.setPartyOn(isParty as boolean))
      .catch((err) => this.log.error(err));
  }

  private async handleSilentSet(isSilent : any) {
    this.log.info('Triggered SET Silent');
    return this.heliosKwl
      .run(async (com) => com.setSilentOn(isSilent as boolean))
      .catch((err) => this.log.error(err));
  }

  private handleFanSet(isOn : any) {
    this.log.info('Triggered SET fan ignored');
    setTimeout(() => {
      this.fan
        .getCharacteristic(hap.Characteristic.On)
        .updateValue(this.lastFanOnValue);
    }, 500);
    return true;
  }

  private async handleFirmwareRevisionGet() {
    this.log.info('Triggered GET FirmwareRevision');
    return this.heliosKwl
      .run(async (com) => {
        if (!this.firmware) {
          this.firmware = await com.getFirmwareRevision();
        }
        return this.firmware;
      })
      .catch((err) => {
        this.log.error(err);
        return '';
      });
  }

  private async periodicFetch() {
    try {
      // prevent callback overflow
      if (this.isFetching) return;
      this.isFetching = true;
      this.log.debug('Fetching updates');
      await this.heliosKwl.run(async (com) => {
        const isPartyOn = await com.getPartyOn();
        this.partySwitch
          .getCharacteristic(hap.Characteristic.On)
          .updateValue(isPartyOn);

        const isSilentOn = await com.getSilentOn();
        this.silentSwitch
          .getCharacteristic(hap.Characteristic.On)
          .updateValue(isSilentOn);

        const fanPercentage = await com.getVentilationPercent();
        this.fan
          .getCharacteristic(hap.Characteristic.RotationSpeed)
          .updateValue(fanPercentage);

        const fanStage = await com.getFanStage();
        this.lastFanOnValue = fanStage !== 0;
        this.fan
          .getCharacteristic(hap.Characteristic.On)
          .updateValue(this.lastFanOnValue);
      });
    } catch (error) {
      this.log.error(`Error fetching values: ${error}`);
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
    return [
      this.informationService,
      this.partySwitch,
      this.silentSwitch,
      this.fan,
    ];
  }
}
/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory('Helios KWL', HeliosKWLAccessory);
};
