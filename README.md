# DNS Proxy

Simple DNS Proxy written in Node.JS

Designed to allow you to override hosts or domains with specific answers or override tlds, or domains to use different nameservers. Useful when using VPN connections with split DNS setups.

This app makes use of the [rc](https://www.npmjs.com/package/rc) module for configuration, the default configuration is below, use any file location to override the defaults. Appname is `dnsproxy` when creating a configuration file.

I can guarentee this app isn't perfect but fulfills my current needs for routing certain domains to private IP name servers when on VPN.

## Examples

### TLD Specific Nameserver

This will send all .com queries to 8.8.8.8
```
servers: {
  'com': '8.8.8.8
}
```

### Domain Specific Nameserver

This will match all google.com and its subdomains. 
```
servers: {
  'google.com': '8.8.8.8'
}
```

### Domain Specific Answers
This will match all of google.com and its subdomains and return 127.0.0.1 as the answer.
```
domains: {
  'google.com': '127.0.0.1'
}
```


## Default Configuration
```
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


