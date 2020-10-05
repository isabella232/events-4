import { Contract, ContractAbi } from 'web3x/contract'
import { Address } from 'web3x/address'
import { ETH } from './utils'
import abi from './poi.abi.json'

export const address = Address.fromString('0x0ef15a1c7a49429a36cb46d4da8c53119242b54e')
export const topic = '0x642fae9d0bdca764daf250fc90831d6e88318a4ce78836d46fbbf63c282c6c20'
export default new Contract(ETH, new ContractAbi(abi as any), address)
