var FileUtils = function () {}
FileUtils.base64MimeType = function (encoded) {
  var result = null;

  if (typeof encoded !== 'string') {
    return result;
  }

  var mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);

  if (mime && mime.length) {
    result = mime[1];
  }

  return result;
}

FileUtils.getExtensionFromMimetype = function (mimetype) {
  switch (mimetype) {
    case "audio/3gpp":
      return "3gpp"

  }
}

var fs = require('fs');
FileUtils.deleteFolderRecursive = function (path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};


FileUtils.base64ToBlob = function (base64) {
  var binary = atob(base64);
  var len = binary.length;
  var buffer = new ArrayBuffer(len);
  var view = new Uint8Array(buffer);
  for (var i = 0; i < len; i++) {
    view[i] = binary.charCodeAt(i);
  }
  var blob = new Blob([view]);
  return blob;
};
exports.FileUtils = FileUtils;

FileUtils.getFilename = function (filepath) {
  return filepath.replace(/^.*[\\\/]/, '');
}

FileUtils.stripExtensionFromName = function (name) {
  return name.replace(/\.[^/.]+$/, "")
}