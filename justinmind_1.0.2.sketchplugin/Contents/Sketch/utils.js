function createNewUUID(){
  return NSString.stringWithUUID();
}

function getDefault(key,initialValue) {
  var defaults = [NSUserDefaults standardUserDefaults];
  var defaultValue = [defaults objectForKey: '-' + kPluginDomain + '-' + key];
  if (defaultValue != nil && ([defaultValue class] === NSDictionary)) return [NSMutableDictionary dictionaryWithDictionary:defaultValue]
  if (defaultValue != nil)
    return defaultValue;
  return initialValue;
}

function setDefault(key, value) {
  var defaults = [NSUserDefaults standardUserDefaults];
  var	configs  = [NSMutableDictionary dictionary];
  [configs setObject: value forKey: '-' + kPluginDomain + '-' + key];
  return [defaults registerDefaults: configs];
}
