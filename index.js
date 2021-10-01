#!/usr/bin/env node
'use strict';

console.log("Started...")

const modbusUnitId = 180;
// create a tcp modbus client
const Modbus = require('jsmodbus')

const net = require('net')
const socket = new net.Socket()
const client = new Modbus.client.TCP(socket, modbusUnitId, 5000)
const options = {
'host' : 'helios.fritz.box',
'port' : 502
}

function get(variable, modbuslen) {
    client.writeMultipleRegisters(1, Buffer.from(variable + '\0\0', 'ascii')).then(function (writeResp) {
        
        console.log('Helios get task modbus write for var name ' + variable + ' finished: ' + JSON.stringify(writeResp));
        console.log('Helios get task executing modbus read for var name ' + variable + ' with len ' + modbuslen);

        const resp = client.readHoldingRegisters(1, modbuslen).then(function (resp) {
            
            console.log('Helios get task modbus read for var name ' + variable + ' finished: ' + JSON.stringify(resp) + ' payload in ASCII: ' + resp.response._body.valuesAsBuffer.toString('ascii'));
            
            //V-Teil prüfen, abschneiden und nur Wert weitergeben:
            var responseArr = resp.response._body.valuesAsBuffer.toString('ascii').split("=");
            if (responseArr.length > 1 && responseArr[0] == variable) {
                responseArr.shift();
                return decodeURIComponent(responseArr.join("=").replace(/[\u0000]+$/g, ''));
            } else {
                throw new Error('Helios get task modbus write error var name ' + variable + ' did not match read result: ' + resp.payload.toString('ascii'));
        }});
    });
}


// for reconnecting see node-net-reconnect npm module

// use socket.on('open', ...) when using serialport
socket.on('connect', function () {
    console.log("GET");
    try {
        get('v00094', 6);
    } catch (error) {
        console.error(error);
    }

});

socket.connect(options)


