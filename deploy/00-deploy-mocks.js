const { deployments, getNamedAccounts, network, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const _BASE_FEE = ethers.parseEther("0.25")
const _GAS_PRICE_LINK = 1e9
const _WEIPERUNITLINK = 4323045521844006

module.exports = async function () {
   const { deploy, log } = deployments
   const { deployer } = await getNamedAccounts()
   const networkName = network.name

   if (developmentChains.includes(networkName)) {
      const accounts = await ethers.getSigners()
      const signer = accounts[0]
      log("Deploying Mocks...............")

      const _args = [_BASE_FEE, _GAS_PRICE_LINK, _WEIPERUNITLINK]

      await deploy("VRFCoordinatorV2_5Mock", {
         from: signer.address,
         log: true,
         args: _args,
      })

      log("Mocks Deployed!!..........................")
      log("-----------------------------------------------------------------")
   }
}

module.exports.tags = ["all", "mocks"]
