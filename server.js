var opts  = require('rc')('dnsproxy', {
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
  },
  fallback_timeout: 350
});

process.env.DEBUG_FD = process.env.DEBUG_FD || 1;
process.env.DEBUG = process.env.DEBUG || opts.logging;
var d = process.env.DEBUG.split(',')
d.push('dnsproxy:error')
process.env.DEBUG=d.join(',');

var dgram = require('dgram');
var packet = require('native-dns-packet');
var util = require('./util.js');

var logdebug = require('debug')('dnsproxy:debug');
var logquery = require('debug')('dnsproxy:query');
var logerror = require('debug')('dnsproxy:error');

logdebug('options: %j', opts);

var server = dgram.createSocket('udp4');

server.on('error', function(err) {
  logerror('Server Error: %s', err);
});



server.on('message', function (message, rinfo) {
  var nameserver = opts.nameservers[0];
  var returner = false;
  var use_failover = false;

  var query = packet.parse(message);
  var domain = query.question[0].name;
  var type = query.question[0].type

  logdebug('query: %j', query);

  Object.keys(opts.domains).forEach(function(s) {
    var s_len = s.length;
    var d_len = domain.length;

    if (domain.indexOf(s) >= 0 && domain.indexOf(s) == (d_len - s_len)) {

      var return_ip=opts.domains[h];
      if(!opts.hosts[h].match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
          if(typeof(opts.cnames[opts.domains[h]]) != "undefined") {
            return_ip=opts.cnames[opts.domains[h]];
            console.log(opts.cnames[opts.domains[h]]);
          } else {
            return;
          }
      } 

      logquery('type: server, domain: %s, answer: %s', domain, return_ip);

      var res = util.createAnswer(query, return_ip);
      server.send(res, 0, res.length, rinfo.port, rinfo.address);

      returner = true;
    }
  });
  
  if (returner) return;

  Object.keys(opts.hosts).forEach(function(h) {
    if (domain == h) {
      var return_ip=opts.hosts[h];
      if(!opts.hosts[h].match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
          if(typeof(opts.cnames[opts.hosts[h]]) != "undefined") {
            return_ip=opts.cnames[opts.hosts[h]];
            console.log(opts.cnames[opts.hosts[h]]);
          } else {
            return;
          }
      } 
      logquery('type: host, domain: %s, answer: %s', domain, return_ip);

      var res = util.createAnswer(query, return_ip);
      server.send(res, 0, res.length, rinfo.port, rinfo.address);

      returner = true;
    }
  });

  if (returner) return;


  Object.keys(opts.wildcards).forEach(function(h) {
    if (domain.match(h)) {
      var return_ip=opts.wildcards[h];
      if(!opts.wildcards[h].match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
          if(typeof(opts.cnames[opts.wildcards[h]]) != "undefined") {
            return_ip=opts.cnames[opts.wildcards[h]];
            console.log(opts.cnames[opts.wildcards[h]]);
          } else {
            return;
          }
      } 
      logquery('type: wildcard, domain: %s, answer: %s', domain, return_ip);

      var res = util.createAnswer(query, return_ip);
      server.send(res, 0, res.length, rinfo.port, rinfo.address);

      returner = true;
    }
  });

  if (returner) return;




  Object.keys(opts.servers).forEach(function(s) {
    if (domain.indexOf(s) !== -1)
      nameserver = opts.servers[s]
  });

  var fallback;
  !function queryns(message, nameserver) {
    var sock = dgram.createSocket('udp4');
    sock.send(message, 0, message.length, 53, nameserver, function() {
      fallback = setTimeout(function() {
        queryns(message, opts.nameservers[0])
      }, opts.fallback_timeout);
    });
    sock.on('error', function(err) {
      logerror('Socket Error: %s', err);
    });
    sock.on('message', function(response) {
      clearTimeout(fallback);
      logquery('type: primary, nameserver: %s, query: %s, type: %s, answer: %s', nameserver, domain, util.records[type] || 'unknown', util.listAnswer(response))
      server.send(response, 0, response.length, rinfo.port, rinfo.address);
      sock.close();
    });
  }(message, nameserver);
  
});

server.bind(opts.port, opts.host);
