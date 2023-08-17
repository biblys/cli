# biblys/cli

Biblys Command Line Interface

## Install

```shell
git clone
cd cli
npm install -g .
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

### `theme:update`

Update a site's theme to its latest version

```shell
biblys theme:update [site]
```
