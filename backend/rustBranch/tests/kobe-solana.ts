import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SoccerGame } from "../target/types/soccer_game";
import { expect } from 'chai';

describe("soccer-game", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SoccerGame as Program<SoccerGame>;

  it("Can start a game", async () => {
    const game = anchor.web3.Keypair.generate();
    const tx = await program.methods
      .startGame("Team A", "Team B")
      .accounts({
        game: game.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([game])
      .rpc();

    const gameAccount = await program.account.game.fetch(game.publicKey);
    expect(gameAccount.teamA.name).to.equal("Team A");
    expect(gameAccount.teamB.name).to.equal("Team B");
    expect(gameAccount.state).to.deep.equal({ inProgress: {} });
  });

  it("Can score a goal", async () => {
    const game = anchor.web3.Keypair.generate();
    await program.methods
      .startGame("Team A", "Team B")
      .accounts({
        game: game.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([game])
      .rpc();

    await program.methods
      .scoreGoal("Team A")
      .accounts({
        game: game.publicKey,
        user: provider.wallet.publicKey,
      })
      .rpc();

    const gameAccount = await program.account.game.fetch(game.publicKey);
    expect(gameAccount.teamA.score).to.equal(1);
    expect(gameAccount.teamB.score).to.equal(0);
  });

  it("Cannot score for an invalid team", async () => {
    const game = anchor.web3.Keypair.generate();
    await program.methods
      .startGame("Team A", "Team B")
      .accounts({
        game: game.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([game])
      .rpc();

    try {
      await program.methods
        .scoreGoal("Team C")
        .accounts({
          game: game.publicKey,
          user: provider.wallet.publicKey,
        })
        .rpc();
      expect.fail("The transaction should have failed");
    } catch (error) {
      expect(error.error.errorMessage).to.equal("Invalid team");
    }
  });

  it("Can end a game", async () => {
    const game = anchor.web3.Keypair.generate();
    await program.methods
      .startGame("Team A", "Team B")
      .accounts({
        game: game.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([game])
      .rpc();

    await program.methods
      .endGame()
      .accounts({
        game: game.publicKey,
        user: provider.wallet.publicKey,
      })
      .rpc();

    const gameAccount = await program.account.game.fetch(game.publicKey);
    expect(gameAccount.state).to.deep.equal({ finished: {} });
  });

  it("Cannot score after game has ended", async () => {
    const game = anchor.web3.Keypair.generate();
    await program.methods
      .startGame("Team A", "Team B")
      .accounts({
        game: game.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([game])
      .rpc();

    await program.methods
      .endGame()
      .accounts({
        game: game.publicKey,
        user: provider.wallet.publicKey,
      })
      .rpc();

    try {
      await program.methods
        .scoreGoal("Team A")
        .accounts({
          game: game.publicKey,
          user: provider.wallet.publicKey,
        })
        .rpc();
      expect.fail("The transaction should have failed");
    } catch (error) {
      expect(error.error.errorMessage).to.equal("Game is not in progress");
    }
  });
});