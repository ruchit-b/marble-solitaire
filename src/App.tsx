import { useCallback, useEffect, useState } from 'react'
import './App.css'

const initialBoard: (number | null)[][] = [
  [null, null, 1, 1, 1, null, null],
  [null, null, 1, 1, 1, null, null],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [null, null, 1, 1, 1, null, null],
  [null, null, 1, 1, 1, null, null],
]

const directions: [number, number][] = [
  [-2, 0], // up
  [2, 0], // down
  [0, -2], // left
  [0, 2], // right
]

const storageKey = 'marble-board'

function App() {
  const [board, setBoard] = useState(initialBoard)
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [moveCount, setMoveCount] = useState(0)
  const [history, setHistory] = useState<(number | null)[][][]>([initialBoard])
  const [step, setStep] = useState(0)
  const [isGameStarted, setIsGameStarted] = useState(false)
  const [timeLapsed, setTimeLapsed] = useState(0)
  const [validMoves, setValidMoves] = useState<string[]>([])

  const isValidMove = useCallback(
    (boardState: (number | null)[][], src: [number, number], dest: [number, number]) => {
      const [sr, sc] = src
      const [dr, dc] = dest

      if (sr === dr) {
        if (Math.abs(sc - dc) !== 2) return false
        const midC = (sc + dc) / 2
        return boardState[sr][midC] === 1 && boardState[dr][dc] === 0
      } else if (sc === dc) {
        if (Math.abs(sr - dr) !== 2) return false
        const midR = (sr + dr) / 2
        return boardState[midR][sc] === 1 && boardState[dr][dc] === 0
      }
      return false
    },
    [],
  )

  const hasValidMove = useCallback((boardState: (number | null)[][], [r, c]: [number, number]) => {
    if (boardState[r][c] !== 1) return false

    for (const [dr, dc] of directions) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7 && boardState[nr]?.[nc] === 0) {
        const midR = r + dr / 2
        const midC = c + dc / 2
        if (boardState[midR]?.[midC] === 1) return true
      }
    }
    return false
  }, [])

  const checkGameOver = useCallback(
    (boardState: (number | null)[][]) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (boardState[r][c] === 1 && hasValidMove(boardState, [r, c])) {
            return false
          }
        }
      }
      return true
    },
    [hasValidMove],
  )

  const makeMove = useCallback(
    (src: [number, number], dest: [number, number]) => {
      setValidMoves([])
      if (!isValidMove(board, src, dest)) {
        setSelected(null)
        alert('Invalid move')
        return
      }

      const [sr, sc] = src
      const [dr, dc] = dest

      const newBoard = board.map((row) => [...row])
      newBoard[dr][dc] = 1
      newBoard[sr][sc] = 0

      const midR = (sr + dr) / 2
      const midC = (sc + dc) / 2
      newBoard[midR][midC] = 0

      setBoard(newBoard)
      window.localStorage.setItem(storageKey, JSON.stringify(newBoard))
      setSelected(null)
      setMoveCount((prev) => prev + 1)
      setHistory((prev) => [...prev.slice(0, step + 1), newBoard])
      setStep((prev) => prev + 1)

      if (checkGameOver(newBoard)) {
        setGameOver(true)
        setIsGameStarted(false)
      } else {
        setGameOver(false)
      }
    },
    [board, checkGameOver, isValidMove, step],
  )

  const highlightMoves = useCallback(
    (row: number, col: number) => {
      const possibleMoves: string[] = []
      for (const [dr, dc] of directions) {
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7 && board[nr]?.[nc] === 0) {
          const midR = row + dr / 2
          const midC = col + dc / 2
          if (board[midR]?.[midC] === 1) {
            possibleMoves.push(`${nr}-${nc}`)
          }
        }
      }
      setValidMoves(possibleMoves)
    },
    [board],
  )

  const handleClick = useCallback(
    (row: number, col: number) => {
      if (gameOver) return
      const cell = board[row][col]
      if (!isGameStarted) {
        setIsGameStarted(true)
        setTimeLapsed(0)
      }
      if (cell === null) return

      if (selected) {
        makeMove(selected, [row, col])
      } else if (cell === 1) {
        setSelected([row, col])
        highlightMoves(row, col)
      }
    },
    [gameOver, board, isGameStarted, selected, makeMove, highlightMoves],
  )

  const undo = useCallback(() => {
    if (step === 0) return
    const prevStep = step - 1
    const prevBoard = history[prevStep]
    setBoard(prevBoard)
    setStep(prevStep)
    setSelected(null)
    setMoveCount(prevStep)
    setGameOver(checkGameOver(prevBoard))
  }, [history, step, checkGameOver])

  const redo = useCallback(() => {
    if (step === history.length - 1) return
    const nextStep = step + 1
    const nextBoard = history[nextStep]
    setBoard(nextBoard)
    setStep(nextStep)
    setSelected(null)
    setMoveCount(nextStep)
    setGameOver(checkGameOver(nextBoard))
  }, [history, step, checkGameOver])

  const reset = useCallback(() => {
    setBoard(initialBoard)
    setSelected(null)
    setGameOver(false)
    setMoveCount(0)
    setStep(0)
    setHistory([initialBoard])
    setTimeLapsed(0)
    setIsGameStarted(false)
  }, [])

  const remaining = board.flat().filter((x) => x === 1).length
  const isWin = remaining === 1 && board[3][3] === 1

  useEffect(() => {
    if (!isGameStarted) return
    const interval = setInterval(() => {
      setTimeLapsed((prev) => prev + 1)
    }, 1000)
    if (isWin) {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isGameStarted, isWin])

  useEffect(() => {
    const existingBoardStr = window.localStorage.getItem(storageKey)
    if (existingBoardStr) {
      const existingBoard = JSON.parse(existingBoardStr)
      setBoard(existingBoard)
    }
  }, [])

  return (
    <div>
      {isWin && <div className='win-message'>Congratulations! You won!</div>}
      {gameOver && !isWin && <div className='game-over'>Game Over!</div>}
      {isGameStarted && <div className='time-lapsed'>Time Lapsed: {timeLapsed} seconds</div>}
      <div className='board'>
        {board.map((row, r) => (
          <div key={r} className='row'>
            {row.map((cell, c) => {
              if (cell === null) return <div key={c} className='cell empty-cell' />
              const shouldHighlight = validMoves.includes(`${r}-${c}`)
              return (
                <div
                  key={`${r}-${c}`}
                  className={`cell ${cell === 1 ? 'marble' : 'empty'} ${
                    selected?.[0] === r && selected?.[1] === c ? 'selected' : ''
                  } ${shouldHighlight ? 'highlight' : ''}`}
                  onClick={() => handleClick(r, c)}
                >
                  {cell === 1 ? 'O' : ''}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div>Moves: {moveCount}</div>
      <div className='buttons'>
        <button onClick={undo} disabled={step === 0 || isWin || gameOver}>
          Undo
        </button>
        <button onClick={redo} disabled={step === history.length - 1 || isWin || gameOver}>
          Redo
        </button>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  )
}

export default App
