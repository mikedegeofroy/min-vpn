import path from 'path'
import { fileURLToPath } from 'url';

import { WgConfig } from 'wireguard-tools'

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '/configs', '/wg0.conf')
const filePath2 = path.join(__dirname, '/configs', '/client1.conf')

import { publicIpv4 } from 'public-ip';

const port = 54210

// const endpoint = await publicIpv4() + ":" + port
const endpoint = "192.168.64.2:58468"

const server = new WgConfig({ filePath })
await server.parseFile()

const client = new WgConfig({
    wgInterface: { address: ['10.10.1.2'] },
    filePath: filePath2,
})

server.wgInterface.name = 'Min-Vpn Server'

server.wgInterface.postUp = ['iptables -A FORWARD -i enp0s2 -o wg0 -j ACCEPT; iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o enp0s2 -j MASQUERADE; ip6tables -A FORWARD -i wg0 -j ACCEPT; ip6tables -t nat -A POSTROUTING -o enp0s2 -j MASQUERADE']

server.wgInterface.postDown = ['iptables -D FORWARD -i enp0s2 -o wg0 -j ACCEPT; iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o enp0s2 -j MASQUERADE; ip6tables -D FORWARD -i wg0 -j ACCEPT; ip6tables -t nat -D POSTROUTING -o enp0s2 -j MASQUERADE']

server.wgInterface.listenPort = port

server.wgInterface.endpoint = endpoint


await Promise.all([
    server.generateKeys({ preSharedKey: true }),
    client.generateKeys({ preSharedKey: true })
])

// server.addPeer(client)

server.addPeer(client.createPeer({
    allowedIps: ['10.10.1.1/32'],
    preSharedKey: server.preSharedKey,
}))

client.addPeer(server.createPeer({
    allowedIps: ['0.0.0.0/0'],
    preSharedKey: server.preSharedKey,
    endpoint: endpoint
}))

client.writeToFile()
await server.writeToFile()

console.log(client)

await server.save()
