
const fs = require('fs');
const logFilePath = 'logs.txt'; // the path to the log file

function printMessage(label, message) {
  fs.appendFileSync(logFilePath, `(time: ${new Date().toLocaleString()})[${
    label}]: ${
      message}\n`, (err) => {
    if (err) throw err;
  });
    console.log(`(time: ${new Date().toLocaleString()})[${label}]: ${message}`)
}

module.exports ={
  printMessage
}
