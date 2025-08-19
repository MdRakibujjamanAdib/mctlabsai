import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bird, RefreshCw, Play, Pause } from 'lucide-react';

interface Bird {
  y: number;
  velocity: number;
}

interface Pipe {
  x: number;
  height: number;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const BIRD_SIZE = 30;
const PIPE_WIDTH = 50;
const PIPE_GAP = 150;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const PIPE_SPEED = 2;
const BIRD_X = 100; // Move bird more to the right

export default function FlappyBird() {
  const [gameOver, setGameOver] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [paused, setPaused] = useState(true);
  const [bird, setBird] = useState<Bird>({ y: CANVAS_HEIGHT / 2, velocity: 0 });
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);
  const pipeSpawnTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawGame = () => {
      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw bird
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(BIRD_X, bird.y, BIRD_SIZE/2, 0, Math.PI * 2);
      ctx.fill();

      // Draw pipes
      ctx.fillStyle = '#f87171';
      pipes.forEach(pipe => {
        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.height + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT - (pipe.height + PIPE_GAP));
        // Top pipe
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.height);
      });

      // Draw score
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.fillText(`Score: ${score}`, 10, 30);
    };

    drawGame();
  }, [bird, pipes, score]);

  const resetGame = () => {
    setBird({ y: CANVAS_HEIGHT / 2, velocity: 0 });
    setPipes([]);
    setScore(0);
    setGameOver(false);
    setPaused(true);
    pipeSpawnTimeRef.current = 0;
    lastUpdateTimeRef.current = 0;
  };

  const updateGame = (timestamp: number) => {
    if (gameOver || paused) return;

    const deltaTime = timestamp - lastUpdateTimeRef.current;
    
    if (deltaTime >= 16) { // Cap at ~60 FPS
      lastUpdateTimeRef.current = timestamp;

      // Update bird
      setBird(prev => {
        const newY = prev.y + prev.velocity;
        const newVelocity = prev.velocity + GRAVITY;
        
        // Keep bird within bounds
        if (newY <= 0) return { y: 0, velocity: 0 };
        if (newY >= CANVAS_HEIGHT - BIRD_SIZE/2) return { y: CANVAS_HEIGHT - BIRD_SIZE/2, velocity: 0 };
        
        return {
          y: newY,
          velocity: newVelocity
        };
      });

      // Update pipes
      setPipes(prev => {
        let newPipes = prev.map(pipe => ({
          ...pipe,
          x: pipe.x - PIPE_SPEED
        })).filter(pipe => pipe.x + PIPE_WIDTH > 0);

        // Add new pipe
        if (timestamp - pipeSpawnTimeRef.current >= 2000) { // Spawn pipe every 2 seconds
          pipeSpawnTimeRef.current = timestamp;
          newPipes.push({
            x: CANVAS_WIDTH,
            height: Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 200) + 100 // Better height range
          });
        }

        return newPipes;
      });

      // Check collisions
      const birdRect = {
        x: BIRD_X - BIRD_SIZE/2,
        y: bird.y - BIRD_SIZE/2,
        width: BIRD_SIZE,
        height: BIRD_SIZE
      };

      // Check if bird hits the ground or ceiling
      if (bird.y - BIRD_SIZE/2 <= 0 || bird.y + BIRD_SIZE/2 >= CANVAS_HEIGHT) {
        setGameOver(true);
        setHighScore(prev => Math.max(prev, score));
        return;
      }

      // Check pipe collisions
      pipes.forEach(pipe => {
        const topPipeRect = {
          x: pipe.x,
          y: 0,
          width: PIPE_WIDTH,
          height: pipe.height
        };

        const bottomPipeRect = {
          x: pipe.x,
          y: pipe.height + PIPE_GAP,
          width: PIPE_WIDTH,
          height: CANVAS_HEIGHT - (pipe.height + PIPE_GAP)
        };

        if (checkCollision(birdRect, topPipeRect) || checkCollision(birdRect, bottomPipeRect)) {
          setGameOver(true);
          setHighScore(prev => Math.max(prev, score));
          return;
        }

        // Score when passing pipe center
        if (pipe.x + PIPE_WIDTH/2 < BIRD_X && pipe.x + PIPE_WIDTH/2 > BIRD_X - PIPE_SPEED) {
          setScore(prev => prev + 1);
        }
      });
    }

    animationFrameRef.current = requestAnimationFrame(updateGame);
  };

  const checkCollision = (rect1: any, rect2: any) => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  };

  useEffect(() => {
    if (!gameOver && !paused) {
      lastUpdateTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(updateGame);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameOver, paused]);

  const handleJump = () => {
    if (!gameOver && !paused) {
      setBird(prev => ({
        ...prev,
        velocity: JUMP_FORCE
      }));
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      event.preventDefault(); // Prevent page scrolling
      handleJump();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameOver, paused]);

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gray-900 rounded-lg shadow-xl">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Bird className="w-6 h-6 text-green-400" />
          <h2 className="text-xl font-bold text-white">Flappy Bird</h2>
        </div>
        <div className="flex items-center gap-4 text-white">
          <div>Score: {score}</div>
          <div>High Score: {highScore}</div>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleJump}
          className="border-2 border-gray-700 rounded cursor-pointer"
        />

        {gameOver && (
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
          onClick={() => setPaused(!paused)}
          className="px-4 py-2 bg-blue-500 text-white rounded-full flex items-center gap-2 hover:bg-blue-600 transition-colors"
        >
          {paused ? (
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
        Press spacebar or click/tap to jump
      </div>
    </div>
  );
}