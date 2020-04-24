# takehome-alloy-api
This is the API and Cron portion of the Alloy take home project. The web portion (which consumes this API) is [here].(https://github.com/mmattax/takehome-alloy-web)

## Setup

1. Add Slack credentials to [.env](https://github.com/mmattax/takehome-alloy-api/blob/master/.env).

2. Install deps and get Mongo up and running:
```bash
npm install
docker-compose up mongo
```

3. This project makes use of [webpack](https://webpack.js.org/) to transpile and bundle our TypeScript for Node.js. It uses [HMR](https://webpack.js.org/concepts/hot-module-replacement/) during development to load changes automatically. To start webpack, run:

```bash
npm run webpack
```
4. In another tab, run the bundled application that's in `.dist/` by:
```bash
npm start
```

## Docker
The API can be run fully within docker (if a `./dist` folder exists) by running:
```
docker-compose up
```
If I had more time, I'd find a way to get webpack and node running within the same docker container, likely with [Supervisor](http://supervisord.org/)
