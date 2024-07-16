/* eslint-disable max-classes-per-file */
/* eslint-disable no-unused-vars */
import { Mutex } from 'async-mutex';
import HeliosModbus, { Log } from './heliosModbus';

class Commands {
  private bus: HeliosModbus;

  constructor(bus: HeliosModbus) {
    this.bus = bus;
  }

  async getModel() : Promise<string> {
    const modelText = await this.bus.get('v00000', 20);
    return modelText;
  }

  async getPartyOn() : Promise<boolean> {
    const isOnText = await this.bus.get('v00094', 5);
    return Boolean(Number(isOnText));
  }

  async getSerial() : Promise<string> {
    return this.bus.get('v00303', 12);
  }

  async getVentilationPercent() : Promise<number> {
    const percentText = await this.bus.get('v00103', 6);
    return Number(percentText);
  }

  async getFanStage() : Promise<number> {
    const stage = await this.bus.get('v00102', 5);
    return Number(stage);
  }

  async setFanStage(stage : any) : Promise<void> {
    const numberValue = Number(stage).toString();
    await this.bus.set('v00102', 5, numberValue);
  }

  async getFirmwareRevision() : Promise<string> {
    return this.bus.get('v01101', 7);
  }

  async setPartyOn(isOn: boolean) : Promise<void> {
    const numberValue = Number(isOn).toString();
    await this.bus.set('v00094', 5, numberValue);
  }

  async getSilentOn() : Promise<boolean> {
    const isOnText = await this.bus.get('v00099', 5);
    return Boolean(Number(isOnText));
  }

  async setSilentOn(isOn: boolean) : Promise<void> {
    const numberValue = Number(isOn).toString();
    await this.bus.set('v00099', 5, numberValue);
  }
}

export default class HeliosKWL {
  private host: string;

  private port: number;

  private log?: Log;

  private mutex: Mutex;

  constructor(host: string, port: number, log?: Log) {
    this.host = host;
    this.port = port;
    this.log = log;
    this.mutex = new Mutex();
  }

  async run<T>(commFunc: (com: Commands) => Promise<T>): Promise<T> {
    return this.mutex.runExclusive(async () => {
      const bus = new HeliosModbus(this.host, this.port, this.log);
      await bus.open();
      try {
        return await commFunc(new Commands(bus));
      } finally {
        await bus.close();
      }
    });
  }
}
