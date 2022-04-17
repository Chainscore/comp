import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts'
import { createMockedFunction } from 'matchstick-as'

export function init(markets: string[], underlying: string[]): void {
  for (let i = 0; i < markets.length; i++) {
    createMockedFunction(
      Address.fromString(markets[i].toLowerCase()),
      'underlying',
      'underlying():(address)',
    )
      .withArgs([])
      .returns([ethereum.Value.fromAddress(Address.fromString(underlying[i].toString()))])

    createMockedFunction(
      Address.fromString(markets[i].toLowerCase()),
      'interestRateModel',
      'interestRateModel():(address)',
    )
      .withArgs([])
      .returns([ethereum.Value.fromAddress(Address.fromString(underlying[i].toString()))])

    createMockedFunction(
      Address.fromString(markets[i].toLowerCase()),
      'reserveFactorMantissa',
      'reserveFactorMantissa():(uint256)',
    )
      .withArgs([])
      .returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromString('0'))])

    initToken(markets[i], 'cToken'.concat(i.toString()), 'c'.concat(i.toString()), 6, 0)
    initToken(underlying[i], 'Token'.concat(i.toString()), i.toString(), 18, 10000000)
  }
}

function initToken(
  token: string,
  name: string,
  symbol: string,
  decimals: i32,
  totalSupply: i32,
): void {
  createMockedFunction(Address.fromString(token), 'name', 'name():(string)')
    .withArgs([])
    .returns([ethereum.Value.fromString(name)])

  createMockedFunction(Address.fromString(token), 'symbol', 'symbol():(string)')
    .withArgs([])
    .returns([ethereum.Value.fromString(symbol)])

  createMockedFunction(Address.fromString(token), 'decimals', 'decimals():(uint8)')
    .withArgs([])
    .returns([ethereum.Value.fromI32(decimals)])

  createMockedFunction(
    Address.fromString(token),
    'totalSupply',
    'totalSupply():(uint256)',
  )
    .withArgs([])
    .returns([ethereum.Value.fromI32(totalSupply)])
}
