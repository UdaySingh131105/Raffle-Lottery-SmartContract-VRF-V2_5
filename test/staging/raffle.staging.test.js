const { network, ethers, deployments } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { expect, assert } = require("chai")

developmentChains.includes(network.name)
   ? describe.skip
   : describe("Raffle Staging Tests", function () {
        let signer, raffle, entranceFee

        beforeEach(async function () {
           const accounts = await ethers.getSigners()
           signer = accounts[0]

           const raffleDeployments = await deployments.get("Raffle")
           raffle = await ethers.getContractAt(
              raffleDeployments.abi,
              raffleDeployments.address,
              signer
           )

           entranceFee = await raffle.getEntranceFee()
        })

        describe("FulFillRandomWords", function () {
           it("works with live ChainlinkKeepers and VRF, we get a random winner", async function () {
              console.log("Setting Up Tests....")
              const startingTimeStamp = await raffle.getLastTimeStamp()
              let winnerStartingBalance

              console.log("setting up Listener....")
              await new Promise(async (resolve, reject) => {
                 // just in case blockchain moves really fast.
                 raffle.once("winnerPicked", async () => {
                    try {
                       const recentWinner = await raffle.getRecentWinner()
                       const raffleState = await raffle.getRaffleState()
                       const winnerEndingBalance = await ethers.provider.getBalance(recentWinner)
                       const endingTimeStamp = await raffle.getLastTimeStamp()

                       // assertions
                       await expect(raffle.getPlayer(0)).to.be.reverted
                       assert.equal(recentWinner, signer.address)
                       assert.equal(raffleState, 0)
                       assert(
                          winnerEndingBalance.toString(),
                          (winnerStartingBalance + entranceFee).toString()
                       )
                       assert(endingTimeStamp > startingTimeStamp)
                       resolve()
                    } catch (error) {
                       console.log(error)
                       reject(error)
                    }
                 })

                 console.log("Entering Raffle....")
                 const txResponse = await raffle.enterRaffle()
                 const txReceipt = await txResponse.wait(1)
                 console.log("Waiting for the interval to pass....")
                 winnerStartingBalance = await ethers.provider.getBalance(signer.address)
              })
           })
        })
     })
