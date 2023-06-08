import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import PolicyPlan from "../components/PolicyPlan";
import InsurancePlanner from "../components/InsurancePlanner";

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>DInsur</title>
        <meta name="Decentralized Insurance Application" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className="flex justify-center items-center space-y-10 flex-col p-8 min-h-screen">
        <ConnectButton />

        <h1 className={styles.title}>Welcome to DInsur!</h1>

        <InsurancePlanner />

        <div className="flex flex-wrap justify-center items-center gap-4 w-3/4">
          <PolicyPlan title="General" />
          <PolicyPlan title="Travel" />
          <PolicyPlan title="Health" />
        </div>

        {/* <div className={styles.grid}>
          <a className={styles.card} href="https://rainbowkit.com">
            <h2>RainbowKit Documentation &rarr;</h2>
            <p>Learn how to customize your wallet connection flow.</p>
          </a>
        </div> */}
      </main>

      <footer className={styles.footer}>
        <a href="https://rainbow.me" rel="noopener noreferrer" target="_blank">
          All Rights Reserved ©{new Date().getFullYear()}
        </a>
      </footer>
    </div>
  );
};

export default Home;
