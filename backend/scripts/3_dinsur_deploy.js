async function main() {
  const GENERAL_INSURANCE_PLAN_ID = 0;
  const TRAVEL_INSURANCE_PLAN_ID = 1;
  const HEALTH_INSURANCE_PLAN_ID = 2;
  const DAILY_PRICE_RATE = ethers.utils.parseEther("0.002"); // 2e15

  const DInsur = await ethers.getContractFactory("DInsur");
  const dInsur = await DInsur.deploy(
    GENERAL_INSURANCE_PLAN_ID,
    TRAVEL_INSURANCE_PLAN_ID,
    HEALTH_INSURANCE_PLAN_ID,
    DAILY_PRICE_RATE
  );

  await dInsur.deployed();

  console.log("DInsur deployed to:", dInsur.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
