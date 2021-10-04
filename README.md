# Homebridge PlugIn for Helios Easy Control Ventilation Systems

The Helios KWL uses a web server for configuration and control and is able to do most automation tasks on its own. This plugin adds some functionalities to HomeKit to integrate the home ventilation to your home automation.

The plugin provides the following services:

- **Party Modus Switch**: A switch synchronized to the 'Party Modus' of the ventilation

## Config

    "accessories": [
        {
            "accessory": "Helios KWL",
            "name": "My Ventilation",
            "port": 502,
            "host": "helios.fritz.box"
        }
    ],

## Developer installation

Install this plugin into a local installation by installing the package globally:

    npm install -g
    sudo hb-service restart

## Local Test

Edit the `test.ts` file for  tests with a local ventilation system and start using:

    npm run test
