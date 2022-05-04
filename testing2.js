const lineReader = require('line-reader');
var xmlString
function parseXML(xmlString) {
    var parser = new DOMParser();
    // Parse a simple Invalid XML source to get namespace of <parsererror>:
    var docError = parser.parseFromString('INVALID', 'text/xml');
    var parsererrorNS = docError.getElementsByTagName("parsererror")[0].namespaceURI;
    // Parse xmlString:
    // (XMLDocument object)
    var doc = parser.parseFromString(xmlString, 'text/xml');
    if (doc.getElementsByTagNameNS(parsererrorNS, 'parsererror').length > 0) {
        throw new Error('Error parsing XML');
    }
    return doc;
}

// XML String:
/*var xmlString = "<?xml version = '1.0'?>" +
    "<class> " +
    "   <student rollNo = '393'> " +
    "      <fullName>Putin</fullName> " +
    "      <nickName>putin</nickName> " +
    "      <marks>95</marks> " +
    "   </student> "

    +
    "   <student rollNo = '493'> " +
    "      <fullName>Trump</fullName> " +
    "      <nickName>trump</nickName> " +
    "      <marks>90</marks> " +
    "   </student> "

    +
    "   <student rollNo = '593'> " +
    "      <fullName>Kim</fullName> " +
    "      <nickName>kim</nickName> " +
    "      <marks>85</marks> " +
    "   </student> " +
    "</class> ";
*/
var xmlString = 
    "<urlset><url><loc>LOC</loc><lastmod>Lastmod</lastmod><priority>Priority</priority></url></urlset>"
/*var xmlString = "<?xml version = '1.0'?>" +
    "<urlset> " +
    "   <url> " +
    "      <loc>https://pandas.pydata.org/docs/</loc> " +
    "      <lastmod>2022-04-06T12:58:55+00:00</lastmod> " +
    "      <priority>1.00</priority> " +
    "   </url> "
    +

    "</urlset> ";*/

function data_string(){
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
      xmlString = data_string
}

function clickHandler(evt) {

    data_string();
    console.log(xmlString);
    var doc;

    try {
        // XMLDocument object:
        doc = parseXML(xmlString);
        console.log(doc.documentElement);
    } catch (e) {
        alert(e);
        return;
    }
    resetLog();

    // Element object. <--> <class>
    var rootElement = doc.documentElement;
    //
    var children = rootElement.childNodes;

    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        // <studen> Element
        if (child.nodeType == Node.ELEMENT_NODE) {
            //var rollNo = child.getAttribute("rollNo");
            var fullNameElement = child.getElementsByTagName("loc")[0];
            var nickNameElement = child.getElementsByTagName("lastmod")[0];
            var marksElement = child.getElementsByTagName("priority")[0];

            var fullName = fullNameElement.textContent;
            var nickName = nickNameElement.textContent;
            var marks = marksElement.textContent;

            //appendLog("rollNo: " + rollNo);
            appendLog("fullName: " + fullName);
            appendLog("nickName: " + nickName);
            appendLog("marks: " + marks);
        }
    }

}


function resetLog() {
    document.getElementById('textarea-log').value = "";
}

function appendLog(msg) {
    document.getElementById('textarea-log').value += "\n" + msg;
}
