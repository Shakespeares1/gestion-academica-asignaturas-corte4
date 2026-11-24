const { cordova, events } = require('cordova-lib');

for (const event of ['log', 'warn', 'results']) {
  events.on(event, console.log);
}

cordova.build({ platforms: ['android'], options: { debug: true } }).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
