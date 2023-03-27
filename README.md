# biblys/cli

Biblys Command Line Interface

## Install

```shell
git clone
cd cli
npm install -g .
```

## Usage

### `deploy`

Deploy a site

```shell
biblys deploy [site] [version]
```

Deploy all sites

```shell
biblys deploy all [version]
```

### `version`

Display a site's current version

```shell
biblys version [site]
```

Display all sites current version

```shell
biblys version all
```


### `config:get`

Get a config option value for a site

```shell
biblys config:get [site] [path]
biblys config:set demo maintenance.enabled
```

Get a config option value for all sites

```shell
biblys config:get [site] [path]
```


### `config:set`

Set a config option value for a site's 

```shell
biblys config:set [site] [path] [value]
biblys config:set demo maintenance.enabled true
```

Set a config option value for all sites

```shell
biblys config:set [site] [path] [value]
```
