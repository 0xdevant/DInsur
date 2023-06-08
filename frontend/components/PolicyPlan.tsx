import React from "react";

type AppProps = {
  title: string;
};

function PolicyPlan({ title }: AppProps) {
  return (
    <div className="w-[calc(100%/3-16px)] bg-gray-100 rounded-md p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center border-white-100 pb-2 border-b-2">
          <h2 className="font-bold ">{title} Insurance</h2>
          <button className="button-style">Purchase</button>
        </div>

        <div className="flex flex-wrap justify-between items-center space-x-4">
          <div className="w-1/2">Chains</div>
          <div className="">ETH</div>
        </div>

        <div className="flex flex-wrap justify-between items-center space-x-4">
          <div className="w-1/2">TVL</div>
          <div className="">$100000</div>
        </div>

        <div className="flex flex-wrap justify-between items-center space-x-4">
          <div className="w-1/2">Insured Period</div>
          <div className="">7 days</div>
        </div>

        <div className="flex flex-wrap justify-between items-center space-x-4">
          <div className="w-1/2">Min Insured Amount</div>
          <div className="">10 ETH</div>
        </div>
      </div>
    </div>
  );
}

export default PolicyPlan;
