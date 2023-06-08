// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DInsur is Pausable, Ownable {
    uint8 public immutable GENERAL_INSURANCE_PLAN_ID;
    uint8 public immutable TRAVEL_INSURANCE_PLAN_ID;
    uint8 public immutable HEALTH_INSURANCE_PLAN_ID;
    uint8 public constant BASE_BPS = 100;
    uint112 public constant MIN_INSURED_AMOUNT = 1 ether;
    uint112 public constant MAX_INSURED_AMOUNT = 100 ether;
    uint256 public INSURED_AMOUNT_PRECISION = 1e18;

    address public operator;

    struct Policy {
        uint8 planId;
        uint64 activeDate;
        uint64 expiryDate;
        uint256 insuredAmt;
        uint256 price;
        address insurer;
        bool claimed;
    }

    Policy[] private policies;
    mapping(uint256 => mapping(uint256 => bool)) public policyClaimable; // planId => policyId => claimable
    mapping(uint8 => bool) public planActivated; // planId => activated
    mapping(uint8 => uint256) public planIdToDailyPriceRate; // planId => daily price rate

    event PolicyInsured(
        uint8 _planId,
        uint256 indexed _policyId,
        uint64 _activeDate,
        uint64 _expiryDate,
        uint256 indexed _insuredAmt,
        address indexed _insurer
    );
    event PolicyClaimed(
        uint8 _planId,
        uint256 indexed _policyId,
        uint64 _activeDate,
        uint64 _expiryDate,
        uint256 indexed _claimedAmt,
        address indexed _insurer
    );

    /// @notice Setting caller as operator, activate travel insurance, update its price rate, and send ETH to contract as a treasury
    constructor(
        uint8 _generalInsurancePlanID,
        uint8 _travelInsurancePlanID,
        uint8 _healthInsurancePlanID,
        uint256 _dailyPriceRate
    ) payable {
        GENERAL_INSURANCE_PLAN_ID = _generalInsurancePlanID;
        TRAVEL_INSURANCE_PLAN_ID = _travelInsurancePlanID;
        HEALTH_INSURANCE_PLAN_ID = _healthInsurancePlanID;
        operator = _msgSender();
        planActivated[_travelInsurancePlanID] = true;
        updatePriceRate(_travelInsurancePlanID, _dailyPriceRate);
    }

    /// @notice Purchase a policy
    /// @dev _planId: policy plan Id (i.e. 0 - 2), _activeDate: unix timestamp of the policy to be activated,
    /// _expiryDate: unix timestamp of the policy to be expired, _insuredAmt: desired amount to be covered in the plan
    function insure(uint8 _planId, uint64 _activeDate, uint64 _expiryDate, uint256 _insuredAmt) external payable {
        require(planActivated[_planId], "This type of plan is not available yet.");
        require(
            _insuredAmt >= MIN_INSURED_AMOUNT || _insuredAmt <= MAX_INSURED_AMOUNT,
            "Insured amount only between 1 ETH and 100 ETH."
        );
        uint256 _policyPrice = calculatePolicyPrice(_planId, _activeDate, _expiryDate, _insuredAmt);
        require(msg.value >= _policyPrice, "Insufficient payment!");
        Policy memory p = Policy({
            planId: _planId,
            activeDate: _activeDate,
            expiryDate: _expiryDate,
            price: _policyPrice,
            insuredAmt: _insuredAmt,
            insurer: _msgSender(),
            claimed: false
        });
        uint256 _policyId = policies.length;
        policies.push(p);

        emit PolicyInsured(_planId, _policyId, _activeDate, _expiryDate, _insuredAmt, _msgSender());
    }

    function claim(uint8 _planId, uint256 _policyId) external whenNotPaused {
        Policy memory p = policies[_policyId];
        require(p.insurer == _msgSender(), "This policy is not owned by caller.");
        require(block.timestamp >= p.activeDate, "This policy is not yet activated!");
        require(block.timestamp <= p.expiryDate + 7 days, "This policy is expired for more than a week!");
        require(policyClaimable[_planId][_policyId], "This policy is not deemed to be claimable.");

        (bool success,) = p.insurer.call{value: p.insuredAmt}("");
        require(success, "Transfer Ether failed.");

        emit PolicyClaimed(_planId, _policyId, p.activeDate, p.expiryDate, p.insuredAmt, _msgSender());
    }

    function isUserPolicy(address _user, uint256 _policyId) public view returns (bool) {
        uint256[] memory userPolicyIds = getUserPolicyIds(_user);
        if (userPolicyIds.length == 0) return false;
        for (uint256 i = 0; i < userPolicyIds.length;) {
            if (userPolicyIds[i] == _policyId) {
                return true;
            }
            unchecked {
                ++i;
            }
        }
        return false;
    }

    function getUserPolicyIds(address _user) public view returns (uint256[] memory) {
        uint256 userNumOfPolicy = getUserNumOfPolicy(_user);
        uint256[] memory userPolicyIds = new uint[](userNumOfPolicy);
        for (uint256 i = 0; i < policies.length;) {
            if (_user == policies[i].insurer) {
                userPolicyIds[userPolicyIds.length - 1] = i;
            }
            unchecked {
                ++i;
            }
        }

        return userPolicyIds;
    }

    function getUserNumOfPolicy(address _user) public view returns (uint256) {
        uint256 userNumOfPolicy;
        for (uint256 i = 0; i < policies.length;) {
            if (_user == policies[i].insurer) {
                userNumOfPolicy++;
            }
            unchecked {
                ++i;
            }
        }
        return userNumOfPolicy;
    }

    function calculatePolicyPrice(uint8 _planId, uint64 _activeDate, uint64 _expiryDate, uint256 _insuredAmt)
        public
        view
        returns (uint256)
    {
        uint256 priceRatePerSec = planIdToDailyPriceRate[_planId] / 1 days;
        uint256 benefitPeriodBySec = _expiryDate - _activeDate;
        uint256 multiplierBPS = _calculateMultiplierBPS(_insuredAmt);
        uint256 policyPrice = _calculatePolicyPrice(priceRatePerSec, benefitPeriodBySec, multiplierBPS);
        return policyPrice;
    }

    function _calculatePolicyPrice(uint256 _priceRatePerSec, uint256 _benefitPeriodBySec, uint256 _multiplierBPS)
        internal
        pure
        returns (uint256)
    {
        uint256 totalBenefitPeriodFee = _priceRatePerSec * _benefitPeriodBySec;
        uint256 totalInsuredAmtFee = _priceRatePerSec * _benefitPeriodBySec * _multiplierBPS / 10_000;
        return totalBenefitPeriodFee + totalInsuredAmtFee;
    }

    /// @dev Use Basic Point for multiplier to calculate percentage
    function _calculateMultiplierBPS(uint256 _insuredAmt) internal view returns (uint256) {
        // for every 1 ETH, increase total price by 1%
        uint256 multiplierBPS = _insuredAmt * BASE_BPS / INSURED_AMOUNT_PRECISION;
        return multiplierBPS;
    }

    /// @notice Update the daily price rate for different policy plans
    /// @dev _planId: the id of the policy plan, _dailyPriceRate: daily pricing rate in ETH
    function updatePriceRate(uint8 _planId, uint256 _dailyPriceRate) public onlyOwner {
        planIdToDailyPriceRate[_planId] = _dailyPriceRate;
    }

    function setPlanActivated(uint8 _planId, bool _isActivated) public onlyOwner {
        planActivated[_planId] = _isActivated;
    }

    function setOperator(address _newOperator) public onlyOwner {
        require(_newOperator != address(0), "No zero address.");
        require(_newOperator != operator, "Setting the same operator!");
        operator = _newOperator;
    }

    modifier onlyOperator() {
        require(_msgSender() == operator, "Only operator allowed.");
        _;
    }

    /// @notice To be called by operator bot after verifying the incident is eligible for claim
    /// @dev Set certain policy to be claimable after FunctionConsumer.latestResponse returns true
    function setPolicyClaimable(uint8 _planId, uint256 _policyId, bool _isClaimable) public onlyOperator {
        policyClaimable[_planId][_policyId] = _isClaimable;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}
