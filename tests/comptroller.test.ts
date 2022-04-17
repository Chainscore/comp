import {
  clearStore,
  test,
  assert,
  newMockEvent,
  createMockedFunction,
} from 'matchstick-as/assembly/index'
import { Comptroller } from '../src/types/schema'
import { NewCloseFactor } from '../src/types/Comptroller/Comptroller'

import { getOrCreateComptroller } from '../src/mappings/helpers'
import { handleMarketListed } from '../src/mappings/comptroller'
import { createMarket } from '../src/mappings/markets'

import { ethereum, Address } from '@graphprotocol/graph-ts'
import { MarketListed } from '../src/types/Comptroller/Comptroller'

import { init } from './helpers/utils'
import {
  newMarketInterestRateModel,
  newMint,
  newReserveFactor,
} from './helpers/events/ctokens'
import { newMarketEvent } from './helpers/events/comptrollers'

import {
  handleMint,
  handleNewMarketInterestRateModel,
  handleNewReserveFactor,
} from '../src/mappings/ctoken'
import { log } from 'matchstick-as/assembly/log'

const Comptroller1 = '0x0eD6a1F7a99E8Bc1c752E4515f7AB3aFe20BdBF7'.toLowerCase()
const Market = '0xc98F11DAAAC76D3ef368fDF54fbbA34FfD951976'.toLowerCase()
const EthMarket = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5'.toLowerCase()
const Underlying1 = '0xB5D8d01aCf4C0869D481BBE6520FFBA05aA70000'.toLowerCase()
const Underlying2 = '0xa98dB2Ea8dc5f31Bd08Be4E855912BBAd16fA000'.toLowerCase()
const interestRateModel = '0xef0881ec094552b2e128cf945ef17a6752b4ec5d'.toLowerCase()

const User1 = '0x502cb8985b2c92a8d4bf309cdaa89de9be442708'.toLowerCase()

// Market1: cToken = 0x776e67767D36819dD7b200CBcFC3b8be3b270000 || Underlying = 0xB5D8d01aCf4C0869D481BBE6520FFBA05aA70000
// Market2: cToken = 0x2731DD2F3Dc439D0EC9ed4FcFf8deF7F4B288000 || Underlying = 0xa98dB2Ea8dc5f31Bd08Be4E855912BBAd16fA000
init([Market, EthMarket], [Underlying1, Underlying2])

test('can create comptroller and market', () => {
  // Call mappings
  let market1 = newMarketEvent(Comptroller1, Market)
  let market2 = newMarketEvent(Comptroller1, EthMarket)

  handleMarketListed(market1)
  handleMarketListed(market2)

  assert.fieldEquals('Market', Market, 'token', Market)
  assert.fieldEquals('Market', Market, 'comptroller', Comptroller1)

  assert.fieldEquals('Market', EthMarket, 'token', EthMarket)
  assert.fieldEquals('Market', EthMarket, 'comptroller', Comptroller1)
  //   clearStore()
})

test('can set new reserve factor', () => {
  let newReserve = newReserveFactor(Market, '100')

  handleNewReserveFactor(newReserve)

  assert.fieldEquals('Market', Market, 'reserveFactor', '100')
})

test('can set new interest rate', () => {
  let newReserve = newMarketInterestRateModel(Market, interestRateModel)

  handleNewMarketInterestRateModel(newReserve)

  assert.fieldEquals('Market', Market, 'interestRateModelAddress', interestRateModel)
})

test('can mint', () => {
  let mint = newMint(Market, User1, '10000000000000000', '50000000')

  handleMint(mint)

  assert.fieldEquals('Account', User1, 'id', User1)
})
