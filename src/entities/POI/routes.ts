import { hexToAscii } from 'web3x/utils'
import cache from 'apicache'
import routes from 'decentraland-gatsby/dist/entities/Route/routes'
import handle from 'decentraland-gatsby/dist/entities/Route/handle'
import { address, topic } from '../Contracts/poi'
import { ETH } from '../Contracts/utils'
import Land from 'decentraland-gatsby/dist/utils/api/Land'

export default routes((router) => {
  router.get('/pois', cache.middleware('1 hour'), handle(getPOIs))
})

export async function getPOIs(): Promise<any[]> {
  const poiEvents = await ETH.getPastLogs({ fromBlock: 0, address, topics: [ topic ]})
  const pois = await poiEvents.map((event) => hexToAscii('0x' + event.data.substr(-64)).split(',').map(Number))
  return Promise.all(pois.map(async ([x, y]) => {
    const position: [ number, number ] = [ x, y ]
    const data = await Land.get().getMapContent(position, position)
    const parcel = data?.assets?.parcels && data?.assets?.parcels[0] || null
    const estate = data?.assets?.estates && data?.assets?.estates[0] || null
    return { position, estate, parcel }
  }))
}