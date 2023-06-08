# DInsur

This repo is consisted of a [frontend](./frontend/), which is a RainbowKit + wagmi + Next.js project, and a [backend](./backend/), which is a Hardhat project.

This product basically allows users to purchase different types of insurance plans like Travel Insurance, and claim automatically in ETH in case there is an unfortunate incident.

The verification of the claim will be achieved by utilizing Chainlink's _Functions_ feature, to fetch data in real time from Decentralized Oracle Networks (DONs).

## Getting Started

### Backend development:

```zsh
$ cd backend
$ npm install # install all necessary packages
```

### Frontend development:

```zsh
$ cd frontend
$ pnpm install # install all necessary packages
$ pnpm dev
```
