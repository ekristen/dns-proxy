const packet = require('native-dns-packet')

module.exports.records = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  12: 'PTR',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA'
}

module.exports.listAnswer = function (response) {
  const results = []
  const res = packet.parse(response)
  res.answer.map(function (r) {
    results.push(r.address || r.data)
  })
  return results.join(', ') || 'nxdomain'
}

module.exports.createAnswer = function (query, answer) {
  query.header.qr = 1
  query.header.rd = 1
  query.header.ra = 1
  query.answer.push({ name: query.question[0].name, type: 1, class: 1, ttl: 30, address: answer })

  const buf = Buffer.alloc(4096)
  const wrt = packet.write(buf, query)
  const res = buf.slice(0, wrt)

  return res
}
