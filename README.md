# biblys/cli

Biblys Command Line Interface

## Install

```shell
git clone
cd cli
npm install -g .
```

Create a config file at `~/.biblys/config.json` with the following content:

```json
{
  "sites": [
    {
      "name": "paronymie",
      "server": "paronymie.fr",
      "path": "/var/www/paronymie"
    }
  ]
}
```

## Usage

All commands can be run for one site, several sites or all sites

Run for one site

```shell
biblys [command] [site] [...arguments]
```

Run for several sites

```shell
biblys [command] [site1,site2,site3] [...arguments]
```

Run for all sites

```shell
biblys [command] all [...arguments]
```

### `deploy`

Deploy a site

```shell
biblys deploy [site] [version]
```

### `version`

Display a site's current version

```shell
biblys version [site]
```

### `config:get`

Get a config option value for a site

```shell
biblys config:get [site] [path]
biblys config:set demo maintenance.enabled
```

### `config:set`

Set a config option value for a site

```shell
biblys config:set [site] [path]=[value] [path]=[value]
biblys config:set demo maintenance.enabled=true
```

### `config:del`

Deletes a config option value for a site

```shell
biblys config:del [site] [path]=[value] [path]=[value]
biblys config:del demo maintenance.message
```

### `theme:update`

Update a site's theme to its latest version

```shell
biblys theme:update [site]
```

### `theme:switch`

Replace current site theme with another one

```shell
biblys theme:switch [current] [target]
```
