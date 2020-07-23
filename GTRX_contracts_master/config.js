const { ether, BN } = require("@openzeppelin/test-helpers")

let config = {}

config.GTRXToken = {
  name:"Grid Trade",
  symbol:"GTRX",
  decimals:18,
  taxBP:190,
  daoTaxBP:10
}

config.GTRXStaking = {
  stakingTaxBP: 0,
  unstakingTaxBP: 200,
  startTime: 1593918000
}

config.GTRXPresale = {
  maxBuyPerAddressBase: ether("10"),
  maxBuyPerAddressBP: 200,
  maxBuyWithoutWhitelisting: ether("1"),
  redeemBP: 200,
  redeemInterval: 3600,
  referralBP: 250,
  startingPrice: ether("0.00002"),
  multiplierPrice: new BN("600000"),
  etherPools: {
    promoFund: 500,
    teamFund: 2000
  },
  tokenPools: {
    promoFund: 500,
    stakingFund: 900,
    teamFund: 1000,
    daoFund: 2000
  }
}

config.GTRXPresaleTimer = {
  startTime: 1595383200,
  baseTimer: 48*3600, //48 hours
  deltaTimer: 8*3600, //8 hours
}

config.GTRXTeamLock = {
  releaseInterval: 86400,
  releaseBP:33,
  addresses:[
    "0x4735581201F4cAD63CCa0716AB4ac7D6d9CFB0ed",
    "0x0ec2ECD66Ea154F9F99624da860BDAf1D594129A",
    "0xEc40bcD40D618B56359378eaA3203B59B233c013",
    "0x1c38759F74d253791c9Cdb32425e3793894F8231",
    "0xf1B48f1aA5Cc76A326B95f78dE09f0Ef8DFD85C1",
    "0x0612dEE3CfEa2466710A2E36833f85113F6F2BeC"
  ],
  basisPoints:[
    3500,
    2500,
    1500,
    1500,
    500,
    500
  ]
}

config.GTRXDaoLock = {
  releaseInterval: 86400,
  releaseBP:16
}

config.GTRXPromoFund = {
  authorizor: "0x4735581201F4cAD63CCa0716AB4ac7D6d9CFB0ed",
  releaser: "0xEc40bcD40D618B56359378eaA3203B59B233c013"
}

config.GTRXStakingFund = {
  authorizor: "0x4735581201F4cAD63CCa0716AB4ac7D6d9CFB0ed",
  releaser: "0xEc40bcD40D618B56359378eaA3203B59B233c013"
}

module.exports = config
