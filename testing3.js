const lineReader = require('line-reader');

var data_string = '';

lineReader.eachLine('sitemap.xml', function(line, last) {
    // console.log(`Line from file: ${line}`);
    data_string = data_string.concat(`${line}`)
    if(last) {
      console.log('Last line printed.');
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
      console.log(data_string)
    }
  });

