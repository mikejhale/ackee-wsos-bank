use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use anchor_lang::solana_program::system_instruction::*;

declare_id!("EYahPbK4gjtQNwdigmwSvoPQvPiwSQNo3KrScmc2RqBH");

#[program]
pub mod solanapdas {
    use super::*;

    // create
    pub fn create(ctx: Context<Create>, name: String) -> Result<()> {
        let bank = &mut ctx.accounts.bank;
        bank.name = name;
        bank.balance = 0;
        bank.owner = *ctx.accounts.user.key;
        Ok(())
    }

    //deposit
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let txn = transfer(&ctx.accounts.user.key(), &ctx.accounts.bank.key(), amount);

        anchor_lang::solana_program::program::invoke(
            &txn,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.bank.to_account_info(),
            ],
        )?;

        (&mut ctx.accounts.bank).balance += amount;

        Ok(())
    }

    // withdraw
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> ProgramResult {
        let bank = &mut ctx.accounts.bank;
        let user = &mut ctx.accounts.user;

        if bank.owner != user.key() {
            return Err(ProgramError::IncorrectProgramId);
        }

        let rent = Rent::get()?.minimum_balance(bank.to_account_info().data_len());
        if **bank.to_account_info().lamports.borrow() - rent < amount {
            return Err(ProgramError::InsufficientFunds);
        }

        **bank.to_account_info().try_borrow_mut_lamports()? -= amount;
        **user.to_account_info().try_borrow_mut_lamports()? += amount;

        bank.balance -= amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Create<'info> {
    #[account(init, payer = user, space = 256, seeds = [b"user", user.key().as_ref()], bump)]
    pub bank: Account<'info, Bank>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub bank: Account<'info, Bank>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub bank: Account<'info, Bank>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Bank {
    pub name: String,
    pub balance: u64,
    pub owner: Pubkey,
}

#[error_code]
pub enum BankError {
    NotBankOwner,
    NotEnoughFunds,
}
