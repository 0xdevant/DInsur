const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { constants } = require("@openzeppelin/test-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("bignumber.js");

const ONE_DAY_IN_SECS = 24 * 60 * 60;
const ETHER_PRECISION = 1e18;

const POLICY_ID = 0;
const GENERAL_INSURANCE_PLAN_ID = 0;
const TRAVEL_INSURANCE_PLAN_ID = 1;
const HEALTH_INSURANCE_PLAN_ID = 2;
const UNAVAILABLE_INSURANCE_PLAN_ID = 10;
const DAILY_PRICE_RATE = ethers.utils.parseEther("0.002"); // 2e15
const INSURED_AMOUNT = ethers.utils.parseEther("10");
const TREASURY_AMOUNT = ethers.utils.parseEther("100");

describe("DInsur", function () {
  async function deployFixture() {
    const CURRENT_DATE = await time.latest();
    const FUTURE_DATE = CURRENT_DATE + ONE_DAY_IN_SECS * 7; // 7 days after
    const EXPIRY_DATE = FUTURE_DATE + ONE_DAY_IN_SECS * 7; // 14 days after

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, anotherAccount] = await ethers.getSigners();

    const DInsur = await ethers.getContractFactory("DInsur");
    const dInsur = await DInsur.deploy(
      GENERAL_INSURANCE_PLAN_ID,
      TRAVEL_INSURANCE_PLAN_ID,
      HEALTH_INSURANCE_PLAN_ID,
      DAILY_PRICE_RATE,
      { value: TREASURY_AMOUNT }
    );

    const getPolicyPriceInETH = async (activeDate, expiryDate) => {
      const policyPrice = await dInsur.calculatePolicyPrice(
        TRAVEL_INSURANCE_PLAN_ID,
        activeDate,
        expiryDate,
        INSURED_AMOUNT
      );

      return ethers.utils.parseEther(ethers.utils.formatEther(policyPrice));
    };

    return {
      dInsur,
      owner,
      otherAccount,
      anotherAccount,
      CURRENT_DATE,
      FUTURE_DATE,
      EXPIRY_DATE,
      getPolicyPriceInETH,
    };
  }

  describe("Deployment", function () {
    it("Should set the right configurations", async function () {
      const { dInsur } = await loadFixture(deployFixture);
      const TRAVEL_INSURANCE_PLAN_ID = 1;

      expect(await dInsur.planActivated(TRAVEL_INSURANCE_PLAN_ID)).to.equal(
        true
      );
      expect(
        await dInsur.planIdToDailyPriceRate(TRAVEL_INSURANCE_PLAN_ID)
      ).to.equal(DAILY_PRICE_RATE);
    });

    it("Should set the right owner", async function () {
      const { dInsur, owner } = await loadFixture(deployFixture);

      expect(await dInsur.owner()).to.equal(owner.address);
    });
  });

  describe("Insure", function () {
    describe("Validations", function () {
      it("Should revert with the right error if the type of plan is not available", async function () {
        const { dInsur, otherAccount, CURRENT_DATE, EXPIRY_DATE } =
          await loadFixture(deployFixture);

        await expect(
          dInsur
            .connect(otherAccount)
            .insure(
              UNAVAILABLE_INSURANCE_PLAN_ID,
              CURRENT_DATE,
              EXPIRY_DATE,
              INSURED_AMOUNT,
              {
                value: ethers.utils.parseEther("10"),
              }
            )
        ).to.be.revertedWith("This type of plan is not available yet.");
      });

      it("Should calculate the right amount of policy price to pay", async function () {
        const { dInsur, CURRENT_DATE, EXPIRY_DATE } = await loadFixture(
          deployFixture
        );

        const priceRatePerSec =
          (await dInsur.planIdToDailyPriceRate(TRAVEL_INSURANCE_PLAN_ID)) /
          ONE_DAY_IN_SECS;
        const benefitPeriodBySec = EXPIRY_DATE - CURRENT_DATE;
        const multiplier = 1 + INSURED_AMOUNT / ETHER_PRECISION / 100;
        const policyPrice = new BigNumber(
          priceRatePerSec * benefitPeriodBySec * multiplier
        );

        expect(
          await dInsur.calculatePolicyPrice(
            TRAVEL_INSURANCE_PLAN_ID,
            CURRENT_DATE,
            EXPIRY_DATE,
            INSURED_AMOUNT
          )
        ).to.be.closeTo(policyPrice, ethers.utils.parseEther("0.000001"));
      });

      it("Should revert with the right error if not paying enough", async function () {
        const { dInsur, otherAccount, CURRENT_DATE, EXPIRY_DATE } =
          await loadFixture(deployFixture);

        await expect(
          dInsur
            .connect(otherAccount)
            .insure(
              TRAVEL_INSURANCE_PLAN_ID,
              CURRENT_DATE,
              EXPIRY_DATE,
              INSURED_AMOUNT,
              { value: ethers.utils.parseEther("0.001") }
            )
        ).to.be.revertedWith("Insufficient payment!");
      });

      it("Shouldn't fail if the plan is available and has paid enough", async function () {
        const {
          dInsur,
          otherAccount,
          CURRENT_DATE,
          EXPIRY_DATE,
          getPolicyPriceInETH,
        } = await loadFixture(deployFixture);

        await expect(
          dInsur
            .connect(otherAccount)
            .insure(
              TRAVEL_INSURANCE_PLAN_ID,
              CURRENT_DATE,
              EXPIRY_DATE,
              INSURED_AMOUNT,
              {
                value: getPolicyPriceInETH(CURRENT_DATE, EXPIRY_DATE),
              }
            )
        ).not.to.be.reverted;

        // const t = await tx.wait();
        // console.log(t);
      });
    });

    describe("Events", function () {
      it("Should emit an event on Policy Purchase", async function () {
        const {
          dInsur,
          otherAccount,
          CURRENT_DATE,
          EXPIRY_DATE,
          getPolicyPriceInETH,
        } = await loadFixture(deployFixture);

        await expect(
          dInsur
            .connect(otherAccount)
            .insure(
              TRAVEL_INSURANCE_PLAN_ID,
              CURRENT_DATE,
              EXPIRY_DATE,
              INSURED_AMOUNT,
              {
                value: getPolicyPriceInETH(CURRENT_DATE, EXPIRY_DATE),
              }
            )
        )
          .to.emit(dInsur, "PolicyInsured")
          .withArgs(
            TRAVEL_INSURANCE_PLAN_ID,
            anyValue,
            CURRENT_DATE,
            EXPIRY_DATE,
            INSURED_AMOUNT,
            otherAccount.address
          );
      });
    });
  });

  describe("Claim", function () {
    describe("Validations", function () {
      it("Should revert with the right error if the claiming policy doesn't belong to the caller", async function () {
        const {
          dInsur,
          otherAccount,
          CURRENT_DATE,
          EXPIRY_DATE,
          getPolicyPriceInETH,
        } = await loadFixture(deployFixture);

        await dInsur.insure(
          TRAVEL_INSURANCE_PLAN_ID,
          CURRENT_DATE,
          EXPIRY_DATE,
          INSURED_AMOUNT,
          {
            value: getPolicyPriceInETH(CURRENT_DATE, EXPIRY_DATE),
          }
        );

        await expect(
          dInsur
            .connect(otherAccount)
            .claim(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID)
        ).to.be.revertedWith("This policy is not owned by caller.");
      });

      it("Should revert with the right error if the policy is not yet activated", async function () {
        const {
          dInsur,
          otherAccount,
          FUTURE_DATE,
          EXPIRY_DATE,
          getPolicyPriceInETH,
        } = await loadFixture(deployFixture);

        await dInsur
          .connect(otherAccount)
          .insure(
            TRAVEL_INSURANCE_PLAN_ID,
            FUTURE_DATE,
            EXPIRY_DATE,
            INSURED_AMOUNT,
            {
              value: getPolicyPriceInETH(FUTURE_DATE, EXPIRY_DATE),
            }
          );

        await expect(
          dInsur
            .connect(otherAccount)
            .claim(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID)
        ).to.be.revertedWith("This policy is not yet activated!");
      });

      it("Should revert with the right error if the policy is expired for more than a week", async function () {
        const {
          dInsur,
          otherAccount,
          CURRENT_DATE,
          EXPIRY_DATE,
          getPolicyPriceInETH,
        } = await loadFixture(deployFixture);

        await dInsur
          .connect(otherAccount)
          .insure(
            TRAVEL_INSURANCE_PLAN_ID,
            CURRENT_DATE,
            EXPIRY_DATE,
            INSURED_AMOUNT,
            {
              value: getPolicyPriceInETH(CURRENT_DATE, EXPIRY_DATE),
            }
          );

        await time.increase(ONE_DAY_IN_SECS * 22); // (EXPIRY_DATE + 7) days after

        await expect(
          dInsur
            .connect(otherAccount)
            .claim(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID)
        ).to.be.revertedWith("This policy is expired for more than a week!");
      });

      it("Should revert with the right error if the policy is not set to be claimable", async function () {
        const {
          dInsur,
          otherAccount,
          CURRENT_DATE,
          EXPIRY_DATE,
          getPolicyPriceInETH,
        } = await loadFixture(deployFixture);

        await dInsur
          .connect(otherAccount)
          .insure(
            TRAVEL_INSURANCE_PLAN_ID,
            CURRENT_DATE,
            EXPIRY_DATE,
            INSURED_AMOUNT,
            {
              value: getPolicyPriceInETH(CURRENT_DATE, EXPIRY_DATE),
            }
          );

        await expect(
          dInsur
            .connect(otherAccount)
            .claim(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID)
        ).to.be.revertedWith("This policy is not deemed to be claimable.");
      });

      it("Shouldn't fail if the policy is not expired and is deemed claimable", async function () {
        const {
          dInsur,
          owner,
          otherAccount,
          FUTURE_DATE,
          EXPIRY_DATE,
          getPolicyPriceInETH,
        } = await loadFixture(deployFixture);

        await dInsur
          .connect(otherAccount)
          .insure(
            TRAVEL_INSURANCE_PLAN_ID,
            FUTURE_DATE,
            EXPIRY_DATE,
            INSURED_AMOUNT,
            {
              value: getPolicyPriceInETH(FUTURE_DATE, EXPIRY_DATE),
            }
          );

        await time.increase(ONE_DAY_IN_SECS * 7); // 7 days after
        await dInsur
          .connect(owner)
          .setPolicyClaimable(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID, true);

        await expect(
          dInsur
            .connect(otherAccount)
            .claim(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID)
        ).not.to.be.reverted;
      });
    });

    describe("Events", function () {
      it("Should emit an event on Policy Claim", async function () {
        const {
          dInsur,
          owner,
          otherAccount,
          CURRENT_DATE,
          EXPIRY_DATE,
          getPolicyPriceInETH,
        } = await loadFixture(deployFixture);

        await dInsur
          .connect(otherAccount)
          .insure(
            TRAVEL_INSURANCE_PLAN_ID,
            CURRENT_DATE,
            EXPIRY_DATE,
            INSURED_AMOUNT,
            {
              value: getPolicyPriceInETH(CURRENT_DATE, EXPIRY_DATE),
            }
          );

        await time.increase(ONE_DAY_IN_SECS * 3); // 3 days after
        await dInsur
          .connect(owner)
          .setPolicyClaimable(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID, true);

        await expect(
          dInsur
            .connect(otherAccount)
            .claim(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID)
        )
          .to.emit(dInsur, "PolicyClaimed")
          .withArgs(
            TRAVEL_INSURANCE_PLAN_ID,
            anyValue,
            CURRENT_DATE,
            EXPIRY_DATE,
            INSURED_AMOUNT,
            otherAccount.address
          );
      });
    });

    describe("Transfers", function () {
      it("Should transfer ETH to the policy owner after claim successfully", async function () {
        const {
          dInsur,
          owner,
          otherAccount,
          CURRENT_DATE,
          EXPIRY_DATE,
          getPolicyPriceInETH,
        } = await loadFixture(deployFixture);

        await dInsur
          .connect(otherAccount)
          .insure(
            TRAVEL_INSURANCE_PLAN_ID,
            CURRENT_DATE,
            EXPIRY_DATE,
            INSURED_AMOUNT,
            {
              value: getPolicyPriceInETH(CURRENT_DATE, EXPIRY_DATE),
            }
          );

        await time.increase(ONE_DAY_IN_SECS * 3); // 3 days after
        await dInsur
          .connect(owner)
          .setPolicyClaimable(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID, true);

        await expect(
          dInsur
            .connect(otherAccount)
            .claim(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID)
        ).to.changeEtherBalances(
          [otherAccount, dInsur],
          [ethers.utils.parseEther("10"), ethers.utils.parseEther("-10")]
        );
      });
    });
  });

  describe("OnlyOwner functions", function () {
    describe("updatePriceRate()", function () {
      it("Should revert with the right error if the caller is not owner", async function () {
        const { dInsur, otherAccount } = await loadFixture(deployFixture);

        const newPriceRate = ethers.utils.parseEther("0.1");
        await expect(
          dInsur
            .connect(otherAccount)
            .updatePriceRate(GENERAL_INSURANCE_PLAN_ID, newPriceRate)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Shouldn be able to set the new priceRate", async function () {
        const { dInsur, owner } = await loadFixture(deployFixture);

        const newPriceRate = ethers.utils.parseEther("0.1");
        await dInsur
          .connect(owner)
          .updatePriceRate(HEALTH_INSURANCE_PLAN_ID, newPriceRate);

        expect(
          await dInsur.planIdToDailyPriceRate(HEALTH_INSURANCE_PLAN_ID)
        ).to.equal(newPriceRate);
      });
    });

    describe("setPlanActivated()", function () {
      it("Shouldn't fail if the caller is owner", async function () {
        const { dInsur, owner } = await loadFixture(deployFixture);

        await expect(
          dInsur.connect(owner).setPlanActivated(HEALTH_INSURANCE_PLAN_ID, true)
        ).not.to.be.reverted;
      });
    });

    describe("setOperator()", function () {
      it("Should revert with the right error if the newOperator is zero address", async function () {
        const { dInsur, owner } = await loadFixture(deployFixture);

        await expect(
          dInsur.connect(owner).setOperator(constants.ZERO_ADDRESS)
        ).to.be.revertedWith("No zero address.");
      });

      it("Should revert with the right error if the newOperator is same as before", async function () {
        const { dInsur, owner } = await loadFixture(deployFixture);

        await expect(
          dInsur.connect(owner).setOperator(owner.address)
        ).to.be.revertedWith("Setting the same operator!");
      });

      it("Shouldn't fail if the caller is owner and newOperator is not zero addreess", async function () {
        const { dInsur, owner, anotherAccount } = await loadFixture(
          deployFixture
        );

        await expect(dInsur.connect(owner).setOperator(anotherAccount.address))
          .not.to.be.reverted;
      });
    });
  });

  describe("OnlyOperator function", function () {
    describe("setPolicyClaimable()", function () {
      it("Should revert with the right error if the caller is not operator", async function () {
        const { dInsur, anotherAccount } = await loadFixture(deployFixture);

        await expect(
          dInsur
            .connect(anotherAccount)
            .setPolicyClaimable(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID, true)
        ).to.be.revertedWith("Only operator allowed.");
      });

      it("Should revert if caller is not the current operator after operator changed", async function () {
        const { dInsur, owner, otherAccount } = await loadFixture(
          deployFixture
        );

        await dInsur.connect(owner).setOperator(otherAccount.address);

        await expect(
          dInsur
            .connect(owner)
            .setPolicyClaimable(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID, true)
        ).to.be.revertedWith("Only operator allowed.");
      });

      it("Shouldn't fail if the caller is operator", async function () {
        const { dInsur, owner, anotherAccount } = await loadFixture(
          deployFixture
        );

        await dInsur.connect(owner).setOperator(anotherAccount.address);

        await expect(
          dInsur
            .connect(anotherAccount)
            .setPolicyClaimable(TRAVEL_INSURANCE_PLAN_ID, POLICY_ID, true)
        ).not.to.be.reverted;
      });
    });
  });

  describe("Getters", function () {
    it("Should get the correct number of policyIds given the adderss of a policy owner exists", async function () {
      const {
        dInsur,
        otherAccount,
        CURRENT_DATE,
        FUTURE_DATE,
        EXPIRY_DATE,
        getPolicyPriceInETH,
      } = await loadFixture(deployFixture);

      await dInsur
        .connect(otherAccount)
        .insure(
          TRAVEL_INSURANCE_PLAN_ID,
          CURRENT_DATE,
          EXPIRY_DATE,
          INSURED_AMOUNT,
          {
            value: getPolicyPriceInETH(CURRENT_DATE, EXPIRY_DATE),
          }
        );

      await dInsur
        .connect(otherAccount)
        .insure(
          TRAVEL_INSURANCE_PLAN_ID,
          FUTURE_DATE,
          EXPIRY_DATE,
          INSURED_AMOUNT,
          {
            value: getPolicyPriceInETH(FUTURE_DATE, EXPIRY_DATE),
          }
        );

      const userPolicyIds = await dInsur.getUserPolicyIds(otherAccount.address);
      const correctUserPolicyIds = [];
      [0, 1].forEach((val, i) => {
        correctUserPolicyIds[i] = ethers.BigNumber.from(val);
      });

      expect(userPolicyIds).to.deep.equal(correctUserPolicyIds);
    });

    it("Should get the correct number of policys given the adderss is the insurer of the asked policy", async function () {
      const {
        dInsur,
        otherAccount,
        anotherAccount,
        CURRENT_DATE,
        FUTURE_DATE,
        EXPIRY_DATE,
        getPolicyPriceInETH,
      } = await loadFixture(deployFixture);

      await dInsur
        .connect(anotherAccount)
        .insure(
          TRAVEL_INSURANCE_PLAN_ID,
          CURRENT_DATE,
          EXPIRY_DATE,
          INSURED_AMOUNT,
          {
            value: getPolicyPriceInETH(CURRENT_DATE, EXPIRY_DATE),
          }
        );

      await dInsur
        .connect(otherAccount)
        .insure(
          TRAVEL_INSURANCE_PLAN_ID,
          FUTURE_DATE,
          EXPIRY_DATE,
          INSURED_AMOUNT,
          {
            value: getPolicyPriceInETH(FUTURE_DATE, EXPIRY_DATE),
          }
        );

      const userNumOfPolicy = await dInsur.getUserNumOfPolicy(
        otherAccount.address
      );

      expect(userNumOfPolicy).to.equal(1);
    });
  });
});
