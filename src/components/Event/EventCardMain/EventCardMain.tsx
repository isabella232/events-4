import React from 'react'
import { navigate } from 'gatsby'
import { useLocation } from '@reach/router'
import { Card } from 'decentraland-ui/dist/components/Card/Card'
import ImgFixed from 'decentraland-gatsby/dist/components/Image/ImgFixed'
import TokenList from 'decentraland-gatsby/dist/utils/TokenList'
import EventDetail from '../EventModal/EventDetail/EventDetail'
import { EventAttributes } from '../../../entities/Event/types'
import url from '../../../utils/url'

import './EventCardMain.css'

export type EventCardMainProps = {
  event: EventAttributes
}

export default function EventCardMain(props: EventCardMainProps) {
  const event = props.event
  const location = useLocation()
  function handleOpenEvent(e: React.MouseEvent<any>) {
    e.preventDefault()
    navigate(url.toEvent(location, event.id))
  }
  return (
    <Card key={event.id} link className={TokenList.join(['EventCardMain'])} href={url.toEvent(location, event.id)} onClick={handleOpenEvent}>
      <ImgFixed src={event.image} dimension="wide" />
      <EventDetail event={event} hideImage hideDescription hideEdit hideDate />
    </Card>)
}