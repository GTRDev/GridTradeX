const { accounts, contract, web3 } = require("@openzeppelin/test-environment")
const { expectRevert, time, BN, ether, balance } = require("@openzeppelin/test-helpers")
const {expect} = require("chai")
const config = require("../config")

const GTRXToken = contract.fromArtifact("GTRXToken")
const GTRXStaking = contract.fromArtifact("GTRXStaking")
const GTRXCertifiedPresale = contract.fromArtifact("GTRXCertifiedPresale")
const GTRXDaoFund = contract.fromArtifact("GTRXDaoLock")


const owner = accounts[0]
const transferFromAccounts = [accounts[1],accounts[2],accounts[3],accounts[9]]
const transferToAccounts = [accounts[4],accounts[5],accounts[6],accounts[10]]
const emptyAccount = accounts[7]
const approvedSender = accounts[8]

describe("GTRXToken", function() {
  before(async function() {
    const tokenParams = config.GTRXToken
    const stakingParams = config.GTRXStaking

    this.GTRXToken = await GTRXToken.new()
    this.GTRXStaking = await GTRXStaking.new()
    this.GTRXCertifiedPresale = await GTRXCertifiedPresale.new()
    this.GTRXDaoFund = await GTRXDaoFund.new()

    await this.GTRXToken.initialize(
      tokenParams.name,
      tokenParams.symbol,
      tokenParams.decimals,
      owner,
      tokenParams.taxBP,
      tokenParams.daoTaxBP,
      this.GTRXDaoFund.address,
      this.GTRXStaking.address,
      this.GTRXCertifiedPresale.address
    )
    await this.GTRXStaking.initialize(
      stakingParams.stakingTaxBP,
      stakingParams.unstakingTaxBP,
      owner,
      this.GTRXToken.address
    )

    await this.GTRXStaking.setStartTime(new BN("1"),{from:owner})

    await Promise.all([
      await this.GTRXToken.mint(transferFromAccounts[0],ether('10'),{from: owner}),
      await this.GTRXToken.mint(transferFromAccounts[1],ether('10'),{from: owner}),
      await this.GTRXToken.mint(transferFromAccounts[2],ether('10'),{from: owner})
    ])


  })



  describe("Stateless", function(){
    describe("#taxBP", function(){
      it("Should be taxBP.", async function() {
        let taxBP = await this.GTRXToken.taxBP()
        expect(taxBP.toString()).to.equal(config.GTRXToken.taxBP.toString())
      })
    })
    describe("#findTaxAmount", function(){
      it("Should return taxBP/10000 of value passed.", async function() {
        let {tax, daoTax} = await this.GTRXToken.findTaxAmount(ether("1"))
        let expectedTax = ether("1")
          .mul((new BN(config.GTRXToken.taxBP)).add(new BN(config.GTRXToken.daoTaxBP)))
          .div(new BN(10000))
        expect((tax.add(daoTax)).toString()).to.equal(expectedTax.toString())
      })
    })
  })

  describe("State: isTransfersActive=false", function (){
    describe("#isTransfersActive", function(){
      it("Should be false.", async function() {
        let isTransfersActive = await this.GTRXToken.isTransfersActive()
        expect(isTransfersActive).to.equal(false)
      })
    })
    describe("#transfer", function(){
      it("Should revert.", async function() {
        await expectRevert(
          this.GTRXToken.transfer(transferToAccounts[0],ether("10").add(new BN(1)),{from:transferFromAccounts[0]}),
          "Transfers are currently locked."
        )
      })
    })
    describe("#transferFrom", function(){
      it("All transferFrom should revert.", async function() {
        const receiver = transferToAccounts[1]
        const sender = transferFromAccounts[1]
        await expectRevert(
          this.GTRXToken.transferFrom(sender,receiver,ether("5").add(new BN(1)),{from:approvedSender}),
          "Transfers are currently locked."
        )
      })
    })
  })

  describe("State: isTaxActive=false, isTransfersActive=true", function(){
    before(async function() {
      await this.GTRXToken.setIsTransfersActive(true,{from:owner})
    })
    describe("#isTransfersActive", function(){
      it("Should be true.", async function() {
        let isTransfersActive = await this.GTRXToken.isTransfersActive()
        expect(isTransfersActive).to.equal(true)
      })
    })
    describe("#isTaxActive", function(){
      it("Should be false.", async function() {
        let isTaxActive = await this.GTRXToken.isTaxActive()
        expect(isTaxActive).to.equal(false)
      })
    })
    describe("#transfer", function(){
      it("Should revert if msg.sender sends more than their balance", async function() {
        await expectRevert(
          this.GTRXToken.transfer(transferToAccounts[0],ether("10").add(new BN(1)),{from:transferFromAccounts[0]}),
          "ERC20: transfer amount exceeds balance"
        )
      })
      it("Should increase receiver by value", async function() {
        const receiver = transferToAccounts[0]
        const sender = transferFromAccounts[0]
        const receiverInitialBalance = await this.GTRXToken.balanceOf(receiver)
        await this.GTRXToken.transfer(receiver,ether("1"),{from:sender})
        const receiverFinalBalance = await this.GTRXToken.balanceOf(receiver)
        expect(receiverFinalBalance.toString()).to.equal(receiverInitialBalance.add(ether("1")).toString())
      })
      it("Should decrease sender by value", async function() {
        const receiver = transferToAccounts[0]
        const sender = transferFromAccounts[0]
        const senderInitialBalance = await this.GTRXToken.balanceOf(sender)
        await this.GTRXToken.transfer(receiver,ether("1"),{from:sender})
        const senderFinalBalance = await this.GTRXToken.balanceOf(sender)
        expect(senderFinalBalance.toString()).to.equal(senderInitialBalance.sub(ether("1")).toString())
      })
    })
    describe("#transferFrom", function(){
      before(async function() {
        await this.GTRXToken.approve(approvedSender,ether("2"),{from:transferFromAccounts[1]})
      })
      it("Should revert if msg.sender does not have enough approved", async function() {
          const receiver = transferToAccounts[1]
          const sender = transferFromAccounts[1]
        await expectRevert(
          this.GTRXToken.transferFrom(sender,receiver,ether("5").add(new BN(1)),{from:approvedSender}),
          "Transfer amount exceeds allowance"
        )
      })
      it("Should increase receiver by value", async function() {
        const receiver = transferToAccounts[1]
        const sender = transferFromAccounts[1]
        const receiverInitialBalance = await this.GTRXToken.balanceOf(receiver)
        await this.GTRXToken.transferFrom(sender,receiver,ether("1"),{from:approvedSender})
        const receiverFinalBalance = await this.GTRXToken.balanceOf(receiver)
        expect(receiverFinalBalance.toString()).to.equal(receiverInitialBalance.add(ether("1")).toString())
      })
      it("Should decrease sender by value", async function() {
        const receiver = transferToAccounts[1]
        const sender = transferFromAccounts[1]
        const senderInitialBalance = await this.GTRXToken.balanceOf(sender)
        await this.GTRXToken.transferFrom(sender,receiver,ether("1"),{from:approvedSender})
        const senderFinalBalance = await this.GTRXToken.balanceOf(sender)
        expect(senderFinalBalance.toString()).to.equal(senderInitialBalance.sub(ether("1")).toString())
      })
    })
  })



  describe("State: isTaxActive=true", function(){
    before(async function() {
      await this.GTRXToken.setIsTaxActive(true,{from:owner})
    })
    describe("#isTaxActive", function(){
      it("Should be true.", async function() {
        let isTaxActive = await this.GTRXToken.isTaxActive()
        expect(isTaxActive).to.equal(true)
      })
    })
    describe("#transfer", function(){
      it("Should revert if msg.sender sends more than their balance", async function() {
        await expectRevert(
          this.GTRXToken.transfer(transferToAccounts[0],ether("10").add(new BN(1)),{from:transferFromAccounts[0]}),
          "ERC20: transfer amount exceeds balance"
        )
      })
      it("Should increase receiver by value minus tax.", async function() {
        const {tax, daoTax} = await this.GTRXToken.findTaxAmount(ether("1"))
        const receiver = transferToAccounts[0]
        const sender = transferFromAccounts[0]
        const receiverInitialBalance = await this.GTRXToken.balanceOf(receiver)
        await this.GTRXToken.transfer(receiver,ether("1"),{from:sender})
        const receiverFinalBalance = await this.GTRXToken.balanceOf(receiver)
        expect(receiverFinalBalance.toString()).to.equal(receiverInitialBalance.add(ether("1")).sub(tax).sub(daoTax).toString())
      })
      it("Should decrease sender by value", async function() {
        const receiver = transferToAccounts[0]
        const sender = transferFromAccounts[0]
        const senderInitialBalance = await this.GTRXToken.balanceOf(sender)
        await this.GTRXToken.transfer(receiver,ether("1"),{from:sender})
        const senderFinalBalance = await this.GTRXToken.balanceOf(sender)
        expect(senderFinalBalance.toString()).to.equal(senderInitialBalance.sub(ether("1")).toString())
      })
      it("Should increase staking contract by tax", async function() {
        const receiver = transferToAccounts[0]
        const sender = transferFromAccounts[0]
        const stakingInitialBalance = await this.GTRXToken.balanceOf(this.GTRXStaking.address);
        await this.GTRXToken.transfer(receiver,ether("1"),{from:sender})
        const {tax, daoTax} = await this.GTRXToken.findTaxAmount(ether("1"));
        const stakingFinalBalance = await this.GTRXToken.balanceOf(this.GTRXStaking.address);
        expect(stakingFinalBalance.toString()).to.equal(stakingInitialBalance.add(tax).toString())
      })
    })
    describe("#transferFrom", function(){
      before(async function() {
        await this.GTRXToken.approve(approvedSender,ether("3"),{from:transferFromAccounts[1]})
      })
      it("Should revert if msg.sender does not have enough approved", async function() {
          const receiver = transferToAccounts[1]
          const sender = transferFromAccounts[1]
        await expectRevert(
          this.GTRXToken.transferFrom(sender,receiver,ether("5").add(new BN(1)),{from:approvedSender}),
          "Transfer amount exceeds allowance"
        )
      })
      it("Should increase receiver by value minus tax", async function() {
        const {tax, daoTax} = await this.GTRXToken.findTaxAmount(ether("1"))
        const receiver = transferToAccounts[1]
        const sender = transferFromAccounts[1]
        const receiverInitialBalance = await this.GTRXToken.balanceOf(receiver)
        await this.GTRXToken.transferFrom(sender,receiver,ether("1"),{from:approvedSender})
        const receiverFinalBalance = await this.GTRXToken.balanceOf(receiver)
        expect(receiverFinalBalance.toString()).to.equal(receiverInitialBalance.add(ether("1")).sub(tax).sub(daoTax).toString())
      })
      it("Should decrease sender by value", async function() {
        const receiver = transferToAccounts[1]
        const sender = transferFromAccounts[1]
        const senderInitialBalance = await this.GTRXToken.balanceOf(sender)
        await this.GTRXToken.transferFrom(sender,receiver,ether("1"),{from:approvedSender})
        const senderFinalBalance = await this.GTRXToken.balanceOf(sender)
        expect(senderFinalBalance.toString()).to.equal(senderInitialBalance.sub(ether("1")).toString())
      })
      it("Should increase staking contract by tax", async function() {
        const receiver = transferToAccounts[1]
        const sender = transferFromAccounts[1]
        const stakingInitialBalance = await this.GTRXToken.balanceOf(this.GTRXStaking.address);
        await this.GTRXToken.transferFrom(sender,receiver,ether("1"),{from:approvedSender})
        const {tax, daoTax} = await this.GTRXToken.findTaxAmount(ether("1"));
        const stakingFinalBalance = await this.GTRXToken.balanceOf(this.GTRXStaking.address);
        expect(stakingFinalBalance.toString()).to.equal(stakingInitialBalance.add(tax).toString())
      })
    })
  })
})
