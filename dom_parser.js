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
var xmlString = "<?xml version = '1.0'?>" +
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


function clickHandler(evt) {

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
    appendLog("{\n")
    for(var i =0; i< children.length; i++) {
       var child = children[i];
       // <studen> Element
       
       if(child.nodeType == Node.ELEMENT_NODE)  {
           var rollNo = child.getAttribute("rollNo");
           var fullNameElement = child.getElementsByTagName("fullName")[0];
           var nickNameElement = child.getElementsByTagName("nickName")[0];
           var marksElement = child.getElementsByTagName("marks")[0];

           var fullName = fullNameElement.textContent;
           var nickName = nickNameElement.textContent;
           var marks = marksElement.textContent;
           appendLog("{\n")
           appendLog('"rollNo" :' + '"' + rollNo + '" ,');
           appendLog('"fullName" : "' + fullName + '" ,');
           appendLog('"nickName" : "' + nickName + '" ,');
           appendLog('"marks" : "' + marks + '" ,');
           appendLog("} , \n");
       }
    }
    appendLog("}\n")
}


function resetLog() {
    document.getElementById('textarea-log').value = "";
}

function appendLog(msg) {
    document.getElementById('textarea-log').value += "\n" + msg;
}