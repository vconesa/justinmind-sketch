
function getSelectedArtboards(selection){
  var skArtboards = [];
  if([selection count]>0){
    for (var i=0; i<[selection count]; i++) {
      var skLayer = [selection objectAtIndex:i];
      if(isArtboard(skLayer))
        skArtboards.push(skLayer);
    });
  }
  return skArtboards;
}

function getAllArtboards(sketchDoc){
  var skArtboards = [];
  var skPages = sketchDoc.pages;
  var pagesCount = skPages.length;
  for(var i=0;i<pagesCount;i++){
    var skPage=skPages[i];
    skPage.iterate(function(skLayer){
      if(skLayer.isArtboard){
        skArtboards.push(skLayer);
      }
    });
  }
  return skArtboards;
}

function getArtboardData(skArtboard){
  var wSkArtboard = skArtboard.sketchObject;
  var items = [];
  if(exportArtboardAsSingleImage){
    if(wSkArtboard.layers().length>0){
      var itemData = getImageData(wSkArtboard,wSkArtboard);
      items.push(itemData);
    }
  }else{
    items  = getChildrenData(wSkArtboard);
  }
  if(cancelled)
    return {};
  var absolutePosition = calculateAbsolutePosition(wSkArtboard);
  translateChildrenToRelativePosition(items,absolutePosition);
  var background;
  if(wSkArtboard.hasBackgroundColor())
    background = getJustinmindColorFromNSColor(wSkArtboard.backgroundColor());

  return {
    'name': skArtboard.name,
    'id':  "id",
    'background': background,
    'width': skArtboard.frame.width+"",
    'height': skArtboard.frame.height+"",
    'items': items
  };
}

function translateChildrenToRelativePosition(items,parentAbsolute){
  for (var i=0;i<items.length;i++){
    var item=items[i];
    var relativePosition = item.relativePosition;
    var absolutePosition = item.absolutePosition;
    relativePosition.x = absolutePosition.x - parentAbsolute.x;
    relativePosition.y = absolutePosition.y - parentAbsolute.y;
    if(item.type=="group"){
      translateChildrenToRelativePosition(item.items,absolutePosition);
    }
  }
}

function getChildrenData(skContainer){
  var items  = [];
  skContainer.layers().forEach(function(skLayer){
    if(cancelled)
      return [];

    var itemData = getItemData(skLayer,skContainer);
    if(itemData){
      if(Array.isArray(itemData))
      items = items.concat(itemData);
      else
      items.push(itemData);
    }
  });
  return items;
}

function getItemData(skLayer,skParent){
  if(isGroup(skLayer))
  return getGroupData(skLayer,skParent);
  else if(isImage(skLayer))
  return getImageData(skLayer,skParent);
  else if(isShape(skLayer))
  return getShapeData(skLayer,skParent);
  else if(isText(skLayer))
  return getTextData(skLayer,skParent);
  else if(isSymbol(skLayer)){
    var duplicate = skLayer.duplicate();
    var group = skLayer.detachByReplacingWithGroup();
    if(group==null){
      return;
    //  var existingOverrides = skLayer.overrides();//Sketch versions previous to 48.0
    //  if(MSApplicationMetadata.metadata().appVersion >= 48){
    //    existingOverrides = skLayer.overrideValues();
    //  }
    //  var items = getChildrenData(skLayer.symbolMaster());
    //  var instancePosition = calculateAbsolutePosition(skLayer);
  //    var masterAbsolutePosition = calculateAbsolutePosition(skLayer.symbolMaster());
    //  translateRelativeToSymbolInstance(items,instancePosition,masterAbsolutePosition,existingOverrides);
    //  duplicate.removeFromParent();
    //  return items;
    }
    var groupData = getItemData(group,skParent);
    group.removeFromParent();
    return groupData;

  }
  return;
}


function isSymbolMaster(wSkLayer){
  return [wSkLayer isMemberOfClass:[MSSymbolMaster class]];
}

function isSymbol(wSkLayer){
  return [wSkLayer isMemberOfClass:[MSSymbolInstance class]];
}

function isText(wSkLayer){
  return [wSkLayer isMemberOfClass:[MSTextLayer class]];
}

function isShape(wSkLayer){
  return [wSkLayer isMemberOfClass:[MSShapeGroup class]];
}

function isImage(wSkLayer){
  return [wSkLayer isMemberOfClass:[MSBitmapLayer class]];
}

function isGroup(wSkLayer){
  return [wSkLayer isMemberOfClass:[MSLayerGroup class]];
}

function isArtboard(wSkLayer){
  return [wSkLayer isMemberOfClass:[MSImmutableArtboardGroup class]] || [wSkLayer isMemberOfClass:[MSArtboardGroup class]];
}

function translateRelativeToSymbolInstance(items,instancePosition,masterAbsolutePosition,existingOverrides){

  for (var i=0;i<items.length;i++){
    var item=items[i];
    var absolutePosition = item.absolutePosition;
    absolutePosition.x = instancePosition.x + absolutePosition.x  - masterAbsolutePosition.x;
    absolutePosition.y = instancePosition.y + absolutePosition.y  - masterAbsolutePosition.y;
    if(item.type=="group"){
      translateRelativeToSymbolInstance(item.items,instancePosition,masterAbsolutePosition,existingOverrides);
    }
    //    var textOverride = null
    //    if(MSApplicationMetadata.metadata().appVersion >= 48){
    //    }
    //    else
    //      textOverride = existingOverrides.objectForKey(item.objectID)
    //    if(textOverride != null)
    //      item.text = textOverride;
    //}
  }
}



function toRadians(degrees){
  return degrees * (Math.PI/180);
}

function toDegrees(radians){
  return radians * (180/Math.PI);
}

function rotatePointAroundPoint(pointToRotate,center,angle){
  var x1 = pointToRotate.x - center.x;
  var y1 = pointToRotate.y - center.y;

  var x2 = (x1 * Math.cos(angle)) - (y1 * Math.sin(angle));
  var y2 = (x1 * Math.sin(angle)) + (y1 * Math.cos(angle));

  return {'x':Math.round(x2 + center.x),'y':Math.round(y2 + center.y)};
}

function getRotatedBBoxPosition(position,frame,angle){
  if(angle!=0){
    var rad = toRadians(angle);
    var center = {'x':Math.round(position.x()+(frame.width()/2)),'y':Math.round(position.y()+(frame.height()/2))};
    var topLeft = rotatePointAroundPoint({'x':position.x(),'y':position.y()},center,rad);
    var topRight = rotatePointAroundPoint({'x':position.x()+frame.width(),'y':position.y()},center,rad);
    var bottomLeft = rotatePointAroundPoint({'x':position.x(),'y':position.y()+frame.height()},center,rad);
    var bottomRight = rotatePointAroundPoint({'x':position.x()+frame.width(),'y':position.y()+frame.height()},center,rad);

    var minX = Math.min(Math.min(Math.min(topLeft.x,topRight.x),bottomLeft.x),bottomRight.x);
    var minY = Math.min(Math.min(Math.min(topLeft.y,topRight.y),bottomLeft.y),bottomRight.y);
    return {'x':minX,'y':minY};
  }
  return {'x':position.x(),'y':position.y()};
}

function calculateAbsolutePosition(skLayer){
  if(isSymbolMaster(skLayer) || isSymbol(skLayer)){
    var absoluteRect = skLayer.absoluteRect();
    return {'x':absoluteRect.x(),'y':absoluteRect.y()};
  }
  if(isText(skLayer) && !enableExportTextAsImage){
    var absoluteRect = skLayer.absoluteRect();
    var angle = skLayer.rotation();
    var absolutePos = {'x':absoluteRect.x(),'y':absoluteRect.y()};
    if(angle!=0){
      var rotatedBBox = getRotatedBBoxPosition(absoluteRect,skLayer.frame(), angle);
      absolutePos.x+= absoluteRect.x() - rotatedBBox.x;
      absolutePos.y+= absoluteRect.y() - rotatedBBox.y;
    }
    return absolutePos;
  }
  var ancestry = MSImmutableLayerAncestry.ancestryWithMSLayer(skLayer);
  var rect = MSSliceTrimming.trimmedRectForLayerAncestry(ancestry);
  return {'x':rect.origin.x,'y':rect.origin.y};
}

function getJustinmindHAlign(skAlign){
  if(skAlign==1)
  return "right";
  else if(skAlign==2)
  return "center";
  return "left";
}

function getJustinmindColorFromNSColor(nsColor){
  return getJustinmindColor(nsColor.red(),nsColor.green(),nsColor.blue());
}

function getJustinmindColorFromMSImmutableColor(msImmutableColor){
  return getJustinmindColor(msImmutableColor.red(),msImmutableColor.green(),msImmutableColor.blue());
}

function getJustinmindColorFromUIColor(uiColor){
  if(uiColor){
    uiColor = uiColor.colorUsingColorSpaceName(NSCalibratedRGBColorSpace);
    var red = MOPointer.alloc().init();
    var green = MOPointer.alloc().init();
    var blue = MOPointer.alloc().init();
    var alpha = MOPointer.alloc().init();
    uiColor.getRed_green_blue_alpha(red,green,blue,alpha);
    return getJustinmindColor(red.value(),green.value(),blue.value());
  }
  return "0r0g0b";
}

function getJustinmindColor(red,green,blue){
  return parseInt(red*255)+"r"+parseInt(green*255)+"g"+parseInt(blue*255)+"b";
}

function getJustinmindFontWeight(osWeight){
  var weight = "400";
  switch (osWeight) {
    case 1:
    case 2:
    weight = "100";
    break;
    case 3:
    weight = "200";
    break;
    case 4:
    weight = "300";
    break;
    case 5:
    weight = "400";
    break;
    case 6:
    weight = "500";
    break;
    case 7:
    case 8:
    weight = "600";
    break;
    case 9:
    weight = "700";
    break;
    case 10:
    case 11:
    weight = "800";
    break;
    case 12:
    case 13:
    case 14:
    weight = "900";
    break;
  }
  return weight;
}

function getScreenDPIRatio(){
  var primaryScreen = NSScreen.screens().objectAtIndex(0);
  var deviceDescription = primaryScreen.deviceDescription();
  var nsSize = [deviceDescription objectForKey:NSDeviceResolution];
  var screenDPI  =  nsSize.sizeValue().height;
  var isRetina = primaryScreen.backingScaleFactor()==2;
  if(isRetina)
  screenDPI = parseInt(screenDPI / 2);
  return screenDPI/96;
}

function getJustinmindTextDecoration(isUnderline,isLineThrough){
  if(isUnderline)
  return "underline";
  if(isLineThrough)
  return "line-through";
  return "none";
}

function getJustinmindTransparency(opacity){
  var transparency = 1 - opacity;
  return parseInt(transparency * 100);
}

function getJustinmindRotation(rotation){
  return parseInt(((-rotation % 360)+360)%360);
}

function getBoundingBox(items){
  var minX = 99999999;
  var minY = 99999999;
  var maxX = -99999999;
  var maxY = -99999999;

  for (var i=0;i<items.length;i++){
    var item=items[i];
    var position = item.absolutePosition;
    var size= item.size;
    if(position.x < minX)
    minX = position.x;
    if(position.y < minY)
    minY = position.y;
    if((position.x +size.width)> maxX)
    maxX = position.x+size.width;
    if((position.y+size.height) > maxY)
    maxY = position.y+size.height;
  }
  return {
    'x':minX,
    'y':minY,
    'width':maxX-minX,
    'height': maxY-minY
  };
}

function getJustinmindTextShadow(color,blur,dx,dy){
  var angle = 0;
  if(dx!=0 && dy!=0){
    angle = Math.round(toDegrees(Math.atan(-dy/dx)));
    if(dx>=0)
      angle= angle+180;
    angle = parseInt(((angle % 360)+360)%360);
  }
  return {
    'color':getJustinmindColorFromNSColor(color),
    'blur':blur,
    'distance': Math.round(Math.sqrt(Math.pow(dx,2)+Math.pow(dy,2))),
    'angle': angle
  };
}

function getTextRanges(nsAttributedString, rangeToProcess, fillColor){
  var ranges  = [];
  var pointer = MOPointer.alloc().init();
  var dictionary = nsAttributedString.attributesAtIndex_longestEffectiveRange_inRange(rangeToProcess.location,pointer,rangeToProcess);
  var newRange = pointer.value();

  var nextRangeStart = newRange.location+newRange.length;
  var foregroundColor = dictionary[NSForeground​Color​Attribute​Name];

  if(foregroundColor==null){
    foregroundColor = dictionary["MSAttributedStringColorAttribute"];
    if(foregroundColor!=null)
      foregroundColor = getJustinmindColorFromMSImmutableColor(foregroundColor);
  }else{
    foregroundColor = getJustinmindColorFromUIColor(foregroundColor);
  }

  if(foregroundColor==null){
      if(fillColor == null)
        foregroundColor = getJustinmindColor(0.0,0.0,0.0);
      else
        foregroundColor = getJustinmindColorFromMSImmutableColor(fillColor);
  }


  var font = dictionary[NSFontAttributeName];
  var underline = dictionary[NSUnderlineStyleAttributeName];
  var linethrough = dictionary[NSStrikethroughStyleAttributeName];

  var rangeData = {
    'start':newRange.location,
    'end':nextRangeStart,
    'fontData': getDataFromNSFont(font),
    'text_color':foregroundColor,
    'text_decoration': getJustinmindTextDecoration(underline && underline!=0,linethrough && linethrough!=0)
  };
  ranges.push(rangeData);

  if(nextRangeStart<nsAttributedString.string().length()){
    var nextRangeToProcess = NSMakeRange(nextRangeStart,nsAttributedString.string().length()-nextRangeStart);
    var nextRanges = getTextRanges(nsAttributedString,nextRangeToProcess,fillColor);
    ranges = ranges.concat(nextRanges);
  }

  return ranges;
}

function getDataFromNSFont(nsFont){
  var dpiRatio = getScreenDPIRatio();

  var nsFontDescriptor = nsFont.fontDescriptor();
  var fontFamily = [nsFontDescriptor objectForKey:NSFont​Family​Attribute];
  var fontName = [nsFontDescriptor objectForKey:NSFont​Face​Attribute];

  var fontSize =  (nsFont.pointSize()*dpiRatio).toFixed(1);
  var fontTraits = [nsFontDescriptor objectForKey:NSFont​Traits​Attribute];
  var symbolicTrait =  [fontTraits objectForKey:NSFont​Symbolic​Trait];
  var isItalic = (symbolicTrait & NSItalicFontMask)!=0;
  var nsWeight =  NSFontManager.sharedFontManager().weightOfFont(nsFont);
  var jimWeight = getJustinmindFontWeight(nsWeight);

  return {
    'family':fontFamily,
    'size':fontSize+"",
    'height':"15",
    'name':fontName,
    'weight':jimWeight,
    'italic':isItalic ? "italic": "normal"
  };
}

function getTextData(skText,skParent){
  if(enableExportTextAsImage)
    return getImageData(skText,skParent);
  var skFontColor = skText.textColor();

  var skFillColor = null;
  var fills = skText.style().fills();
  for(var i=0;i<fills.length;i++){
    var fill = fills[i];
    if(fill.fillType()==0 && fill.isEnabled())
      skFillColor = fill.color();
  }


  var alignH = getJustinmindHAlign(skText.textAlignment());
  var nsAttributedString = skText.attributedStringValue();
  var fullRange =  NSMakeRange(0,nsAttributedString.string().length());
  var ranges = getTextRanges(nsAttributedString,fullRange,skFillColor);
  var textShadow;
  var shadows = skText.style().shadows();

  if(shadows && shadows.length>=1){
    var shadow = shadows[0];
    var isEnabled = shadow.isEnabled();
    if(isEnabled){
      var color = shadow.color();
      var blur = shadow.blurRadius();
      var dx = shadow.offsetX();
      var dy = shadow.offsetY();
      textShadow = getJustinmindTextShadow(color,blur,dx,dy);
    }
  }

  var textValue = skText.stringValue();
  var transformOption = skText.styleAttributes()["MSAttributedStringTextTransformAttribute"];
  if(transformOption==1)//uppercase
    textValue= textValue.uppercaseString();
  else if(transformOption==2)//lowercase
    textValue= textValue.lowercaseString();

  return {
    'objectID':skText.objectID().toString(),
    'type':"text",
    'name':skText.name(),
    'size':{'width':skText.frame().width(),'height':skText.frame().height()},
    'absolutePosition':calculateAbsolutePosition(skText),
    'relativePosition':{'x':0,'y':0},
    'text':textValue,
    'fontData': getDataFromNSFont(skText.font()),
    'text_color':getJustinmindColorFromNSColor(skFontColor),
    'text_hAlign':alignH,
    'line_height':skText.lineHeight()+"",
    'transparency': getJustinmindTransparency(skText.style().contextSettings().opacity()),
    'rotation': getJustinmindRotation(skText.rotation()),
    'visible':skText.isVisible(),
    'textShadow': textShadow,
    'ranges': ranges
  };
}

function getShapeData(skShape,skParent){
  return getSVGLayerData(skShape,skParent);
}

function getImageData(skImage,skParent){
  var pngFile = exportLayerAsPNG(skImage);

  var ancestry = MSImmutableLayerAncestry.ancestryWithMSLayer(skImage);
  var rect = MSSliceTrimming.trimmedRectForLayerAncestry(ancestry);

  return {
    'objectID':skImage.objectID().toString(),
    'type':"image",
    'name':skImage.name(),
    'absolutePosition':calculateAbsolutePosition(skImage),
    'relativePosition':{'x':0,'y':0},
    'size':rect.size,
    'filename':pngFile,
    'visible':skImage.isVisible()
  };
}


function getGroupData(skGroup,skParent){
  if(isLayerMarkedAsSVG(skGroup))
  return getSVGLayerData(skGroup,skParent);

  var items  = getChildrenData(skGroup);
  if(items.length==0)
    return null;
  var bbox = getBoundingBox(items);

  return {
    'objectID':skGroup.objectID().toString(),
    'type':"group",
    'name':skGroup.name(),
    'size':{'width':bbox.width,'height':bbox.height},
    'absolutePosition':{'x':bbox.x,'y':bbox.y},
    'relativePosition':{'x':0,'y':0},
    'items':items,
    'visible':skGroup.isVisible()
  };
}

function isLayerMarkedAsSVG(skLayer){
  return enableExportGroupAsSingleLayer && skLayer.name().startsWith("ic_");
}

function isAncestorMasked(skLayer){
  var ancestors = skLayer.ancestors();
  for(var i=0;i<ancestors.length;i++){
    var ancestor = ancestors[i];
    if([ancestor isKindOfClass:[MSLayer class]]){
      if(ancestor.isMasked()==1){
          return true;
      }
    }
  }
  return false;
}

function getSVGLayerData(skLayer,skParent){
  var fills = skLayer.style().fills();
  for(var i=0;i<fills.length;i++){
    var fill = fills[i];
    if(fill.fillType()==4)//fill image (sketch error exporting as a svg file)
        return getImageData(skLayer,skParent);
  }
//  alert(skLayer.name(),skLayer.hasClippingMask());
//  alert(skLayer.isPartOfClippingMask()+"",skLayer.isMasked()+"");
  if(skLayer.isMasked()==1 || isAncestorMasked(skLayer))
    return getImageData(skLayer,skParent);
  var pngFile = exportLayerAsSVG(skLayer);
  var ancestry = MSImmutableLayerAncestry.ancestryWithMSLayer(skLayer);
  var rect = MSSliceTrimming.trimmedRectForLayerAncestry(ancestry);

//  alert("shouldBreakMaskChain",skLayer.shouldBreakMaskChain());

  return {
    'objectID':skLayer.objectID().toString(),
    'type':"svg",
    'name':skLayer.name(),
    'absolutePosition':calculateAbsolutePosition(skLayer),
    'relativePosition':{'x':0,'y':0},
    'size':rect.size,
    'filename':pngFile,
    'visible':skLayer.isVisible()

  };
}

function exportLayerAsPNG(skLayer){
  var uuid = NSString.stringWithUUID();
  return exportLayerAsImage(skLayer,uuid,".png");
}

function exportLayerAsSVG(skLayer){
  var uuid = NSString.stringWithUUID();
  exportLayerAsImage(skLayer,uuid,".svg");
  return exportLayerAsImage(skLayer,uuid,".png");
}

function exportLayerAsImage(skLayer,uuid,extension){
  var layerCopy;
  if(isArtboard(skLayer))
    layerCopy = skLayer;
  else
    layerCopy = skLayer.duplicate();

  var wSkDoc = sketchDoc.sketchObject;
  var fileFolder = getExportImageFolder();
  var outFile = fileFolder+ uuid+extension;

  var exportOptions=layerCopy.exportOptions();
  exportOptions.removeAllExportFormats();
  var exportSize = exportOptions.addExportFormat();
  if(enableExportImage2X)
    exportSize.setScale(2.0);
  else
   exportSize.setScale(1.0);

  var exportFormats = exportOptions.exportFormats();
  var slice = MSExportRequest.exportRequestsFromExportableLayer_exportFormats_useIDForName(layerCopy,exportFormats,false).firstObject();

  wSkDoc.saveExportRequest_toFile(slice, outFile);

  if(!isArtboard(skLayer))
    layerCopy.removeFromParent();
  else
    exportOptions.removeExportFormat(exportSize);

  return uuid+extension;
}

function getExportImageFolder(){
  return tempFolder.path()+"/images/";
}
