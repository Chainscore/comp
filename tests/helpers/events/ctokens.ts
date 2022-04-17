/* eslint-disable prefer-const */ // to satisfy AS compiler

import {
  Mint,
  Redeem,
  Borrow,
  RepayBorrow,
  LiquidateBorrow,
  Transfer,
  AccrueInterest,
  NewReserveFactor,
  NewMarketInterestRateModel,
} from '../../../src/types/templates/CToken/CToken'

import { newMockEvent } from 'matchstick-as'
import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts'

export function newReserveFactor(market: string, newRF: string): NewReserveFactor {
  let newRFEvent = changetype<NewReserveFactor>(newMockEvent())
  newRFEvent.address = Address.fromString(market.toLowerCase())

  let oldReserveFactorMantissaParam = new ethereum.EventParam(
    'oldReserveFactorMantissa',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString('0')),
  )

  let newReserveFactorMantissaParam = new ethereum.EventParam(
    'newReserveFactorMantissa',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(newRF)),
  )
  newRFEvent.parameters = new Array()
  newRFEvent.parameters.push(oldReserveFactorMantissaParam)
  newRFEvent.parameters.push(newReserveFactorMantissaParam)

  return newRFEvent
}

export function newMarketInterestRateModel(
  market: string,
  newIR: string,
): NewMarketInterestRateModel {
  let newIREvent = changetype<NewMarketInterestRateModel>(newMockEvent())
  newIREvent.address = Address.fromString(market.toLowerCase())

  let oldInterestRateModelParam = new ethereum.EventParam(
    'oldInterestRateModel',
    ethereum.Value.fromAddress(
      Address.fromString('0x27720707cc542af3326eaafe2613ec31b40f4947'),
    ),
  )

  let newInterestRateModelParam = new ethereum.EventParam(
    'newInterestRateModel',
    ethereum.Value.fromAddress(Address.fromString(newIR)),
  )

  newIREvent.parameters = new Array()
  newIREvent.parameters.push(oldInterestRateModelParam)
  newIREvent.parameters.push(newInterestRateModelParam)

  return newIREvent
}

export function newMint(
  market: string,
  minter: string,
  mintAmount: string,
  mintTokens: string,
): Mint {
  let newMintEvent = changetype<Mint>(newMockEvent())
  newMintEvent.address = Address.fromString(market.toLowerCase())

  let minterParam = new ethereum.EventParam(
    'minter',
    ethereum.Value.fromAddress(Address.fromString(minter.toLowerCase())),
  )

  let mintAmountParam = new ethereum.EventParam(
    'mintAmount',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(mintAmount)),
  )

  let mintTokensParam = new ethereum.EventParam(
    'mintTokens',
    ethereum.Value.fromUnsignedBigInt(BigInt.fromString(mintTokens)),
  )

  newMintEvent.parameters = new Array()
  newMintEvent.parameters.push(minterParam)
  newMintEvent.parameters.push(mintAmountParam)
  newMintEvent.parameters.push(mintTokensParam)

  return newMintEvent
}
