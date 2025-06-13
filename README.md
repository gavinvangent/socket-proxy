# socket-proxy

A NodeJS TCP/UDP proxy built in typescript.

## Getting started

You will need to have NodeJS installed, preferably version 14.15.5. After cloning the repository, run the following command to prepare the codebase. This repo supports [NVM](https://github.com/nvm-sh/nvm) with a .nvmrc file for automatic version loading.

```sh
npm i
```

## Running

To run the socket-proxy, execute the following with all the arguments needed for your usage:

```sh
npm run start -- ${args}
```

### Arguments

- bindAddress - The address to bind the server to, defaults to `0.0.0.0`
- bindPort - The port to bind the server to, required
- serverAddress - The address of the remote server where traffic will be forwarded to, required in the format of `server.example.com` or `8.8.4.4`
- serverPort - The port of the remote server where traffic will be forwarded to, required
- clientKeepAliveInterval - the TCP Keep-Alive Interval (milliseconds) for the client connection, optional, defaults to none
- serverKeepAliveInterval - the TCP Keep-Alive Interval (milliseconds) for the server connection, optional, defaults to none
- type - The type of server to start, defaults to `tcp`, options are
    - tcp
    - udp (same as udp4)
    - udp4
    - udp6

Example:

```sh
npm run start -- --bindPort 9001 --serverAddress server.example.com --serverPort 5000 --type udp4
```

```sh
npm run start -- --bindPort 9001 --serverAddress server.example.com --serverPort 5000 --type tcp --clientKeepAliveInterval 30000 --serverKeepAliveInterval 30000
```

## TODO

- Logging: Not much has been added yet. The logging currently is basic and will need attention.
- Tests: No unit/end-to-end tests have been added yet
