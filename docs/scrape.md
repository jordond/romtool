# romtool - Scrape Archive.org

This command will allow you to scrape [archive.org](http://archive.org) for all links within an identifier, including the locked files.

Recently a lot of Archive.org collections have been locked down. So that you can no longer click the link to download a file. This command will find those links then generate a proper URL for you to use. I recommend importing them into JDownloader2.

![romtool scraper demo][demo]

[demo]: https://github.com/jordond/romtools/raw/master/assets/demo-scraper.gif "Scraper Demo"

## Usage

```
$ romtool scrape-archive -h
romtool scrape-archive [options]

Scrape locked links from archive.org

Options:
  --version                    Show version number                     [boolean]
  --help, -h                   Show help                               [boolean]
  --identifier, -i             Archive.org identifier to scrape [required]
  --multi, -m, --part          Check to see if there is multiple parts available
                                                       [boolean] [default: true]
  --extension, -e, --ext       Extension of files to list
  --output, -o, --out          Path to save the results to, disable with
                               '--no-out'               [string] [default: "./"]
  --print                      Print the URL's to the console
                                                      [boolean] [default: false]
  --verbose, -v                Display all the things                  [boolean]
```

## Notes

By default it will save the results to a text file in the directory you run the command in. Use `--output ~/some/new/path` to change the path, or pass `--no-output` to disable saving.

* `--identifier` - String | String[]
  * The identifier for archive.org
    * ex: `https://archive.org/details/ImAIdentifier` would be `--identifier ImAIdentifier`
  * You can pass multiple identifiers to scrape them all
    * ex: `romtools scrape-archive -i IdentBlue -i IdentRed`
* `--multi` - Boolean
  * If enabled then the scraper will attempt to find links that are apart of a multi-part upload
    * ex: `-i IdentBlue` would try to find `IdentBluePart2`, `IdentBluePart3`
    * This is the naming scheme for some of the ReDump posts
  * Disable by passing `--no-multi`

## TODO

* Also scrape the filesize from each link
