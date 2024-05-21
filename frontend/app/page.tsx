"use client";

import offCKB from "@/offckb.config";
import { capacityOf, generateAccountFromPrivateKey, transfer } from "./lib";
import { Script } from "@ckb-lumos/lumos";
import React, { useEffect, useState } from "react";

export default function Home() {
  // default value: first account privkey from offckb
  const [privKey, setPrivKey] = useState(
    "0x6109170b275a09ad54877b82f7d9930f88cab5717d484fb4741ae9d1dd078cd6"
  );
  const [fromAddr, setFromAddr] = useState("");
  const [fromLock, setFromLock] = useState<Script>();
  const [balance, setBalance] = useState("0");

  // default value: second account address from offckb
  const [toAddr, setToAddr] = useState(
    "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqt435c3epyrupszm7khk6weq5lrlyt52lg48ucew"
  );
  // default value: 62 CKB
  const [amount, setAmount] = useState("6200000000");

  const [isTransferring, setIsTransferring] = useState(false);
  const [txHash, setTxHash] = useState<string>();

  useEffect(() => {
    if (privKey) {
      updateFromInfo();
    }
  }, [privKey]);

  const updateFromInfo = async () => {
    const { lockScript, address } = generateAccountFromPrivateKey(privKey);
    const capacity = await capacityOf(address);
    setFromAddr(address);
    setFromLock(lockScript);
    setBalance(capacity.toString());
  };

  const onInputPrivKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Regular expression to match a valid private key with "0x" prefix
    const priv = e.target.value;
    const privateKeyRegex = /^0x[0-9a-fA-F]{64}$/;

    const isValid = privateKeyRegex.test(priv);
    if (isValid) {
      setPrivKey(priv);
    } else {
      alert(
        `Invalid private key: must start with 0x and 32 bytes length. Ensure you're using a valid private key from the offckb accounts list.`
      );
    }
  };

  const onTransfer = async () => {
    setIsTransferring(true);
    const txHash = await transfer(fromAddr, toAddr, amount, privKey).catch(
      alert
    );

    // We can wait for this txHash to be on-chain so that we can trigger the UI/UX updates including balance.
    if (txHash) {
      setTxHash(txHash);
      // Note: indexer.waitForSync has a bug, we use negative number to workaround.
      // the negative number presents the block difference from current tip to wait
      await offCKB.indexer.waitForSync(-1);
      await updateFromInfo();
    }

    setIsTransferring(false);
  };

  const enabled =
    +amount > 6100000000 &&
    +balance > +amount &&
    toAddr.length > 0 &&
    !isTransferring;
  const amountTip =
    amount.length > 0 && +amount < 6100000000 ? (
      <span>
        amount must larger than 6,100,000,000(61 CKB), see{" "}
        <a href="https://docs.nervos.org/docs/wallets/#requirements-for-ckb-transfers">
          why
        </a>
      </span>
    ) : null;
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div>
        <div className="mb-10 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          View and Transfer Balance
        </div>
        <label htmlFor="private-key">Private Key: </label>&nbsp;
        <input
          id="private-key"
          type="text"
          value={privKey}
          onChange={onInputPrivKey}
          className="w-full px-1 py-1"
        />
        <ul>
          <li>CKB Address: {fromAddr}</li>
          <li>
            Current lock script:
            <pre>{JSON.stringify(fromLock, null, 2)}</pre>
          </li>

          <li>Total capacity: {(+balance).toLocaleString()}</li>
        </ul>
        <label htmlFor="to-address">Transfer to Address: </label>&nbsp;
        <input
          id="to-address"
          type="text"
          value={toAddr}
          onChange={(e) => setToAddr(e.target.value)}
          className="w-full px-1 py-1"
        />
        <br />
        <label htmlFor="amount">Amount</label>
        &nbsp;
        <input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-1 py-1"
        />
        <small>Tx fee: 100,000 (0.001 CKB)</small>
        <br />
        <small style={{ color: "red" }}>{amountTip}</small>
        <br />
        <br />
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          disabled={!enabled}
          onClick={onTransfer}
        >
          Transfer
        </button>
        {txHash && <div>tx hash: {txHash}</div>}
      </div>
    </main>
  );
}
