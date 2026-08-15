(function () {
  "use strict";

  if (!window.chrome || !window.chrome.webview) return;

  var pending = new Map();
  var sequence = 0;

  function request(type, payload) {
    return new Promise(function (resolve, reject) {
      sequence += 1;
      var id = "r50-" + Date.now() + "-" + sequence;
      pending.set(id, { resolve: resolve, reject: reject });
      window.chrome.webview.postMessage(Object.assign({ id: id, type: type }, payload || {}));
    });
  }

  window.chrome.webview.addEventListener("message", function (event) {
    var message = event.data || {};
    var handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.ok) handler.resolve(message.result);
    else handler.reject(new Error(message.error || "Windows 연결 작업에 실패했습니다."));
  });

  window.smartHanwooNative = {
    getDeviceId: function () { return request("getDeviceId"); },
    getLicenseState: function () { return request("getLicenseState"); },
    setLicenseState: function (json) {
      return request("setLicenseState", { json: String(json) });
    },
    fetchMarketXml: function (url) {
      return request("fetchMarketXml", { url: String(url) });
    },
    exitApp: function () {
      return request("exitApp").then(function () { return true; });
    }
  };

  var nativeRevoke = URL.revokeObjectURL.bind(URL);
  URL.revokeObjectURL = function (url) {
    setTimeout(function () { nativeRevoke(url); }, 15000);
  };

  function bytesToBase64(bytes) {
    var binary = "";
    var block = 32768;
    for (var offset = 0; offset < bytes.length; offset += block) {
      binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + block));
    }
    return btoa(binary);
  }

  function saveDownloadAnchor(anchor) {
    fetch(anchor.href)
      .then(function (response) { return response.blob(); })
      .then(function (blob) {
        return blob.arrayBuffer().then(function (buffer) {
          return request("saveFile", {
            base64: bytesToBase64(new Uint8Array(buffer)),
            fileName: anchor.download || "smart-hanwoo-backup.json",
            mimeType: blob.type || "application/octet-stream"
          });
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
