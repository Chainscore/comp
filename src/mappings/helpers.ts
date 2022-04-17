/* eslint-disable prefer-const */ // to satisfy AS compiler

// For each division by 10, add one to exponent to truncate one significant figure
import { BigDecimal, BigInt, Bytes, Address } from '@graphprotocol/graph-ts'
import {
  AccountCToken,
  Account,
  AccountCTokenTransaction,
  Token,
  Comptroller,
} from '../types/schema'
import { ERC20 } from '../types/templates/CToken/ERC20'

import { ZERO_BD, ONE_BD, ZERO_BI, ONE_BI } from './config'

export function exponentToBigDecimal(decimals: number): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = 0; i < decimals; i++) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

export let mantissaFactor = 18
export let cTokenDecimals = 8
export let mantissaFactorBD: BigDecimal = exponentToBigDecimal(18)
export let cTokenDecimalsBD: BigDecimal = exponentToBigDecimal(cTokenDecimals)

export function createAccountCToken(
  cTokenStatsID: string,
  account: string,
  marketID: string,
): AccountCToken {
  let cTokenStats = new AccountCToken(cTokenStatsID)
  cTokenStats.market = marketID
  cTokenStats.account = account
  cTokenStats.accrualBlockNumber = BigInt.fromI32(0)
  cTokenStats.cTokenBalance = ZERO_BD
  cTokenStats.totalUnderlyingSupplied = ZERO_BD
  cTokenStats.totalUnderlyingRedeemed = ZERO_BD
  cTokenStats.accountBorrowIndex = ZERO_BD
  cTokenStats.totalUnderlyingBorrowed = ZERO_BD
  cTokenStats.totalUnderlyingRepaid = ZERO_BD
  cTokenStats.storedBorrowBalance = ZERO_BD
  cTokenStats.enteredMarket = false

  cTokenStats.supplyBalanceUnderlying = ZERO_BD
  cTokenStats.lifetimeSupplyInterestAccrued = ZERO_BD
  cTokenStats.borrowBalanceUnderlying = ZERO_BD
  cTokenStats.lifetimeBorrowInterestAccrued = ZERO_BD
  return cTokenStats
}

export function createAccount(accountID: string): Account {
  let account = new Account(accountID)
  account.health = ZERO_BD
  account.totalBorrowValueInEth = ZERO_BD
  account.totalCollateralValueInEth = ZERO_BD
  account.save()
  return account
}

export function updateCommonCTokenStats(
  marketID: string,
  accountID: string,
  tx_hash: Bytes,
  timestamp: BigInt,
  blockNumber: BigInt,
  logIndex: BigInt,
): AccountCToken {
  let cTokenStatsID = marketID.concat('-').concat(accountID)
  let cTokenStats = AccountCToken.load(cTokenStatsID)
  if (cTokenStats == null) {
    cTokenStats = createAccountCToken(cTokenStatsID, accountID, marketID)
  }
  getOrCreateAccountCTokenTransaction(
    cTokenStatsID,
    tx_hash,
    timestamp,
    blockNumber,
    logIndex,
  )
  cTokenStats.accrualBlockNumber = blockNumber
  return cTokenStats as AccountCToken
}

export function getOrCreateAccountCTokenTransaction(
  accountID: string,
  tx_hash: Bytes,
  timestamp: BigInt,
  block: BigInt,
  logIndex: BigInt,
): AccountCTokenTransaction {
  let id = accountID
    .concat('-')
    .concat(tx_hash.toHex())
    .concat('-')
    .concat(logIndex.toString())
  let transaction = AccountCTokenTransaction.load(id)

  if (transaction == null) {
    transaction = new AccountCTokenTransaction(id)
    transaction.account = accountID
    transaction.tx_hash = tx_hash
    transaction.timestamp = timestamp
    transaction.block = block
    transaction.logIndex = logIndex
    transaction.save()
  }

  return transaction as AccountCTokenTransaction
}

export function getOrCreateToken(token_id: string): Token {
  let token = Token.load(token_id)

  if (token == null) {
    token = new Token(token_id)
    let tokenContract = ERC20.bind(Address.fromString(token_id))
    let tokenNameResponse = tokenContract.try_name()
    if (tokenNameResponse.reverted) {
      token.name = 'UNKNOWN'
    } else {
      token.name = tokenNameResponse.value
    }

    let tokenSymbolResponse = tokenContract.try_symbol()
    if (tokenSymbolResponse.reverted) {
      token.symbol = 'UNKNOWN'
    } else {
      token.symbol = tokenSymbolResponse.value
    }

    let tokenDecimalsResponse = tokenContract.try_decimals()
    if (tokenDecimalsResponse.reverted) {
      token.decimals = 0
    } else {
      token.decimals = tokenDecimalsResponse.value
    }

    let tokenSupplyResponse = tokenContract.try_totalSupply()
    if (tokenSupplyResponse.reverted) {
      token.totalSupply = ZERO_BD
    } else {
      token.totalSupply = BigDecimal.fromString(tokenSupplyResponse.value.toString())
    }

    token.priceETH = ZERO_BD
    token.priceUSD = ZERO_BD

    token.save()
  }

  return token as Token
}

export function getOrCreateComptroller(addr: string): Comptroller {
  let comptroller = Comptroller.load(addr)
  if (!comptroller) {
    comptroller = new Comptroller(addr)
    comptroller.priceOracle = Address.fromString(
      '0x0000000000000000000000000000000000000000',
    )
  }
  return comptroller
}
