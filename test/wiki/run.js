const { deployDat, updateDatConfig } = require("../datHelpers");
const { approveAll } = require("../helpers");

const behaviors = require("../behaviors");
const { default: BigNumber } = require("bignumber.js");
const { time } = require("@openzeppelin/test-helpers");

contract("wiki / run", (accounts) => {
  const initReserve = "1000000000000000000000";
  const [control, beneficiary, feeCollector] = accounts;
  const investors = [accounts[3], accounts[4], accounts[5]];
  let contracts;

  beforeEach(async function () {
    contracts = await deployDat(accounts, {
      initGoal: "0",
      initReserve,
      control,
      beneficiary,
      feeCollector,
      feeBasisPoints: "10",
    });
    await approveAll(contracts, accounts);

    for (let i = 0; i < investors.length; i++) {
      await contracts.dat.buy(investors[i], "100000000000000000000", 1, {
        value: "100000000000000000000",
        from: investors[i],
      });
    }

    this.contract = contracts.dat;
    this.whitelist = contracts.whitelist;
  });

  behaviors.wiki.run.all(control, beneficiary, investors);

  describe("With minDuration", () => {
    beforeEach(async function () {
      const currentTime = new BigNumber(await time.latest());
      await updateDatConfig(contracts, {
        minDuration: currentTime.plus(10).toFixed(),
      });
      behaviors.wiki.run.allWithMinDuration(control, beneficiary, investors);
    });
  });

  describe("With 0 initGoal and 0 reserve", () => {
    beforeEach(async function () {
      contracts = await deployDat(accounts, {
        initGoal: 0,
        initReserve,
        feeBasisPoints: "10",
        beneficiary,
      });
      await approveAll(contracts, accounts);

      this.contract = contracts.dat;
      this.whitelist = contracts.whitelist;
    });

    behaviors.wiki.run.allWith0GoalAndReserve(beneficiary, investors);
  });
});