const { network, ethers, deployments } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
   ? describe.skip
   : describe("Raffle Unit testing", function () {
        let vrfCoordinator, raffle, enteranceFee, interval, signer
        beforeEach(async () => {
           const accounts = await ethers.getSigners()
           signer = accounts[0]

           await deployments.fixture("all")

           // fetching mock deployments
           const mockDeployments = await deployments.get("VRFCoordinatorV2_5Mock")

           vrfCoordinator = await ethers.getContractAt(
              mockDeployments.abi,
              mockDeployments.address,
              signer
           )

           // fetching contract deployments.
           const raffleDeployments = await deployments.get("Raffle")
           raffle = await ethers.getContractAt(
              raffleDeployments.abi,
              raffleDeployments.address,
              signer
           )

           enteranceFee = await raffle.getEntranceFee()
           interval = await raffle.getInterval()
        })

        describe("Contract Initialisation", function () {
           describe("Contract Constansts", function () {
              it("Author Verification", async () => {
                 const Author = await raffle.getAuthor()
                 assert.equal(Author, "Uday Singh")
              })

              it("Minimum Confirmation Requests", async () => {
                 const minRequestConfirmations = await raffle.getRequestConfimations()
                 assert.equal(minRequestConfirmations.toString(), "3")
              })

              it("Number of Words Needed", async () => {
                 const numWords = await raffle.getNumWords()
                 assert.equal(numWords.toString(), "1")
              })
           })

           describe("Contract Initial State", function () {
              it("RaffleState", async () => {
                 const raffleState = await raffle.getRaffleState()

                 assert.equal(raffleState.toString(), "0")
              })

              it("Interval", async function () {
                 const expectedInterval = networkConfig[network.config.chainId].interval
                 assert.equal(interval.toString(), expectedInterval.toString())
              })

              it("Players", async function () {
                 await expect(raffle.getPlayer(0)).to.be.reverted
              })
           })
        })

        describe("Entering Raffle", function () {
           it("Reverts when you don't pay enough Fees", async function () {
              await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                 raffle,
                 "Raffle__notEnoughETHEntered"
              )
           })

           it("Records Players When they Enter", async function () {
              await raffle.enterRaffle({ value: enteranceFee })
              //   const accounts = await ethers.getSigners()
              //   const signer = accounts[0]
              const playerFromContract = await raffle.getPlayer(0)
              assert.equal(playerFromContract, signer.address)
           })

           it("Dosen't Allow Enterance while Calculating", async function () {
              await raffle.enterRaffle({ value: enteranceFee })
              // we need to wait for the interval to make the checkUpKeep function return True;
              await network.provider.send("evm_increaseTime", [Number(interval) + 1])
              await network.provider.send("evm_mine", [])
              //pretend to be chainlink Kepper and call
              await raffle.performUpkeep("0x")
              // assertion
              await expect(
                 raffle.enterRaffle({ value: enteranceFee })
              ).to.be.revertedWithCustomError(raffle, "Raffle__notOpen")
           })
        })

        describe("Events", function () {
           it("Emits event on enter", async function () {
              await expect(raffle.enterRaffle({ value: enteranceFee })).to.emit(
                 raffle,
                 "RaffleEnter"
              )
           })

           it("Emits event on generation of requestId", async function () {
              await raffle.enterRaffle({ value: enteranceFee })
              await network.provider.send("evm_increaseTime", [Number(interval) + 1])
              await network.provider.send("evm_mine", [])
              await expect(raffle.performUpkeep("0x")).to.emit(raffle, "RaffleRequestId")
           })

           it("Emits event when a winner is decided", async function () {
              await raffle.enterRaffle({ value: enteranceFee })
              await network.provider.send("evm_increaseTime", [Number(interval) + 1])
              await network.provider.send("evm_mine", [])
              await raffle.performUpkeep("0x")
              await expect()
           })
        })

        describe("CheckUpKeep", function () {
           it("Return false if people didn't send any ETH", async function () {
              await network.provider.send("evm_increaseTime", [Number(interval) + 1])
              await network.provider.send("evm_mine", [])

              const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")
              assert(!upkeepNeeded)
           })

           it("return false if raffle isn't open", async function () {
              await raffle.enterRaffle({ value: enteranceFee })
              await network.provider.send("evm_increaseTime", [Number(interval) + 1])
              await network.provider.send("evm_mine", [])

              await raffle.performUpkeep("0x")
              const raffleState = await raffle.getRaffleState()
              const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x")

              assert.equal(raffleState.toString(), "1")
              assert.equal(upkeepNeeded, false)
           })

           it("returns false if enough time hasn't passed", async function () {
              await raffle.enterRaffle({ value: enteranceFee })
              await network.provider.send("evm_increaseTime", [Number(interval) - 5]) // use a higher number here if this test fails
              await network.provider.request({ method: "evm_mine", params: [] })
              const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
              assert(!upkeepNeeded)
           })

           it("returns true if enough time has passed, has players, eth, and is open", async () => {
              await raffle.enterRaffle({ value: enteranceFee })
              await network.provider.send("evm_increaseTime", [Number(interval) + 1])
              await network.provider.request({ method: "evm_mine", params: [] })
              const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
              assert(upkeepNeeded)
           })
        })

        describe("Perform Upkeep", function () {
           it("It can only Run if it is true", async () => {
              await raffle.enterRaffle({ value: enteranceFee })
              await network.provider.send("evm_increaseTime", [Number(interval) + 1])
              await network.provider.request({ method: "evm_mine", params: [] })
              const tx = await raffle.performUpkeep("0x")
              assert(tx)
           })

           it("It reverts when checkUpKeep is false", async () => {
              await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(
                 raffle,
                 "Raffle__upkeepNotNeeded"
              )
           })

           it("updates the raffle state and emits a requestId", async () => {
              // Too many asserts in this test!
              await raffle.enterRaffle({ value: enteranceFee })
              await network.provider.send("evm_increaseTime", [Number(interval) + 1])
              await network.provider.request({ method: "evm_mine", params: [] })
              const txResponse = await raffle.performUpkeep("0x") // emits requestId
              const txReceipt = await txResponse.wait(1) // waits 1 block
              const raffleState = await raffle.getRaffleState() // updates state
              // const requestId = txReceipt.events[1].args.requestId
              const requestId = txReceipt.logs[1].args[0]
              assert(Number(requestId) > 0)
              assert(raffleState == 1) // 0 = open, 1 = calculating
           })
        })

        describe("Fulfill Random Words", function () {
           this.beforeEach(async function () {
              await raffle.enterRaffle({ value: enteranceFee })
              await network.provider.send("evm_increaseTime", [Number(interval) + 5])
              await network.provider.request({ method: "evm_mine", params: [] })
           })

           it("it can be only called after performUpkeep", async function () {
              await expect(vrfCoordinator.fulfillRandomWords(0, raffle.target)).to.be.reverted
              await expect(vrfCoordinator.fulfillRandomWords(1, raffle.target)).to.be.reverted
           })

           it("picks a winner, resets, and sends money", async function () {
              const testingAccounts = 10
              const accounts = await ethers.getSigners()

              for (let accountIndex = 1; accountIndex <= testingAccounts; accountIndex++) {
                 const account = accounts[accountIndex]
                 const connectedAccount = raffle.connect(account)
                 await connectedAccount.enterRaffle({ value: enteranceFee })
              }

              const startingTimeStamp = await raffle.getLastTimeStamp()
              let winnerStartingBalance

              await new Promise(async (resolve, reject) => {
                 raffle.once("winnerPicked", async () => {
                    try {
                       const recentWinner = await raffle.getRecentWinner()
                       //   console.log(`Winner : ${recentWinner}`)

                       //   for (let i = 0; i <= testingAccounts; i++) {
                       //      console.log(accounts[i].address)
                       //   }
                       const winnerEndingBalance = await ethers.provider.getBalance(recentWinner)
                       const raffleState = await raffle.getRaffleState()
                       const endingTimeStamp = await raffle.getLastTimeStamp()
                       const numberOfPlayers = await raffle.getNumberOfPlayers()

                       assert.equal(numberOfPlayers.toString(), "0")
                       assert.equal(raffleState.toString(), "0")
                       assert(endingTimeStamp > startingTimeStamp)
                       assert.equal(
                          winnerEndingBalance.toString(),
                          (
                             winnerStartingBalance +
                             (enteranceFee * BigInt(testingAccounts) + enteranceFee)
                          ).toString()
                       )
                       resolve()
                    } catch (error) {
                       reject(error)
                    }
                    resolve()
                 })

                 try {
                    const tx = await raffle.performUpkeep("0x")
                    const txReceipt = await tx.wait(1)
                    const requestId = txReceipt.logs[1].args[0]
                    winnerStartingBalance = await ethers.provider.getBalance(
                       accounts[testingAccounts].address
                    )
                    await vrfCoordinator.fulfillRandomWords(requestId, raffle.target)
                    console.log("fulfillRandomWords called")
                 } catch (error) {
                    console.error("Error during performUpkeep or fulfillRandomWords:", error)
                    reject(error)
                 }
              })
           })
        })

        describe("Reseting Raffle Contract", () => {
           it("Only Owner can Reset the state", async () => {
              const accounts = await ethers.getSigners()
              const attacker = accounts[1]

              const attackerConnectedContract = await raffle.connect(attacker)

              await expect(
                 attackerConnectedContract.resetRaffleState()
              ).to.be.revertedWithCustomError(raffle, "Raffle__notOwner")
           })

           it("Checking the reset State", async () => {
              const txResponse = await raffle.resetRaffleState()
              await txResponse.wait(1)
              const raffleState = await raffle.getRaffleState()
              await expect(raffle.getPlayer(0)).to.be.reverted
              assert.equal(raffleState, 0)
           })
        })
     })
