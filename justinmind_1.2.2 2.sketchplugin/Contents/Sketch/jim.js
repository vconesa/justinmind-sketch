@import 'fileUtils.js'
@import 'utils.js'

var mapID = {};
var invalidXMLCharacterSet;
function createJustinmindXMLData(folderURL,sketchData){
  mapID = {};
  createInvalidXMLCharacterSet();

  for (var i = 0; i < sketchData.length; i++) {
    var artboardData = sketchData[i];
    createScreenFromArtboard(folderURL,i,artboardData);
  }
}

function createScreenFromArtboard(folderURL,index, artboardData){
  var screenID =  createNewUUID();

  var screenXMLPath = folderURL.path().stringByAppendingPathComponent("screens").stringByAppendingPathComponent(screenID+".xml");

  var xmlDoc = createScreenXMLDoc(screenID,index, artboardData);
  writeXMLDoc(xmlDoc,screenXMLPath);

  if(index===0)
    setProjectProperties(folderURL,screenID);
}

function createScreenXMLDoc(id,index, artboardData){
  var root = NSXMLNode.elementWithName("screen");
  var xmlDoc = NSXMLDocument.alloc().initWithRootElement(root);
  xmlDoc.setVersion("1.0");
  xmlDoc.setCharacterEncoding("UTF-8");

  var dateFormatter = NSDateFormatter.alloc().init();
  dateFormatter.setDateFormat(@"dd/MM/yyyy HH:mm:ss");
  var date = dateFormatter.stringFromDate(NSDate.date());
  root.addChild(NSXMLNode.elementWithName("parentCode"));
  root.addChild(NSXMLNode.elementWithName_stringValue("folderPosition",index+""));
  root.addChild(NSXMLNode.elementWithName_stringValue("name",artboardData.name));
  root.addChild(NSXMLNode.elementWithName_stringValue("code",id));
  root.addChild(NSXMLNode.elementWithName_stringValue("templateID","f39803f7-df02-4169-93eb-7547fb8c961a"));
  root.addChild(NSXMLNode.elementWithName_stringValue("date",date));
  root.addChild(NSXMLNode.elementWithName_stringValue("note",""));
  root.addChild(NSXMLNode.elementWithName_stringValue("legend-item",""));
  root.addChild(NSXMLNode.elementWithName_stringValue("pageAlignment","LEFT"));
  root.addChild(NSXMLNode.elementWithName_stringValue("orientation",selectedOrientation.toUpperCase()));

  var jimDevice = getJustinmindDeviceType();
  if(jimDevice.type=="web"){
    root.addChild(NSXMLNode.elementWithName_stringValue("width",artboardData.width));
    root.addChild(NSXMLNode.elementWithName_stringValue("height",artboardData.height));
    root.addChild(NSXMLNode.elementWithName_stringValue("backgroundGrowth","BOTH"));
  }else{
    root.addChild(NSXMLNode.elementWithName_stringValue("width",jimDevice.width));
    root.addChild(NSXMLNode.elementWithName_stringValue("height",jimDevice.height));
    root.addChild(NSXMLNode.elementWithName_stringValue("backgroundGrowth","VERTICAL"));
  }

  var node =  NSXMLNode.elementWithName("item-group");
  node.addAttribute(NSXMLNode.attributeWithName_stringValue("id",createNewUUID()));
  node.addAttribute(NSXMLNode.attributeWithName_stringValue("visible","true"));

  createContainerChildrenNodes(node,artboardData.items,0);
  
  node.addChild(createCanvasStyleNode(artboardData));
  root.addChild(node);
  root.addChild(NSXMLNode.elementWithName("Events"));

  return xmlDoc;
}

function createContainerChildrenNodes(node,childrenData,parentRotation){

    if(node.rotation) 
     parentRotation += node.rotation;
    
    parentRotation = getJustinmindRotation(parentRotation);
    
  for (var i = 0; i < childrenData.length; i++) {
  
    var childData = childrenData[i];
    var type =  childData.type;
    
    var childNode;
    
    
    switch(type)
    {
    case "text":
      childNode = createTextNode(childData,parentRotation);
      break;
  case "image":
       childNode = createImageNode(childData,parentRotation);
      break;
  case "svg":
     if(childData.name.startsWith("in_")){
       childData.name=childData.name.split("_").pop();
      image = createSVGNode(childData,parentRotation);
       childData.type="InputText";
       childData.name="in_"+childData.name;
       childData.rotation="0";
       childData.radius="0";
       childData.fill = {
                'color':"0r0g0b100a",
                'type':"color"
            };
       var childNode = createRectangleNode(childData,parentRotation);
       node.addChild(image)
      }else
      childNode= createSVGNode(childData,parentRotation);
      break;
  case "line":
      childNode = createLineNode(childData,parentRotation);
      break;
  case "rectangle":
      childNode = createRectangleNode(childData,parentRotation);
      break;
  case "InputText":
      childNode = createRectangleNode(childData,parentRotation);
      break;
  case "ellipse":
      childNode = createEllipseNode(childData,parentRotation);
      break;
  case "group":
      childNode = createGroupNode(childData,parentRotation);
      break;
    }

    if(childNode){
      node.addChild(childNode);
      
      }
      
  }
  
}

function createCanvasStyleNode(artboardData){
  var styleNode =  NSXMLNode.elementWithName("style");
  styleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","LnFCanvas"));

  var dimensionNode = NSXMLNode.elementWithName("DimensionStyle");
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("width","0"));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height","0"));
  styleNode.addChild(dimensionNode);

  var positionNode = NSXMLNode.elementWithName("PositioningStyle");
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left","0"));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("top","0"));
  styleNode.addChild(positionNode);

  var backgroundNode = NSXMLNode.elementWithName("BackgroundStyle");
  if(artboardData.background){
    backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("type","color"));
    backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("value",artboardData.background));
  }else
    backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("type","transparent"));
  styleNode.addChild(backgroundNode);

  var transparencyNode = NSXMLNode.elementWithName("TransparencyStyle");
  transparencyNode.addAttribute(NSXMLNode.attributeWithName_stringValue("value","0"));
  styleNode.addChild(transparencyNode);

  return styleNode;
}

function setProjectProperties(folderURL,homeScreenID){
  var nsURLProperties = NSURL.URLWithString_relativeToURL("properties.xml",folderURL);
  var xmlDoc = NSXMLDocument.alloc().initWithContentsOfURL_options_error(nsURLProperties,NSXMLDocumentTidyXML,null);

  var jimDevice = getJustinmindDeviceType();

  var root = xmlDoc.rootElement();
  var children = root.children();
  for (var i = 0; i < children.length; i++) {
    var childNode = children[i];
    if(childNode.name()=="prototypeDevice")
      childNode.setStringValue(jimDevice.type);
    else if(childNode.name()=="homeScreenCode")
      childNode.setStringValue(homeScreenID);
    else if(childNode.name()=="canvasOrientation")
      childNode.setStringValue(selectedOrientation.toUpperCase());
    else if(childNode.name()=="canvasOrientation")
      childNode.setStringValue(selectedOrientation.toUpperCase());
    else if(childNode.name()=="canvasSize"){
       childNode.attributeForName("w").setStringValue(jimDevice.width);
       childNode.attributeForName("h").setStringValue(jimDevice.height);
    }
  }
  var externalAppNode =  NSXMLNode.elementWithName("externalApp");
  externalAppNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","sketch"));
  externalAppNode.addChild(NSXMLNode.elementWithName_stringValue("appVersion",sketch.version));
  externalAppNode.addChild(NSXMLNode.elementWithName_stringValue("pluginVersion",pluginVersion));
  root.addChild(externalAppNode);
  writeXMLDoc(xmlDoc,nsURLProperties.path());
  setSimulationDeviceProperties(folderURL,jimDevice);
  setLibrariesProperties(folderURL,jimDevice);
}

function setSimulationDeviceProperties(folderURL,jimDevice){
  var nsURLProperties = NSURL.URLWithString_relativeToURL("simulation/simulation.xml",folderURL);

  var xmlDoc = NSXMLDocument.alloc().initWithContentsOfURL_options_error(nsURLProperties,NSXMLDocumentTidyXML,null);

  var root = xmlDoc.rootElement();
  var children = root.children();

  for (var i = 0; i < children.length; i++) {
    var childNode = children[i];
    if(childNode.name()=="device")
      childNode.setStringValue(jimDevice.type);
    else if(childNode.name()=="widthValue")
      childNode.setStringValue(jimDevice.width);
    else if(childNode.name()=="heightValue")
      childNode.setStringValue(jimDevice.height);
    else if(childNode.name()=="orientation")
      childNode.setStringValue(selectedOrientation.toLowerCase());
  }
  root.addChild(NSXMLNode.elementWithName_stringValue("startWidthMode","true"));
  writeXMLDoc(xmlDoc,nsURLProperties.path());
}

function setLibrariesProperties(folderURL,jimDevice){
  var mapLibraries = getAvailableLibraries();

  var nsURLProperties = NSURL.URLWithString_relativeToURL("widgetLibraries.xml",folderURL);

  var xmlDoc = NSXMLDocument.alloc().initWithContentsOfURL_options_error(nsURLProperties,NSXMLDocumentTidyXML,null);

  var root = xmlDoc.rootElement();

  if(jimDevice.type=="web"){
    root.addChild(mapLibraries["web"]);
    root.addChild(mapLibraries["webComponents"]);
    root.addChild(mapLibraries["parallax"]);
  } else  if(jimDevice.type=="iPhone X"){
    root.addChild(mapLibraries["iphone"]);
    root.addChild(mapLibraries["ios"]);
  } else  if(jimDevice.type=="iPhone6"){
    root.addChild(mapLibraries["iphone"]);
    root.addChild(mapLibraries["ios"]);
  } else  if(jimDevice.type=="iPhone6Plus"){
    root.addChild(mapLibraries["iphonePlus"]);
    root.addChild(mapLibraries["ios"]);
  } else  if(jimDevice.type=="iPad"){
    root.addChild(mapLibraries["ipad"]);
    root.addChild(mapLibraries["ios"]);
  } else  if(jimDevice.type=="androidPhone"){
    root.addChild(mapLibraries["androidPhone"]);
    root.addChild(mapLibraries["androidIcons"]);
  } else  if(jimDevice.type=="androidTablet"){
    root.addChild(mapLibraries["androidTablet"]);
    root.addChild(mapLibraries["androidIcons"]);
  }

  writeXMLDoc(xmlDoc,nsURLProperties.path());
}

function createTextNode(textData,parentRotation){
  var textNode =  NSXMLNode.elementWithName("rich-text");
  textNode.addAttribute(NSXMLNode.attributeWithName_stringValue("id",createNewUUID()));
  textNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hidden",textData.visible ? "false" : "true"));
  textNode.addAttribute(NSXMLNode.attributeWithName_stringValue("lockType","none"));
  textNode.addAttribute(NSXMLNode.attributeWithName_stringValue("onTop","false"));
  textNode.addAttribute(NSXMLNode.attributeWithName_stringValue("visible",textData.visible ? "true" : "false"));

  textNode.addChild(NSXMLNode.elementWithName_stringValue("text",removeInvalidCharacters(textData.text)));

  var styleNode = NSXMLNode.elementWithName("style");
  styleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","LnFRichText"));

  var dimensionNode = NSXMLNode.elementWithName("DimensionStyle");
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("width",Math.round(textData.size.width)+""));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height",Math.round(textData.size.height)+""));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("autofit","false"));
  styleNode.addChild(dimensionNode);

  var positionNode = NSXMLNode.elementWithName("PositioningStyle");
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left",Math.round(textData.relativePosition.x)+""));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("top",Math.round(textData.relativePosition.y)+""));
  styleNode.addChild(positionNode);

  var backgroundNode = NSXMLNode.elementWithName("BackgroundStyle");
  backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("type","transparent"));
  styleNode.addChild(backgroundNode);

  var borderNode = NSXMLNode.elementWithName("BorderStyle");
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("radius","0"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftWidth","1"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topWidth","1"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightWidth","1"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomWidth","1"));
  styleNode.addChild(borderNode);

  var textStyleNode = NSXMLNode.elementWithName("TextStyle");
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("color",textData.text_color));
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hAlign",textData.text_hAlign));
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("vAlign","left"));
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("decoration",textData.text_decoration));
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("line-height",Math.round(textData.line_height)+""));
  styleNode.addChild(textStyleNode);

  var fontNode = NSXMLNode.elementWithName("FontStyle");
  fontNode.addAttribute(NSXMLNode.attributeWithName_stringValue("size",textData.fontData.size));
  fontNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height",textData.fontData.height));
  fontNode.addChild(NSXMLNode.elementWithName_stringValue("family",textData.fontData.family));
  var fontStyleNode = NSXMLNode.elementWithName("style");
  fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name",textData.fontData.name));
  fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("weight",textData.fontData.weight));
  fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("italic",textData.fontData.italic));
  fontNode.addChild(fontStyleNode);
  styleNode.addChild(fontNode);

  var transparencyNode = NSXMLNode.elementWithName("TransparencyStyle");
  transparencyNode.addAttribute(NSXMLNode.attributeWithName_stringValue("value",textData.transparency+""));
  styleNode.addChild(transparencyNode);
  
  textData.rotation += parentRotation;
  textData.rotation = getJustinmindRotation(textData.rotation);

  var rotationNode = NSXMLNode.elementWithName("RotationStyle");
  rotationNode.addAttribute(NSXMLNode.attributeWithName_stringValue("angle",Math.round(textData.rotation).toString()));
  styleNode.addChild(rotationNode);

  var shadowNode = NSXMLNode.elementWithName("ShadowStyle");
  var shadowBoxNode = NSXMLNode.elementWithName("Box");
  shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","false"));
  shadowNode.addChild(shadowBoxNode);
  var shadowTextNode = NSXMLNode.elementWithName("Text");
  if(textData.textShadow){
    shadowTextNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","true"));
    shadowTextNode.addAttribute(NSXMLNode.attributeWithName_stringValue("global","false"));
    shadowTextNode.addAttribute(NSXMLNode.attributeWithName_stringValue("blur",textData.textShadow.blur+""));
    shadowTextNode.addAttribute(NSXMLNode.attributeWithName_stringValue("distance",textData.textShadow.distance+""));
    shadowTextNode.addAttribute(NSXMLNode.attributeWithName_stringValue("angle",textData.textShadow.angle+""));
    shadowTextNode.addAttribute(NSXMLNode.attributeWithName_stringValue("color",textData.textShadow.color));
  }else {
    shadowTextNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","false"));
  }
  shadowNode.addChild(shadowTextNode);
  styleNode.addChild(shadowNode);
  textNode.addChild(styleNode);

  var rangeListNode = NSXMLNode.elementWithName("rich-text-range-list");

  for (var i = 0; i < textData.ranges.length; i++) {
    var rangeData = textData.ranges[i];
    var rangeNode = NSXMLNode.elementWithName("text-range");
    rangeNode.addAttribute(NSXMLNode.attributeWithName_stringValue("text-range-start",rangeData.start+""));
    rangeNode.addAttribute(NSXMLNode.attributeWithName_stringValue("text-range-end",rangeData.end+""));

    var rangeStyleNode = NSXMLNode.elementWithName("style");
    rangeStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","LnFTextRange"));
    var rangeTextStyleNode = NSXMLNode.elementWithName("TextStyle");
    rangeTextStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("color",rangeData.text_color));
    rangeTextStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hAlign",textData.text_hAlign));
    rangeTextStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("vAlign","left"));
    rangeTextStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("decoration",rangeData.text_decoration));
    rangeTextStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("line-height",Math.round(textData.line_height)+""));
    rangeStyleNode.addChild(rangeTextStyleNode);

    var rangeFontNode = NSXMLNode.elementWithName("FontStyle");
    rangeFontNode.addAttribute(NSXMLNode.attributeWithName_stringValue("size",rangeData.fontData.size));
    rangeFontNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height",rangeData.fontData.height));
    rangeFontNode.addChild(NSXMLNode.elementWithName_stringValue("family",rangeData.fontData.family));
    var rangeFontStyleNode = NSXMLNode.elementWithName("style");
    rangeFontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name",rangeData.fontData.name));
    rangeFontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("weight",rangeData.fontData.weight));
    rangeFontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("italic",rangeData.fontData.italic));
    rangeFontNode.addChild(rangeFontStyleNode);
    rangeStyleNode.addChild(rangeFontNode);
    rangeNode.addChild(rangeStyleNode);
    rangeListNode.addChild(rangeNode);
  }

  textNode.addChild(rangeListNode);
  textNode.addChild(NSXMLNode.elementWithName_stringValue("userID",calculateValidName(textData.name)));
  return textNode;
}

function createImageNode(imageData,parentRotation){
  
  var imageNode =  NSXMLNode.elementWithName("image");
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("id",createNewUUID()));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hidden",imageData.visible ? "false" : "true"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("lockType","none"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("onTop","false"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("visible",imageData.visible ? "true" : "false"));
  

  imageNode.addChild(NSXMLNode.elementWithName_stringValue("image-name",imageData.filename));
  imageNode.addChild(NSXMLNode.elementWithName_stringValue("original-name",imageData.filename));

  var styleNode = NSXMLNode.elementWithName("style");
  styleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","LnFImage"));

  var dimensionNode = NSXMLNode.elementWithName("DimensionStyle");
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("width",Math.round(imageData.size.width)+""));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height",Math.round(imageData.size.height)+""));
  styleNode.addChild(dimensionNode);

  var positionNode = NSXMLNode.elementWithName("PositioningStyle");
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left",Math.round(imageData.relativePosition.x)+""));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("top",Math.round(imageData.relativePosition.y)+""));
  styleNode.addChild(positionNode);

  var borderNode = NSXMLNode.elementWithName("BorderStyle");
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("radius","0"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftWidth","1"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topWidth","1"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightWidth","1"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomWidth","1"));
  styleNode.addChild(borderNode);

  var transparencyNode = NSXMLNode.elementWithName("TransparencyStyle");
  transparencyNode.addAttribute(NSXMLNode.attributeWithName_stringValue("value","0"));
  styleNode.addChild(transparencyNode);
  
//  imageData.rotation += parentRotation;
  //imageData.rotation = getJustinmindRotation(imageData.rotation);

  var rotationNode = NSXMLNode.elementWithName("RotationStyle");
  rotationNode.addAttribute(NSXMLNode.attributeWithName_stringValue("angle","0"));
  styleNode.addChild(rotationNode);

  var shadowNode = NSXMLNode.elementWithName("ShadowStyle");
  var boxNode = NSXMLNode.elementWithName("Box");
  boxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","false"));
  shadowNode.addChild(boxNode);
  styleNode.addChild(shadowNode);

  var backgroundNode = NSXMLNode.elementWithName("SVGBackgroundStyle");
  backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("isSVG","false"));
  backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bgColor","0r0g0b"));
  backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hasColor","false"));
  styleNode.addChild(backgroundNode);

  imageNode.addChild(styleNode);
  imageNode.addChild(NSXMLNode.elementWithName_stringValue("userID",calculateValidName(imageData.name)));
  return imageNode;
}

function createSVGNode(svgData,parentRotation){
  var svgNode =  NSXMLNode.elementWithName("image");
  svgNode.addAttribute(NSXMLNode.attributeWithName_stringValue("id",createNewUUID()));
  svgNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hidden",svgData.visible ? "false" : "true"));
  svgNode.addAttribute(NSXMLNode.attributeWithName_stringValue("lockType","none"));
  svgNode.addAttribute(NSXMLNode.attributeWithName_stringValue("onTop","false"));
  svgNode.addAttribute(NSXMLNode.attributeWithName_stringValue("visible",svgData.visible ? "true" : "false"));

  var imageNameNode = NSXMLNode.elementWithName_stringValue("image-name",svgData.filename);
  imageNameNode.addAttribute(NSXMLNode.attributeWithName_stringValue("type","svg"));
  imageNameNode.addAttribute(NSXMLNode.attributeWithName_stringValue("preserveRatio","false"));
  svgNode.addChild(imageNameNode);
  svgNode.addChild(NSXMLNode.elementWithName_stringValue("original-name",svgData.filename));

  var styleNode = NSXMLNode.elementWithName("style");
  styleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","LnFImage"));

  var dimensionNode = NSXMLNode.elementWithName("DimensionStyle");
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("width",Math.round(svgData.size.width)+""));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height",Math.round(svgData.size.height)+""));
  styleNode.addChild(dimensionNode);

  var positionNode = NSXMLNode.elementWithName("PositioningStyle");
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left",Math.round(svgData.relativePosition.x)+""));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("top",Math.round(svgData.relativePosition.y)+""));
  styleNode.addChild(positionNode);

  var borderNode = NSXMLNode.elementWithName("BorderStyle");
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("radius","0"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftWidth","1"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topWidth","1"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightWidth","1"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomWidth","1"));
  styleNode.addChild(borderNode);

  var transparencyNode = NSXMLNode.elementWithName("TransparencyStyle");
  transparencyNode.addAttribute(NSXMLNode.attributeWithName_stringValue("value","0"));
  styleNode.addChild(transparencyNode);

  //svgData.rotation += parentRotation;
  //svgData.rotation = getJustinmindRotation(svgData.rotation);
  
  var rotationNode = NSXMLNode.elementWithName("RotationStyle");
  rotationNode.addAttribute(NSXMLNode.attributeWithName_stringValue("angle","0"));
  styleNode.addChild(rotationNode);

  var shadowNode = NSXMLNode.elementWithName("ShadowStyle");
  var boxNode = NSXMLNode.elementWithName("Box");
  boxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","false"));
  shadowNode.addChild(boxNode);
  styleNode.addChild(shadowNode);

  var backgroundNode = NSXMLNode.elementWithName("SVGBackgroundStyle");
  backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("isSVG","true"));
  backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bgColor","0r0g0b"));
  backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hasColor","false"));
  styleNode.addChild(backgroundNode);

  svgNode.addChild(styleNode);
  svgNode.addChild(NSXMLNode.elementWithName_stringValue("userID",calculateValidName(svgData.name)));
  return svgNode;
}

function createRectangleNode(imageData,parentRotation){
    
/*
    <rectangle id="33695345-90ce-49c5-a5e0-801daf570a98" auto-fit="false" hidden="false" lockType="none" onTop="false" visible="true">
      <text></text>
      <style name="LnFRectangle">
        <DimensionStyle widthType="px" heightType="px" width="124" height="101" widthPercentage="0.0" heightPercentage="0.0" />
        <PositioningStyle left="57" top="165" pinLeft="none" pinTop="none" />
        <BackgroundStyle type="color" value="217r217g217b0a" />
        <BorderStyle radius="0" leftColor="140r140g140b0a" topColor="140r140g140b0a" rightColor="140r140g140b0a" bottomColor="140r140g140b0a" leftStyle="solid" topStyle="solid" rightStyle="solid" bottomStyle="solid" leftWidth="1" topWidth="1" rightWidth="1" bottomWidth="1" />
        <TextStyle color="51r51g51b0a" hAlign="center" vAlign="center" decoration="none" line-height="18" />
        <FontStyle size="10.0" height="13">
          <family>Arial</family>
          <style name="Regular" weight="400" italic="normal" />
        </FontStyle>
        <TransparencyStyle value="0" />
        <PaddingStyle top="0" left="0" bottom="0" right="0" />
        <RotationStyle angle="0" />
        <ShadowStyle>
          <Box enable="false" />
          <Text enable="false" />
        </ShadowStyle>
        <MarginStyle top="0" left="0" bottom="0" right="0" />
      </style>
      <rich-text-range-list>
        <text-range text-range-start="0" text-range-end="0">
          <style name="LnFTextRange">
            <FontStyle size="10.0" height="17">
              <family>Arial</family>
              <style name="Regular" weight="400" italic="normal" />
            </FontStyle>
            <TextStyle color="51r51g51b0a" hAlign="center" vAlign="center" decoration="none" line-height="18" />
          </style>
        </text-range>
      </rich-text-range-list>
      <userID>Rectangle_1</userID>
    </rectangle>


 
*/
    
    
  var imageNode =  NSXMLNode.elementWithName("rectangle");
  if(imageData.type == "InputText") imageNode =  NSXMLNode.elementWithName("attribute-form");
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("id",createNewUUID()));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hidden",imageData.visible ? "false" : "true"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("auto-fit","false"));
  if(imageData.type == "InputText") imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("writable","true"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("lockType","none"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("onTop","false"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("visible",imageData.visible ? "true" : "false"));
   if(imageData.type == "InputText"){
      imageNode.addChild(NSXMLNode.elementWithName_stringValue("attStyle","InputText"));
      imageNode.addChild(NSXMLNode.elementWithName_stringValue("type","text"));
   }

  var styleNode = NSXMLNode.elementWithName("style");
 if(imageData.type == "InputText") styleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","LnFAttributeForm"));
  else styleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","LnFRectangle"));

  var dimensionNode = NSXMLNode.elementWithName("DimensionStyle");
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("width",Math.round(imageData.size.width).toString()));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height",Math.round(imageData.size.height).toString()));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("widthPercentage","0.0"));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("heightPercentage","0.0"));
  styleNode.addChild(dimensionNode);
  
  if(imageData.fill)
  {
  var backgroundNode = NSXMLNode.elementWithName("BackgroundStyle");
  backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("type","color"));
  backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("value",imageData.fill.color));
  styleNode.addChild(backgroundNode);
  }

  var positionNode = NSXMLNode.elementWithName("PositioningStyle");
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left",Math.round(imageData.relativePosition.x).toString()));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("top",Math.round(imageData.relativePosition.y).toString()));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("pinTop","none"));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("pinLeft","none"));
  styleNode.addChild(positionNode);

  var borderNode = NSXMLNode.elementWithName("BorderStyle");
  if(!imageData.border)
  {
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("radius",Math.round(Math.min(100,100*imageData.radius*2/Math.min(imageData.size.width,imageData.size.height))).toString())));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftStyle","solid"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topStyle","solid"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightStyle","solid"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomStyle","solid"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftWidth","0"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topWidth","0"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightWidth","0"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomWidth","0"));
  }
  else
  {
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("radius",Math.round(Math.min(100,100*imageData.radius*2/Math.min(imageData.size.width,imageData.size.height))).toString()));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftColor",imageData.border.color));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topColor",imageData.border.color));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightColor",imageData.border.color));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomColor",imageData.border.color));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftStyle","solid"));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topStyle","solid"));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightStyle","solid"));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomStyle","solid"));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftWidth",Math.round(imageData.border.width).toString()));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topWidth",Math.round(imageData.border.width).toString()));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightWidth",Math.round(imageData.border.width).toString()));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomWidth",Math.round(imageData.border.width).toString())); 
  }
  styleNode.addChild(borderNode);
  
  
  var textStyleNode = NSXMLNode.elementWithName("TextStyle");
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("color","51r51g51b0a"));
  if(imageData.type =="InputText")
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hAlign","left"));
    else
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hAlign","center"));
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("vAlign","center"));
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("decoration","none"));
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("line-height","18"));
  styleNode.addChild(textStyleNode);

  var fontNode = NSXMLNode.elementWithName("FontStyle");
  fontNode.addAttribute(NSXMLNode.attributeWithName_stringValue("size","10.0"));
  fontNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height","13"));
  fontNode.addChild(NSXMLNode.elementWithName_stringValue("family","Arial"));
  var fontStyleNode = NSXMLNode.elementWithName("style");
  fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","Regular"));
  fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("weight","400"));
  fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("italic","normal"));
  fontNode.addChild(fontStyleNode);
  styleNode.addChild(fontNode);
  

  if(imageData.transparency !=null){
  var transparencyNode = NSXMLNode.elementWithName("TransparencyStyle");
  transparencyNode.addAttribute(NSXMLNode.attributeWithName_stringValue("value",imageData.transparency.toString()));
  styleNode.addChild(transparencyNode);
  }
  imageData.rotation += parentRotation;
  console.log("rect: "+imageData.rotation);
  imageData.rotation = getJustinmindRotation(imageData.rotation);

  var rotationNode = NSXMLNode.elementWithName("RotationStyle");
  rotationNode.addAttribute(NSXMLNode.attributeWithName_stringValue("angle",imageData.rotation.toString()));
  styleNode.addChild(rotationNode);

  var shadowNode = NSXMLNode.elementWithName("ShadowStyle");
  var shadowBoxNode = NSXMLNode.elementWithName("Box");
  
  
  
  if(imageData.shadow){
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","true"));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("global","false"));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("blur",imageData.shadow.blur+""));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("distance",imageData.shadow.distance+""));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("dist",imageData.shadow.spread+""));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("angle",imageData.shadow.angle+""));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("color",imageData.shadow.color));
    }
    else
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","false"));
    
    var shadowTextNode = NSXMLNode.elementWithName("Text");
     shadowTextNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","false"));
     
    shadowNode.addChild(shadowBoxNode);
    shadowNode.addChild(shadowTextNode);
  styleNode.addChild(shadowNode);
  

  var marginNode = NSXMLNode.elementWithName("MarginStyle");
  marginNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left","0"));
  marginNode.addAttribute(NSXMLNode.attributeWithName_stringValue("top","0"));
  marginNode.addAttribute(NSXMLNode.attributeWithName_stringValue("right","0"));
  marginNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottom","0"));
styleNode.addChild(marginNode);

var paddingNode = NSXMLNode.elementWithName("PaddingStyle");
if(imageData.type =="InputText")
  paddingNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left","5"));
  else
  paddingNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left","0")); 
  paddingNode.addAttribute(NSXMLNode.attributeWithName_stringValue("top","0"));
  paddingNode.addAttribute(NSXMLNode.attributeWithName_stringValue("right","0"));
  paddingNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottom","0"));
styleNode.addChild(paddingNode);

  imageNode.addChild(styleNode);
  
  
  var rangeListNode = NSXMLNode.elementWithName("rich-text-range-list");


    var rangeNode = NSXMLNode.elementWithName("text-range");
    rangeNode.addAttribute(NSXMLNode.attributeWithName_stringValue("text-range-start","0"));
    rangeNode.addAttribute(NSXMLNode.attributeWithName_stringValue("text-range-end","0"));

    var rangeStyleNode = NSXMLNode.elementWithName("style");
    rangeStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","LnFTextRange"));
    var textStyleNode = NSXMLNode.elementWithName("TextStyle");
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("color","51r51g51b0a"));
    if(imageData.type =="InputText")
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hAlign","left"));
    else
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hAlign","center"));
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("vAlign","center"));
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("decoration","none"));
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("line-height","18"));
    rangeStyleNode.addChild(textStyleNode);

    var fontNode = NSXMLNode.elementWithName("FontStyle");
    fontNode.addAttribute(NSXMLNode.attributeWithName_stringValue("size","10.0"));
    fontNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height","13"));
    fontNode.addChild(NSXMLNode.elementWithName_stringValue("family","Arial"));
    
    var fontStyleNode = NSXMLNode.elementWithName("style");
    fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","Regular"));
    fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("weight","400"));
    fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("italic","normal"));
    fontNode.addChild(fontStyleNode);
    
    rangeStyleNode.addChild(fontNode);
    
    rangeNode.addChild(rangeStyleNode);
    rangeListNode.addChild(rangeNode);
  
  
  
 

  imageNode.addChild(rangeListNode);
  
  if(imageData.type =="InputText"){
  imageNode.addChild(NSXMLNode.elementWithName_stringValue("defaultValue",""));
    imageNode.addChild(NSXMLNode.elementWithName_stringValue("placeholder",""));
  }

  
  var userid =calculateValidName(imageData.name);
  if(imageData.type =="InputText")
  imageNode.addChild(NSXMLNode.elementWithName_stringValue("userID",userid.split("_").pop()));
  else
  imageNode.addChild(NSXMLNode.elementWithName_stringValue("userID",userid));
  return imageNode;
}

function createEllipseNode(imageData,parentRotation){
    
/*
<ellipse id="fc265539-2bae-4b11-b3ee-7625f5e0072d" hidden="false" lockType="none" onTop="false" visible="true">
      <text></text>
      <style name="LnFEllipse">
        <DimensionStyle widthType="px" heightType="px" width="151" height="249" widthPercentage="0.0" heightPercentage="0.0" />
        <PositioningStyle left="320" top="317" pinLeft="none" pinTop="none" />
        <BackgroundStyle type="color" value="217r217g217b0a" />
        <BorderStyle color="64r64g64b0a" style="solid" width="3" />
        <TextStyle color="51r51g51b0a" hAlign="center" vAlign="center" decoration="none" line-height="18" />
        <FontStyle size="10.0" height="13">
          <family>Arial</family>
          <style name="Regular" weight="400" italic="normal" />
        </FontStyle>
        <TransparencyStyle value="0" />
        <PaddingStyle top="0" left="0" bottom="0" right="0" />
        <RotationStyle angle="0" />
        <ShadowStyle>
          <Box enable="false" />
          <Text enable="false" />
        </ShadowStyle>
        <MarginStyle top="0" left="0" bottom="0" right="0" />
      </style>
      <rich-text-range-list>
        <text-range text-range-start="0" text-range-end="0">
          <style name="LnFTextRange">
            <FontStyle size="10.0" height="17">
              <family>Arial</family>
              <style name="Regular" weight="400" italic="normal" />
            </FontStyle>
            <TextStyle color="51r51g51b0a" hAlign="center" vAlign="center" decoration="none" line-height="18" />
          </style>
        </text-range>
      </rich-text-range-list>
      <userID>Ellipse_1</userID>
    </ellipse>

     <ellipse id="69716872-4d89-45a2-b668-79363ccd36a6" hidden="false" lockType="none" onTop="false" visible="true">
            <style name="LnFEllipse">
                <DimensionStyle width="313" height="267" widthPercentage="0.0" heightPercentage="0.0"></DimensionStyle>
                <BackgroundStyle type="color" value="216r216g216b0a"></BackgroundStyle>
                <PositioningStyle left="252" top="165" pinTop="none" pinLeft="none"></PositioningStyle>
                <BorderStyle color="151r151g151b0a" style="solid" width="1"></BorderStyle>
                <TextStyle color="51r51g51b0a" hAlign="center" vAlign="center" decoration="none" line-height="18"></TextStyle>
                <FontStyle size="10.0" height="13">
                    <family>Arial</family>
                    <style name="Regular" weight="400" italic="normal"></style>
                </FontStyle>
                <TransparencyStyle value="0"></TransparencyStyle>
                <RotationStyle angle="0"></RotationStyle>
                <ShadowStyle>
                    <Box enable="false"></Box>
                    <Text enable="false"></Text>
                </ShadowStyle>
                <MarginStyle left="0" top="0" right="0" bottom="0"></MarginStyle>
            </style>
            <rich-text-range-list>
                <text-range text-range-start="0" text-range-end="0">
                    <style name="LnFTextRange">
                        <TextStyle color="51r51g51b0a" hAlign="center" vAlign="center" decoration="none" line-height="18"></TextStyle>
                        <FontStyle size="10.0" height="13">
                            <family>Arial</family>
                            <style name="Regular" weight="400" italic="normal"></style>
                        </FontStyle>
                    </style>
                </text-range>
            </rich-text-range-list>
            <userID>Oval</userID>
        </ellipse>
*/
    
    
  var imageNode =  NSXMLNode.elementWithName("ellipse");
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("id",createNewUUID()));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hidden",imageData.visible ? "false" : "true"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("lockType","none"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("onTop","false"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("visible",imageData.visible ? "true" : "false"));

    
    
  var styleNode = NSXMLNode.elementWithName("style");
  styleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","LnFEllipse"));

  var dimensionNode = NSXMLNode.elementWithName("DimensionStyle");
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("width",Math.round(imageData.size.width).toString()));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height",Math.round(imageData.size.height).toString()));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("widthPercentage","0.0"));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("heightPercentage","0.0"));
  styleNode.addChild(dimensionNode);
  
  if(imageData.fill)
  {
  var backgroundNode = NSXMLNode.elementWithName("BackgroundStyle");
  backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("type","color"));
  backgroundNode.addAttribute(NSXMLNode.attributeWithName_stringValue("value",imageData.fill.color));
  styleNode.addChild(backgroundNode);
  }

  var positionNode = NSXMLNode.elementWithName("PositioningStyle");
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left",Math.round(imageData.relativePosition.x).toString()));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("top",Math.round(imageData.relativePosition.y).toString()));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("pinTop","none"));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("pinLeft","none"));
  styleNode.addChild(positionNode);

  var borderNode = NSXMLNode.elementWithName("BorderStyle");
  if(!imageData.border)
  {
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("color","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("style","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("width","1"));
  }
  else
  {
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("color",imageData.border.color));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("style","solid"));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("width",Math.round(imageData.border.width).toString()));
  }
  styleNode.addChild(borderNode);
  
  
  var textStyleNode = NSXMLNode.elementWithName("TextStyle");
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("color","51r51g51b0a"));
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hAlign","center"));
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("vAlign","center"));
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("decoration","none"));
  textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("line-height","18"));
  styleNode.addChild(textStyleNode);

  var fontNode = NSXMLNode.elementWithName("FontStyle");
  fontNode.addAttribute(NSXMLNode.attributeWithName_stringValue("size","10.0"));
  fontNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height","13"));
  fontNode.addChild(NSXMLNode.elementWithName_stringValue("family","Arial"));
  var fontStyleNode = NSXMLNode.elementWithName("style");
  fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","Regular"));
  fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("weight","400"));
  fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("italic","normal"));
  fontNode.addChild(fontStyleNode);
  styleNode.addChild(fontNode);
  

  var transparencyNode = NSXMLNode.elementWithName("TransparencyStyle");
  transparencyNode.addAttribute(NSXMLNode.attributeWithName_stringValue("value",imageData.transparency.toString()));
  styleNode.addChild(transparencyNode);
  
  imageData.rotation += parentRotation;
  
  imageData.rotation = getJustinmindRotation(imageData.rotation);

  var rotationNode = NSXMLNode.elementWithName("RotationStyle");
  rotationNode.addAttribute(NSXMLNode.attributeWithName_stringValue("angle",imageData.rotation.toString()));
  styleNode.addChild(rotationNode);

  var shadowNode = NSXMLNode.elementWithName("ShadowStyle");
  var shadowBoxNode = NSXMLNode.elementWithName("Box");
  
  
  
  if(imageData.shadow){
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","true"));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("global","false"));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("blur",imageData.shadow.blur+""));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("distance",imageData.shadow.distance+""));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("dist",imageData.shadow.spread+""));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("angle",imageData.shadow.angle+""));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("color",imageData.shadow.color));
    }
    else
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","false"));
    
    var shadowTextNode = NSXMLNode.elementWithName("Text");
     shadowTextNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","false"));
     
    shadowNode.addChild(shadowBoxNode);
    shadowNode.addChild(shadowTextNode);
  styleNode.addChild(shadowNode);
  

  var marginNode = NSXMLNode.elementWithName("MarginStyle");
  marginNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left","0"));
  marginNode.addAttribute(NSXMLNode.attributeWithName_stringValue("top","0"));
  marginNode.addAttribute(NSXMLNode.attributeWithName_stringValue("right","0"));
  marginNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottom","0"));
styleNode.addChild(marginNode);

  imageNode.addChild(styleNode);
  
  
  var rangeListNode = NSXMLNode.elementWithName("rich-text-range-list");


    var rangeNode = NSXMLNode.elementWithName("text-range");
    rangeNode.addAttribute(NSXMLNode.attributeWithName_stringValue("text-range-start","0"));
    rangeNode.addAttribute(NSXMLNode.attributeWithName_stringValue("text-range-end","0"));

    var rangeStyleNode = NSXMLNode.elementWithName("style");
    rangeStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","LnFTextRange"));
    var textStyleNode = NSXMLNode.elementWithName("TextStyle");
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("color","51r51g51b0a"));
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hAlign","center"));
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("vAlign","center"));
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("decoration","none"));
    textStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("line-height","18"));
    rangeStyleNode.addChild(textStyleNode);

    var fontNode = NSXMLNode.elementWithName("FontStyle");
    fontNode.addAttribute(NSXMLNode.attributeWithName_stringValue("size","10.0"));
    fontNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height","13"));
    fontNode.addChild(NSXMLNode.elementWithName_stringValue("family","Arial"));
    
    var fontStyleNode = NSXMLNode.elementWithName("style");
    fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","Regular"));
    fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("weight","400"));
    fontStyleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("italic","normal"));
    fontNode.addChild(fontStyleNode);
    
    rangeStyleNode.addChild(fontNode);
    
    rangeNode.addChild(rangeStyleNode);
    rangeListNode.addChild(rangeNode);
  
  
  
 

  imageNode.addChild(rangeListNode);
  
  var textNode = NSXMLNode.elementWithName("text");
  imageNode.addChild(textNode);
  
  imageNode.addChild(NSXMLNode.elementWithName_stringValue("userID",calculateValidName(imageData.name)));
  return imageNode;
}


function createLineNode(imageData,parentRotation){
    
    /*
    <line id="788e47b2-9f5a-4dcf-9f88-6204693a4a0e" start-marker="NONE" end-marker="NONE" hidden="false" lockType="none" onTop="false" visible="true">
      <style name="LnFSeparationLine">
        <DimensionStyle widthType="px" heightType="px" width="132" height="2" widthPercentage="0.0" heightPercentage="0.0" />
        <PositioningStyle left="180" top="223" pinLeft="none" pinTop="none" />
        <BorderStyle leftColor="64r64g64b0a" topColor="64r64g64b0a" rightColor="64r64g64b0a" bottomColor="64r64g64b0a" leftStyle="none" topStyle="solid" rightStyle="none" bottomStyle="none" leftWidth="1" topWidth="2" rightWidth="1" bottomWidth="1" />
        <TransparencyStyle value="0" />
        <RotationStyle angle="62" />
        <ShadowStyle>
          <Box enable="false" />
        </ShadowStyle>
        <MarginStyle top="0" left="0" bottom="0" right="0" />
      </style>
      <userID>Line_1</userID>
    </line>
    */
    
    
  var imageNode =  NSXMLNode.elementWithName("line");
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("id",createNewUUID()));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hidden",imageData.visible ? "false" : "true"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("start-marker","NONE"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("end-marker","NONE"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("lockType","none"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("onTop","false"));
  imageNode.addAttribute(NSXMLNode.attributeWithName_stringValue("visible",imageData.visible ? "true" : "false"));


  var styleNode = NSXMLNode.elementWithName("style");
  styleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","LnFSeparationLine"));

  var dimensionNode = NSXMLNode.elementWithName("DimensionStyle");
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("width",Math.round(imageData.lineLength).toString()));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height",Math.round(imageData.border.width).toString()));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("widthPercentage","0.0"));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("heightPercentage","0.0"));
  styleNode.addChild(dimensionNode);

  var positionNode = NSXMLNode.elementWithName("PositioningStyle");
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left",Math.round(imageData.relativePosition.x).toString()));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("top",Math.round(imageData.relativePosition.y).toString()));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("pinTop","none"));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("pinLeft","none"));
  styleNode.addChild(positionNode);

  var borderNode = NSXMLNode.elementWithName("BorderStyle");
  if(!imageData.border)
  {
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("radius","0"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomColor","0r0g0b"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomStyle","none"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftWidth","1"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topWidth","1"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightWidth","1"));
  borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomWidth","1"));
  }
  else
  {
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("radius","0"));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftColor",imageData.border.color));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topColor",imageData.border.color));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightColor",imageData.border.color));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomColor",imageData.border.color));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftStyle","none"));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topStyle","solid"));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightStyle","none"));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomStyle","none"));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("leftWidth","1"));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("topWidth",Math.round(imageData.border.width).toString()));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("rightWidth","1"));
      borderNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottomWidth","1")); 
  }
  styleNode.addChild(borderNode);

  var transparencyNode = NSXMLNode.elementWithName("TransparencyStyle");
  transparencyNode.addAttribute(NSXMLNode.attributeWithName_stringValue("value",imageData.transparency.toString()));
  styleNode.addChild(transparencyNode);

  imageData.rotation += parentRotation;
  imageData.rotation = getJustinmindRotation(imageData.rotation);
  
  var rotationNode = NSXMLNode.elementWithName("RotationStyle");
  rotationNode.addAttribute(NSXMLNode.attributeWithName_stringValue("angle",Math.round(imageData.rotation).toString()));
  styleNode.addChild(rotationNode);

  var shadowNode = NSXMLNode.elementWithName("ShadowStyle");
  var shadowBoxNode = NSXMLNode.elementWithName("Box");
  
  
  
  if(imageData.shadow){
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","true"));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("global","false"));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("blur",imageData.shadow.blur+""));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("distance",imageData.shadow.distance+""));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("dist",imageData.shadow.spread+""));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("angle",imageData.shadow.angle+""));
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("color",imageData.shadow.color));
    }
    else
    shadowBoxNode.addAttribute(NSXMLNode.attributeWithName_stringValue("enable","false"));
     
    shadowNode.addChild(shadowBoxNode);
  styleNode.addChild(shadowNode);
  

  var marginNode = NSXMLNode.elementWithName("MarginStyle");
  marginNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left","0"));
  marginNode.addAttribute(NSXMLNode.attributeWithName_stringValue("top","0"));
  marginNode.addAttribute(NSXMLNode.attributeWithName_stringValue("right","0"));
  marginNode.addAttribute(NSXMLNode.attributeWithName_stringValue("bottom","0"));
styleNode.addChild(marginNode);

  imageNode.addChild(styleNode);
  imageNode.addChild(NSXMLNode.elementWithName_stringValue("userID",calculateValidName(imageData.name)));
  return imageNode;
}

function createGroupNode(groupData,parentRotation){
  var groupNode =  NSXMLNode.elementWithName("group-container");
  groupNode.addAttribute(NSXMLNode.attributeWithName_stringValue("id",createNewUUID()));
  groupNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hidden",groupData.visible ? "false" : "true"));
  groupNode.addAttribute(NSXMLNode.attributeWithName_stringValue("lockType","none"));
  groupNode.addAttribute(NSXMLNode.attributeWithName_stringValue("onTop","false"));
  groupNode.addAttribute(NSXMLNode.attributeWithName_stringValue("visible",groupData.visible ? "true" : "false"));

  if(groupData.rotation) 
   parentRotation += groupData.rotation;
  
  parentRotation = getJustinmindRotation(parentRotation);
  
  createContainerChildrenNodes(groupNode,groupData.items,parentRotation);

  var styleNode = NSXMLNode.elementWithName("style");
  styleNode.addAttribute(NSXMLNode.attributeWithName_stringValue("name","LnFGroup"));

  var dimensionNode = NSXMLNode.elementWithName("DimensionStyle");
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("width",Math.round(groupData.size.width)+""));
  dimensionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("height",Math.round(groupData.size.height)+""));
  styleNode.addChild(dimensionNode);

  var positionNode = NSXMLNode.elementWithName("PositioningStyle");
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("left",Math.round(groupData.relativePosition.x)+""));
  positionNode.addAttribute(NSXMLNode.attributeWithName_stringValue("top",Math.round(groupData.relativePosition.y)+""));
  styleNode.addChild(positionNode);

  var rotationNode = NSXMLNode.elementWithName("RotationStyle");
  rotationNode.addAttribute(NSXMLNode.attributeWithName_stringValue("angle","0"));
  styleNode.addChild(rotationNode);

  groupNode.addChild(styleNode);
  groupNode.addChild(NSXMLNode.elementWithName_stringValue("userID",calculateValidName(groupData.name)));
  return groupNode;
}


function getJustinmindDeviceType(){
	if(selectedDeviceType=="Web"){
			return {'type':"web",'orientation':selectedOrientation,'width':"1024",'height': "768"};
  }else if(selectedDeviceType=="iPhone X"){
          return {'type':"iPhoneX",'orientation':selectedOrientation,'width':"375",'height': "812"};
  }else if(selectedDeviceType=="iPhone"){
      return {'type':"iPhone6",'orientation':selectedOrientation,'width':"375",'height': "667"};
	}else if(selectedDeviceType=="iPhone plus"){
      return {'type':"iPhone6Plus",'orientation':selectedOrientation,'width':"414",'height': "736"};
	}else if(selectedDeviceType=="iPad"){
    return {'type':"iPad",'orientation':selectedOrientation,'width':"768",'height': "1024"};
	}else if(selectedDeviceType=="Android"){
    return {'type':"androidPhone",'orientation':selectedOrientation,'width':"360",'height': "640"};
	}else if(selectedDeviceType=="Android tablet"){
		return {'type':"androidTablet",'orientation':selectedOrientation,'width':"800",'height': "1280"};
  }
	return {'type':"web",'orientation':selectedOrientation,'width':"1024",'height': "768"};
}

function getAvailableLibraries(){
  var mapLibs = {};

  var webLib = NSXMLNode.elementWithName("library");
  webLib.addChild(NSXMLNode.elementWithName_stringValue("uuid","05ed0e22-75e0-459e-aa12-1e1c596d67c9"));
  webLib.addChild(NSXMLNode.elementWithName_stringValue("name","Web"));
  mapLibs["web"] = webLib;

  var webComponentsLib = NSXMLNode.elementWithName("library");
  webComponentsLib.addChild(NSXMLNode.elementWithName_stringValue("uuid","35ed0e22-75e0-459e-aa12-1e1c596d67c9"));
  webComponentsLib.addChild(NSXMLNode.elementWithName_stringValue("name","Web components"));
  mapLibs["webComponents"] = webComponentsLib;

  var parallaxLib = NSXMLNode.elementWithName("library");
  parallaxLib.addChild(NSXMLNode.elementWithName_stringValue("uuid","35ed0e22-75e0-459e-aa12-1e1c596d67c8"));
  parallaxLib.addChild(NSXMLNode.elementWithName_stringValue("name","Parallax elements"));
  mapLibs["parallax"] = parallaxLib;

  var iPhoneLib = NSXMLNode.elementWithName("library");
  iPhoneLib.addChild(NSXMLNode.elementWithName_stringValue("uuid","10ed0e22-75e0-459e-aa12-1e1c596d67c8"));
  iPhoneLib.addChild(NSXMLNode.elementWithName_stringValue("name","iPhone iOS"));
  mapLibs["iphone"] = iPhoneLib;

  var iPhonePlusLib = NSXMLNode.elementWithName("library");
  iPhonePlusLib.addChild(NSXMLNode.elementWithName_stringValue("uuid","10ed0e22-75e0-459e-aa12-1e1c596d67c9"));
  iPhonePlusLib.addChild(NSXMLNode.elementWithName_stringValue("name","iPhone Plus iOS"));
  mapLibs["iphonePlus"] = iPhonePlusLib;

  var iPadLib = NSXMLNode.elementWithName("library");
  iPadLib.addChild(NSXMLNode.elementWithName_stringValue("uuid","15ed0e22-75e0-459e-aa12-1e1c596d67c8"));
  iPadLib.addChild(NSXMLNode.elementWithName_stringValue("name","iPad iOS"));
  mapLibs["ipad"] = iPadLib;

  var iOSLib = NSXMLNode.elementWithName("library");
  iOSLib.addChild(NSXMLNode.elementWithName_stringValue("uuid","15ed0e22-75e0-459e-aa12-1e1c596d67c9"));
  iOSLib.addChild(NSXMLNode.elementWithName_stringValue("name","IOS icons"));
  mapLibs["ios"] = iOSLib;

  var androidPhonelib = NSXMLNode.elementWithName("library");
  androidPhonelib.addChild(NSXMLNode.elementWithName_stringValue("uuid","20ed0e22-75e0-459e-aa12-1e1c596d67c8"));
  androidPhonelib.addChild(NSXMLNode.elementWithName_stringValue("name","Android Phone"));
  mapLibs["androidPhone"] = androidPhonelib;

  var androidTabletLib = NSXMLNode.elementWithName("library");
  androidTabletLib.addChild(NSXMLNode.elementWithName_stringValue("uuid","25ed0e22-75e0-459e-aa12-1e1c596d67c8"));
  androidTabletLib.addChild(NSXMLNode.elementWithName_stringValue("name","Android Table"));
  mapLibs["androidTablet"] = androidTabletLib;
  var androidIcoLib= NSXMLNode.elementWithName("library");
  androidIcoLib.addChild(NSXMLNode.elementWithName_stringValue("uuid","25ed0e22-75e0-459e-aa12-1e1c596d67c9"));
  androidIcoLib.addChild(NSXMLNode.elementWithName_stringValue("name","Android icons"));
  mapLibs["androidIcons"] = androidIcoLib;

  return mapLibs;
}

function createInvalidXMLCharacterSet(){
   var characterSet = NSMutableCharacterSet.characterSetWithRange(NSMakeRange(0x9, 1));
   characterSet.addCharactersInRange(NSMakeRange(0xA, 1));
   characterSet.addCharactersInRange(NSMakeRange(0xD, 1));
   characterSet.addCharactersInRange(NSMakeRange(0x20, 0xD7FF - 0x20));
   characterSet.addCharactersInRange(NSMakeRange(0xE000, 0xFFFD - 0xE000));
   characterSet.addCharactersInRange(NSMakeRange(0x10000, 0x10FFFF - 0x10000));
   invalidXMLCharacterSet = characterSet.invertedSet().retain();
}

function removeInvalidCharacters(text){
  var range = text.rangeOfCharacterFromSet(invalidXMLCharacterSet);
  if(range.length == 0)
    return text;
  var cleanedText = text.mutableCopy();
  while(range.length>0){
    cleanedText.deleteCharactersInRange(range);
    range = cleanedText.rangeOfCharacterFromSet(invalidXMLCharacterSet);
  }
  return cleanedText;
}

function calculateValidName(originalName){
  var name = originalName.replace(/ /g,"_");
  name = name.replace(/([^a-zA-Z0-9_-])/g,"");
  name = name.replace(/(^[^a-zA-Z]*)/,"");
  return getValidUniqueName(name);
}

function getValidUniqueName(originalName,calculatedName,calculatedIndex){
  if(!calculatedName){
    calculatedName = originalName;
  }

  if(mapID[calculatedName]){
    if(calculatedIndex){
      calculatedIndex++;
    }else{
      calculatedIndex = 1;
    }
    return getValidUniqueName(originalName,originalName+"_"+calculatedIndex,calculatedIndex);
  }
  mapID[calculatedName] = originalName;
  return calculatedName;
}


function getJustinmindRotation(rotation){
  return parseInt(((-rotation % 360)+360)%360);
}
