# swagger-ts-client-generator

[![Greenkeeper badge](https://badges.greenkeeper.io/Narazaka/swagger-ts-client-generator.svg)](https://greenkeeper.io/)

swagger schema based api client generator for typescript

## Install

```
npm install -g swagger-ts-client-generator
```

## Usage

```
swagger-ts-client-generator < swagger.json > api.ts
```

swagge.json should have "$ref" keys in /paths to point /definitions because of dtsgenerator's behavior.

## License

This is released under [MIT License](https://narazaka.net/license/MIT?2017)
