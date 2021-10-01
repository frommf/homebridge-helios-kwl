#!/usr/bin/env node

console.log('Started...');

const modbusUnitId = 180;
const Modbus = require('jsmodbus');

const net = require('net');

const socket = new net.Socket();
const client = new Modbus.client.TCP(socket, modbusUnitId, 5000);
const options = {
  host: 'helios.fritz.box',
  port: 502,
};

function get(variable, modbuslen) {
  return new Promise((resolve, reject) => {
    console.log(`Get helios var ${variable} with len ${modbuslen}`);
    client.writeMultipleRegisters(1, Buffer.from(`${variable}\0\0`, 'ascii')).then((writeResp) => {
      console.log(JSON.stringify(writeResp.response));
      client.readHoldingRegisters(1, modbuslen).then((resp) => {
        const responseArr = resp.response.body.valuesAsBuffer.toString('ascii').split('=');
        if (responseArr.length > 1 && responseArr[0] == variable) {
          responseArr.shift();
          resolve(decodeURIComponent(responseArr.join('=').replace(/[\u0000]+$/g, '')));
        } else {
          reject(new Error(`Helios get task modbus write error var name ${variable} did not match read result: ${resp.payload.toString('ascii')}`));
        }
      });
    });
  });
}

function open() {
  const p = new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('Connected.');
      resolve();
    });
  });
  socket.connect(options);
  return p;
}

open()
  .then(() => {
    get('v00094', 6).then((result) => {
      console.log(`Result: ${result}`);
      socket.end();
    });
  });
