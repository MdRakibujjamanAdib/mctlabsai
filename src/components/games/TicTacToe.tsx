import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hash, RefreshCw, Notebook as Robot, User } from 'lucide-react';

type Player = 'X' | 'O';
type Board = (Player | null)[];

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6] // Diagonals
];

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<Player | 'Draw' | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);

  useEffect(() => {
    if (autoplayEnabled && currentPlayer === 'O' && !winner) {
      handleAIMove();
    }
  }, [currentPlayer, autoplayEnabled, winner]);

  const checkWinner = (squares: Board): Player | 'Draw' | null => {
    // Check for winner
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a] as Player;
      }
    }

    // Check for draw
    if (squares.every(square => square !== null)) {
      return 'Draw';
    }

    return null;
  };

  const makeMove = (index: number) => {
    if (board[index] || winner || (autoplayEnabled && currentPlayer === 'O')) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const gameResult = checkWinner(newBoard);
    if (gameResult) {
      setWinner(gameResult);
      if (gameResult !== 'Draw') {
        setScores(prev => ({
          ...prev,
          [gameResult]: prev[gameResult] + 1
        }));
      }
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };

  const handleAIMove = async () => {
    setIsAIThinking(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const bestMove = findBestMove();
    if (bestMove !== -1) {
      makeMove(bestMove);
    }
    setIsAIThinking(false);
  };

  const findBestMove = (): number => {
    // First move optimization - take center if available
    if (board.filter(cell => cell !== null).length === 0) {
      return 4;
    }

    let bestScore = -Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        const newBoard = [...board];
        newBoard[i] = 'O';
        const score = minimax(newBoard, 0, false);
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }

    return bestMove;
  };

  const minimax = (currentBoard: Board, depth: number, isMaximizing: boolean): number => {
    const result = checkWinner(currentBoard);

    if (result === 'O') return 10 - depth;
    if (result === 'X') return depth - 10;
    if (result === 'Draw') return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!currentBoard[i]) {
          const newBoard = [...currentBoard];
          newBoard[i] = 'O';
          const score = minimax(newBoard, depth + 1, false);
          bestScore = Math.max(bestScore, score);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (!currentBoard[i]) {
          const newBoard = [...currentBoard];
          newBoard[i] = 'X';
          const score = minimax(newBoard, depth + 1, true);
          bestScore = Math.min(bestScore, score);
        }
      }
      return bestScore;
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
  };

  const renderSquare = (index: number) => {
    const value = board[index];
    return (
      <motion.button
        whileHover={!value && !winner ? { scale: 1.1 } : {}}
        whileTap={!value && !winner ? { scale: 0.95 } : {}}
        onClick={() => makeMove(index)}
        className={`w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center text-3xl font-bold ${
          value ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700'
        } ${value === 'X' ? 'text-blue-400' : 'text-pink-400'}`}
        disabled={!!value || !!winner || (autoplayEnabled && currentPlayer === 'O')}
      >
        {value}
      </motion.button>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gray-900 rounded-lg shadow-xl">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Hash className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Tic Tac Toe</h2>
        </div>
        <div className="flex items-center gap-4 text-white">
          <div className="text-blue-400">X: {scores.X}</div>
          <div className="text-pink-400">O: {scores.O}</div>
        </div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-3 gap-2">
          {Array(9).fill(null).map((_, i) => (
            <div key={i}>{renderSquare(i)}</div>
          ))}
        </div>

        {winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded"
          >
            <h3 className="text-2xl font-bold text-white mb-4">
              {winner === 'Draw' ? "It's a Draw!" : `Player ${winner} Wins!`}
            </h3>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetGame}
              className="px-4 py-2 bg-green-500 text-white rounded-full flex items-center gap-2 hover:bg-green-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Play Again
            </motion.button>
          </motion.div>
        )}

        {isAIThinking && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
            <div className="flex items-center gap-3 text-white">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
              <span>AI is thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAutoplayEnabled(!autoplayEnabled)}
          className={`px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${
            autoplayEnabled
              ? 'bg-pink-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {autoplayEnabled ? <User className="w-4 h-4" /> : <Robot className="w-4 h-4" />}
          {autoplayEnabled ? 'Play vs Human' : 'Play vs AI'}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetGame}
          className="px-4 py-2 bg-gray-500 text-white rounded-full flex items-center gap-2 hover:bg-gray-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reset Game
        </motion.button>
      </div>

      <div className="text-gray-400 text-sm">
        Current Player: <span className={currentPlayer === 'X' ? 'text-blue-400' : 'text-pink-400'}>{currentPlayer}</span>
        {autoplayEnabled && currentPlayer === 'O' && ' (AI)'}
      </div>
    </div>
  );
}