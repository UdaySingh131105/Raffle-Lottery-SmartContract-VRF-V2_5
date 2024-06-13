const { ethers } = require("hardhat")

const networkConfig = {
   11155111: {
      name: "Sepolia",
      ETH_USD_PriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
      vrfCoordinatorAddress: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
      keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
      subscriptionId: "",
      entranceFee: ethers.parseEther("0.01"),
      callBackGasLimit: "300000",
      interval: "30",
   },
   31337: {
      name: "hardhat",
      entranceFee: ethers.parseEther("100"),
      vrfCoordinatorAddress: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
      keyHash: "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
      subscriptionId: "",
      callBackGasLimit: "500000",
      interval: "30",
   },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
   networkConfig,
   developmentChains,
}
