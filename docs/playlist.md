# romtool - generate playlist for multi-disc PSX games

This command will search the given directory for games that contain multiple discs. Then it will generate a `.m3u` for each game found. It creates the playlist based on the information in the [RetroPie Wiki](https://github.com/retropie/retropie-setup/wiki/Playstation-1#m3u-playlist-for-multi-disc-games).

![romtool playlist demo][demo]

[demo]: https://github.com/jordond/romtool/raw/master/assets/demo-playlist.gif "Playlist Demo"

## Features

* Creates `.m3u` playlist containing each disc's cue
* Renames the original `.cue` to `.CD(x)`, where `x` is the disc number
* Ability to revert the changes
  * ie. Renames the `.CD(x)`'s back to `.cue` and deletes the `.m3u`

## Usage

```bash
# Scan the current directory and generate playlist files
romtool playlist

# Scan a custom directory
romtool playlist --path /media/roms/psx

# Revert the playlist creation
romtool playlist --path /media/roms/psx --revert
```

```
$ romtool playlist --help

romtool playlist [options] [--path]

Create a '.m3u' playlist for multi-disc games

Options:
  --version                   Show version number                      [boolean]
  --help, -h                  Show help                                [boolean]
  --path, -p                  Path to search for multi-track roms
                                                        [string] [default: "./"]
  --revert, -r                Revert the playlist creation, ie delete m3u and
                              rename files to original
  --exclude, -x               Pattern to exclude files
  --confirm                   Select which files to use[boolean] [default: true]
  --verbose, -v, --isVerbose  Display all the things                   [boolean]
```

## Screenshot

Before:

![romtool playlist before][playlist-before]

[playlist-before]: https://github.com/jordond/romtool/raw/master/assets/screen-merge-after.png "Playlist"

After:

![romtool playlist after][playlist-after]

[playlist-after]: https://github.com/jordond/romtool/raw/master/assets/screen-playlist.png "Playlist"
