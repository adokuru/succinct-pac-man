'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Position {
  x: number;
  y: number;
}

interface Ghost {
  position: Position;
  color: string;
  direction: string;
  behavior: 'chase' | 'ambush' | 'patrol' | 'intercept';
  target: Position;
}

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const GAME_SPEED = 150;

const initialMaze = [
  '###################',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  '   #.#       #.#   ',
  '####.# ##-## #.####',
  '    .  #   #  .    ',
  '####.# ##### #.####',
  '   #.#       #.#   ',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#..#.....P.....#..#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '###################',
];

export default function Home() {
  const [playerName, setPlayerName] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [pacmanPosition, setPacmanPosition] = useState<Position>({ x: 9, y: 15 });
  const [ghosts, setGhosts] = useState<Ghost[]>([
    { position: { x: 9, y: 9 }, color: 'red', direction: 'right', behavior: 'chase', target: { x: 9, y: 15 } },
    { position: { x: 8, y: 9 }, color: 'pink', direction: 'left', behavior: 'ambush', target: { x: 9, y: 15 } },
    { position: { x: 9, y: 8 }, color: 'cyan', direction: 'up', behavior: 'patrol', target: { x: 9, y: 15 } },
    { position: { x: 10, y: 9 }, color: 'orange', direction: 'down', behavior: 'intercept', target: { x: 9, y: 15 } },
  ]);
  const [direction, setDirection] = useState('right');
  const [maze, setMaze] = useState(initialMaze);

  useEffect(() => {
    const savedName = localStorage.getItem('pacmanPlayerName');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      localStorage.setItem('pacmanPlayerName', playerName);
      setGameStarted(true);
    }
  };

  const checkCollision = useCallback((pos1: Position, pos2: Position) => {
    return pos1.x === pos2.x && pos1.y === pos2.y;
  }, []);

  const getValidMoves = useCallback((pos: Position) => {
    const moves: { x: number; y: number; direction: string }[] = [];
    const directions = [
      { dir: 'up', x: 0, y: -1 },
      { dir: 'down', x: 0, y: 1 },
      { dir: 'left', x: -1, y: 0 },
      { dir: 'right', x: 1, y: 0 },
    ];

    directions.forEach(({ dir, x, y }) => {
      const newX = pos.x + x;
      const newY = pos.y + y;
      if (maze[newY]?.[newX] !== '#') {
        moves.push({ x: newX, y: newY, direction: dir });
      }
    });

    return moves;
  }, [maze]);

  const predictPacmanPosition = useCallback((currentPos: Position, currentDir: string) => {
    let predictedPos = { ...currentPos };
    let steps = 4; // Predict 4 steps ahead

    while (steps > 0) {
      switch (currentDir) {
        case 'up':
          predictedPos.y--;
          break;
        case 'down':
          predictedPos.y++;
          break;
        case 'left':
          predictedPos.x--;
          break;
        case 'right':
          predictedPos.x++;
          break;
      }

      if (maze[predictedPos.y]?.[predictedPos.x] === '#') {
        // If we hit a wall, try to find a new direction
        const validMoves = getValidMoves(predictedPos);
        if (validMoves.length > 0) {
          const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
          predictedPos = { x: randomMove.x, y: randomMove.y };
          currentDir = randomMove.direction;
        }
      }
      steps--;
    }

    return predictedPos;
  }, [maze, getValidMoves]);

  const findPathToTarget = useCallback((ghost: Ghost, target: Position) => {
    const validMoves = getValidMoves(ghost.position);
    let bestMove = validMoves[0];
    let shortestDistance = Infinity;

    validMoves.forEach(move => {
      const distance = Math.abs(move.x - target.x) + Math.abs(move.y - target.y);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        bestMove = move;
      }
    });

    return bestMove;
  }, [getValidMoves]);

  const updateGhostBehavior = useCallback((ghost: Ghost) => {
    let target: Position;

    switch (ghost.behavior) {
      case 'chase':
        // Red ghost: Directly chases Pac-Man
        target = pacmanPosition;
        break;
      case 'ambush':
        // Pink ghost: Tries to ambush by predicting Pac-Man's position
        target = predictPacmanPosition(pacmanPosition, direction);
        break;
      case 'patrol':
        // Cyan ghost: Patrols specific areas and occasionally chases
        if (Math.random() < 0.3) {
          target = pacmanPosition;
        } else {
          // Patrol pattern
          const patrolPoints = [
            { x: 1, y: 1 },
            { x: 18, y: 1 },
            { x: 1, y: 18 },
            { x: 18, y: 18 },
          ];
          target = patrolPoints[Math.floor(Math.random() * patrolPoints.length)];
        }
        break;
      case 'intercept':
        // Orange ghost: Tries to intercept Pac-Man by cutting off escape routes
        const predictedPos = predictPacmanPosition(pacmanPosition, direction);
        const dx = predictedPos.x - ghost.position.x;
        const dy = predictedPos.y - ghost.position.y;
        target = {
          x: predictedPos.x + (dx > 0 ? 2 : -2),
          y: predictedPos.y + (dy > 0 ? 2 : -2),
        };
        break;
      default:
        target = pacmanPosition;
    }

    return { ...ghost, target };
  }, [pacmanPosition, direction, predictPacmanPosition]);

  const movePacman = useCallback(() => {
    setPacmanPosition(prev => {
      let newX = prev.x;
      let newY = prev.y;

      switch (direction) {
        case 'up':
          newY = prev.y - 1;
          break;
        case 'down':
          newY = prev.y + 1;
          break;
        case 'left':
          newX = prev.x - 1;
          break;
        case 'right':
          newX = prev.x + 1;
          break;
      }

      if (maze[newY]?.[newX] !== '#') {
        if (maze[newY]?.[newX] === '.') {
          setScore(prev => prev + 10);
          const newMaze = [...maze];
          newMaze[newY] = newMaze[newY].substring(0, newX) + ' ' + newMaze[newY].substring(newX + 1);
          setMaze(newMaze);
        }
        return { x: newX, y: newY };
      }
      return prev;
    });
  }, [direction, maze]);

  const moveGhosts = useCallback(() => {
    setGhosts(prev => prev.map(ghost => {
      const updatedGhost = updateGhostBehavior(ghost);
      const bestMove = findPathToTarget(updatedGhost, updatedGhost.target);

      return {
        ...updatedGhost,
        position: { x: bestMove.x, y: bestMove.y },
        direction: bestMove.direction,
      };
    }));
  }, [updateGhostBehavior, findPathToTarget]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameInterval = setInterval(() => {
      movePacman();
      moveGhosts();

      const pacmanPos = pacmanPosition;
      const hasCollision = ghosts.some(ghost => checkCollision(pacmanPos, ghost.position));

      if (hasCollision) {
        setGameOver(true);
      }
    }, GAME_SPEED);

    return () => clearInterval(gameInterval);
  }, [gameStarted, gameOver, movePacman, moveGhosts, pacmanPosition, ghosts, checkCollision]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
          setDirection('up');
          break;
        case 'ArrowDown':
          setDirection('down');
          break;
        case 'ArrowLeft':
          setDirection('left');
          break;
        case 'ArrowRight':
          setDirection('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameOver]);

  const resetGame = () => {
    setGameOver(false);
    setScore(0);
    setPacmanPosition({ x: 9, y: 15 });
    setGhosts([
      { position: { x: 9, y: 9 }, color: 'red', direction: 'right', behavior: 'chase', target: { x: 9, y: 15 } },
      { position: { x: 8, y: 9 }, color: 'pink', direction: 'left', behavior: 'ambush', target: { x: 9, y: 15 } },
      { position: { x: 9, y: 8 }, color: 'cyan', direction: 'up', behavior: 'patrol', target: { x: 9, y: 15 } },
      { position: { x: 10, y: 9 }, color: 'orange', direction: 'down', behavior: 'intercept', target: { x: 9, y: 15 } },
    ]);
    setMaze(initialMaze);
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center bg-white/70 p-8 rounded-lg backdrop-blur-sm">
          <div className="mb-8">
            <Image
              src="https://testnet.succinct.xyz/images/succinct-icon-pink.svg"
              alt="Succinct Logo"
              width={100}
              height={100}
              className="mx-auto"
            />
          </div>
          <h1 className="text-4xl font-bold mb-8 text-[#FE11C5]">Succinct Pac-Man</h1>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="px-4 py-2 rounded text-black w-full border-2 border-[#FE11C5]"
              required
            />
            <button
              type="submit"
              className="block w-full bg-[#FE11C5] text-white font-bold py-2 px-4 rounded hover:bg-[#d60fa8] transition-colors"
            >
              Start Game
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <div className="mb-4 text-center bg-black/20 p-4 rounded-lg backdrop-blur-sm">
        <div className="mb-4">
          <Image
            src="https://testnet.succinct.xyz/images/succinct-icon-pink.svg"
            alt="Succinct Logo"
            width={50}
            height={50}
            className="mx-auto"
          />
        </div>
        <h1 className="text-2xl font-bold text-[#FE11C5]">Succinct Pac-Man</h1>
        <p className="text-lg">Player: {playerName}</p>
        <p className="text-lg">Score: {score}</p>
        {gameOver && (
          <div className="mt-4 text-center">
            <p className="text-[#FE11C5] text-xl font-bold mb-4">Game Over!</p>
            <button
              onClick={resetGame}
              className="bg-[#FE11C5] text-white font-bold py-2 px-4 rounded hover:bg-[#d60fa8] transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
      <div
        className="relative bg-black/20 p-4 rounded-lg backdrop-blur-sm"
        style={{
          width: GRID_SIZE * CELL_SIZE + 32,
          height: GRID_SIZE * CELL_SIZE + 32,
        }}
      >
        {maze.map((row, y) =>
          row.split('').map((cell, x) => (
            <div
              key={`${x}-${y}`}
              className="absolute"
              style={{
                left: x * CELL_SIZE + 16,
                top: y * CELL_SIZE + 16,
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: cell === '#' ? '#FE11C5' : 'transparent',
              }}
            >
              {cell === '.' && (
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    width: CELL_SIZE / 4,
                    height: CELL_SIZE / 4,
                    backgroundColor: '#90DCFE',
                    borderRadius: '50%',
                  }}
                />
              )}
            </div>
          ))
        )}
        <div
          className="absolute"
          style={{
            left: pacmanPosition.x * CELL_SIZE + 16,
            top: pacmanPosition.y * CELL_SIZE + 16,
            width: CELL_SIZE,
            height: CELL_SIZE,
            backgroundColor: '#FE11C5',
            borderRadius: '50%',
            transform: `rotate(${direction === 'right' ? 0 :
              direction === 'down' ? 90 :
                direction === 'left' ? 180 : 270
              }deg)`,
          }}
        />
        {ghosts.map((ghost, index) => (
          <div
            key={index}
            className="absolute"
            style={{
              left: ghost.position.x * CELL_SIZE + 16,
              top: ghost.position.y * CELL_SIZE + 16,
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor: ghost.color,
              borderRadius: '50%',
            }}
          />
        ))}
      </div>
    </div>
  );
}
