require("@nomicfoundation/hardhat-toolbox")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
   solidity: {
      version: "0.8.19",
      settings: {
         optimizer: {
            enabled: true,
            runs: 1000,
         },
      },
   },
   defaultNetwork: "hardhat",
   networks: {
      hardhat: {
         chainId: 31337,
         blockConfirmation: 1,
      },
      sepolia: {
         url: SEPOLIA_RPC_URL,
         accounts: [PRIVATE_KEY],
         chainId: 11155111,
         blockConfirmations: 1,
      },
      localhost: {
         url: "http://127.0.0.1:8545/",
         chainId: 31337,
      },
   },
   namedAccounts: {
      deployer: {
         default: 0,
      },
      player: {
         default: 1,
      },
   },
   mocha: {
      timeout: 1000000, // 1000 seconds max
   },
   etherscan: {
      apiKey: ETHERSCAN_API_KEY,
   },
   gasReporter: {
      enabled: true,
      outputFile: "gas-report.txt",
      noColors: true,
      currency: "USD",
      coinmarketcap: COINMARKETCAP_API_KEY,
      token: "ETH",
   },
}
