var sketch = require('sketch/dom');
var ShapePath = require('sketch/dom').ShapePath;
var Shape = require('sketch/dom').Shape;

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
  else if(isShape(skLayer)){
    return getShapeData(skLayer,skParent);
  }
  else if(isText(skLayer))
  return getTextData(skLayer,skParent);
  else if(isSymbol(skLayer)){
     var duplicate = skLayer.duplicate();
    var group = detachSymbol(skLayer,skParent);

    if(group!=null){
      var groupData = getItemData(group,skParent);
      group.removeFromParent();
      return groupData;
    }

    
    //else{
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
    //}

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
  return [wSkLayer isMemberOfClass:[MSShapeGroup class]] || [wSkLayer isKindOfClass:[MSShapePathLayer class]];
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

function detachSymbol(skSymbolInstance,skParent){
  if(MSApplicationMetadata.metadata().appVersion >=53){
      return skSymbolInstance.detachStylesAndReplaceWithGroupRecursively(false);
  }else{
    var  group = skSymbolInstance.detachByReplacingWithGroup();

    var skSymbolMaster = skSymbolInstance.symbolMaster();
    if(skSymbolMaster.hasBackgroundColor() && skSymbolMaster.includeBackgroundColorInInstance()){
      var symbolBackgroundColor = skSymbolMaster.backgroundColor();
      var instanceFrame = skSymbolInstance.frame();

      var newBGLayer = MSShapePathLayer.shapeWithRect(NSMakeRect(0,0,instanceFrame.width(),instanceFrame.height()));
      var fill = newBGLayer.style().addStylePartOfType(0);//0==fill type
      fill.color = MSColor.colorWithRed_green_blue_alpha(symbolBackgroundColor.red(), symbolBackgroundColor.green(), symbolBackgroundColor.blue(), symbolBackgroundColor.alpha());
      if(group==null){
        var group = MSLayerGroup.new();
        group.setName(skSymbolInstance.name()+"_bg");

        group.frame().x  = instanceFrame.x();
        group.frame().y  = instanceFrame.y();
        skParent.addLayer(group);
      }
      group.insertLayer_atIndex(newBGLayer,0);
      newBGLayer.flatten();//without this line the SVG exported is empty (probably a sketch bug)
    }
  }
  return group;
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


function colorFromHex(hexString)
{
    var str = hexString.substring(1);
    
    
    var red=parseInt(str.substring(0,2),16);
    var green=parseInt(str.substring(2,4),16);
    var blue=parseInt(str.substring(4,6),16);    
    var alpha=Math.round((1-parseInt(str.substring(6,8),16)/255)*100);  
    
    return red+"r"+green+"g"+blue+"b"+alpha+"a";
    
    
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
  return screenDPI/96*0.9714;
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
  if(nsFont== null)
    nsFont = [NSFont systemFontOfSize:10];
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
  var ranges;

  if(nsAttributedString.string().length()>0){
    ranges = getTextRanges(nsAttributedString,fullRange,skFillColor);
  }
  else{
      ranges = [];
      var rangeData = {
        'start':0,
        'end':0,
        'fontData': getDataFromNSFont(skText.font()),
        'text_color':getJustinmindColorFromNSColor(skFontColor),
        'text_decoration': "none"
      };
    ranges.push(rangeData);
  }
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
  
  // var shape = sketch.fromNative(skText);
  //console.log(shape.transform.rotation,shape.transform.flippedHorizontally,shape.transform.flippedally);

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

    var shape = sketch.fromNative(skShape);
    
    // console.log(shape.transform);
    /*
    console.log(shape.type);
    console.log(shape.shapeType);
    console.log(shape.points);
*/
    
//    if(shape.shapeType == ShapePath.ShapeType.Rectangle)
 //       return getRectangleData(skShape,skParent, shape);
//    if(shape.shapeType == ShapePath.ShapeType.Oval)
//        return getEllipseData(skShape,skParent, shape);
    if(shape.shapeType == ShapePath.ShapeType.Custom && shape.points.length==2)
        return getLineData(skShape,skParent, shape);
    
  return getSVGLayerData(skShape,skParent);
}

function getLineData(skShape,skParent, shape)
{
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
    
    var style = shape.style;
    
    var shadows = style.shadows;
    var jimShadow = undefined;
    
    if(shadows && shadows.length){
      var shadow = shadows[0];
      var isEnabled = shadow.enabled;
      if(isEnabled){
        var color = shadow.color;
        var blur = shadow.blur;
        var dx = shadow.x;
        var dy = shadow.y;
        
        var angle = 0;
        if(dx!=0 && dy!=0){
          angle = Math.round(toDegrees(Math.atan(-dy/dx)));
          if(dx>=0)
            angle= angle+180;
          angle = parseInt(((angle % 360)+360)%360);
        }
        jimShadow = {
          'color':colorFromHex(color),
          'blur':blur,
          'distance': Math.round(Math.sqrt(Math.pow(dx,2)+Math.pow(dy,2))),
            'spread': Math.round(shadow.spread),
          'angle': angle
        };
      }
    }
    
    var jimBorder = undefined;
    var borders = style.borders;
    if(borders && borders.length)
    {
        var border = borders[0];
        if(border.enabled)
        {
            var color = colorFromHex(border.color);
            var borderWidth = Math.round(border.thickness);
            jimBorder = {
                'color':color,
                'width':borderWidth  
            };
        }
    }
    
    var jimFill = undefined;
    if(style.fills && style.fills.length)
    {
        var fill = style.fills[0];
        if(fill.enabled)
        {
            jimFill = {
                'color':colorFromHex(fill.color),
                'type':fill.fillType.toString()
            };
        }
    }
    
    
    var pos = calculateAbsolutePosition(skShape);
    

    var a = shape.frame.width*Math.abs(shape.points[0].point.x-shape.points[1].point.x);
    var b = shape.frame.height*Math.abs(shape.points[0].point.y-shape.points[1].point.y);
    
    var lineLength = Math.sqrt(a*a+b*b);
    
    var angle = 0;
    if(a==0) angle = 90;
    else
        if(b==0) angle = 0;
    else
       angle = Math.asin(b/lineLength)*180/Math.PI; 
    
    
    
    if((shape.points[0].point.x>shape.points[1].point.x && shape.points[0].point.y<shape.points[1].point.y) ||
        (shape.points[1].point.x>shape.points[0].point.x && shape.points[1].point.y<shape.points[0].point.y))
        angle = 360-angle;
    
    
    var xDiff = (lineLength-a)/2;
    var yDiff = b/2;
    
    pos.x-=xDiff;
    pos.y+=yDiff;
    
    return {
      'objectID':shape.id,
      'type':"line",
    'name':shape.name,
      'size':{'width':a,'height':b},
        'lineLength':lineLength,
      'absolutePosition':pos,
      'relativePosition':{'x':shape.frame.x,'y':shape.frame.y},
      'visible':!shape.hidden,
        'rotation':getJustinmindRotation(shape.transform.rotation+angle),
        'transparency':getJustinmindTransparency(style.opacity),
        'shadow':jimShadow,
        'border':jimBorder,
        'fill':jimFill
    };
}

function getRectangleData(skShape,skParent,shape)
{
   
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
    var style = shape.style;
    
    var shadows = style.shadows;
    var jimShadow = undefined;
    
    if(shadows && shadows.length){
      var shadow = shadows[0];
      var isEnabled = shadow.enabled;
      if(isEnabled){
        var color = shadow.color;
        var blur = shadow.blur;
        var dx = shadow.x;
        var dy = shadow.y;
        
        var angle = 0;
        if(dx!=0 && dy!=0){
          angle = Math.round(toDegrees(Math.atan(-dy/dx)));
          if(dx>=0)
            angle= angle+180;
          angle = parseInt(((angle % 360)+360)%360);
        }
        jimShadow = {
          'color':colorFromHex(color),
          'blur':blur,
          'distance': Math.round(Math.sqrt(Math.pow(dx,2)+Math.pow(dy,2))),
            'spread': Math.round(shadow.spread),
          'angle': angle
        };
      }
    }
    
    var jimBorder = undefined;
    var borders = style.borders;
    if(borders && borders.length)
    {
        var border = borders[0];
        if(border.enabled)
        {
            var color = colorFromHex(border.color);
            var borderWidth = Math.round(border.thickness);
            jimBorder = {
                'color':color,
                'width':borderWidth  
            };
        }
    }
    
    var jimFill = undefined;
    if(style.fills && style.fills.length)
    {
        var fill = style.fills[0];
        if(fill.enabled)
        {
            jimFill = {
                'color':colorFromHex(fill.color),
                'type':fill.fillType.toString()
            };
        }
    }
    
    return {
      'objectID':shape.id,
      'type':"rectangle",
    'name':shape.name,
      'size':{'width':shape.frame.width,'height':shape.frame.height},
      'absolutePosition':calculateAbsolutePosition(skShape),
      'relativePosition':{'x':shape.frame.x,'y':shape.frame.y},
      'visible':!shape.hidden,
        'rotation':getJustinmindRotation(shape.transform.rotation),
        'transparency':getJustinmindTransparency(style.opacity),
        'shadow':jimShadow,
        'border':jimBorder,
        'fill':jimFill,
        'radius':shape.points[0].cornerRadius
    };
}


function getEllipseData(skShape,skParent,shape)
{
   
/*
 <ellipse id="ed6bd313-e5cc-4015-9e5e-ae48daf82d6e" hidden="false" lockType="none" onTop="false" visible="true">
      <text></text>
      <style name="LnFEllipse">
        <DimensionStyle widthType="px" heightType="px" width="336" height="219" widthPercentage="0.0" heightPercentage="0.0" />
        <PositioningStyle left="114" top="115" pinLeft="none" pinTop="none" />
        <BackgroundStyle type="color" value="217r217g217b0a" />
        <BorderStyle color="64r64g64b0a" style="none" width="1" />
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


 
*/
    var style = shape.style;
    
    var shadows = style.shadows;
    var jimShadow = undefined;
    
    if(shadows && shadows.length){
      var shadow = shadows[0];
      var isEnabled = shadow.enabled;
      if(isEnabled){
        var color = shadow.color;
        var blur = shadow.blur;
        var dx = shadow.x;
        var dy = shadow.y;
        
        var angle = 0;
        if(dx!=0 && dy!=0){
          angle = Math.round(toDegrees(Math.atan(-dy/dx)));
          if(dx>=0)
            angle= angle+180;
          angle = parseInt(((angle % 360)+360)%360);
        }
        jimShadow = {
          'color':colorFromHex(color),
          'blur':blur,
          'distance': Math.round(Math.sqrt(Math.pow(dx,2)+Math.pow(dy,2))),
            'spread': Math.round(shadow.spread),
          'angle': angle
        };
      }
    }
    
    var jimBorder = undefined;
    var borders = style.borders;
    if(borders && borders.length)
    {
        var border = borders[0];
        if(border.enabled)
        {
            var color = colorFromHex(border.color);
            var borderWidth = Math.round(border.thickness);
            jimBorder = {
                'color':color,
                'width':borderWidth  
            };
        }
    }
    
    var jimFill = undefined;
    if(style.fills && style.fills.length)
    {
        var fill = style.fills[0];
        if(fill.enabled)
        {
            jimFill = {
                'color':colorFromHex(fill.color),
                'type':fill.fillType.toString()
            };
        }
    }
    
    return {
      'objectID':shape.id,
      'type':"ellipse",
    'name':shape.name,
      'size':{'width':shape.frame.width,'height':shape.frame.height},
      'absolutePosition':calculateAbsolutePosition(skShape),
      'relativePosition':{'x':shape.frame.x,'y':shape.frame.y},
      'visible':!shape.hidden,
        'rotation':getJustinmindRotation(shape.transform.rotation),
        'transparency':getJustinmindTransparency(style.opacity),
        'shadow':jimShadow,
        'border':jimBorder,
        'fill':jimFill
    };
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
    'visible':skGroup.isVisible(),
     'rotation':skGroup.rotation()
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
