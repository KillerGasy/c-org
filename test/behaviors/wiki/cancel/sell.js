const BigNumber = require("bignumber.js");
const { constants, getGasCost } = require("../../../helpers");
const { expectRevert } = require("@openzeppelin/test-helpers");

module.exports = function (beneficiary, investor) {
  describe("Behavior / Wiki / Cancel / sell", () => {
    const initReserve = "1000000000000000000000";
    const sellAmount = "1000000000000000000";

    it("state is cancel", async function () {
      const state = await this.contract.state();
      assert.equal(state, constants.STATE.CANCEL);
    });

    it("the beneficiary can sell", async function () {
      await this.contract.sell(beneficiary, sellAmount, 1, {
        from: beneficiary,
      });
    });

    describe("On a successful sell", function () {
      let investorFairBalanceBefore;
      let investorCurrencyBalanceBefore;
      let totalSupplyBefore;
      let initInvestmentBefore;
      let x;
      let gasCost;

      beforeEach(async function () {
        investorFairBalanceBefore = new BigNumber(
          await this.contract.balanceOf(investor)
        );
        investorCurrencyBalanceBefore = new BigNumber(
          await web3.eth.getBalance(investor)
        );
        initInvestmentBefore = new BigNumber(
          await this.contract.initInvestors(investor)
        );
        totalSupplyBefore = new BigNumber(await this.contract.totalSupply());

        x = new BigNumber(await this.contract.estimateSellValue(sellAmount));

        const tx = await this.contract.sell(investor, sellAmount, 1, {
          from: investor,
        });
        gasCost = await getGasCost(tx);
      });

      it("amount is being subtracted from the investor's balance.", async function () {
        const balance = new BigNumber(await this.contract.balanceOf(investor));
        assert.equal(
          balance.toFixed(),
          investorFairBalanceBefore.minus(sellAmount).toFixed()
        );
      });

      it("The investor receives x collateral value from the buyback_reserve.", async function () {
        const balance = new BigNumber(await web3.eth.getBalance(investor));
        assert.equal(
          balance.toFixed(),
          investorCurrencyBalanceBefore.plus(x).minus(gasCost).toFixed()
        );
        assert.notEqual(x.toFixed(), 0);
      });

      it("The total_supply is decreased of amount FAIRs.", async function () {
        const totalSupply = new BigNumber(await this.contract.totalSupply());
        assert.equal(
          totalSupply.toFixed(),
          totalSupplyBefore.minus(sellAmount).toFixed()
        );
      });

      it("Save investor's total withdrawal in init_investors[address]-=amount.", async function () {
        const initInvestment = new BigNumber(
          await this.contract.initInvestors(investor)
        );
        assert.equal(
          initInvestment.toFixed(),
          initInvestmentBefore.minus(sellAmount).toFixed()
        );
      });
    });

    it("if the value is less than the min specified then sell fails", async function () {
      const x = new BigNumber(
        await this.contract.estimateSellValue(sellAmount)
      );

      await expectRevert(
        this.contract.sell(investor, sellAmount, x.plus(1).toFixed(), {
          from: investor,
        }),
        "PRICE_SLIPPAGE"
      );
    });

    it("If the min is exact, the call works", async function () {
      const x = new BigNumber(
        await this.contract.estimateSellValue(sellAmount)
      );

      await this.contract.sell(investor, sellAmount, x.toFixed(), {
        from: investor,
      });
    });

    describe("if the investor was awarded tokens from the initReserve", function () {
      beforeEach(async function () {
        await this.contract.transfer(investor, initReserve, {
          from: beneficiary,
        });
      });

      it("If init_investors[address]<amount then the call fails.", async function () {
        await expectRevert(
          this.contract.sell(investor, initReserve, 1, { from: investor }),
          "SafeMath: subtraction overflow"
        );
      });

      it("The call works if amount==init_investors[address]", async function () {
        const initInvestment = await this.contract.initInvestors(investor);
        await this.contract.sell(investor, initInvestment, 1, {
          from: investor,
        });
        assert.notEqual(initInvestment.toString(), 0);
        assert.equal(
          (await this.contract.initInvestors(investor)).toString(),
          0
        );
      });
    });
  });
};
