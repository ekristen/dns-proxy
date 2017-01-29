const fs = require('fs')
const rc = require('rc')
const dgram = require('dgram')
const packet = require('native-dns-packet')

const util = require('./util.js')

const defaults = {
  port: 53,
  host: '127.0.0.1',
  logging: 'dnsproxy:query,dnsproxy:info',
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
  },
  fallback_timeout: 350,
  reload_config: true
}

const config = rc('dnsproxy', defaults)

process.env.DEBUG_FD = process.env.DEBUG_FD || 1
process.env.DEBUG = process.env.DEBUG || config.logging
let d = process.env.DEBUG.split(',')
d.push('dnsproxy:error')
process.env.DEBUG = d.join(',')

const loginfo = require('debug')('dnsproxy:info')
const logdebug = require('debug')('dnsproxy:debug')
const logquery = require('debug')('dnsproxy:query')
const logerror = require('debug')('dnsproxy:error')

if (config.reload_config === true) {
  var configFile = config.config
  fs.watchFile(configFile, function (curr, prev) {
    loginfo('config file changed, reloading config options')
    try {
      config = rc('dnsproxy', defaults)
    } catch (e) {
      logerror('error reloading configuration')
      logerror(e)
    }
  })
}

logdebug('options: %j', config)

const server = dgram.createSocket('udp4')

server.on('listening', function () {
  loginfo('we are up and listening at %s on %s', config.host, config.port)
})

server.on('error', function (err) {
  logerror('udp socket error')
  logerror(err)
})

server.on('message', function (message, rinfo) {
  let returner = false
  let nameserver = config.nameservers[0]

  const query = packet.parse(message)
  const domain = query.question[0].name
  const type = query.question[0].type

  logdebug('query: %j', query)

  Object.keys(config.hosts).forEach(function (h) {
    if (domain === h) {
      let answer = config.hosts[h]
      if (typeof config.hosts[config.hosts[h]] !== 'undefined') {
        answer = config.hosts[config.hosts[h]]
      }

      logquery('type: host, domain: %s, answer: %s, source: %s:%s, size: %d', domain, config.hosts[h], rinfo.address, rinfo.port, rinfo.size)

      let res = util.createAnswer(query, answer)
      server.send(res, 0, res.length, rinfo.port, rinfo.address)

      returner = true
    }
  })

  if (returner) {
    return
  }

  Object.keys(config.domains).forEach(function (s) {
    let sLen = s.length
    let dLen = domain.length

    if (domain.indexOf(s) >= 0 && domain.indexOf(s) === (dLen - sLen)) {
      let answer = config.domains[s]
      if (typeof config.domains[config.domains[s]] !== 'undefined') {
        answer = config.domains[config.domains[s]]
      }

      logquery('type: server, domain: %s, answer: %s, source: %s:%s, size: %d', domain, config.domains[s], rinfo.address, rinfo.port, rinfo.size)

      let res = util.createAnswer(query, answer)
      server.send(res, 0, res.length, rinfo.port, rinfo.address)

      returner = true
    }
  })

  if (returner) {
    return
  }

  Object.keys(config.servers).forEach(function (s) {
    if (domain.indexOf(s) !== -1) {
      nameserver = config.servers[s]
    }
  })

  let fallback
  (function queryns (message, nameserver) {
    const sock = dgram.createSocket('udp4')
    sock.send(message, 0, message.length, 53, nameserver, function () {
      fallback = setTimeout(function () {
        queryns(message, config.nameservers[0])
      }, config.fallback_timeout)
    })
    sock.on('error', function (err) {
      logerror('Socket Error: %s', err)
      process.exit(5)
    })
    sock.on('message', function (response) {
      clearTimeout(fallback)
      logquery('type: primary, nameserver: %s, query: %s, type: %s, answer: %s, source: %s:%s, size: %d', nameserver, domain, util.records[type] || 'unknown', util.listAnswer(response), rinfo.address, rinfo.port, rinfo.size)
      server.send(response, 0, response.length, rinfo.port, rinfo.address)
      sock.close()
    })
  }(message, nameserver))
})

server.bind(config.port, config.host)
