import { ModbusTCPClient } from 'jsmodbus';
import { Socket } from 'net';

export default class Helios {
  readonly host: string;

  readonly port: number;

  private readonly modbusUnitId = 180;

  private socket: Socket;

  private client: ModbusTCPClient;

  private options: { host: string; port: number };

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
    this.socket = new Socket();
    this.client = new ModbusTCPClient(this.socket, this.modbusUnitId, 5000);
    this.options = {
      host,
      port,
    };
  }

  async open(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const rejectListener = (err: Error) => {
        console.log('Connection error.');
        reject(err);
      };
      this.socket.once('error', rejectListener);
      this.socket.connect(this.options, () => {
        console.log('Connected.');
        this.socket.removeListener('error', rejectListener);
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      const rejectListener = (err: Error) => {
        console.log('Connection close error.');
        reject(err);
      };
      this.socket.once('error', rejectListener);
      this.socket.end(() => {
        console.log('Disconnected.');
        this.socket.removeListener('error', rejectListener);
        resolve();
      });
    });
  }

  async get(variable: string, modbuslen: number): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`Get helios var ${variable} with len ${modbuslen}`);
      this.client
        .writeMultipleRegisters(1, Buffer.from(`${variable}\0\0`, 'ascii'))
        .then((writeResp) => {
          console.log(JSON.stringify(writeResp.response));
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
