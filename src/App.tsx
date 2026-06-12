import { useBoard } from './model/useBoard'
import { TopBar } from './ui/TopBar'
import { Canvas } from './canvas/Canvas'
import './styles/tokens.css'
import './styles/app.css'

export default function App() {
  const { board, entities, rels, canUndo, canRedo, undo, redo } = useBoard()
  return (
    <div className="app">
      <TopBar
        board={board}
        entities={entities}
        rels={rels}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />
      <Canvas board={board} entities={entities} rels={rels} />
    </div>
  )
}
