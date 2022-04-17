/* eslint-disable prefer-const */ // to satisfy AS compiler

// For each division by 10, add one to exponent to truncate one significant figure
import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { Market, Comptroller, Token } from '../types/schema'
// PriceOracle is valid from Comptroller deployment until block 8498421
import { PriceOracle } from '../types/templates/CToken/PriceOracle'
// PriceOracle2 is valid from 8498422 until present block (until another proxy upgrade)
import { PriceOracle2 } from '../types/templates/CToken/PriceOracle2'
import { ERC20 } from '../types/templates/CToken/ERC20'
import { CToken } from '../types/templates/CToken/CToken'

import {
  exponentToBigDecimal,
  mantissaFactor,
  mantissaFactorBD,
  cTokenDecimalsBD,
  getOrCreateToken,
  getOrCreateComptroller,
} from './helpers'
import { ONE_BD, ZERO_BD } from './config'

let cUSDCAddress = '0x39aa39c021dfbae8fac545936693ac917d5e7563'
let cETHAddress = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5'
let daiAddress = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359'

let mainComptroller = '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B'
// Used for all cERC20 contracts
function getTokenPrice(
  blockNumber: number,
  eventAddress: Address,
  underlyingAddress: Address,
  underlyingDecimals: number,
): BigDecimal {
  let comptroller = getOrCreateComptroller(mainComptroller)
  let oracleAddress = changetype<Address>(comptroller.priceOracle)
  let underlyingPrice: BigDecimal
  let priceOracle1Address = Address.fromString(
    '0x02557a5e05defeffd4cae6d83ea3d173b272c904',
  )

  /* PriceOracle2 is used at the block the Comptroller starts using it.
   * see here https://etherscan.io/address/0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b#events
   * Search for event topic 0xd52b2b9b7e9ee655fcb95d2e5b9e0c9f69e7ef2b8e9d2d0ea78402d576d22e22,
   * and see block 7715908.
   *
   * This must use the cToken address.
   *
   * Note this returns the value without factoring in token decimals and wei, so we must divide
   * the number by (ethDecimals - tokenDecimals) and again by the mantissa.
   * USDC would be 10 ^ ((18 - 6) + 18) = 10 ^ 30
   *
   * Note that they deployed 3 different PriceOracles at the beginning of the Comptroller,
   * and that they handle the decimals different, which can break the subgraph. So we actually
   * defer to Oracle 1 before block 7715908, which works,
   * until this one is deployed, which was used for 121 days */
  if (blockNumber > 7715908) {
    let mantissaDecimalFactor = 18 - underlyingDecimals + 18
    let bdFactor = exponentToBigDecimal(mantissaDecimalFactor)
    let oracle2 = PriceOracle2.bind(oracleAddress)
    let tryPrice = oracle2.try_getUnderlyingPrice(eventAddress)

    underlyingPrice = tryPrice.reverted
      ? ZERO_BD
      : tryPrice.value.toBigDecimal().div(bdFactor)

    /* PriceOracle(1) is used (only for the first ~100 blocks of Comptroller. Annoying but we must
     * handle this. We use it for more than 100 blocks, see reason at top of if statement
     * of PriceOracle2.
     *
     * This must use the token address, not the cToken address.
     *
     * Note this returns the value already factoring in token decimals and wei, therefore
     * we only need to divide by the mantissa, 10^18 */
  } else {
    let oracle1 = PriceOracle.bind(priceOracle1Address)
    underlyingPrice = oracle1
      .getPrice(underlyingAddress)
      .toBigDecimal()
      .div(mantissaFactorBD)
  }
  return underlyingPrice
}

// Returns the price of USDC in eth. i.e. 0.005 would mean ETH is $200
function getUSDCpriceETH(blockNumber: number): BigDecimal {
  let comptroller = getOrCreateComptroller(mainComptroller)
  let oracleAddress = changetype<Address>(comptroller.priceOracle)
  let priceOracle1Address = Address.fromString(
    '0x02557a5e05defeffd4cae6d83ea3d173b272c904',
  )
  let USDCAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 '
  let usdPrice: BigDecimal

  // See notes on block number if statement in getTokenPrices()
  if (blockNumber > 7715908) {
    let oracle2 = PriceOracle2.bind(oracleAddress)
    let mantissaDecimalFactorUSDC = 18 - 6 + 18
    let bdFactorUSDC = exponentToBigDecimal(mantissaDecimalFactorUSDC)
    let tryPrice = oracle2.try_getUnderlyingPrice(Address.fromString(cUSDCAddress))

    usdPrice = tryPrice.reverted
      ? ZERO_BD
      : tryPrice.value.toBigDecimal().div(bdFactorUSDC)
  } else {
    let oracle1 = PriceOracle.bind(priceOracle1Address)
    usdPrice = oracle1
      .getPrice(Address.fromString(USDCAddress))
      .toBigDecimal()
      .div(mantissaFactorBD)
  }
  return usdPrice
}

export function createMarket(marketAddress: string): Market {
  let market = new Market(marketAddress)
  let contract = CToken.bind(Address.fromString(marketAddress))
  let ctoken = getOrCreateToken(marketAddress)

  let underlying: Token

  // It is CETH, which has a slightly different interface
  if (marketAddress == cETHAddress) {
    underlying = new Token('0x0000000000000000000000000000000000000000')

    underlying.decimals = 18
    underlying.priceETH = BigDecimal.fromString('1')
    underlying.name = 'Ether'
    underlying.symbol = 'ETH'
    underlying.priceUSD = ZERO_BD
    // It is all other CERC20 contracts
  } else {
    let underlyingAddressCall = contract.try_underlying()
    if (underlyingAddressCall.reverted) {
      log.info('***CALL FAILED*** : cToken underlying() reverted', [market.id])
      return market
    }
    underlying = getOrCreateToken(underlyingAddressCall.value.toHex())
    if (marketAddress == cUSDCAddress) underlying.priceUSD = BigDecimal.fromString('1')
  }

  underlying.save()

  market.underlying = underlying.id
  market.token = ctoken.id

  let interestRateModelAddress = contract.try_interestRateModel()
  let reserveFactor = contract.try_reserveFactorMantissa()

  market.borrowRate = ZERO_BD
  market.cash = ZERO_BD
  market.collateralFactor = ZERO_BD
  market.exchangeRate = ZERO_BD
  market.interestRateModelAddress = interestRateModelAddress.reverted
    ? Address.fromString('0x0000000000000000000000000000000000000000')
    : interestRateModelAddress.value

  market.reserves = ZERO_BD
  market.supplyRate = ZERO_BD
  market.totalBorrows = ZERO_BD

  ctoken.name = contract.name()
  ctoken.symbol = contract.symbol()
  ctoken.totalSupply = ZERO_BD

  market.accrualBlockNumber = 0
  market.blockTimestamp = 0
  market.borrowIndex = ZERO_BD
  market.reserveFactor = reserveFactor.reverted ? BigInt.fromI32(0) : reserveFactor.value

  market.save()

  return market
}

// Only to be used after block 10678764, since it's aimed to fix the change to USD based price oracle.
function getETHinUSD(): BigDecimal {
  let comptroller = Comptroller.load(mainComptroller)!
  let oracleAddress = comptroller.priceOracle as Address
  let oracle = PriceOracle2.bind(oracleAddress)
  let tryPrice = oracle.try_getUnderlyingPrice(Address.fromString(cETHAddress))

  let ethPriceInUSD = tryPrice.reverted
    ? ZERO_BD
    : tryPrice.value.toBigDecimal().div(mantissaFactorBD)

  return ethPriceInUSD
}

export function updateMarket(
  marketAddress: Address,
  blockNumber: i32,
  blockTimestamp: i32,
): Market {
  let marketID = marketAddress.toHex()
  let market = Market.load(marketID)
  if (market == null) {
    market = createMarket(marketID)
  }

  let underlying = getOrCreateToken(market.underlying)
  let ctoken = getOrCreateToken(market.token)

  // Only updateMarket if it has not been updated this block
  if (market.accrualBlockNumber != blockNumber) {
    let contractAddress = Address.fromString(market.id)
    let contract = CToken.bind(contractAddress)

    // After block 10678764 price is calculated based on USD instead of ETH
    if (blockNumber > 10678764) {
      let ethPriceInUSD = getETHinUSD()
      // if cETH, we only update USD price
      if (market.id == cETHAddress) {
        underlying.priceUSD = ethPriceInUSD.truncate(underlying.decimals)
        underlying.priceETH = ONE_BD
      } else {
        let tokenPriceUSD = getTokenPrice(
          blockNumber,
          contractAddress,
          Address.fromString(underlying.id.toString()),
          underlying.decimals,
        )
        if (ethPriceInUSD.gt(ZERO_BD)) {
          underlying.priceUSD = tokenPriceUSD
            .div(ethPriceInUSD)
            .truncate(underlying.decimals)
        }

        // if USDC, we only update ETH price
        if (market.id != cUSDCAddress) {
          underlying.priceUSD = tokenPriceUSD.truncate(underlying.decimals)
        }
      }
    } else {
      let usdPriceInEth = getUSDCpriceETH(blockNumber)

      // if cETH, we only update USD price
      if (market.id == cETHAddress) {
        if (usdPriceInEth.gt(ZERO_BD)) {
          underlying.priceUSD = underlying.priceETH
            .div(usdPriceInEth)
            .truncate(underlying.decimals)
        }
      } else {
        let tokenPriceEth = getTokenPrice(
          blockNumber,
          contractAddress,
          Address.fromString(underlying.id.toString()),
          underlying.decimals,
        )
        underlying.priceETH = tokenPriceEth.truncate(underlying.decimals)
        // if USDC, we only update ETH price
        if (market.id != cUSDCAddress) {
          if (usdPriceInEth.gt(ZERO_BD)) {
            underlying.priceUSD = underlying.priceETH
              .div(usdPriceInEth)
              .truncate(underlying.decimals)
          }
        }
      }
    }

    let bnCall = contract.try_accrualBlockNumber()
    if (bnCall.reverted) {
      market.accrualBlockNumber = 0
    } else {
      market.accrualBlockNumber = bnCall.value.toI32()
    }

    market.blockTimestamp = blockTimestamp

    ctoken.totalSupply = contract
      .totalSupply()
      .toBigDecimal()
      .div(cTokenDecimalsBD)

    /* Exchange rate explanation
       In Practice
        - If you call the cDAI contract on etherscan it comes back (2.0 * 10^26)
        - If you call the cUSDC contract on etherscan it comes back (2.0 * 10^14)
        - The real value is ~0.02. So cDAI is off by 10^28, and cUSDC 10^16
       How to calculate for tokens with different decimals
        - Must div by tokenDecimals, 10^market.underlyingDecimals
        - Must multiply by ctokenDecimals, 10^8
        - Must div by mantissa, 10^18
     */
    market.exchangeRate = contract
      .exchangeRateStored()
      .toBigDecimal()
      .div(exponentToBigDecimal(underlying.decimals))
      .times(cTokenDecimalsBD)
      .div(mantissaFactorBD)
      .truncate(mantissaFactor)

    ctoken.priceETH = market.exchangeRate.times(underlying.priceETH)
    ctoken.priceUSD = market.exchangeRate.times(underlying.priceUSD)

    market.borrowIndex = contract
      .borrowIndex()
      .toBigDecimal()
      .div(mantissaFactorBD)
      .truncate(mantissaFactor)
    market.reserves = contract
      .totalReserves()
      .toBigDecimal()
      .div(exponentToBigDecimal(underlying.decimals))
      .truncate(underlying.decimals)
    market.totalBorrows = contract
      .totalBorrows()
      .toBigDecimal()
      .div(exponentToBigDecimal(underlying.decimals))
      .truncate(underlying.decimals)
    market.cash = contract
      .getCash()
      .toBigDecimal()
      .div(exponentToBigDecimal(underlying.decimals))
      .truncate(underlying.decimals)

    // Must convert to BigDecimal, and remove 10^18 that is used for Exp in Compound Solidity
    market.borrowRate = contract
      .borrowRatePerBlock()
      .toBigDecimal()
      .times(BigDecimal.fromString('2102400'))
      .div(mantissaFactorBD)
      .truncate(mantissaFactor)

    // This fails on only the first call to cZRX. It is unclear why, but otherwise it works.
    // So we handle it like this.
    let supplyRatePerBlock = contract.try_supplyRatePerBlock()
    if (supplyRatePerBlock.reverted) {
      log.info('***CALL FAILED*** : cERC20 supplyRatePerBlock() reverted', [])
      market.supplyRate = ZERO_BD
    } else {
      market.supplyRate = supplyRatePerBlock.value
        .toBigDecimal()
        .times(BigDecimal.fromString('2102400'))
        .div(mantissaFactorBD)
        .truncate(mantissaFactor)
    }

    market.save()
    ctoken.save()
    underlying.save()
  }
  return market as Market
}
