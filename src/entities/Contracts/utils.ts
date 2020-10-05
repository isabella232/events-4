import { parse } from 'url'
import { Eth } from 'web3x/eth/eth';
import { HttpProvider, WebsocketProvider } from 'web3x/providers'

const ETHEREUM_ENDPOINT = `wss://mainnet.infura.io/ws/v3/1da6448958b2444f956aed19030a53e7`

export function getCurrentProvider() {
  const url = parse(ETHEREUM_ENDPOINT)
  switch (url.protocol) {
    case 'wss:':
      return new WebsocketProvider(ETHEREUM_ENDPOINT);

    case 'https:':
      return new HttpProvider(ETHEREUM_ENDPOINT)

    default:
      throw new Error(`Invalid ethereum endpoint`);
  }
}

export function getCurrentEth() {
  const provider = getCurrentProvider()
  return new Eth(provider)
}

export const ETH = getCurrentEth()