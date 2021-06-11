@import 'utils.js'
@import 'MochaJSDelegate.js'


function openExportDialog(titleText,subtitleText,showTextAsImageOption){
  var app = [NSApplication sharedApplication];
  var exportWindow = [[NSWindow alloc] init];
  var horizontalMargin = 35;
  var width = 770;
  var height = 510;
  var blackTextAttribs =  {
    //  NSColor: NSColor.blackColor(),
  };
  var isDarkMode = isDarkModeEnabled();

  COScript.currentCOScript().setShouldKeepAround_(true);
  [exportWindow setFrame:NSMakeRect(0, 0, width, height+20) display: false];
  var contentView = [exportWindow contentView];
  contentView.setWantsLayer(true);

  var headerView = [[NSView alloc] initWithFrame:NSMakeRect(0, height-124, width, 124)];
  headerView.setWantsLayer(true);
  [headerView setBackgroundColor:NSColor.windowBackgroundColor()];
  [[exportWindow contentView] addSubview:headerView];

  var sepView = [[NSView alloc] initWithFrame:NSMakeRect(0, height-125, width, 1)];
  sepView.setWantsLayer(true);
  var separatorColor = NSColor.whiteColor();
  try{
    separatorColor = NSColor.separatorColor();
  }catch(e){}
  [sepView setBackgroundColor:separatorColor];
  [[exportWindow contentView] addSubview:sepView];

  var imageView = [[NSImageView alloc] initWithFrame: NSMakeRect(289, 62, 192, 30)];

  var file =  isDarkMode ? '../Resources/logo_white.png' : '../Resources/logo.png';
  resolve = require('path').resolve;
  var icon = NSImage.alloc().initByReferencingFile(resolve(file));
  [imageView setImage: icon];
  [headerView addSubview:imageView];
  var fontManager = [NSFontManager sharedFontManager];

  var subtitleField = [[NSTextField alloc] initWithFrame:NSMakeRect(0, 20, 550, 25)];
  [subtitleField setEditable:false];
  [subtitleField setBordered:false];
  var subtitleFont =[fontManager fontWithFamily:"Helvetica" traits:0 weight:0 size:13];
  [subtitleField setFont:subtitleFont];
  //[subtitleField setTextColor:NSColor.colorWithRed_green_blue_alpha(69/255, 69/255, 69/255, 1.0)];
  [subtitleField setDrawsBackground:false];
  [subtitleField setStringValue:subtitleText];
  var subtitleWidth = subtitleField.fittingSize().width;
  subtitleField.frame = NSMakeRect((width-subtitleWidth)/2, 20,subtitleWidth, 25);
  [headerView addSubview:subtitleField];

  var skArtboards = getAllArtboards(sketchDoc);
  var artboardsCount = skArtboards.length;

  var entryWidth = 92;
  var entryHeight = 98;
  var previewWidth = 76;
  var previewHeight = 76;

  var horizontalSpacing = 22;
  var verticalSpacing = 18;

  var rows = Math.ceil(artboardsCount/4);
  var marginHeight = 10;
  var containerHeight = Math.max(290,((rows*entryHeight)+((rows-1)*verticalSpacing))+(marginHeight*2));
  var artboardsContainer = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, (entryWidth * 4)+(horizontalSpacing*3), containerHeight)];

  var scrollArtboards = [[NSScrollView alloc] initWithFrame:NSMakeRect(15, height-125-290-13, 464, 290)];
  scrollArtboards.setWantsLayer(true);
  [scrollArtboards setBackgroundColor:NSColor.windowBackgroundColor()];
  [scrollArtboards setHasVerticalScroller:true];
  [scrollArtboards setHasHorizontalScroller:true];
  [scrollArtboards setBorderType:NSBezelBorder];
  [scrollArtboards setAutoresizingMask:NSViewWidthSizable|NSViewHeightSizable];
  [scrollArtboards setDocumentView:artboardsContainer];
  [scrollArtboards setDrawsBackground:true];
  [scrollArtboards setAutohidesScrollers:true];
  var scrollLayer = [scrollArtboards layer];
  [[scrollArtboards verticalScroller] setScrollerStyle:NSScrollerStyleLegacy];
  [[exportWindow contentView] addSubview:scrollArtboards];

  var mapPreviews = {};
  var mapCheckboxes = {};

  for (var i=0;i<artboardsCount;i++){
      var skArtboard=skArtboards[i];
      var name = skArtboard.name;

      var r = i % 4;
      var x = r * (entryWidth+horizontalSpacing);
      var y = containerHeight - marginHeight - (entryHeight) - (Math.floor(i/4)*(entryHeight+verticalSpacing));
      var artboard = [[NSView alloc] initWithFrame:NSMakeRect(x,y, entryWidth,entryHeight)];
      [artboardsContainer addSubview:artboard];

      var artboardView = [[NSImageView alloc] initWithFrame: NSMakeRect(8,20, previewWidth, previewHeight)];
      [artboard addSubview:artboardView];
      artboardView.setWantsLayer(true);
      [artboardView setToolTip:name];
      [[artboardView layer] setShadowOpacity:0.5];

      var artboardName =[[NSTextField alloc] initWithFrame: NSMakeRect(0, 2,72, 12)];

      [artboardName setEditable:false];
      [artboardName setBordered:false];
      [artboardName setFont:[NSFont systemFontOfSize:10]];
      //[artboardName setTextColor:NSColor.blackColor()];
      [artboardName setDrawsBackground:false];
      [artboardName setStringValue:name];
      [artboardName setToolTip:name];
      var nameWidth = artboardName.fittingSize().width;
      var nameX = (entryWidth - nameWidth)/2;
      if(nameWidth>(entryWidth-15)){
        nameWidth = 72;
        nameX = 0;
      }else if(nameWidth>(entryWidth - (15*2)))
        nameX =  entryWidth - nameWidth - 15;
      artboardName.frame = NSMakeRect(nameX, 2,nameWidth, 12);

      [[artboardName cell] setLineBreakMode:NSLineBreakByTruncatingTail];
      [artboard addSubview:artboardName];

      artboardName.alignment = NSTextAlignmentCenter;

      var artboardCheck = [[NSButton alloc] initWithFrame: NSMakeRect(77,0, 16, 16)];
      [artboardCheck setButtonType:NSSwitchButton];
      [artboardCheck setTitle:@""];

      var contains = selectedArtboards.length==0 ? true :(selectedArtboards.indexOf(skArtboard.sketchObject)!=-1);
      [artboardCheck setState: (contains ? NSOnState : NSOffState)];

      [artboardCheck setEnabled:false];
      [artboard addSubview:artboardCheck];

      mapPreviews[i] = artboardView;
      mapCheckboxes[i] = artboardCheck;


  }
  [[scrollArtboards contentView] scrollToPoint:NSMakePoint(0, NSMaxY([[scrollArtboards documentView] frame]) - [[scrollArtboards contentView] bounds].size.height)];
  [scrollArtboards reflectScrolledClipView: [scrollArtboards contentView]];

  var exportAll =[[NSButton alloc] initWithFrame: NSMakeRect(25, 56, 120, 20)];
  [exportAll setButtonType:NSSwitchButton];
  [exportAll setTitle:@"Export all"];


  var allselected = selectedArtboards.length==0 || selectedArtboards.length==artboardsCount;
  [exportAll setState:(allselected ? NSOnState : NSOffState)];
  [exportAll setEnabled:false];
  [[exportWindow contentView] addSubview:exportAll];
  [exportAll setCOSJSTargetFunction:function(sender) {
    for(var i=0;i<artboardsCount;i++){
      var artboardCheckbox = mapCheckboxes[i];
      [artboardCheckbox setState:[exportAll state]];
    }
  }];


  var deviceTypeLabel =[[NSTextField alloc] initWithFrame: NSMakeRect(514, 335, 300, 25)];
  [deviceTypeLabel setEditable:false];
  [deviceTypeLabel setBordered:false];
  [deviceTypeLabel setFont:[NSFont systemFontOfSize:13]];
  [deviceTypeLabel setDrawsBackground:false];
  [deviceTypeLabel setStringValue:"Choose a device for your prototype:"];
  [[exportWindow contentView] addSubview:deviceTypeLabel];

  var deviceTypeCombo = [[NSPopUpButton alloc] initWithFrame: NSMakeRect(514, 302, 210, 25)];
  deviceTypeCombo.addItemsWithTitles(deviceTypes);
  var itemArray = [deviceTypeCombo itemArray];
  for (var i = 0; i < [itemArray count]; i++) {
    var item = [itemArray objectAtIndex:i];
    [item setAttributedTitle:NSAttributedString.attributedStringWithString_attributes_([item title],blackTextAttribs)];
  }
  [deviceTypeCombo setFont:[NSFont systemFontOfSize:13]];
  [deviceTypeCombo selectItemAtIndex:0];
  var defaultDevice = getDefault("exportDevice",null);
  if(defaultDevice){
    var indexDevice = deviceTypes.indexOf(defaultDevice.trim());
    if(indexDevice>=0)
      [deviceTypeCombo selectItemAtIndex:indexDevice];
  }
  [deviceTypeCombo setEnabled:false];
  [[exportWindow contentView] addSubview:deviceTypeCombo];

  var orientationCombo = [[NSPopUpButton alloc] initWithFrame: NSMakeRect(514, 265, 120, 25)];
  [orientationCombo setEnabled: ([deviceTypeCombo indexOfSelectedItem] != 0)];
  [orientationCombo setFont:[NSFont systemFontOfSize:13]];
  orientationCombo.addItemsWithTitles(orientation);
  itemArray = [orientationCombo itemArray];
  for (i = 0; i < [itemArray count]; i++) {
    var item = [itemArray objectAtIndex:i];
    [item setAttributedTitle:NSAttributedString.attributedStringWithString_attributes_([item title],blackTextAttribs)];
  }
  [orientationCombo selectItemAtIndex:0];
  var defaultOrientation = getDefault("exportOrientation",null);
  if(defaultOrientation){
    var indexOrientation = orientation.indexOf(defaultOrientation.trim());
    if(indexOrientation>=0)
      [orientationCombo selectItemAtIndex:indexOrientation];
  }
  [[exportWindow contentView] addSubview:orientationCombo];

  [deviceTypeCombo setCOSJSTargetFunction:function(sender) {
    var projectIndex = [deviceTypeCombo indexOfSelectedItem];
    if(projectIndex == 0)
      [orientationCombo setEnabled: false];
    else
      [orientationCombo setEnabled: true];
  }];

  if(showTextAsImageOption){
    var exportTextLabel =[[NSButton alloc] initWithFrame: NSMakeRect(514, 206, 300, 25)];
    [exportTextLabel setButtonType:NSSwitchButton];
    [exportTextLabel setAttributedTitle:NSAttributedString.attributedStringWithString_attributes_(@"Export text layers as images",blackTextAttribs)];
    [exportTextLabel setFont:[NSFont systemFontOfSize:13]];
    if(getDefault("exportTextAsImage",0)==1)
      [exportTextLabel setState:NSOnState];
    [exportTextLabel setEnabled:false];
    [[exportWindow contentView] addSubview:exportTextLabel];
  }

  var export2x =[[NSButton alloc] initWithFrame: NSMakeRect(514, showTextAsImageOption ? 176 : 206, 300, 25)];
  [export2x setButtonType:NSSwitchButton];
  [export2x setAttributedTitle:NSAttributedString.attributedStringWithString_attributes_(@"Export images to 2x",blackTextAttribs)];
  [export2x setFont:[NSFont systemFontOfSize:13]];
  if(getDefault("export2x",0)==1)
    [export2x setState:NSOnState];
  [export2x setEnabled:false];
  [[exportWindow contentView] addSubview:export2x];

  var exportButton = [[NSButton alloc] initWithFrame:NSMakeRect(397, 15, 92, 30)],
  cancelButton = [[NSButton alloc] initWithFrame:NSMakeRect(280, 15, 92, 30)];
  [exportButton setTitle:"Export"];
  [exportButton setBezelStyle:NSRoundedBezelStyle];
  [exportButton setAction:"callAction:"];
  [cancelButton setTitle:"Cancel"];
  [cancelButton setBezelStyle:NSRoundedBezelStyle];
  [cancelButton setAction:"callAction:"];
  [exportButton setEnabled: false];
  [cancelButton setEnabled: false];

  var bottomActionsView = [[NSView alloc] initWithFrame:NSMakeRect(0, 0,width, 68)];
  [[exportWindow contentView] addSubview:bottomActionsView];


  var loadingView = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, width, height-146)];
  loadingView.setWantsLayer(true);
  //[loadingView setBackgroundColor:NSColor.colorWithRed_green_blue_alpha(255/255, 255/255, 255/255, 0.7)];
  [[exportWindow contentView] addSubview:loadingView positioned:NSWindowAbove relativeTo:null];

  var activityIndicator = [[NSProgressIndicator alloc]initWithFrame:NSMakeRect(190,245,width-320,NSProgressIndicatorPreferredLargeThickness)];
  [activityIndicator setStyle:NSProgress​Indicator​Bar​Style];
  [activityIndicator setBezeled:true];
  [activityIndicator setMinValue:0];
  [activityIndicator setMaxValue:artboardsCount];
  [activityIndicator setDoubleValue:0];
  [activityIndicator setIndeterminate:false];
  [loadingView addSubview:activityIndicator];

  [exportButton setCOSJSTargetFunction:function(sender) {
    artboardsToExport = [];
    for(var i=0;i<artboardsCount;i++){
      var artboardCheckbox = mapCheckboxes[i];
      if([artboardCheckbox state]==NSOnState){
        artboardsToExport.push(skArtboards[i]);
      }
    }
    if(artboardsToExport.length==0){
        alert("No artboard selected", "You must select at least one artboard");
      return;
    }
    if(showTextAsImageOption)
      enableExportTextAsImage = [exportTextLabel state] == NSOnState;
    enableExportImage2X = [export2x state] == NSOnState;
    selectedDeviceType = deviceTypes[[deviceTypeCombo indexOfSelectedItem]];
    selectedOrientation = orientation[[orientationCombo indexOfSelectedItem]];
    setDefault("exportDevice",selectedDeviceType);
    setDefault("exportOrientation",selectedOrientation);
    if(showTextAsImageOption)
      setDefault("exportTextAsImage",enableExportTextAsImage);
    setDefault("export2x",enableExportImage2X);
    setDefault("exportSingleLayer",enableExportGroupAsSingleLayer);
    [exportWindow orderOut:nil];
    [[app mainWindow] endSheet: exportWindow];
    [exportButton setCOSJSTargetFunction:undefined];
    [cancelButton setCOSJSTargetFunction:undefined];
    COScript.currentCOScript().setShouldKeepAround_(false);

    var jimFile = openSaveFileDialog();
    if(jimFile){
      openProgressDialog(jimFile);
    }
  }];

  [cancelButton setCOSJSTargetFunction:function(sender) {
    [exportWindow orderOut:nil];
    [[app mainWindow] endSheet: exportWindow];
    [exportButton setCOSJSTargetFunction:undefined];
    [cancelButton setCOSJSTargetFunction:undefined];
    COScript.currentCOScript().setShouldKeepAround_(false);
  }];
  [bottomActionsView addSubview:exportButton];
  [bottomActionsView addSubview:cancelButton];
  [exportWindow setDefaultButtonCell:[exportButton cell]];


  var index = 0;

  var  processor = new MochaJSDelegate({
    "processArtboard:":(function(timer) {
      var skArtboard=skArtboards[index];
      var wSkDoc = sketchDoc.sketchObject;
      var fileFolder = tempFolder.path()+"/images/";
      var uuid = NSString.stringWithUUID();
      var outFile = fileFolder+ uuid+".png";

      var exportOptions= skArtboard.sketchObject.exportOptions();
      exportOptions.removeAllExportFormats();
      var exportSize = exportOptions.addExportFormat();
      var scale = 1.0;
      if(skArtboard.sketchObject.frame().width() >=skArtboard.sketchObject.frame().height())
        scale = previewWidth /skArtboard.sketchObject.frame().width();
      else
        scale = previewHeight /skArtboard.sketchObject.frame().width();
      exportSize.setScale(scale);


      var exportFormats = exportOptions.exportFormats();
      var slice = MSExportRequest.exportRequestFromExportFormat_layer_inRect_useIDForName(exportSize,skArtboard.sketchObject,skArtboard.sketchObject.absoluteRect().rect(),false);
      var hasBackgroundColor = skArtboard.sketchObject.hasBackgroundColor();

      wSkDoc.saveExportRequest_toFile(slice, outFile);
      var preview = NSImage.alloc().initByReferencingFile(outFile);
      var artboardView = mapPreviews[index];
      [artboardView setImage: preview];
      if(hasBackgroundColor==false)
        [artboardView setBackgroundColor:NSColor.whiteColor()];
      exportOptions.removeExportFormat(exportSize);


      index += 1;
      [activityIndicator setDoubleValue:(index+1)];
      [[exportWindow contentView] addSubview:loadingView positioned:NSWindowAbove relativeTo:null];
      if (index >= artboardsCount) {
        timer.invalidate();
        [activityIndicator setHidden:true];
        [loadingView setHidden:true];
        [exportAll setEnabled:true];
        [deviceTypeCombo setEnabled:true];
        if(showTextAsImageOption)
          [exportTextLabel setEnabled:true];
        [export2x setEnabled:true];
        [exportButton setEnabled: true];
        [cancelButton setEnabled: true];
        for(var i=0;i<artboardsCount;i++){
          var artboardCheckbox = mapCheckboxes[i];
          [artboardCheckbox setEnabled:true];
        }
      }
    }),
  });


  var timer = [NSTimer scheduledTimerWithTimeInterval: 0.001 target: processor.getClassInstance() selector: "processArtboard:" userInfo: nil repeats: true]
  var runLoop = [NSRunLoop currentRunLoop];
  [runLoop addTimer:timer forMode:NSRunLoopCommonModes];
  [[app mainWindow] beginSheet:exportWindow completionHandler:nil];

}

function openSaveFileDialog(){
  removeFolderContents(tempFolder);
  var jimFilename = nsDoc.displayName()+ ".vp";

  var panel = [NSSavePanel savePanel];
  var allowedTypes = NSArray.arrayWithObject("vp");

  panel.setAllowedFileTypes(allowedTypes);
  panel.setExtensionHidden(false);
  panel.setNameFieldStringValue(jimFilename);
  //
  var result = panel.runModal();
  if (result == 0) {
    return null;
  }
  return panel.URL().path();
}

function openProgressDialog(jimFile){
  cancelled = false;
  COScript.currentCOScript().setShouldKeepAround_(true);
  var app = [NSApplication sharedApplication];
  var progressWindow = [[NSWindow alloc] init];
  var width = 455;
  [progressWindow setFrame:NSMakeRect(0, 0, width, 220) display: false];
  var contentView = [progressWindow contentView];
//  [progressWindow setBackgroundColor:NSColor.whiteColor()];

  var isDarkMode = isDarkModeEnabled();
  var imageView = [[NSImageView alloc] initWithFrame: NSMakeRect(131, 136, 192, 30)];
  var file =  isDarkMode ? '../Resources/logo_white.png' : '../Resources/logo.png';
  var icon = NSImage.alloc().initByReferencingFile(resolve(file));
  [imageView setImage: icon];
  [contentView addSubview:imageView];

  var titleField = [[NSTextField alloc] initWithFrame:NSMakeRect(50, 92, 355, 20)];
[titleField setAlignment:NSCenterTextAlignment];
[titleField setEditable:false];
[titleField setBordered:false];
[titleField setDrawsBackground:false];
[titleField setFont:[NSFont boldSystemFontOfSize:13]];
//  [titleField setTextColor:NSColor.blackColor()];
[titleField setStringValue:"Exporting artboards to Justinmind"];
var titleWidth = titleField.fittingSize().width;
titleField.frame = NSMakeRect((width-titleWidth)/2, 96,titleWidth, 20);
[contentView addSubview:titleField];

  var subtitleField = [[NSTextField alloc] initWithFrame:NSMakeRect(50, 44, 355, 25)];
  [subtitleField setAlignment:NSCenterTextAlignment];
  [subtitleField setEditable:false];
  [subtitleField setBordered:false];
  [subtitleField setFont:[NSFont systemFontOfSize:11]];
  //[subtitleField setTextColor:NSColor.colorWithGray(0.4)]
  [subtitleField setDrawsBackground:false];
  [subtitleField setStringValue:"Exporting artboards..."];
  var subtitleWidth = subtitleField.fittingSize().width;
  subtitleField.frame = NSMakeRect((width-subtitleWidth)/2, 44,subtitleWidth, 25);
[contentView addSubview:subtitleField];

  var activityIndicator = [[NSProgressIndicator alloc]initWithFrame:NSMakeRect(75,68,305,20)];
  var progressCount = artboardsToExport.length+2;
  [activityIndicator setStyle:NSProgress​Indicator​Bar​Style];
  [activityIndicator setBezeled:true];
  [activityIndicator setMinValue:0];
  [activityIndicator setMaxValue:progressCount];
  [activityIndicator setDoubleValue:0];
  [activityIndicator setIndeterminate:false];
  [[progressWindow contentView] addSubview:activityIndicator];


  var cancelButton = [[NSButton alloc] initWithFrame:NSMakeRect(178, 12, 100, 30)];
  [cancelButton setTitle:"Cancel"];
  [cancelButton setBezelStyle:NSRoundedBezelStyle];
  [cancelButton setCOSJSTargetFunction:function(sender) {
    [cancelButton setCOSJSTargetFunction:undefined];
    cancelled = true;
  }];
  [cancelButton setAction:"callAction:"];
  [[progressWindow contentView] addSubview:cancelButton];

  var okButton = [[NSButton alloc] initWithFrame:NSMakeRect(178, 12, 100, 30)];
  [okButton setTitle:"Ok"];
  [okButton setBezelStyle:NSRoundedBezelStyle];
  [okButton setCOSJSTargetFunction:function(sender) {
    [progressWindow orderOut:nil];
    [[app mainWindow] endSheet: progressWindow];
    [okButton setCOSJSTargetFunction:undefined];
    COScript.currentCOScript().setShouldKeepAround_(false);

  }];
  [okButton setAction:"callAction:"];
  [okButton setHidden:true];

  [[progressWindow contentView] addSubview:okButton];

  var progressIndex = 0;
  var sketchData = [];
  var  processor = new MochaJSDelegate({
    "processStep:":(function(timer) {
      try{
        if(cancelled){
          timer.invalidate();
          [progressWindow orderOut:nil];
          [[app mainWindow] endSheet: progressWindow];
        //  COScript.currentCOScript().setShouldKeepAround_(false);
          return;
        }
        [activityIndicator setDoubleValue:progressIndex];
        if (progressIndex ==0) {
          [subtitleField setStringValue:"Gathering project information..."];
          var subtitleWidth = subtitleField.fittingSize().width;
          subtitleField.frame = NSMakeRect((width-subtitleWidth)/2, 44,subtitleWidth, 25);
          unzipJIMFile(tempFolder);
        }else if(progressIndex<(progressCount-1)){
          var skArtboard=artboardsToExport[progressIndex-1];
          [subtitleField setStringValue:"Exporting '"+skArtboard.name+"' ..."];
          var subtitleWidth = subtitleField.fittingSize().width;
          subtitleField.frame = NSMakeRect((width-subtitleWidth)/2, 44,subtitleWidth, 25);
          sketchData.push(getArtboardData(skArtboard));
        }else if(progressIndex==(progressCount-1)){
           [subtitleField setStringValue:"Creating Justinmind file..."];
           var subtitleWidth = subtitleField.fittingSize().width;
           subtitleField.frame = NSMakeRect((width-subtitleWidth)/2, 44,subtitleWidth, 25);
          createJustinmindFile(sketchData,tempFolder,jimFile);
        }

        if (progressIndex > progressCount && !cancelled) {
          timer.invalidate();
          [titleField setStringValue:"Artboards exported succesfully!"];
          var titleWidth = titleField.fittingSize().width;
          titleField.frame = NSMakeRect((width-titleWidth)/2, 72,titleWidth, 20);
          [cancelButton setHidden:true];
          [okButton setHidden:false];
          [activityIndicator setHidden:true];
          [subtitleField setHidden:true];
        }
        progressIndex++;
      }catch(e) {
        timer.invalidate();
        [titleField setStringValue:"Export failed!"];
        var titleWidth = titleField.fittingSize().width;
        titleField.frame = NSMakeRect((width-titleWidth)/2, 72,titleWidth, 20);
        alert("Error",e);
        [cancelButton setHidden:true];
        [okButton setHidden:false];
        [activityIndicator setHidden:true];
        [subtitleField setHidden:true];
      }
    }),
  });

  var timer = [NSTimer scheduledTimerWithTimeInterval: 0.05 target: processor.getClassInstance() selector: "processStep:" userInfo: nil repeats: true]
  var runLoop = [NSRunLoop currentRunLoop];
  [runLoop addTimer:timer forMode:NSRunLoopCommonModes];

  [[app mainWindow] beginSheet:progressWindow completionHandler:nil];
}

function isDarkModeEnabled(){
  var skVersion;
  try{
      skVersion = BCSketchInfo.shared().metadata().appVersion;
  }catch(e) {
      skVersion = MSApplicationMetadata.metadata().appVersion;
  }
  return skVersion >=52 ? [[NSUserDefaults standardUserDefaults] stringForKey:@"AppleInterfaceStyle"]=="Dark" : false;
}
