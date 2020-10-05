import fetch from 'isomorphic-fetch'
import { AbortController } from 'abort-controller'
import cache from 'apicache'
import routes from 'decentraland-gatsby/dist/entities/Route/routes'
import handle from 'decentraland-gatsby/dist/entities/Route/handle'
import { CommStatus, Realm, CatalystNode } from './types'
import contract from '../Contracts/catalyst'
import Datetime from 'decentraland-gatsby/dist/utils/Datetime'

export default routes((router) => {
  router.get('/realms', cache.middleware('1 hour'), handle(getRealms))
})

export async function getRealms(): Promise<Realm[]> {
  const nodes = await fetchCatalystNodes()
  // const config: Configuration = await fetch(CONFIGURATION_ENDPOINT).then((response) => response.json())
  const comms: (CommStatus | null)[] = await Promise.all(
    nodes.map((node) => {
      return new Promise<any>((resolve) => {
        const controller = new AbortController
        let completed = false
        function complete(data: any, ...logs: any[]) {
          if (!completed) {
            completed = true
            if (logs.length > 0) {
              console.log(...logs)
            }
            resolve(data)
          }
        }

        setTimeout(() => complete(null, `aborting fetch to "${node.domain}"`, node), 5 * Datetime.Second)

        return fetch(node.domain + '/comms/status?includeLayers=true', { signal: controller.signal })
          .then((response) => response.json())
          .then((data) => complete(data))
          .catch((err: Error) => complete(null, err, node))
      })
    })
  )

  const realms = new Set<string>()

  return comms
    .filter(comm => {
      if (!comm || !comm.ready) {
        return false
      }

      if (realms.has(comm.name)) {
        return false
      }

      realms.add(comm.name)
      return true
    })
    .map((comm, i) => {
      const c = comm as CommStatus
      return {
        id: c.name,
        url: nodes[i].domain,
        layers: c.layers.map(layer => layer.name)
      }
    })
}

export async function fetchCatalystNodes(): Promise<CatalystNode[]> {
  const count = Number.parseInt(await contract.methods.catalystCount().call(), 10)
  const nodes: CatalystNode[] = await Promise.all(Array.from(Array(count), async (_, i) => {
    const ids = await contract.methods.catalystIds(i).call()
    return contract.methods.catalystById(ids).call()
  }))

  return nodes
    .filter((node) => !node.domain.trim().startsWith('http://'))
    .map((node) => {
      node.domain = node.domain.trim()
      if (!node.domain.startsWith('https://')) {
        node.domain = 'https://' + node.domain
      }

      return node
    })
}
