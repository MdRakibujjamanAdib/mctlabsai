import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Gamepad, RefreshCw, Play, Pause } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface GameState {
  snake: Position[];
  food: Position;
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  gameOver: boolean;
  score: number;
  paused: boolean;
}

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 5;

const getRandomPosition = (): Position => ({
  x: Math.floor(Math.random() * GRID_SIZE),
  y: Math.floor(Math.random() * GRID_SIZE)
});

export default function Snake() {
  const [gameState, setGameState] = useState<GameState>({
    snake: [{ x: 10, y: 10 }],
    food: getRandomPosition(),
    direction: 'RIGHT',
    gameOver: false,
    score: 0,
    paused: true
  });
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [highScore, setHighScore] = useState(0);
  const gameLoopRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const resetGame = useCallback(() => {
    setGameState({
      snake: [{ x: 10, y: 10 }],
      food: getRandomPosition(),
      direction: 'RIGHT',
      gameOver: false,
      score: 0,
      paused: true
    });
    setSpeed(INITIAL_SPEED);
  }, []);

  const moveSnake = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return;

    setGameState(prev => {
      const newSnake = [...prev.snake];
      const head = { ...newSnake[0] };

      switch (prev.direction) {
        case 'UP':
          head.y = (head.y - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case 'DOWN':
          head.y = (head.y + 1) % GRID_SIZE;
          break;
        case 'LEFT':
          head.x = (head.x - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case 'RIGHT':
          head.x = (head.x + 1) % GRID_SIZE;
          break;
      }

      // Check collision with self
      if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        return { ...prev, gameOver: true };
      }

      newSnake.unshift(head);

      // Check if snake ate food
      if (head.x === prev.food.x && head.y === prev.food.y) {
        const newScore = prev.score + 1;
        setSpeed(current => Math.max(50, current - SPEED_INCREMENT));
        setHighScore(current => Math.max(current, newScore));
        return {
          ...prev,
          snake: newSnake,
          food: getRandomPosition(),
          score: newScore
        };
      }

      newSnake.pop();
      return { ...prev, snake: newSnake };
    });
  }, [gameState.gameOver, gameState.paused]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState.gameOver) return;

    setGameState(prev => {
      const newDirection = (() => {
        switch (event.key) {
          case 'ArrowUp':
            return prev.direction !== 'DOWN' ? 'UP' : prev.direction;
          case 'ArrowDown':
            return prev.direction !== 'UP' ? 'DOWN' : prev.direction;
          case 'ArrowLeft':
            return prev.direction !== 'RIGHT' ? 'LEFT' : prev.direction;
          case 'ArrowRight':
            return prev.direction !== 'LEFT' ? 'RIGHT' : prev.direction;
          default:
            return prev.direction;
        }
      })();

      return { ...prev, direction: newDirection };
    });
  }, [gameState.gameOver]);

  const togglePause = useCallback(() => {
    setGameState(prev => ({ ...prev, paused: !prev.paused }));
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    gameLoopRef.current = window.setInterval(moveSnake, speed);
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [moveSnake, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

    // Draw snake
    ctx.fillStyle = '#4ade80';
    gameState.snake.forEach(({ x, y }) => {
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
    });

    // Draw food
    ctx.fillStyle = '#f87171';
    ctx.fillRect(
      gameState.food.x * CELL_SIZE,
      gameState.food.y * CELL_SIZE,
      CELL_SIZE - 1,
      CELL_SIZE - 1
    );
  }, [gameState]);

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gray-900 rounded-lg shadow-xl">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Gamepad className="w-6 h-6 text-green-400" />
          <h2 className="text-xl font-bold text-white">Snake Game</h2>
        </div>
        <div className="flex items-center gap-4 text-white">
          <div>Score: {gameState.score}</div>
          <div>High Score: {highScore}</div>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          className="border-2 border-gray-700 rounded"
        />

        {gameState.gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded"
          >
            <h3 className="text-2xl font-bold text-white mb-4">Game Over!</h3>
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
      </div>

      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={togglePause}
          className="px-4 py-2 bg-blue-500 text-white rounded-full flex items-center gap-2 hover:bg-blue-600 transition-colors"
        >
          {gameState.paused ? (
            <>
              <Play className="w-4 h-4" />
              Start
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          )}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetGame}
          className="px-4 py-2 bg-gray-500 text-white rounded-full flex items-center gap-2 hover:bg-gray-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </motion.button>
      </div>

      <div className="text-gray-400 text-sm">
        Use arrow keys to control the snake
      </div>
    </div>
  );
}