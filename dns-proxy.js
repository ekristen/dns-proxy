#!/usr/bin/env node

const fs = require('fs')
const rc = require('rc')
const dgram = require('dgram')
const packet = require('native-dns-packet')
const wildcard = require('wildcard2')
const uuid = require('uuid/v4')

const util = require('./util.js')

const defaults = {
  port: 53,
  host: '127.0.0.1',
  logging: 'dnsproxy:query,dnsproxy:info,dnsproxy:debug',
  nameservers: [
    '1.1.1.1',
    '1.0.0.1'
  ],
  servers: {},
  domains: {
    'dev': '127.0.0.1'
  },
  hosts: {
    'devlocal': '127.0.0.1'
  },
  fallback_timeout: 250,
  reload_config: true
}

let config = rc('dnsproxy', defaults)

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

server.on('message', function (topMessage, rinfo) {
  const reqId = uuid();
  
  let returner = false
  let nameserver = config.nameservers[0]

  const query = packet.parse(topMessage)
  const domain = query.question[0].name
  const type = query.question[0].type

  logdebug('req: %s, type: incoming-query, query: %j', reqId, query)

  Object.keys(config.hosts).forEach(function (h) {
    if (domain === h) {
      let answer = config.hosts[h]
      if (typeof config.hosts[config.hosts[h]] !== 'undefined') {
        answer = config.hosts[config.hosts[h]]
      }

      logquery('req: %s, type: host, domain: %s, answer: %s, source: %s:%s, size: %d', reqId, domain, config.hosts[h], rinfo.address, rinfo.port, rinfo.size)

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

    if ((domain.indexOf(s) >= 0 && domain.indexOf(s) === (dLen - sLen)) || wildcard(domain, s)) {
      let answer = config.domains[s]
      if (typeof config.domains[config.domains[s]] !== 'undefined') {
        answer = config.domains[config.domains[s]]
      }

      logquery('req: %s, type: server, domain: %s, answer: %s, source: %s:%s, size: %d', reqId, domain, config.domains[s], rinfo.address, rinfo.port, rinfo.size)

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
  let nameParts = nameserver.split(':')
  nameserver = nameParts[0]
  let port = nameParts[1] || 53
  let fallback

  function queryns (queryMessage, nameserver, isFallback) {
    const query = packet.parse(queryMessage)
    logdebug("req: %s, type: queryns, query: %j, fallback: %s, nameserver: %s", reqId, query, isFallback, nameserver)
    const sock = dgram.createSocket('udp4')
    sock.send(queryMessage, 0, queryMessage.length, port, nameserver, function () {
      fallback = setTimeout(function () {
        queryns(queryMessage, config.nameservers[0], true)
      }, config.fallback_timeout)
    })
    sock.on('error', function (err) {
      logerror('Socket Error: %s', err)
      process.exit(5)
    })
    sock.on('message', function (queryResponse) {
      logdebug("req: %s, type: query-on-message, fallback: %s, response: %s", reqId, isFallback, util.listAnswer(queryResponse))

      clearTimeout(fallback)
      logquery('req: %s, type: primary, nameserver: %s, fallback: %s, query: %s, type: %s, answer: %s, source: %s:%s, size: %d', reqId, nameserver, isFallback, domain, util.records[type] || 'unknown', util.listAnswer(queryResponse), rinfo.address, rinfo.port, rinfo.size)
      server.send(queryResponse, 0, queryResponse.length, rinfo.port, rinfo.address)
      sock.close()
    })
  }

  queryns(topMessage, nameserver, false)
})

server.bind(config.port, config.host)
