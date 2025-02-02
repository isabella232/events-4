import React, { createContext, useContext, useCallback } from "react"
import useAuthContext from "decentraland-gatsby/dist/context/Auth/useAuthContext"
import useAsyncTasks from "decentraland-gatsby/dist/hooks/useAsyncTasks"
import useAsyncMemo from "decentraland-gatsby/dist/hooks/useAsyncMemo"
import track from "decentraland-gatsby/dist/utils/development/segment"
import Events from "../api/Events"
import { SessionEventAttributes } from "../entities/Event/types"
import { useMemo } from "react"
import { SegmentEvent } from "../modules/segment"
import { EventAttendeeAttributes } from "../entities/EventAttendee/types"
import isUUID from "validator/lib/isUUID"

const defaultProfileSettings = [
  [] as SessionEventAttributes[],
  {
    error: null as Error | null,
    loading: false as boolean,
    approving: [] as string[],
    rejecting: [] as string[],
    restoring: [] as string[],
    attending: [] as string[],
    notifying: [] as string[],
    modifying: new Set<string>(),
    reload: (() => null) as () => void,
    add: (() => null) as (newEvent: SessionEventAttributes) => void,
    approve: (() => null) as (id: string) => void,
    reject: (() => null) as (id: string) => void,
    restore: (() => null) as (id: string) => void,
    attend: (() => null) as (id: string, attending: boolean) => void,
    notify: (() => null) as (id: string, attending: boolean) => void,
  },
] as const

export function useEvents() {
  const [account, accountState] = useAuthContext()
  const [events, eventsState] = useAsyncMemo(
    async () => {
      if (accountState.loading) {
        return []
      }

      return Events.get().getEvents()
    },
    [account, accountState.loading],
    { initialValue: [] as SessionEventAttributes[] }
  )

  const add = useCallback(
    function (newEvent: SessionEventAttributes) {
      eventsState.set((events) => {
        let replaced = false
        const list = events.map((event) => {
          if (event.id === newEvent.id) {
            replaced = true
            return newEvent
          }

          return event
        })

        if (!replaced) {
          list.push(newEvent)
        }

        return list
      })
    },
    [eventsState]
  )

  const updateEventState = useCallback(
    async function (
      id: string,
      changes: Pick<SessionEventAttributes, "approved" | "rejected">
    ) {
      if (!account) {
        return accountState.select()
      }

      const newEvent = await Events.get().updateEvent(id as string, changes)
      track((analytics) =>
        analytics.track(SegmentEvent.EditEvent, { event: newEvent })
      )
      add(newEvent)
    },
    [account, accountState, add]
  )

  const [approving, approve] = useAsyncTasks(
    (id) => updateEventState(id as string, { approved: true, rejected: false }),
    [updateEventState]
  )
  const [rejecting, reject] = useAsyncTasks(
    (id) => updateEventState(id as string, { approved: false, rejected: true }),
    [updateEventState]
  )
  const [restoring, restore] = useAsyncTasks(
    (id) =>
      updateEventState(id as string, { approved: false, rejected: false }),
    [updateEventState]
  )

  const updateAttendee = useCallback(
    async (
      id: string,
      updateAttendee: () => Promise<EventAttendeeAttributes[]>
    ) => {
      if (!account) {
        return accountState.select()
      }

      const event = events.find((event) => event.id === id)
      if (!event) {
        return
      }

      try {
        const ethAddress = account
        const newAttendees = await updateAttendee()
        const newAttendee = newAttendees.find(
          (attendee) => attendee.user === account
        )

        const newEvent = {
          ...event,
          attending: !!newAttendee,
          notify: !!(newAttendee && newAttendee.notify),
          total_attendees: newAttendees.length,
          latest_attendees: newAttendees
            .slice(0, 10)
            .map((attendee) => attendee.user),
        }

        add(newEvent)
        track((analytics) =>
          analytics.track(SegmentEvent.Going, {
            ethAddress,
            eventId: event?.id || null,
            trending: event?.trending || false,
            highlighted: event?.highlighted || false,
          })
        )
        return event
      } catch (error) {
        console.error(error)
        track((analytics) =>
          analytics.track(SegmentEvent.Error, {
            error: (error as any).message,
            eventId: id,
            ...(error as any),
          })
        )
        throw error
      }
    },
    [account, accountState, events, add]
  )

  const [attending, attend] = useAsyncTasks(
    async (id, attending: boolean) => {
      await updateAttendee(id, () =>
        Events.get().setEventAttendee(id, attending)
      )
    },
    [updateAttendee]
  )

  const [notifying, notify] = useAsyncTasks(
    async (id, notify: boolean) => {
      await updateAttendee(id, () =>
        Events.get().updateEventAttendee(id, { notify })
      )
    },
    [updateAttendee]
  )

  const modifying = useMemo(
    () =>
      new Set([
        ...approving,
        ...rejecting,
        ...restoring,
        ...attending,
        ...notifying,
      ]),
    [approving, rejecting, restoring, attending, notifying]
  )

  return [
    events,
    {
      error: eventsState.error,
      loading: eventsState.loading,
      approving,
      rejecting,
      restoring,
      attending,
      notifying,
      modifying,
      reload: eventsState.reload,
      add,
      approve,
      reject,
      restore,
      notify,
      attend,
    },
  ] as const
}

const EventsContext = createContext(defaultProfileSettings)

export default function EventsProvider(props: React.PropsWithChildren<{}>) {
  const events = useEvents()
  return (
    <EventsContext.Provider value={events}>
      {props.children}
    </EventsContext.Provider>
  )
}

export function useEventsContext() {
  return useContext(EventsContext)
}

export function useEventSorter(events: SessionEventAttributes[] = []) {
  return useMemo(() => {
    const now = Date.now()
    return events
      .filter((event) => {
        if (event.rejected) {
          return false
        }

        if (!event.approved && !event.owned && !event.editable) {
          return false
        }

        if (event.finish_at.getTime() < now) {
          return false
        }

        return true
      })
      .sort((a, b) => a.next_start_at.getTime() - b.next_start_at.getTime())
  }, [events])
}

export function useEventIdContext(eventId?: string | null) {
  const [events, state] = useContext(EventsContext)
  return useAsyncMemo(async () => {
    if (!eventId || !isUUID(eventId) || state.loading) {
      return null
    }

    const currentEvent = events.find((event) => event.id === eventId)
    if (currentEvent) {
      return currentEvent
    }

    return Events.get().getEventById(eventId)
  }, [eventId, events, state.loading])
}
