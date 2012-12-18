#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    program = require('commander'),
    _ = require('underscore');

_.str = require('underscore.string');
_.mixin(_.str.exports());

var videoExtensions = ['.mkv', '.mp4', '.avi', '.mpg'];

var Folder = (function() {
  var inPath, outPath;

  inPath = '';

  outPath = '';

  Folder.files = [];

  Folder.episodes = [];

  function Folder(inp, outp) {
    this.inPath = path.resolve(path.normalize(inp));
    this.outPath = path.resolve(path.normalize(outp));
    this.parse();
    this.parseFiles();
  }

  Folder.prototype.parse = function() {
    this.files = fs.readdirSync(this.inPath);
    this.reduceToVideoFiles();
    return this.cleanup();
  };

  Folder.prototype.reduceToVideoFiles = function() {
    return this.files = _.filter(this.files, function(file) {
      return videoExtensions.indexOf( path.extname(file) ) >= 0;
    });
  };

  Folder.prototype.cleanup = function() {
    var _this = this;
    return this.files = _.map(this.files, function(file) {
      return path.join(_this.inPath, file);
    });
  };

  Folder.prototype.parseFiles = function() {
    return this.episodes = _.map(this.files, function(file) {
      return new Episode(file);
    });
  };

  Folder.prototype.renameFiles = function(folderStructure, copyFiles) {
    var episode, newFile, newPath, oldFile, oldPath, verb, _i, _len, _ref, _results;
    _ref = this.episodes;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      episode = _ref[_i];
      oldPath = episode.getPath();
      newPath = folderStructure ? path.join(this.outPath, episode.generateNewRelPath()) : path.join(this.outPath, episode.generateNewFilename());
      verb = copyFiles ? 'Copying' : 'Moving';
      console.log("" + verb + ": " + (path.relative(process.cwd(), oldPath)) + " -> " + (path.relative(process.cwd(), newPath)));
      if (!fs.existsSync(path.dirname(newPath))) {
        mkdirp.sync(path.dirname(newPath));
      }
      if (fs.existsSync(newPath)) {
        _results.push(console.info("File already exists"));
      } else {
        if (copyFiles) {
          newFile = fs.createWriteStream(newPath);
          oldFile = fs.createReadStream(oldPath);
          _results.push(oldFile.once('open', function(fd) {
            return oldFile.pipe(newFile);
          }));
        } else {
          _results.push(fs.renameSync(oldPath, newPath));
        }
      }
    }
    return _results;
  };

  Folder.prototype.getPath = function() {
    return this.inPath;
  };

  Folder.prototype.getFiles = function() {
    return this.files;
  };

  Folder.prototype.getEpisodes = function() {
    return this.episodes;
  };

  return Folder;

})();

var Episode = (function() {
  var episodeRegex;

  episodeRegex = /(?:.*_)*([\w .-]*)[._]{1}(?:S?(\d+)(?:E|x)(\d+)|(\d{4}\.\d{2}\.\d{2})|(?:\((\d{2})\..*?\.(\d{2})))/i;

  function Episode(p) {
    this.path = p;
    this.filename = path.basename(this.path);
    this.parse();
    this.cleanup();
  }

  Episode.prototype.parse = function() {
    var res;
    res = this.filename.match(episodeRegex);
    if (res.length !== 7) {
      console.error("## Error parsing " + this.filename);
      console.error("## res.length == " + res.length);
    }
    this.showName = res[1];
    this.season = res[2] * 1 | res[5] * 1;
    this.episode = res[3] * 1 | res[6] * 1;
    return this.date = res[4] || false;
  };

  Episode.prototype.cleanup = function() {
    return this.showName = _.map(_.words(this.showName, /\./), function(e) {
      return _.capitalize(e);
    }).join(' ');
  };

  Episode.prototype.generateNewFilename = function() {
    if (this.date) {
      return "" + this.showName + "." + this.date + (path.extname(this.filename));
    } else {
      return "" + this.showName + ".S" + (_.pad(this.season, 2, '0')) + "E" + (_.pad(this.episode, 2, '0')) + (path.extname(this.filename));
    }
  };

  Episode.prototype.generateNewRelPath = function() {
    if (this.season) {
      return path.join(this.showName, "Season " + this.season, this.generateNewFilename());
    } else {
      return path.join(this.showName, this.generateNewFilename());
    }
  };

  Episode.prototype.getPath = function() {
    return this.path;
  };

  Episode.prototype.getFilename = function() {
    return this.filename;
  };

  return Episode;

})();

program.version('0.0.1').option('-i, --in [dir]', 'Input directory').option('-o, --out [dir]', 'Output directory').option('-c, --copy', 'Copy files instead of renaming/moving them').option('-f, --folder', 'Create a folder structure "Show Name/Season #/"').parse(process.argv);

program["in"] = program["in"] || '.';

program.out = program.out || '.';

program.copy = program.copy || false;

program.folder = program.folder || false;

if (!fs.existsSync(path.resolve(program["in"]))) {
  console.error("Input directory does not exist!");
  return 0;
}

if (!fs.existsSync(path.resolve(program.out))) {
  console.error("Output directory does not exist!");
  return 0;
}

folder = new Folder(program["in"], program.out);

folder.renameFiles(program.folder, program.copy);
