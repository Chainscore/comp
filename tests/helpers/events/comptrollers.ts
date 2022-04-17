/* eslint-disable prefer-const */ // to satisfy AS compiler

import { MarketListed } from '../../../src/types/Comptroller/Comptroller'

import { newMockEvent } from 'matchstick-as'
import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts'

export function newMarketEvent(comptroller: string, market: string): MarketListed {
  let newMarketEvent = changetype<MarketListed>(newMockEvent())
  newMarketEvent.address = Address.fromString(comptroller.toLowerCase())

  let cTokenParam = new ethereum.EventParam(
    'cToken',
    ethereum.Value.fromAddress(Address.fromString(market.toLowerCase())),
  )
  newMarketEvent.parameters = new Array()
  newMarketEvent.parameters.push(cTokenParam)

  return newMarketEvent
}
