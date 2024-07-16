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
const unknown = 'unknown';
const LEVELS: { [key: number]: [number, number] } = {
    0: [0, 0],
    1: [1, 33],
    2: [34, 66],
    3: [67, 99],
    4: [100, 100],
};

function toPercent(level: number): number {
    const [min, max] = LEVELS[level];
    return Math.floor((min + max) / 2);
}

function fromPercent(percent: number): number {
    for (const [level, [min, max]] of Object.entries(LEVELS)) {
        if (percent >= min && percent <= max) {
            return Number(level);
        }
    }
    return -1; // Return -1 if percent is not within any level range
}
class HeliosKWLAccessory implements AccessoryPlugin {
  private readonly log: Logging;

  private readonly name: string;

  private firmware = unknown;

  private model = unknown;

  private serial = unknown;

  private lastFanOnValue = true;

  private isFetching = false;

  private fanStage = 2;

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
    this.fan.getCharacteristic(hap.Characteristic.RotationSpeed)
      .onGet(this.handleFanGetSpeed.bind(this))
      .onSet(this.handleFanSetSpeed.bind(this));

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

    setTimeout(() => setInterval(() => this.getInformation(), 1000 * 60), 1000 * 1);
    setTimeout(() => setInterval(() => this.periodicFetch(), 1000 * 10), 1000 * 8);

    log.info('Switch finished initializing!');
  }

  private async handleIdentifySet(value: any) {
    this.log.error(`Triggered SET Identify: ${value}`);
  }

  private async handleSerialNumberGet() {
    return this.serial;
  }

  private async handleFirmwareRevisionGet() {
    return this.firmware;
  }

  private async handleModelGet() {
    return this.model;
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

  // eslint-disable-next-line no-unused-vars
  private async handleFanSet(isOn : any) {
    this.log.info(`Triggered SET fan: ${isOn}`);
    var value = 0;
    if (isOn) {
      value = 50;
    }
    this.fanStage = fromPercent(value);
    this.log.info(`Setting fan stage: ${this.fanStage}`);
    return this.heliosKwl
        .run(async (com) => com.setFanStage(this.fanStage))
        .catch((err) => this.log.error(err));
  }

  private async handleFanGetSpeed() {
    this.log.info(`Triggered GET fan speed`);

    await this.heliosKwl.run(async (com) => {
        this.fanStage = await com.getFanStage();
    });
    this.log.info(`Got fan stage ${this.fanStage}`);
    return toPercent(this.fanStage);
  }

  private async handleFanSetSpeed(speed : any) {
    this.log.info(`Triggered SET fan speed: ${speed}`);
    this.fanStage = fromPercent(speed);
    this.log.info(`Setting fan stage: ${this.fanStage}`);
    return this.heliosKwl
        .run(async (com) => com.setFanStage(this.fanStage))
        .catch((err) => this.log.error(err));
  }

  private async getInformation() {
    await this.heliosKwl
      .run(async (com) => {
        this.firmware = await com.getFirmwareRevision() ?? unknown;
        this.model = await com.getModel() ?? unknown;
        this.serial = await com.getSerial() ?? unknown;
      })
      .catch((err) => this.log.error(`Error getting infos: ${err}`));

    this.informationService
      .getCharacteristic(hap.Characteristic.FirmwareRevision)
      .updateValue(this.firmware);

    this.informationService
      .getCharacteristic(hap.Characteristic.Model)
      .updateValue(this.model);

    this.informationService
      .getCharacteristic(hap.Characteristic.SerialNumber)
      .updateValue(this.serial);
  }

  private async periodicFetch() {
    try {
      // prevent callback overflow
      if (this.isFetching) return;
      this.isFetching = true;
      this.log.debug('Fetching updates');
      await this.heliosKwl.run(async (com) => {
        this.log.debug('Connected to KWL');
        const isPartyOn = await com.getPartyOn();
        this.partySwitch
          .getCharacteristic(hap.Characteristic.On)
          .updateValue(isPartyOn);

        const isSilentOn = await com.getSilentOn();
        this.silentSwitch
          .getCharacteristic(hap.Characteristic.On)
          .updateValue(isSilentOn);

        this.fanStage = await com.getFanStage();
        this.lastFanOnValue = !isSilentOn && this.fanStage > 0;
        this.fan
          .getCharacteristic(hap.Characteristic.On)
          .updateValue(this.lastFanOnValue);
        this.fan
          .getCharacteristic(hap.Characteristic.RotationSpeed)
          .updateValue(toPercent(this.fanStage));
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
