import React, { SyntheticEvent, useState } from "react";
import { ethers } from "ethers";

function InsurancePlanner() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [insuredAmt, setInsuredAmt] = useState("");

  const handlePurchase = (e: SyntheticEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex justify-center items-center flex-wrap gap-4">
      <div className="input-field-style">
        <label htmlFor="startDate">Start Date</label>
        <input
          id="startDate"
          type="date"
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Select date"
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="input-field-style">
        <label htmlFor="endDate">End Date</label>
        <input
          id="endDate"
          type="date"
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Select date"
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <div className="input-field-style self-stretch">
        <label htmlFor="amount">Insured Amount(in ETH)</label>
        <input
          id="amount"
          type="number"
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg"
          name="amount"
          placeholder="e.g. 10"
          onChange={(e) => setInsuredAmt(e.target.value)}
        />
      </div>

      <button className="button-style" onClick={handlePurchase}>
        Buy
      </button>
    </div>
  );
}

export default InsurancePlanner;
