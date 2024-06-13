const { deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

const _FUND_AMMOUNT = ethers.parseEther("200")

module.exports = async function () {
   const { deploy, log } = deployments
   const accounts = await ethers.getSigners()
   const signer = accounts[0]
   const chainId = network.config.chainId

   let VRFCoordinatorV2_5Mock, _mockAddress, _subscriptionId

   if (developmentChains.includes(network.name)) {
      // if on local network

      const vrfCoordinatorDeployments = await deployments.get("VRFCoordinatorV2_5Mock")

      VRFCoordinatorV2_5Mock = await ethers.getContractAt(
         vrfCoordinatorDeployments.abi,
         vrfCoordinatorDeployments.address,
         signer
      )
      _mockAddress = VRFCoordinatorV2_5Mock.target

      // creating a subscription
      const txResponse = await VRFCoordinatorV2_5Mock.createSubscription()
      const txReciept = await txResponse.wait(1)

      _subscriptionId = txReciept.logs[0].args.subId

      // funding the subscription created
      const fundResponse = await VRFCoordinatorV2_5Mock.fundSubscription(
         _subscriptionId,
         _FUND_AMMOUNT
      )
      const fundReciept = await fundResponse.wait(1)

      /**used these for debugging events (fundsubscription event - SubscriptionFunded in mocks)
       * SubscriptionFunded Event
       * console.log(fundReciept.logs[0].args.subId)
       * console.log(fundReciept.logs[0].args.oldBalance)
       * console.log(fundReciept.logs[0].args.newBalance)
       */

      log("-------------------------------------------------------------")
   } else {
      // when on testnet or mainnet.
      _mockAddress = networkConfig[chainId].vrfCoordinatorAddress
      _subscriptionId = networkConfig[chainId].subscriptionId
   }

   const _entranceFee = networkConfig[chainId].entranceFee
   const _keyHash = networkConfig[chainId].keyHash
   const _callBackGasLimit = networkConfig[chainId].callBackGasLimit
   const _interval = networkConfig[chainId].interval

   const _args = [
      _mockAddress,
      _entranceFee,
      _keyHash,
      _subscriptionId,
      _callBackGasLimit,
      _interval,
   ]

   // deploying raffle
   const raffle = await deploy("Raffle", {
      from: signer.address,
      args: _args,
      log: true,
      waitConfirmations: network.config.blockConfirmation || 1,
   })

   if (developmentChains.includes(network.name)) {
      const response = await VRFCoordinatorV2_5Mock.addConsumer(_subscriptionId, raffle.address)
      await response.wait(1)

      log(`consumer Added`)
   }

   if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
      log("-----------------------------------------------------------")
      log("Verifying the contract ")
      await verify(raffle.address, _args)
   }
   log("---------------------------------------------------------------")
}

module.exports.tags = ["all", "raffle"]
