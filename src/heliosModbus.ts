import { ModbusTCPClient } from 'jsmodbus';
import { Socket } from 'net';

export interface Log {
  // eslint-disable-next-line no-unused-vars
  (message: string): void;
}

export default class HeliosModbus {
  private readonly modbusUnitId = 180;

  private socket: Socket;

  private client: ModbusTCPClient;

  private options: { host: string; port: number };

  private log: Log;

  constructor(host: string, port: number, log?: Log) {
    this.log = log ?? (() => {});
    this.options = {
      host,
      port,
    };
    this.socket = new Socket();
    this.client = new ModbusTCPClient(this.socket, this.modbusUnitId, 5000);
  }

  async open(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const rejectListener = (err: Error) => {
        this.log('Connection error.');
        reject(err);
      };
      this.socket.once('error', rejectListener);
      this.socket.connect(this.options, () => {
        this.log('Connected.');
        this.socket.removeListener('error', rejectListener);
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      const rejectListener = (err: Error) => {
        this.log('Connection close error.');
        reject(err);
      };
      this.socket.once('error', rejectListener);
      this.socket.end(() => {
        this.log('Disconnected.');
        this.socket.removeListener('error', rejectListener);
        resolve();
      });
    });
  }

  private static check(variable: string, modbuslen:number, value: string) {
    const isOk = variable.startsWith('v')
      && variable.length === 6
      && modbuslen * 2 >= 8 + value.length;
    if (!isOk) {
      throw new Error(`Parameter check for '${variable}' failed.`);
    }
  }

  async set(variable: string, modbuslen: number, value: string) : Promise<void> {
    HeliosModbus.check(variable, modbuslen, value);
    return new Promise<void>((resolve, reject) => {
      const buf = Buffer.alloc(modbuslen * 2);
      buf.write(`${variable}=`, 0, 7, 'ascii');
      buf.write(value, 7, value.length, 'ascii');
      this.client.writeMultipleRegisters(1, buf).then((resp) => {
        this.log(`Response: ${JSON.stringify(resp.response)}`);
        resolve();
      }, (error) => {
        reject(new Error(
          `Modbus write error on '${variable}' with value ${value}: ${error}`,
        ));
      });
    });
  }

  async get(variable: string, modbuslen: number): Promise<string> {
    HeliosModbus.check(variable, modbuslen, '');
    return new Promise((resolve, reject) => {
      this.log(`Get helios var ${variable} with len ${modbuslen}`);
      this.client
        .writeMultipleRegisters(1, Buffer.from(`${variable}\0\0`, 'ascii'))
        .then((writeResp) => {
          this.log(`Response: ${JSON.stringify(writeResp.response)}`);
          this.client.readHoldingRegisters(1, modbuslen).then((resp) => {
            const resultText = resp.response.body.valuesAsBuffer
              .toString('ascii')
              .replace(/\0+$/g, '');
            const keyValue = resultText.split(/=(.+)/, 2);
            if (keyValue.length === 2 && keyValue[0] === variable) {
              resolve(decodeURIComponent(keyValue[1]));
            } else {
              reject(
                new Error(
                  `Modbus write error - variable '${variable}' did not match.`
                    + `Read result: ${resultText}`,
                ),
              );
            }
          });
        });
    });
  }
}
