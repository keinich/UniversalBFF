import React from 'react'

const BoardContextMenu: React.FC<{ onNewEntity: () => void }> = ({ onNewEntity }) => {
  return (
    <div
      className='flex flex-col bg-bg3 dark:bg-bg3dark p-1 z-40'
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('new Entity')
        onNewEntity()
      }}
    >
      <button
        className='p-1 hover:bg-bg4 dark:hover:bg-bg4dark z-40'
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('new Relation')
        }}
      >
        New Entity
      </button>
      <button className='p-1 hover:bg-bg4 dark:hover:bg-bg4dark' onClick={() => onNewEntity()}>
        New Relation
      </button>
    </div>
  )
}

export default BoardContextMenu
