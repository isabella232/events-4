import { Contract, ContractAbi } from 'web3x/contract'
import { Address } from 'web3x/address'
import { ETH } from './utils'
import abi from './catalyst.abi.json'

export const address = Address.fromString('0x4a2f10076101650f40342885b99b6b101d83c486')
export default new Contract(ETH, new ContractAbi(abi as any), address)