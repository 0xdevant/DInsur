# Backend

This contract allows users to purchase different types of insurance plans like Travel Insurance, and claim automatically in ETH in case there is an unfortunate incident.

The verification of the claim will be achieved by utilizing Chainlink's _Functions_ feature, to fetch data in real time from Decentralized Oracle Networks (DONs).

Depending on the **insured amount** and the **duration of the benefit period** the user desired, the price of the policy could vary.

## Getting Started

```sh
$ cd backend
$ npm install # install all necessary packages
```

## Usage

This is a list of the most frequently needed commands.

### Test

Run the tests:

```sh
$ npm run test
```

### Deployment flow (on Polygon Mumbai testnet)

1. Deploy FunctionsConsumer.sol

```sh
$ npm run deploy-function-consumer:mumbai
```

2. Create and fund a subscription

```sh
$ npm run function-sub:mumbai
```

3. Deploy DInsur.sol

```sh
$ npm run deploy-main:mumbai
```

4. Send requests

```sh
$ npm run request:mumbai
```

## Deployed

### DInsur.sol

| Environment    | Address                                    |
| -------------- | ------------------------------------------ |
| Polygon Mumbai | 0xCD2f364B79BFab87Dd4232FAC9F59EA951A900E9 |
| Sepolia        | 0x9168662E43fD30Bb69C91c78eaEDeD192115B55c |

### FunctionsConsumer.sol

| Environment    | Address                                    |
| -------------- | ------------------------------------------ |
| Polygon Mumbai | 0x393ddF26d17e674218346b907768D6280F8F8ddA |

## Functions

### Insure & Claim

| Method                                                                               | Usage                                 |
| ------------------------------------------------------------------------------------ | ------------------------------------- |
| `insure(uint8 _planId, uint64 _activeDate, uint64 _expiryDate, uint256 _insuredAmt)` | Purchase a policy                     |
| `claim(uint8 _planId, uint256 _policyId)`                                            | Initialize a claim against one policy |

### Getters

| Method                                                                                             | Usage                                                                                      | Return                       |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------- |
| `getUserPolicyIds(address _user)`                                                                  | Get all ids of the policies that a user owns                                               | `uint256[] userPolicyIds`    |
| `getUserNumOfPolicy(address _user)`                                                                | Get the number of policy that a user owns                                                  | `uint256 userNumOfPolicy`    |
| `calculatePolicyPrice(uint8 _planId, uint64 _activeDate, uint64 _expiryDate, uint256 _insuredAmt)` | Calculate the price of a policy based on its insured amount and duration of benefit period | `uint256 rewardTokensLength` |

```
Policy Price = Daily Price Rate(based on the plan the policy belongs to) * benefitPeriod(by days) * totalInsuredAmount
```

### Owner-only functions

| Method                                                    | Usage                                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `updatePriceRate(uint8 _planId, uint256 _dailyPriceRate)` | Update price rate for a certain type of insurance plan(General Insurance: 0, Travel Insurance: 1, Health Insurance: 2) |
| `setPlanActivated(uint8 _planId, bool _isActivated)`      | Activate or deactivate an insurance plan                                                                               |
| `setOperator(address _newOperator)`                       | Change operator's address                                                                                              |
| `pause()`                                                 | Implement an emergency stop mechanism to the contract                                                                  |
| `unpause()`                                               | Unpause the contract to return its state to normal                                                                     |

### Operator-only functions

| Method                                                                    | Usage                                                                                          |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `setPolicyClaimable(uint8 _planId, uint256 _policyId, bool _isClaimable)` | Set certain policy to be claimable after successfully verifying the incident through Chainlink |

### Events

| Name                                                                                                                                                        | Description                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `PolicyInsured( uint8 _planId, uint256 indexed _policyId, uint64 _activeDate, uint64 _expiryDate, uint256 indexed _insuredAmt, address indexed _insurer );` | Emitted when a user purchased a policy       |
| `PolicyClaimed( uint8 _planId, uint256 indexed _policyId, uint64 _activeDate, uint64 _expiryDate, uint256 indexed _claimedAmt, address indexed _insurer );` | Emitted when a user claimed ETH successfully |
