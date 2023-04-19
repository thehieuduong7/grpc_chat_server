
const fs = require('fs');

const currentDate = new Date();
const year = currentDate.getFullYear();
const month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
const day = ('0' + currentDate.getDate()).slice(-2);
const hours = ('0' + currentDate.getHours()).slice(-2);
const minutes = ('0' + currentDate.getMinutes()).slice(-2);
const time = `${year}${month}${day}_${hours}${minutes}`;
const logFilePath = `logs/${time}.txt`; // the path to the log file

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
