const { scripts, ConfigManager } = require("@openzeppelin/cli")
const { add, push, create } = scripts
const {publicKey} = require("../privatekey")

const config = require("../config")

const GTRXToken = artifacts.require("GTRXToken")
const GTRXTeamLock = artifacts.require("GTRXTeamLock")
const GTRXStakingFund = artifacts.require("GTRXStakingFund")
const GTRXStaking = artifacts.require("GTRXStaking")
const GTRXPromoFund = artifacts.require("GTRXPromoFund")
const GTRXDaoLock = artifacts.require("GTRXDaoLock")
const GTRXCertifiedPresaleTimer = artifacts.require("GTRXCertifiedPresaleTimer")
const GTRXCertifiedPresale = artifacts.require("GTRXCertifiedPresale")

async function initialize(accounts,networkName) {
  let owner = accounts[0]

  const tokenParams = config.GTRXToken
  const teamlockParams = config.GTRXTeamLock
  const stakingFundParams = config.GTRXStakingFund
  const stakingParams = config.GTRXStaking
  const promoParams = config.GTRXPromoFund
  const daolockParams = config.GTRXDaoLock
  const timerParams = config.GTRXPresaleTimer
  const presaleParams = config.GTRXPresale

  const GTRXToken =   await GTRXToken.deployed()
  const GTRXTeamLock = await GTRXTeamLock.deployed()
  const GTRXStakingFund = await GTRXStakingFund.deployed()
  const GTRXStaking = await GTRXStaking.deployed()
  const GTRXPromoFund = await GTRXPromoFund.deployed()
  const GTRXDaoLock = await GTRXDaoLock.deployed()
  const GTRXCertifiedPresaleTimer = await GTRXCertifiedPresaleTimer.deployed()
  const GTRXCertifiedPresale = await GTRXCertifiedPresale.deployed()

  await Promise.all([
    GTRXToken.initialize(
      tokenParams.name,
      tokenParams.symbol,
      tokenParams.decimals,
      owner,
      tokenParams.taxBP,
      tokenParams.daoTaxBP,
      GTRXDaoLock.address,
      GTRXStaking.address,
      GTRXCertifiedPresale.address
    ),
    GTRXTeamLock.initialize(
      teamlockParams.releaseInterval,
      teamlockParams.releaseBP,
      teamlockParams.addresses,
      teamlockParams.basisPoints,
      GTRXToken.address
    ),
    GTRXStakingFund.initialize(
      stakingFundParams.authorizor,
      stakingFundParams.releaser,
      GTRXToken.address
    ),
    GTRXStaking.initialize(
      stakingParams.stakingTaxBP,
      stakingParams.unstakingTaxBP,
      owner,
      GTRXToken.address
    ),
    GTRXPromoFund.initialize(
      promoParams.authorizor,
      promoParams.releaser,
      GTRXToken.address
    ),
    GTRXDaoLock.initialize(
      daolockParams.releaseInterval,
      daolockParams.releaseBP,
      owner,
      GTRXToken.address
    ),
    GTRXCertifiedPresaleTimer.initialize(
      timerParams.startTime,
      timerParams.baseTimer,
      timerParams.deltaTimer,
      owner
    )
  ])
  await GTRXToken.addMinter(GTRXCertifiedPresale.address)
  await GTRXCertifiedPresale.initialize(
    presaleParams.maxBuyPerAddressBase,
    presaleParams.maxBuyPerAddressBP,
    presaleParams.maxBuyWithoutWhitelisting,
    presaleParams.redeemBP,
    presaleParams.redeemInterval,
    presaleParams.referralBP,
    presaleParams.startingPrice,
    presaleParams.multiplierPrice,
    owner,
    GTRXCertifiedPresaleTimer.address,
    GTRXToken.address
  )
  await Promise.all([
    GTRXCertifiedPresale.setEtherPools(
      [
        GTRXPromoFund.address,
        GTRXTeamLock.address
      ],
      [
        presaleParams.etherPools.promoFund,
        presaleParams.etherPools.teamFund
      ]
    ),
    GTRXCertifiedPresale.setTokenPools(
      [
        GTRXPromoFund.address,
        GTRXStakingFund.address,
        GTRXTeamLock.address,
        GTRXDaoLock.address
      ],
      [
        presaleParams.tokenPools.promoFund,
        presaleParams.tokenPools.stakingFund,
        presaleParams.tokenPools.teamFund,
        presaleParams.tokenPools.daoFund
      ]
    )
  ])
}

module.exports = function(deployer, networkName, accounts) {
  deployer.then(async () => {
    await initialize(accounts,networkName)
  })
}
