# romtool - merge multi-track PSX roms

This command will search the given directory for games that contain multiple bin files per `.cue`. It will then prompt you to select which games you would like to merge, and produce a **single** `.bin` and `.cue` pair. Use this in conjuction with `romtool playlist` as stated in the [RetroPie Wiki](https://github.com/retropie/retropie-setup/wiki/Playstation-1#m3u-playlist-for-multi-disc-games).

![romtool merge demo][demo]

[demo]: https://github.com/jordond/romtool/raw/master/assets/demo-merge.gif "Merge Demo"

## Features

* Merge multi-track `.bin`'s into a single `.cue`/`.bin` pair
* Move originals to subfolder
* Delete the source files
  * **NOTE**
    * Cannot be undone
    * If used with `--no-confirm` it will **NOT** ask if you really want to delete
* Archive the source files using 7zip

**Note:** The default behavior is to ask you which files you would like to merge, pass `--no-confirm` to disable this.

## Requirements

The following programs must be installed and be on your `$PATH`

* `python`
  * Needed to merge the files
* `7zip`
  * Required only if `--archive` is enabled

In order for the tool to find your files, the folder needs to have a `.cue` file, with matching `.bin` files with `(Track N)` (where N is the number). There can be multiple `.cue` files, as long as there are matching `.bin` files. See [sample output](https://github.com/jordond/romtool/blob/master/docs/merge-sample.md) for more info.

```bash
$ tree /media/roms/psx/Twisted\ Metal\ (USA)
.
├── Twisted Metal (USA) (Track 1).bin
├── Twisted Metal (USA) (Track 2).bin
├── Twisted Metal (USA) (Track 3).bin
├── Twisted Metal (USA) (Track 4).bin
├── Twisted Metal (USA) (Track 5).bin
├── Twisted Metal (USA) (Track 6).bin
├── Twisted Metal (USA) (Track 7).bin
├── Twisted Metal (USA) (Track 8).bin
├── Twisted Metal (USA) (Track 9).bin
└── Twisted Metal (USA).cue

0 directories, 10 files
```

## Usage

If your computer supports it, you process the files quicker by changing the following flags:

* `--workers [number]`
  * The number of files to merge at a time
  * ex: if you have 50 files to merge, doing 10 at a time will be faster than the default 6
* `--archiveWorkers [number]`
  * The number of `7zip` processes to run
  * **NOTE** setting this number _too_ high might cause some performance problems, will nuke your CPU

```bash
# Scan the current directory and merge compatible files
romtool merge

# Scan a custom directory
romtool merge --path /media/roms/psx

# Merge the files then archive the originals
romtool merge --path /roms/psx --archive

# Merge and archive files, move zip files to other folder
romtool merge --path /roms/psx --archive /media/NAS/backup

# Merge ALL compatible files and delete WITHOUT COMFIRMATION
romtool merge --path /psx --delete --no-confirm # Do this at your own risk...
```

```
$ romtool merge --help

romtool merge [options] [--path]

Merge multi-track roms into a single '.bin' + '.cue'

Options:
  --version              Show version number                           [boolean]
  --verbose, -v          Enable extra logging                          [boolean]
  --help, -h             Show help                                     [boolean]
  --path, -p             Path to search for multi-track roms
                                                        [string] [default: "./"]
  --exclude, -x          Pattern to exclude files
  --recursive, -r        Recursively look through directories, pass
                         '--no-recursive' to disable   [boolean] [default: true]
  --workers, -w          Number of concurrent merges to do, higher number will
                         speed up the process.  Do so at your computer's expense
                                                           [number] [default: 6]
  --archive, -a          Archive the source files instead of deleting, if a
                         string, the 7z's will be moved there
  --archiveWorkers, -W   Number of concurrent 7zip processes to use, WARNING:
                         using too many may cause serious performance problems
                                                           [number] [default: 1]
  --confirm              Ask before merging            [boolean] [default: true]
  --clean, -d, --delete  Delete the source files after completion. * CANNOT BE
                         UNDONE                       [boolean] [default: false]

Examples:
  romtool merge                             Merge all multi-track files in the
                                            current directory.
  romtool merge --path /roms/psx --archive  Merge all multi-track files in
  /backup/psx                               '/roms/psx' and create a 7z backup
                                            in '/backup/psx'.
  romtool merge --no-confirm --clean        Merge files the delete without
                                            needing any user input.
  romtool merge --path /roms/psx --clean    Merge all multi-track files in
                                            '/roms/psx' and permanently DELETE
                                            all of the originals.
```

## Example

```bash
$ pwd
/media/roms/psx/Twisted Metal (USA)

$ ls -l
total 667536
 88M | Twisted Metal (USA) (Track 1).bin
 30M | Twisted Metal (USA) (Track 2).bin
 33M | Twisted Metal (USA) (Track 3).bin
 21M | Twisted Metal (USA) (Track 4).bin
 31M | Twisted Metal (USA) (Track 5).bin
 31M | Twisted Metal (USA) (Track 6).bin
 31M | Twisted Metal (USA) (Track 7).bin
 30M | Twisted Metal (USA) (Track 8).bin
 31M | Twisted Metal (USA) (Track 9).bin
999B | Twisted Metal (USA).cue

$ romtool merge --no-confirm
✔ successfully merged all 1 cue files

$ tree
.
├── Twisted Metal (USA).bin
├── Twisted Metal (USA).cue
└── romtool-original
    ├── Twisted Metal (USA) (Track 1).bin
    ├── Twisted Metal (USA) (Track 2).bin
    ├── Twisted Metal (USA) (Track 3).bin
    ├── Twisted Metal (USA) (Track 4).bin
    ├── Twisted Metal (USA) (Track 5).bin
    ├── Twisted Metal (USA) (Track 6).bin
    ├── Twisted Metal (USA) (Track 7).bin
    ├── Twisted Metal (USA) (Track 8).bin
    ├── Twisted Metal (USA) (Track 9).bin
    └── Twisted Metal (USA).cue

1 directory, 12 files
```
