(function(){
  "use strict";
  function extractTokens(text){
    var matches=String(text||"").match(/SHM1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[];
    return Array.from(new Set(matches));
  }
  window.SmartHanwooLicenseFileParser=Object.freeze({extractTokens:extractTokens});
})();
