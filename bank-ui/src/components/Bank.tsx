import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { FC, useState } from 'react';
import {
  Program,
  AnchorProvider,
  web3,
  utils,
  BN,
} from '@project-serum/anchor';
import idl from '../idl/solanapdas.json';
import { PublicKey } from '@solana/web3.js';

const idl_string = JSON.stringify(idl);
const idl_object = JSON.parse(idl_string);
const programID = new PublicKey(idl.metadata.address);

export const Bank: FC = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [banks, setBanks] = useState([]);

  const getProvider = () => {
    const provider = new AnchorProvider(
      connection,
      wallet,
      AnchorProvider.defaultOptions()
    );

    return provider;
  };

  const createBank = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl_object, programID, provider);

      // get PDA for bank
      const [bank] = await PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode('user'), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .create('Dev Phantom')
        .accounts({
          bank,
          user: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log('Bank PDA', bank.toString());
    } catch (error) {
      console.log('createBank', error);
    }
  };

  const getBanks = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl_object, programID, provider);

      Promise.all(
        (await connection.getProgramAccounts(programID)).map(async (bank) => ({
          ...(await program.account.bank.fetch(bank.pubkey)),
          pubkey: bank.pubkey,
        }))
      ).then((banks) => {
        setBanks(banks);
      });
    } catch (error) {
      console.log('getBanks', error);
    }
  };

  const depositBank = async (publicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(idl_object, programID, provider);

      await program.methods
        .deposit(new BN(0.1 * web3.LAMPORTS_PER_SOL))
        .accounts({
          bank: publicKey,
          user: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log('Deposited 0.1 SOL to ' + publicKey.toString());
    } catch (error) {
      console.log('depositBank', error);
    }
  };

  const withdrawBank = async (publicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(idl_object, programID, provider);
      const bankData = await connection.getAccountInfo(publicKey, 'processed');
      const rent = await connection.getMinimumBalanceForRentExemption(
        bankData.data.length
      );

      const bank = await program.account.bank.fetch(publicKey);
      const amount = bank.balance - rent;

      await program.methods
        .withdraw(new BN(amount))
        .accounts({
          bank: publicKey,
          user: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log('Withdrew ' + amount + ' SOL from ' + publicKey.toString());
    } catch (error) {
      console.log('depositBank', error);
    }
  };

  return (
    <>
      {banks.map((bank) => {
        return (
          <div
            key={bank.pubkey.toString()}
            className='md:hero-content flex flex-col'
          >
            <h1>{bank.name.toString()}</h1>
            <span>{bank.balance.toString()}</span>
            <button
              className='group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black'
              onClick={() => depositBank(bank.pubkey)}
            >
              <span className='block group-disabled:hidden'>
                Deposit to Bank
              </span>
            </button>

            <button
              className='group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black'
              onClick={() => withdrawBank(bank.pubkey)}
            >
              <span className='block group-disabled:hidden'>
                Withdraw From Bank
              </span>
            </button>
          </div>
        );
      })}
      <div className='flex flex-row justify-center'>
        <div className='relative group items-center'>
          <div
            className='m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt'
          ></div>
          <button
            className='group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black'
            disabled={!wallet.publicKey}
            onClick={createBank}
          >
            <div className='hidden group-disabled:block'>
              Wallet not connected
            </div>
            <span className='block group-disabled:hidden'>Create Bank</span>
          </button>

          <button
            className='group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black'
            onClick={getBanks}
          >
            <span className='block group-disabled:hidden'>Fetch Banks</span>
          </button>
        </div>
      </div>
    </>
  );
};
