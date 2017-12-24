var Importer = function (destPath) {
    this.elem = document.getElementById("table-container");
    this.progressView = document.getElementById("progress-view");
    this.destPath = destPath;
    this.webview = document.getElementById("webview")
    var importer = this
    document.getElementById("folder-picker").style.display = "none"
    $("#note-selection-view").hide();
    document.getElementById("select-folder-button").onclick = function () {
        document.getElementById("folder-picker").style.display = "block"

    }
    this.webview.addEventListener('ipc-message', event => {
        // prints "ping"
        if (event.channel == "pathSelected") {
            importer.path = event.args[0]
            console.log("event.channel " + event.args[0])
            importer.fillNoteList()
            $(importer.webview).hide()
            $("#select-folder").hide()
            $("#note-selection-view").show()
        }
    })
}

function generateUID() {
    // I generate the UID from two parts here
    // to ensure the random number provide enough bits.
    var firstPart = (Math.random() * 46656) | 0;
    var secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
}

Importer.prototype.listNotes = function (callback) {
    var fs = require("fs");
    var FileUtils = require("../utils/file_utils.js").FileUtils

    var importer = this;
    fs.readdir(this.path, (err, dir) => {
        if (err)
            callback(false);
        else {
            importer.result = []
            importer.dir = dir;
            importer.readNext(callback)
        }

    });
}

Importer.prototype.importNotes = function () {
    this.notesToImport = this.getSelectedNotes()
    this.timeStampedNotes = []
    var importer = this;
    this.importNext(function () {
        console.log(importer.timeStampedNotes.length + " notes imported")
    })
}

Importer.prototype.importNext = function (callback) {
    if (this.notesToImport.length <= 0) {
        callback();
        return;
    }
    var notePath = this.notesToImport.pop();
    var importer = this;
    var FileUtils = require("../utils/file_utils.js").FileUtils
    this.importNote(notePath, this.destPath, function () {
        importer.importNext(callback);
    })
}

Importer.prototype.fillNoteList = function (callback) {
    var importer = this;
    $(this.progressView).show();
    for (var elem of document.getElementsByClassName("import-button")) {
        $(elem).hide();
    }
    this.listNotes(function (success, notes) {
        var table = document.createElement("table");
        table.classList.add("mdl-data-table")
        table.classList.add("mdl-js-data-table")
        table.classList.add("mdl-data-table--selectable")
        table.classList.add("mdl-shadow--2dp")
        var head = document.createElement("thead");
        table.appendChild(head)
        var tr = document.createElement("tr");
        head.appendChild(tr)
        var th = document.createElement("th");
        th.classList.add("mdl-data-table__cell--non-numeric")
        th.innerHTML = "Title"
        tr.appendChild(th)
        var tbody = document.createElement("tbody");
        table.appendChild(tbody)


        importer.elem.appendChild(table)
        for (var note of notes) {
            var tr = document.createElement("tr");
            tbody.appendChild(tr)

            var td = document.createElement("td");
            td.classList.add("mdl-data-table__cell--non-numeric")
            tr.appendChild(td)
            td.innerHTML = note.title
            td = document.createElement("td");
            tr.appendChild(td)
            td.classList.add("value")
            td.innerHTML = note.path


        }
        new MaterialDataTable(table)
        $(importer.progressView).hide()
        for (var elem of document.getElementsByClassName("import-button")) {
            $(elem).show();
        }
        callback()
    })
}

Importer.prototype.getSelectedNotes = function () {
    var toImport = [];
    for (var note of document.getElementsByClassName("value")) {
        if (note.parentElement.getElementsByClassName("mdl-checkbox__input")[0].checked)
            toImport.push(note.innerHTML)
    }
    return toImport;
}
Importer.prototype.readNext = function (callback) {
    if (this.dir.length == 0 || this.result.length == -1) {
        callback(true, this.result)

        return;
    }
    var base64 = require("../utils/base64")
    var importer = this;
    var fileName = this.dir.pop()
    var fs = require("fs");
    fs.readFile(this.path + "/" + fileName, 'base64', function (err, data) {
        if (err) {
            callback(false)
            return;
        }
        var buffer = new Buffer(data, 'base64');
        var file = buffer.toString()
        if (file.indexOf("<?xml") > -1) {
            var container = document.createElement("div");
            container.innerHTML = file
            var thisTitle = container.querySelector("title").innerHTML;
            console.log(thisTitle)
            importer.result.push({
                title: thisTitle,
                path: importer.path + "/" + fileName
            })

        } else {

            console.log(fileName + " " + "unknown")

        }
        setTimeout(function () {
            importer.readNext(callback)

        }, 10)

    });
}

Importer.prototype.writeNext = function (callback) {
    if (this.toWrite.length <= 0) {
        callback()
        return;
    }
    var fs = require("fs");
    var importer = this;
    var toWrite = this.toWrite.pop()
    console.log("write to " + toWrite.path)
    fs.writeFile(toWrite.path, toWrite.data, function (err) {
        console.log(err)
        importer.writeNext(callback)

    });
}

function DateError() {}

Importer.prototype.importNote = function (keepNotePath, destFolder, callback) {
    var FileUtils = require("../utils/file_utils.js").FileUtils
    var fileName = FileUtils.getFilename(keepNotePath);
    this.importingSpan.innerHTML = fileName;
    var fs = require("fs");
    console.log(keepNotePath)
    var importer = this;
    fs.readFile(keepNotePath, 'base64', function (err, data) {
        if (err) {
            callback()
            return
        }
        importer.toWrite = []
        var buffer = new Buffer(data, 'base64');
        var content = buffer.toString()
        var container = document.createElement("div");
        container.innerHTML = content
        var titleDiv = container.querySelector("title")
        var title = "";
        if (titleDiv != null)
            title = titleDiv.innerHTML;
        console.log("title " + title)
        var textDiv = container.querySelector(".content");
        var text = "";
        if (textDiv != null)
            text = textDiv.innerHTML;
        importer.toWrite.push({
            type: "text",
            path: "importtmp/index.html",
            data: '<div id="text" contenteditable="true" style="height:100%;">\
        <!-- be aware that THIS will be modified in java -->\
        <!-- soft won\'t save note if contains -->' + text + '\
    </div>\
    <div id="floating">\
    \
    </div>'
        })

        console.log("text " + text)
        var labels = container.getElementsByClassName("label");
        var keywords = [];
        var dateDiv = container.querySelector(".heading");
        console.log(dateDiv.innerText.trim())


        console.log(escape(dateDiv.innerText.trim()).replace("%E0%20", ""))
        var date = dateDiv.innerText.trim();
        //escape unescape only way I've found to replace the à which didn't work with simple replace("à ","")
        var fixedDate = unescape(escape(date).replace("%E0%20", "").replace("%E9", "e").replace("%FB", "u")).replace("at ", "").replace("à ", "")
            .replace("&agrave; ", "")
            .replace("juin", "june")
            .replace("juil.", "july")
            .replace("mars", "march")
            .replace("oct.", "october")
            .replace("jan.", "january")
            .replace("janv.", "january")
            .replace("sept.", "september")
            .replace("déc.", "december")
            .replace("dec.", "december")
            .replace("fevr.", "february")
            .replace("avr.", "april")
            .replace("nov.", "november")
            .replace("mai", "may")
            .replace("aout", "august");
        console.log(fixedDate)
        var time = getDateFromFormat(fixedDate, "dd MMM yyyy HH:mm:ss")
        if (time == 0) //try different
            time = getDateFromFormat(fixedDate, "d MMM yyyy HH:mm:ss")
        if (time == 0)
            throw new DateError()
        var notePath = destFolder + "/" + (title == date ? "untitled" : "") + FileUtils.stripExtensionFromName(fileName) + ".sqd"
        importer.timeStampedNotes.push({
            time: time,
            path: notePath
        });
        console.log(time)
        if (labels != undefined) {
            for (var label of labels) {
                keywords.push(label.innerHTML)
                console.log("label " + label.innerHTML)

            }
        }
        var metadata = {
            creation_date: time,
            last_modification_date: time,
            keywords: keywords
        }
        console.log("meta " + JSON.stringify(metadata))

        importer.toWrite.push({
            type: "text",
            path: "importtmp/metadata.json",
            data: JSON.stringify(metadata)
        })
        //attachments
        var attachments = container.querySelector(".attachments");
        var base64Files = []
        if (attachments != undefined) {


            var audioFiles = attachments.getElementsByClassName("audio");
            if (audioFiles != undefined) {
                for (var audioFile of audioFiles) {
                    var data = audioFile.getAttribute("href")
                    importer.toWrite.push({
                        type: "base64",
                        path: "importtmp/" + generateUID() + "." + FileUtils.getExtensionFromMimetype(FileUtils.base64MimeType(data)),
                        data: data
                    })
                }
            }

            var imgFiles = attachments.getElementsByTagName("image");
            if (imgFiles != undefined) {
                for (var imageFile of imgFiles) {
                    var data = imageFile.getAttribute("src")
                    importer.toWrite.push({
                        type: "base64",
                        path: "importtmp/" + generateUID() + "." + FileUtils.getExtensionFromMimetype(FileUtils.base64MimeType(data)),
                        data: data
                    })
                }
            }

            console.log("attachments " + base64Files.length)

        }

        for (var base64File of base64Files) {
            console.log("mime " + FileUtils.getExtensionFromMimetype(FileUtils.base64MimeType(base64File)))

        }
        FileUtils.deleteFolderRecursive("importtmp");

        var mkdirp = require('mkdirp');
        mkdirp.sync("importtmp");
        importer.writeNext(function () {
            console.log("callback, zip to " + notePath)
            var archiver = require("archiver")
            var archive = archiver.create('zip', {
                zlib: {
                    level: 0
                } // no compression
            });
            mkdirp(destFolder)

            var output = fs.createWriteStream(notePath);
            archive.pipe(output);

            archive
                .directory("importtmp", false)
                .finalize();

            callback()
        })



    });

}


exports.Importer = Importer;