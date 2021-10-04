# Homebridge PlugIn for Helios easyControls Ventilation Systems

The Helios KWL uses a web server for configuration and control and is able to do most automation tasks on its own. This plugin adds some functionalities to HomeKit to integrate the home ventilation to your home automation.

The plugin provides the following services:

- **Party Modus Switch**: A switch synchronized to the 'Party Mode' of the ventilation system
- **Silent Modus Switch**: A switch synchronized to the 'Silent Mode' of the ventilation system
- **Fan Speed**: Signalizes the fan speed

## Remarks

This plugin is in early alpha state. Use it with care. This is a plugin for connecting Helios Domestic Ventilation Systems to Homebridge. There is no connection with the manufacturer and since I only own one of the Systems I can't provide support or help with yours...

Helios does not sync access to the modbus protocol. This means using 2 modbus connections leads to errors in communication. Make sure that your system is only communicating to **one client at a time**.

## Config

    "accessories": [
        {
            "accessory": "Helios KWL",
            "name": "My Ventilation",
            "port": 502,
            "host": "helios.fritz.box"
        }
    ],

## Developer notes

Install this plugin into a local installation by installing the package globally:

    npm install -g
    sudo hb-service restart

### Local Test

Edit the `test.ts` file for  tests with a local ventilation system and start using:

    npm run test
