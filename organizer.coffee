#!/usr/bin/env coffee

fs      = require 'fs'
path    = require 'path'

mkdirp  = require 'mkdirp'
program = require 'commander'

# Underscore & Underscore.string
_     = require 'underscore'
_.str = require 'underscore.string'
_.mixin _.str.exports()

#####

videoExtensions = ['.mkv','.mp4','.avi','.mpg']

class Folder
  
  inPath = ''
  outPath = ''
  @files = []
  @episodes = []
  
  constructor: (inp,outp) ->
    @inPath = path.resolve path.normalize(inp)
    @outPath = path.resolve path.normalize(outp)
    @parse()
    @parseFiles()
  
  parse: ->
    @files = fs.readdirSync(@inPath)
    @reduceToVideoFiles()
    @cleanup()
  
  reduceToVideoFiles: ->
    @files = _.filter @files, (file) ->
      path.extname(file) in videoExtensions
  
  cleanup: ->
    @files = _.map @files, (file) =>
      path.join(@inPath,file)
  
  parseFiles: ->
    @episodes = _.map @files, (file) ->
      new Episode(file)

  renameFiles: (folderStructure,copyFiles) ->
    for episode in @episodes
      oldPath = episode.getPath()
      newPath = if folderStructure then path.join(@outPath, episode.generateNewRelPath() ) else path.join(@outPath, episode.generateNewFilename() )
      
      verb = if copyFiles then 'Copying' else 'Moving'

      console.log "#{verb}: #{path.relative(process.cwd(), oldPath)} -> #{path.relative(process.cwd(), newPath)}"
      
      if not fs.existsSync(path.dirname(newPath)) then mkdirp.sync(path.dirname(newPath))
      
      if fs.existsSync(newPath) 
        console.info "File already exists"
      else 
        if copyFiles 
          newFile = fs.createWriteStream(newPath)

          oldFile = fs.createReadStream(oldPath)

          oldFile.once('open', (fd) ->
            oldFile.pipe newFile
          )

        else
          fs.renameSync( oldPath, newPath)

  getPath: -> @inPath
  
  getFiles: ->
    @files
  
  getEpisodes: ->
    @episodes

class Episode
  
  episodeRegex = /(?:.*_)*([\w .-]*)[._]{1}(?:S?(\d+)(?:E|x)(\d+)|(\d{4}\.\d{2}\.\d{2})|(?:\((\d{2})\..*?\.(\d{2})))/i
  
  constructor: (p) ->
    @path = p
    @filename = path.basename(@path)
    @parse()
    @cleanup()
  
  parse: ->
    res = @filename.match(episodeRegex)
    
    if res.length isnt 7
      console.error "## Error parsing #{@filename}"
      console.error "## res.length == #{res.length}"
        
    @showName = res[1]
    @season = res[2]*1 | res[5]*1
    @episode = res[3]*1 | res[6]*1
    @date = res[4] || false
  
  cleanup: ->
    @showName = _.map( _.words( @showName, /\./ ), (e) -> return _.capitalize(e)).join(' ')
    
  generateNewFilename: ->
    if @date 
      "#{@showName}.#{@date}#{path.extname(@filename)}"
    else
      "#{@showName}.S#{_.pad(@season, 2, '0')}E#{_.pad(@episode, 2, '0')}#{path.extname(@filename)}"
  
  generateNewRelPath: ->
    if @season
      path.join(@showName,"Season #{@season}",@generateNewFilename())
    else
      path.join(@showName,@generateNewFilename())
  
  getPath: ->
    @path
    
  getFilename: ->
    @filename

#####

program
  .version('0.0.1')
  .option('-i, --in [dir]','Input directory')
  .option('-o, --out [dir]','Output directory')
  .option('-c, --copy','Copy files instead of renaming/moving them')
  .option('-f, --folder','Create a folder structure "Show Name/Season #/"')
  .parse(process.argv)

program.in = program.in || '.'
program.out = program.out || '.'
program.copy = program.copy || false
program.folder = program.folder || false

if not fs.existsSync(path.resolve(program.in))
  console.error "Input directory does not exist!"
  return 0
if not fs.existsSync(path.resolve(program.out))
  console.error "Output directory does not exist!"
  return 0

folder = new Folder program.in, program.out

#folder.parse()
#folder.parseFiles()
folder.renameFiles(program.folder, program.copy)

#####
