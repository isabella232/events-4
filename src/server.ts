import express from 'express'
import Manager from 'decentraland-gatsby/dist/entities/Job/job'
import { listen } from 'decentraland-gatsby/dist/entities/Server/utils'
import { status, filesystem } from 'decentraland-gatsby/dist/entities/Route/routes'
import { withDDosProtection, withLogs, withCors, withBody } from 'decentraland-gatsby/dist/entities/Route/middleware'
import database from 'decentraland-gatsby/dist/entities/Database/index'
import profile from 'decentraland-gatsby/dist/entities/Profile/routes'
import metrics from 'decentraland-gatsby/dist/entities/Prometheus/routes'
import handle from 'decentraland-gatsby/dist/entities/Route/handle'
import RequestError from 'decentraland-gatsby/dist/entities/Route/error'
import events from './entities/Event/routes'
import attendees from './entities/EventAttendee/routes'
import social from './entities/Social/routes'
import poster from './entities/Poster/routes'
import realms from './entities/Realm/routes'
import profileSettings, { verifySubscription, removeSubscription } from './entities/ProfileSettings/routes'
import profileSubscription from './entities/ProfileSubscription/routes'
import { SUBSCRIPTION_PATH, UNSUBSCRIBE_PATH } from './entities/ProfileSettings/types'
import { notifyUpcomingEvents, updateNextStartAt } from './entities/Event/cron'

const jobs = new Manager({ concurrency: 10 })
jobs.cron('@eachMinute', notifyUpcomingEvents)
jobs.cron('@eachMinute', updateNextStartAt)

const app = express()
app.set('x-powered-by', false)
app.use(withLogs())
app.use('/api', [
  status(),
  withCors(),
  withDDosProtection(),
  withBody(),
  events,
  poster,
  attendees,
  profileSettings,
  profileSubscription,
  profile,
  realms,
  handle(async () => {
    throw new RequestError('NotFound', RequestError.NotFound)
  })
])

app.get(SUBSCRIPTION_PATH, verifySubscription)
app.get(UNSUBSCRIBE_PATH, removeSubscription)

app.use(metrics)
app.use('/', social)
app.use(filesystem('public', '404.html'))

Promise.resolve()
  .then(() => database.connect())
  .then(() => jobs.start())
  .then(() => listen(
    app,
    process.env.PORT || 4000,
    process.env.HOST
  ))
