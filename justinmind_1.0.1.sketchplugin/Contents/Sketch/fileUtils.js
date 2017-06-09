function createEmptyTempFolder(){
  var processUniqueID =  NSProcessInfo.processInfo().globallyUniqueString();
  var tmpPath = NSTemporaryDirectory().stringByAppendingPathComponent(processUniqueID);
  var directoryURL = NSURL.fileURLWithPath_isDirectory(tmpPath,true);

  if(NSFileManager.defaultManager().createDirectoryAtURL_withIntermediateDirectories_attributes_error(directoryURL,true,null,null))
  return directoryURL;
  return "";
}

function removeFolderContents(folderURL){
  var filePath = folderURL.path();
  if(NSFileManager.defaultManager().fileExistsAtPath(filePath))){
    var files = NSFileManager.defaultManager().contentsOfDirectoryAtPath_error(filePath,null);
    for (var i=0;i<files.length;i++){
        var file = files[i];
        NSFileManager.defaultManager().removeItemAtPath_error(filePath.stringByAppendingPathComponent(file),null);
    }
  }
}


function removeFolder(folderURL){
  var filePath = folderURL.path();
  if(NSFileManager.defaultManager().fileExistsAtPath(filePath)))
    NSFileManager.defaultManager().removeItemAtURL_error(folderURL,null);
}

function unzipJIMFile(folderURL){
  var jimFile = sketchApp.resourceNamed("base.vp");
  log(jimFile);
  var unzipTask = NSTask.alloc().init();
  unzipTask.setLaunchPath("/usr/bin/unzip");
  unzipTask.setCurrentDirectoryPath(folderURL.path());
  var arguments = NSArray.arrayWithObject(jimFile);
  unzipTask.setArguments(arguments);
  unzipTask.launch();
  unzipTask.waitUntilExit();
}

function zipJIMFile(folderURL,jimFile){
  if(NSFileManager.defaultManager().fileExistsAtPath(jimFile)){
    NSFileManager.defaultManager().removeItemAtPath_error(jimFile,null);
  }

  var zipTask = NSTask.alloc().init();
  zipTask.setLaunchPath("/usr/bin/zip");
  zipTask.setCurrentDirectoryPath(folderURL.path());
  var arguments = NSArray.arrayWithObjects("-r",jimFile,"./", null);
  zipTask.setArguments(arguments);
  zipTask.launch();
  zipTask.waitUntilExit();
}

function writeXMLDoc(xmlDoc,xmlPath){
  var xmlData = xmlDoc.XMLDataWithOptions(NSXMLNodePrettyPrint);
  if(xmlData.writeToFile_options_error(xmlPath,NSDataWritingAtomic,null)){
    // alert("write XML finished",xmlPath);
  }else{
    // alert("write XML failed",xmlPath);
  }
}
