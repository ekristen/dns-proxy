[![npm](https://img.shields.io/npm/dt/dns-proxy.svg)](https://github.com/ekristen/dns-proxy) [![npm](https://img.shields.io/npm/l/dns-proxy.svg)](https://github.com/ekristen/dns-proxy) [![David](https://img.shields.io/david/ekristen/dns-proxy.svg)](https://github.com/ekristen/dns-proxy) [![David](https://img.shields.io/david/dev/ekristen/dns-proxy.svg)](https://github.com/ekristen/dns-proxy)

# DNS Proxy

Simple DNS Proxy written in Node.JS

Designed to allow you to override hosts or domains with specific answers or override tlds, or domains to use different nameservers. Useful when using VPN connections with split DNS setups.

This app makes use of the [rc](https://www.npmjs.com/package/rc) module for configuration, the default configuration is below, use any file location to override the defaults. Appname is `dnsproxy` when creating a configuration file.

I can guarentee this app isn't perfect but fulfills my current needs for routing certain domains to private IP name servers when on VPN.

## Roadmap

* Improve configuration logging locations (ie file vs stdout)
* Service scripts for Linux and OSX

## Install

`npm install -g dns-proxy`

## Examples

For nameserver overrides if an answer isn't received by a threshold (350ms by default) DNS proxy will fallback to one of the default nameservers provided in the configuration (by default 8.8.8.8 or 8.8.4.4)

### TLD Specific Nameserver

This will send all .com queries to 8.8.8.8
```json
"servers": {
  "com": "8.8.8.8"
}
```
* This is a snippet that will go into your rc config file.

### Domain Specific Nameserver

This will match all google.com and its subdomains. 
```json
"servers": {
  "google.com": "8.8.8.8"
}
```
* This is a snippet that will go into your rc config file.

### Domain Specific Answers
This will match all of google.com and its subdomains and return 127.0.0.1 as the answer. This technically doens't even have to be a real domain or a full domain, if you configure `ogle.com` and do a lookup on `google.com`, the `ogle.com` will match.
```json
"domains": {
  "google.com": "127.0.0.1"
}
```

### Aliases

**Domains** and **Hosts** support aliases now, whereby you can define a host like normal such as `"hi": "127.0.0.1"` and in another entry reference it like `"hello": "hi"`.

## Default Configuration
This is the default configuration in the application, you should override this by creating the proper rc file in one of the searchable paths.
```js
{
  port: 53,
  host: '127.0.0.1',
  logging: 'dns-proxy:query',
  nameservers: [
    '8.8.8.8',
    '8.8.4.4'
  ],
  servers: {},
  domains: {
    'dev': '127.0.0.1'
  },
  hosts: {
    'devlocal': '127.0.0.1'
  }
}
```

## Logging

Logging is handled by the simple lightweight [debug](https://www.npmjs.com/package/debug) package. By default all queries are logged. To change the logging output update the `logging` variable to any of the following: dns-proxy:error, dns-proxy:query, dns-proxy:debug. You can specify all or none, separate using a comma, a wildcard can be used as well.


## Running as a Service 

### OSX

You can copy the `resources/launchd.plist` file into `/Library/LaunchDaemons` as `com.github.ekristen.dns-proxy.plist`. To start just run `sudo launchctl load /Library/LaunchDaemons/com.github.ekristen.dns-proxy.plist`. This will also make the dns-proxy service to start on boot.
