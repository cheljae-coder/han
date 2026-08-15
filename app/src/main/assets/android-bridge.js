(function () {
  "use strict";

  // Browser/desktop previews load the same HTML. Do not expose native methods
  // unless Android has installed the JavaScript interface.
  if (!window.AndroidBridge) return;

  function decodeUtf8Base64(encoded) {
    var binary = atob(encoded);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new TextDecoder("utf-8").decode(bytes);
  }

  window.smartHanwooNative = {
    getDeviceId: async function () {
      return { deviceId: window.AndroidBridge.getDeviceId(), platform: "ANDROID" };
    },
    getLicenseState: async function () {
      return window.AndroidBridge.getLicenseState();
    },
    setLicenseState: async function (json) {
      window.AndroidBridge.setLicenseState(String(json));
      return true;
    },
    fetchMarketXml: async function (url) {
      var result = window.AndroidBridge.fetchMarketXml(String(url));
      if (result.indexOf("ERROR:") === 0) throw new Error(result.slice(6));
      return { xml: decodeUtf8Base64(result), route: "Android 앱 통신" };
    },
    exitApp: async function () {
      window.AndroidBridge.exitApp();
      return true;
    }
  };

  var nativeRevoke = URL.revokeObjectURL.bind(URL);
  URL.revokeObjectURL = function (url) {
    setTimeout(function () { nativeRevoke(url); }, 15000);
  };

  function saveDownloadAnchor(anchor) {
    fetch(anchor.href)
      .then(function (response) { return response.blob(); })
      .then(function (blob) {
        return blob.arrayBuffer().then(function (buffer) {
          var bytes = new Uint8Array(buffer);
          var binary = "";
          var block = 32768;
          for (var offset = 0; offset < bytes.length; offset += block) {
            binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + block));
          }
          window.AndroidBridge.saveFile(
            btoa(binary),
            anchor.download || "smart-hanwoo-backup.json",
            blob.type || "application/octet-stream"
          );
        });
      })
      .catch(function (error) {
        alert("파일 저장에 실패했습니다: " + (error.message || error));
      });
  }

  var nativeAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && this.href && this.href.indexOf("blob:") === 0) {
      saveDownloadAnchor(this);
      return;
    }
    return nativeAnchorClick.call(this);
  };

  document.addEventListener("click", function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest("a[download]") : null;
    if (!anchor || !anchor.href || anchor.href.indexOf("blob:") !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    saveDownloadAnchor(anchor);
  }, true);
})();
