const { accounts, contract, web3 } = require("@openzeppelin/test-environment")
const { expectRevert, time, BN, ether, balance } = require("@openzeppelin/test-helpers")
const {expect} = require("chai")
const config = require("../config")

const GTRXToken = contract.fromArtifact("GTRXToken")
const GTRXStaking = contract.fromArtifact("GTRXStaking")
const GTRXTeamLock = contract.fromArtifact("GTRXTeamLock")
const GTRXDaoLock = contract.fromArtifact("GTRXDaoLock")
const GTRXPromoFund = contract.fromArtifact("GTRXPromoFund")
const GTRXCertifiedPresale = contract.fromArtifact("GTRXCertifiedPresale")
const GTRXCertifiedPresaleTimer = contract.fromArtifact("GTRXCertifiedPresaleTimer")


const owner = accounts[0]
const buyers = [accounts[1],accounts[2],accounts[3],accounts[4]]
const notWhitelisted = accounts[5]

describe("GTRXPresale", function() {
  before(async function() {
    const tokenParams = config.GTRXToken
    const stakingParams = config.GTRXStaking
    const presaleParams = config.GTRXPresale
    const timerParams = config.GTRXPresaleTimer

    this.GTRXToken = await GTRXToken.new()
    this.GTRXStaking = await GTRXStaking.new()
    this.GTRXTeamFund = await GTRXTeamLock.new()
    this.GTRXPromoFund = await GTRXPromoFund.new()
    this.GTRXDaoFund = await GTRXPromoFund.new()
    this.GTRXPresale = await GTRXCertifiedPresale.new()
    this.GTRXTimer = await GTRXCertifiedPresaleTimer.new()


    await this.GTRXToken.initialize(
      tokenParams.name,
      tokenParams.symbol,
      tokenParams.decimals,
      owner,
      tokenParams.taxBP,
      tokenParams.daoTaxBP,
      this.GTRXDaoFund.address,
      this.GTRXStaking.address,
      this.GTRXPresale.address
    )
    await this.GTRXToken.addMinter(this.GTRXPresale.address,{from:owner})
    await this.GTRXStaking.initialize(
      stakingParams.stakingTaxBP,
      stakingParams.unstakingTaxBP,
      owner,
      this.GTRXToken.address
    )
    await this.GTRXTimer.initialize(
      timerParams.startTime,
      timerParams.baseTimer,
      timerParams.deltaTimer,
      owner
    )
    await this.GTRXPresale.initialize(
      presaleParams.maxBuyPerAddressBase,
      presaleParams.maxBuyPerAddressBP,
      presaleParams.maxBuyWithoutWhitelisting,
      presaleParams.redeemBP,
      presaleParams.redeemInterval,
      presaleParams.referralBP,
      presaleParams.startingPrice,
      presaleParams.multiplierPrice,
      owner,
      this.GTRXTimer.address,
      this.GTRXToken.address
    )

    await this.GTRXPresale.setEtherPools(
      [
        this.GTRXPromoFund.address,
        this.GTRXTeamFund.address
      ],
      [
        presaleParams.etherPools.promoFund,
        presaleParams.etherPools.teamFund
      ],
      {from: owner}
    )

    await this.GTRXPresale.setTokenPools(
      [
        this.GTRXPromoFund.address,
        this.GTRXStaking.address,
        this.GTRXTeamFund.address,
        this.GTRXDaoFund.address
      ],
      [
        presaleParams.tokenPools.promoFund,
        presaleParams.tokenPools.stakingFund,
        presaleParams.tokenPools.teamFund,
        presaleParams.tokenPools.daoFund,
      ],
      {from: owner}
    )

    await this.GTRXStaking.setStartTime(new BN(1),{from:owner})


  })

  describe("Stateless", function() {
    describe("#setWhitelist", function() {
      it("Should revert from non owner", async function() {
        const buyer = buyers[0]
        await expectRevert(
          this.GTRXPresale.setWhitelist(buyer,true,{from:buyer}),
          "Ownable: caller is not the owner"
        )
      })
      it("Should whitelist non whitelisted account", async function() {
        const buyer = buyers[0]
        const initialWhitelist = await this.GTRXPresale.whitelist(buyer)
        await this.GTRXPresale.setWhitelist(buyer,true,{from:owner})
        const finalWhitelist = await this.GTRXPresale.whitelist(buyer)
        expect(initialWhitelist).to.equal(false)
        expect(finalWhitelist).to.equal(true)
      })
      it("Should unwhitelist account", async function() {
        const buyer = buyers[0]
        const initialWhitelist = await this.GTRXPresale.whitelist(buyer)
        await this.GTRXPresale.setWhitelist(buyer,false,{from:owner})
        const finalWhitelist = await this.GTRXPresale.whitelist(buyer)
        expect(initialWhitelist).to.equal(true)
        expect(finalWhitelist).to.equal(false)
      })
    })
    describe("#setWhitelistForAll", function() {
      it("Should whitelist all addresses", async function() {
        await this.GTRXPresale.setWhitelistForAll(buyers,true,{from:owner})
        let whitelistVals = await Promise.all(buyers.map((buyer)=>{
          return this.GTRXPresale.whitelist(buyer)
        }))
        expect(whitelistVals.reduce((acc,val)=>{
          return acc && val
        })).to.equal(true)
      })
    })
    describe("#getMaxWhitelistedDeposit", function() {
      it("Should be base at deposit 0 eth.", async function() {
        const actualMax = await this.GTRXPresale.getMaxWhitelistedDeposit("0")
        const expectMax = config.GTRXPresale.maxBuyPerAddressBase
        expect(expectMax.toString()).to.equal(actualMax.toString())
      })
      it("Should be base + bp*val at deposit val eth.", async function() {
        const val = ether("1302.13")
        const actualMax = await this.GTRXPresale.getMaxWhitelistedDeposit(val)
        const expectMax = new BN(config.GTRXPresale.maxBuyPerAddressBase.toString()).add(
          val.mul(new BN(config.GTRXPresale.maxBuyPerAddressBP.toString())).div(new BN("10000"))
        )
        expect(expectMax.toString()).to.equal(actualMax.toString())
      })
    })
  })


  describe("State: Before Presale Start", function() {
    describe("#deposit", function() {
      it("Should revert", async function() {
        const startTime = await this.GTRXTimer.startTime()
        const isStarted = await this.GTRXTimer.isStarted()
        const buyer = buyers[0]
        await expectRevert(
          this.GTRXPresale.deposit({from:buyer}),
          "Presale not yet started."
        )
      })
    })
    describe("#sendToUniswap", function() {
      it("Should revert", async function() {
        const buyer = buyers[0]
        await expectRevert(
          this.GTRXPresale.sendToUniswap({from:buyer}),
          "Presale not yet started."
        )
      })
    })
  })



  describe("State: Presale Active", function() {
    before(async function() {
      await this.GTRXTimer.setStartTime((Math.floor(Date.now()/1000) - 60).toString(),{from:owner})
    })
    describe("#sendToUniswap", function() {
      it("Should revert", async function() {
        const buyer = buyers[0]
        await expectRevert(
          this.GTRXPresale.sendToUniswap({from:buyer}),
          "Presale has not yet ended."
        )
      })
    })
    describe("#deposit", function() {
      it("Should not allow more than nonWhitelisted max buy if not on whitelist.", async function() {
        await expectRevert(
          this.GTRXPresale.deposit({from:notWhitelisted,value:config.GTRXPresale.maxBuyWithoutWhitelisting.add(new BN(1))}),
          "Deposit exceeds max buy per address for non-whitelisted addresses."
        )
      })
      it("Should revert if buy higher than max", async function() {
        const buyer = buyers[0]
        const totalDeposit = await web3.eth.getBalance(this.GTRXPresale.address)
        const max = new BN(await this.GTRXPresale.getMaxWhitelistedDeposit(totalDeposit))

        await expectRevert(
          this.GTRXPresale.deposit({from:buyer,value:max.add(new BN(1))}),
          "Deposit exceeds max buy per address for whitelisted addresses."
        )
        await expectRevert(
          this.GTRXPresale.deposit({from:buyer,value:max.add(ether("10000000000000"))}),
          "Deposit exceeds max buy per address for whitelisted addresses."
        )
      })
    })
    it("Should revert if less than 0.01 ether", async function() {
      const buyer = buyers[0]
      await expectRevert(
        this.GTRXPresale.deposit({from:buyer,value:"0"}),
        "Must purchase at least 0.01 ether."
      )
    })
    describe("On buyer1 success", function(){
      before(async function(){
        const buyer = buyers[0]
        this.GTRXPresale.deposit({from:buyer,value:config.GTRXPresale.maxBuyPerAddress})
      })
    })
    describe("On buyer2 success", function(){
      before(async function(){
        const buyer = buyers[1]
        this.GTRXPresale.deposit({from:buyer,value:config.GTRXPresale.maxBuyPerAddress})
      })
    })
    describe("On final buyer attempts", function(){
      it("Should revert if greater than max", async function() {
        const buyer = buyers[2]

        const totalDeposit = await web3.eth.getBalance(this.GTRXPresale.address)
        const max = new BN(await this.GTRXPresale.getMaxWhitelistedDeposit(totalDeposit))

        await expectRevert(
          this.GTRXPresale.deposit({from:buyer,value:max.add(new BN(1))}),
          "Deposit exceeds max buy per address for whitelisted addresses."
        )
      })
      it("Should revert if time is after endtime.", async function() {
        await this.GTRXTimer.setStartTime("1",{from:owner})
        const buyer = buyers[2]

        const totalDeposit = await web3.eth.getBalance(this.GTRXPresale.address)
        const max = new BN(await this.GTRXPresale.getMaxWhitelistedDeposit(totalDeposit))
        const endTime = await this.GTRXTimer.getEndTime(totalDeposit)

        await expectRevert(
          this.GTRXPresale.deposit({from:buyer,value:max}),
          "Presale has ended."
        )
      })
    })
  })



  describe("State: Presale Ended", function() {
    describe("#deposit", function() {
      it("Should revert", async function() {
        const buyer = buyers[0]
        await expectRevert(
          this.GTRXPresale.deposit({from:buyer}),
          "Presale has ended."
        )
      })
    })
  })
})
