require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const SOLC_SETTINGS = {
  optimizer: {
    enabled: true,
    runs: 1_000,
  },
};

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: SOLC_SETTINGS,
      },
      {
        version: "0.8.7",
        settings: SOLC_SETTINGS,
      },
      {
        version: "0.7.0",
        settings: SOLC_SETTINGS,
      },
      {
        version: "0.6.6",
        settings: SOLC_SETTINGS,
      },
      {
        version: "0.4.24",
        settings: SOLC_SETTINGS,
      },
    ],
  },
  allowUnlimitedContractSize: true,
  networks: {
    hardhat: {},
    ETH_MAINNET: {
      accounts: [`${process.env.PRIVATE_KEY}`],
      url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    },
    ETH_GOERLI: {
      accounts: [`${process.env.PRIVATE_KEY}`],
      url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    },
    ETH_SEPOLIA: {
      accounts: [`${process.env.PRIVATE_KEY}`],
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    },
    POLYGON_MUMBAI: {
      accounts: [`${process.env.PRIVATE_KEY}`],
      url: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    },
  },
  etherscan: {
    apiKey: `${process.env.ETHERSCAN_API_KEY}`,
  },
};
