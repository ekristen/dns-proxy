# DNS Proxy

Simple DNS Proxy written in Node.JS

Designed to allow you to override hosts or domains with specific answers or override tlds, or domains to use different nameservers. Useful when using VPN connections with split DNS setups.

This app makes use of the [rc](https://www.npmjs.com/package/rc) module for configuration, the default configuration is below, use any file location to override the defaults.

## Default Configuration
```
{
  port: 53,
  host: '127.0.0.1',
  logging: 'dnsproxy:query',
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

Logging is handled by the simple lightweight [debug](https://www.npmjs.com/package/debug) package. By default all queries are logged. To change the logging output update the `logging` variable to any of the following: dnsproxy:error, dnsproxy:query, dnsproxy:debug. You can specify all or none, separate using a comma, a wildcard can be used as well.


