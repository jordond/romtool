# romtool - CLI tool for managing your PSX ROMs

A small collection of tools to help manage your PSX ROMS for use with emulators and RetroPie.

NOTE: I have only tested this on Linux and Mac, I do not have a Windows machine to test on. But in theory it should work.

![romtool demo][demo]

## Commands:

* `romtool merge`
  * Merge multi-track `.bin`'s into a single `.cue`/`.bin` pair
    * Move originals to subfolder
    * Delete the source files
    * Archive the source files using 7zip
* `romtool playlist`
  * Create a `.m3u` playlist for multi-disc games
  * Revert playlist creation

See more:

* [merge](https://github.com/jordond/romtool/blob/master/docs/merge.md)
* [playlist](https://github.com/jordond/romtool/blob/master/docs/playlist.md)

### TODO

* Revert merge if source files were archived or moved
* Figure out how to get `popstation_md` to work, so I can convert them to eboots
* Rewrite in TypeScript
  * This was a weekend project I wrote because I needed it right away. The code can be improved, and switching to TypeScript would help.

## Reasoning:

According to the [RetroPie wiki](https://github.com/retropie/retropie-setup/wiki/Playstation-1#m3u-playlist-for-multi-disc-games) in order to play multi-disc games properly within RetroArch, you need to create a playlist `.m3u` file for each multi-disc game. And in order to make a playlist for games that have multiple track files you need to merge those into a single `.bin`/`.cue` pair.

So this CLI tool comes with commands to find and merge all multi-track games into a single `.bin`/`.cue` pair. And then another option to generate a playlist file for each.

## Installation:

You will also need the following requirments:

1.  Node v8.11.1 or higher
2.  Python - If you use `romtool merge`
3.  7zip - If you use the `--archive` flag with `romtool merge`

Install via `npm`

```bash
npm install -g romtool

# Dependencies

# Mac
brew install python
brew install p7zip

# For linux, just install via your package manager
```

## Usage:

Run `romtool -h` for the CLI usage.

```
$ romtool -h
romtool <command>

Commands:
  romtool merge [options] [--path]     Merge multi-track roms into a single
                                        '.bin' + '.cue'
  romtool playlist [options] [--path]  Create a '.m3u' playlist for multi-disc
                                        games
  romtool find-discs [options]         Find all folders with multiple discs
  romtool find-tracks [options]        Find all folders with games that have
                                        multiple tracks
  romtool scrape-archive [options]     Scrape locked links from archive.org

Options:
  --version     Show version number                                   [boolean]
  --verbose, -v Enable extra logging                                  [boolean]
  --help, -h    Show help                                             [boolean]
```

For more information on a specific command run `romtool <command> -h`

ex: `romtool merge -h`

## Contributing

Feel free to fork and create a pull request! All contributions are welcome! Just clone the repo, install dependencies and start coding!

```bash
git clone git@github.com:jordond/romtool
cd romtool
yarn

# Optionally run link so you can test the CLI
yarn link
```

## Acknowledgements

For merging the multi-track files, this tool relies heavily on a python script created by [@putnam](https://github.com/putnam)

* See his script [here](https://github.com/putnam/binmerge)

## License

```
romtool, a CLI tool for managing PSX roms.
Copyright (C) 2018  Jordon de Hoog

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
```

[demo]: https://github.com/jordond/romtool/raw/master/assets/demo-usage.gif "CLI Demo"
