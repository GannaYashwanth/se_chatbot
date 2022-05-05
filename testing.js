var fs = require('fs');
var DOMParser = require('dom-parser')
var data_read;
// Use fs.readFile() method to read the file
fs.readFile('sitemap.xml', 'utf8', function(err, data){
      
    // Display the file content
    data_read = data;
    // console.log(data_read)
});

const lines = data_read.split(/\r\n|\n/)

var parser , xmldoc;

parser = new DOMParser();

xmldoc = parser.parseFromString(data_read , "text/xml")


//document.getElementById("demo").innerHTML = xmldoc.getElementsByTagName("url")[0].childNodes[0].nodeValue;