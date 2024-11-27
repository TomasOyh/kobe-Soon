use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod soccer_game {
    use super::*;

    pub fn start_game(ctx: Context<StartGame>, team_a: String, team_b: String) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.team_a = Team { name: team_a, score: 0 };
        game.team_b = Team { name: team_b, score: 0 };
        game.state = GameState::InProgress;
        emit!(GameStartEvent {
            team_a: game.team_a.name.clone(),
            team_b: game.team_b.name.clone(),
        });
        Ok(())
    }

    pub fn score_goal(ctx: Context<ScoreGoal>, team: String) -> Result<()> {
        let game = &mut ctx.accounts.game;
        if game.state != GameState::InProgress {
            return Err(ErrorCode::GameNotInProgress.into());
        }
        if game.team_a.name == team {
            game.team_a.score += 1;
        } else if game.team_b.name == team {
            game.team_b.score += 1;
        } else {
            return Err(ErrorCode::InvalidTeam.into());
        }
        emit!(GoalScoredEvent {
            team,
            score_a: game.team_a.score,
            score_b: game.team_b.score,
        });
        Ok(())
    }

    pub fn end_game(ctx: Context<EndGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        game.state = GameState::Finished;
        emit!(GameEndEvent {
            team_a: game.team_a.name.clone(),
            score_a: game.team_a.score,
            team_b: game.team_b.name.clone(),
            score_b: game.team_b.score,
        });
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Team {
    pub name: String,
    pub score: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum GameState {
    NotStarted,
    InProgress,
    Finished,
}

impl Default for GameState {
    fn default() -> Self {
        GameState::NotStarted
    }
}

#[account]
pub struct Game {
    pub team_a: Team,
    pub team_b: Team,
    pub state: GameState,
}

#[derive(Accounts)]
pub struct StartGame<'info> {
    #[account(init, payer = user, space = 8 + 64 + 64 + 1)]
    pub game: Account<'info, Game>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ScoreGoal<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct EndGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    pub user: Signer<'info>,
}

#[event]
pub struct GameStartEvent {
    pub team_a: String,
    pub team_b: String,
}

#[event]
pub struct GoalScoredEvent {
    pub team: String,
    pub score_a: u8,
    pub score_b: u8,
}

#[event]
pub struct GameEndEvent {
    pub team_a: String,
    pub score_a: u8,
    pub team_b: String,
    pub score_b: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Game is not in progress")]
    GameNotInProgress,
    #[msg("Invalid team")]
    InvalidTeam,
}