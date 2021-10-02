import { ModbusTCPClient } from 'jsmodbus';
import { Socket } from 'net';

export default class Helios {
    readonly host:string;

    readonly port:number;

    private readonly modbusUnitId = 180;

    private socket: Socket;

    private client: ModbusTCPClient;

    private options: { host: string; port: number; };

    constructor(host: string, port: number) {
      this.host = host;
      this.port = port;
      this.socket = new Socket();
      this.client = new ModbusTCPClient(this.socket, this.modbusUnitId, 5000);
      this.options = {
        host: 'helios.fritz.box',
        port: 502,
      };
    }

    async open() : Promise<void> {
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

    async get(variable: string, modbuslen: number) : Promise<string> {
      return new Promise((resolve, reject) => {
        console.log(`Get helios var ${variable} with len ${modbuslen}`);
        this.client.writeMultipleRegisters(1, Buffer.from(`${variable}\0\0`, 'ascii'))
          .then((writeResp) => {
            console.log(JSON.stringify(writeResp.response));
            this.client.readHoldingRegisters(1, modbuslen)
              .then((resp) => {
                const responseArr = resp.response.body.valuesAsBuffer.toString('ascii').split('=');
                if (responseArr.length > 1 && responseArr[0] === variable) {
                  responseArr.shift();
                  // eslint-disable-next-line no-control-regex
                  resolve(decodeURIComponent(responseArr.join('=').replace(/[\u0000]+$/g, '')));
                } else {
                  reject(new Error(
                    `Modbus write error with variable '${variable}' did not match `
                    + `read result: ${resp.response.body.valuesAsBuffer.toString('ascii')}`,
                  ));
                }
              });
          });
      });
    }
}
