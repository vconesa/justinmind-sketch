@import 'fileUtils.js'
@import 'utils.js'

var mapID = {};

function createJustinmindXMLData(folderURL,sketchData){
  mapID = {};

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
  root.addChild(NSXMLNode.elementWithName_stringValue("pageAlignment","CENTER"));
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
  createContainerChildrenNodes(node,artboardData.items);
  node.addChild(createCanvasStyleNode(artboardData));
  root.addChild(node);
  root.addChild(NSXMLNode.elementWithName("Events"));

  return xmlDoc;
}

function createContainerChildrenNodes(node,childrenData){

  for (var i = 0; i < childrenData.length; i++) {
    var childData = childrenData[i];
    var type =  childData.type;
    var childNode;
    if(type=="text"){
      childNode = createTextNode(childData);
    }else if(type=="image"){
      childNode = createImageNode(childData);
    }else if(type=="svg"){
      childNode = createSVGNode(childData);
    }else if(type=="group"){
      childNode = createGroupNode(childData);
    }

    if(childNode)
      node.addChild(childNode);
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
  externalAppNode.addChild(NSXMLNode.elementWithName_stringValue("appVersion",sketchApp.version));
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

function createTextNode(textData){
  var textNode =  NSXMLNode.elementWithName("rich-text");
  textNode.addAttribute(NSXMLNode.attributeWithName_stringValue("id",createNewUUID()));
  textNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hidden",textData.visible ? "false" : "hidden"));
  textNode.addAttribute(NSXMLNode.attributeWithName_stringValue("lockType","none"));
  textNode.addAttribute(NSXMLNode.attributeWithName_stringValue("onTop","false"));
  textNode.addAttribute(NSXMLNode.attributeWithName_stringValue("visible",textData.visible ? "true" : "false"));

  textNode.addChild(NSXMLNode.elementWithName_stringValue("text",textData.text));

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

  var rotationNode = NSXMLNode.elementWithName("RotationStyle");
  rotationNode.addAttribute(NSXMLNode.attributeWithName_stringValue("angle",textData.rotation+""));
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

function createImageNode(imageData){
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

function createSVGNode(svgData){
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

function createGroupNode(groupData){
  var groupNode =  NSXMLNode.elementWithName("group-container");
  groupNode.addAttribute(NSXMLNode.attributeWithName_stringValue("id",createNewUUID()));
  groupNode.addAttribute(NSXMLNode.attributeWithName_stringValue("hidden",groupData.visible ? "false" : "true"));
  groupNode.addAttribute(NSXMLNode.attributeWithName_stringValue("lockType","none"));
  groupNode.addAttribute(NSXMLNode.attributeWithName_stringValue("onTop","false"));
  groupNode.addAttribute(NSXMLNode.attributeWithName_stringValue("visible",groupData.visible ? "true" : "false"));

  createContainerChildrenNodes(groupNode,groupData.items);

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
	if(selectedDeviceType=="Web")
			return {'type':"web",'orientation':selectedOrientation,'width':"1024",'height': "768"};
	else if(selectedDeviceType=="iPhone"){
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

function calculateValidName(originalName){
  var name = originalName.replace(/ /g,"_");
  name = name.replace(/([^a-zA-Z0-9_-])/g,"");
  name = name.replace(/[^a-zA-Z]+/,"");
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
