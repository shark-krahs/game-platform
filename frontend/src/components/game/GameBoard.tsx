import React from 'react';
import {GameBoardProps, GameEngine} from '../../types';

interface GameBoardPropsInternal extends Omit<GameBoardProps, 'onMoveSubmit'> {
    engine: GameEngine;
    onMoveSubmit?: GameBoardProps['onMoveSubmit'];
}

const GameBoard: React.FC<GameBoardPropsInternal> = ({
                                                         engine,
                                                         gameState,
                                                         onCellClick,
                                                         onMoveSubmit,
                                                         selectedCell,
                                                         selectedQuadrant,
                                                         selectedDirection,
                                                         onQuadrantSelect,
                                                         onDirectionSelect,
                                                         onMoveCancel,
                                                         readOnly = false,
                                                     }) => {
    const BoardComponent = engine.boardComponent;
    const MoveFormComponent = engine.moveFormComponent;

    console.log('GameBoard rendering:', {
        engineId: engine.id,
        boardComponent: BoardComponent.name,
        gameType: gameState.game_type,
        boardLength: gameState.board?.length,
        boardStateKeys: Object.keys(gameState.board_state || {})
    });

    const selectedData = {selectedCell, selectedQuadrant, selectedDirection};
    const handlers = {
        onQuadrantSelect,
        onDirectionSelect,
        onMoveSubmit,
        onMoveCancel,
    };

    const moveFormProps = engine.getMoveFormProps(gameState, selectedData, handlers);

    return (
        <div>
            <BoardComponent
                gameState={gameState}
                onCellClick={onCellClick}
                onMoveSubmit={onMoveSubmit}
                selectedCell={selectedCell}
                selectedQuadrant={selectedQuadrant}
                selectedDirection={selectedDirection}
                onQuadrantSelect={onQuadrantSelect}
                onDirectionSelect={onDirectionSelect}
                onMoveCancel={onMoveCancel}
                readOnly={readOnly}
            />

            {!readOnly && MoveFormComponent && selectedCell && (
                <MoveFormComponent {...moveFormProps} />
            )}
        </div>
    );
};

export default GameBoard;
